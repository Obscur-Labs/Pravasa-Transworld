declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface RazorpayOrderData {
  keyId: string;
  orderId: string;
  amount: number; // subunits
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; email: string; contact: string };
}

export interface RazorpayCheckoutResult {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

export class PaymentCancelledError extends Error {
  constructor() {
    super('Payment was cancelled');
    this.name = 'PaymentCancelledError';
  }
}

/**
 * A payment the gateway turned down — a declined card, a failed bank authorisation.
 * Distinct from a cancellation: the applicant tried and the attempt was refused, which
 * carries a reason worth showing them and worth recording server-side.
 */
export class PaymentFailedError extends Error {
  code: string;
  description: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;

  constructor(details: { code?: string; description?: string; orderId?: string; paymentId?: string }) {
    super(details.description || 'The payment could not be completed');
    this.name = 'PaymentFailedError';
    this.code = details.code || '';
    this.description = details.description || 'The payment could not be completed';
    this.razorpayOrderId = details.orderId || '';
    this.razorpayPaymentId = details.paymentId || '';
  }
}

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

export function loadRazorpayScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load payment gateway')));
      return;
    }
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load payment gateway'));
    document.body.appendChild(script);
  });
}

// Opens the Razorpay checkout modal. Resolves with the gateway's signed payment
// details on success, rejects with PaymentFailedError when the gateway turns the
// attempt down, and with PaymentCancelledError when the applicant closes the window.
export function openRazorpayCheckout(order: RazorpayOrderData): Promise<RazorpayCheckoutResult> {
  return new Promise((resolve, reject) => {
    // A declined payment fires 'payment.failed' and then, once the applicant closes the
    // modal, 'ondismiss' — without this flag the real reason would be overwritten by a
    // generic cancellation.
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };

    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      theme: { color: '#1d4ed8' },
      handler: (response: RazorpayCheckoutResult) => settle(() => resolve(response)),
      modal: {
        ondismiss: () => settle(() => reject(new PaymentCancelledError())),
      },
    });

    rzp.on('payment.failed', (response: any) => {
      const err = response?.error || {};
      settle(() => {
        rzp.close?.();
        reject(new PaymentFailedError({
          code: err.code,
          description: err.description,
          orderId: err.metadata?.order_id || order.orderId,
          paymentId: err.metadata?.payment_id,
        }));
      });
    });

    rzp.open();
  });
}
