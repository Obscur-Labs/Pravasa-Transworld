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

// Opens the Razorpay checkout modal. Resolves with the gateway's signed
// payment details on success, rejects with PaymentCancelledError on dismiss.
export function openRazorpayCheckout(order: RazorpayOrderData): Promise<RazorpayCheckoutResult> {
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: order.prefill,
      theme: { color: '#1d4ed8' },
      handler: (response: RazorpayCheckoutResult) => resolve(response),
      modal: {
        ondismiss: () => reject(new PaymentCancelledError()),
      },
    });
    rzp.open();
  });
}
