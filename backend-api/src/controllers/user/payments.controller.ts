import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import Payment from '../../models/Payment';
import Application from '../../models/Application';
import { generateReceiptPDF } from '../../services/pdf.service';
import { uploadToCloudinary } from '../../services/cloudinary.service';
import {
  isRazorpayConfigured,
  getRazorpayKeyId,
  createRazorpayOrder,
  verifyPaymentSignature,
} from '../../services/razorpay.service';
import { sendSuccess, sendError } from '../../utils/response';

export const getUserPayments = async (req: AuthRequest, res: Response): Promise<void> => {
  const payments = await Payment.find({ user: req.user!._id, status: 'completed' })
    .populate({
      path: 'application',
      populate: [{ path: 'visaType', select: 'name' }, { path: 'country', select: 'name flag' }],
    })
    .sort({ createdAt: -1 });
  sendSuccess(res, payments);
};

export const downloadReceipt = async (req: AuthRequest, res: Response): Promise<void> => {
  const payment = await Payment.findOne({ _id: req.params.id, user: req.user!._id, status: 'completed' })
    .populate({
      path: 'application',
      populate: [{ path: 'visaType', select: 'name' }, { path: 'country', select: 'name flag' }],
    })
    .populate('user', 'name email');

  if (!payment) { sendError(res, 'Payment not found', 404); return; }

  const app = payment.application as any;
  const user = payment.user as any;

  try {
    const countryCode = (app.country?.flag || 'XX').toUpperCase();
    const yearShort = new Date().getFullYear().toString().slice(-2);
    const appLastNum = (app.referenceId || '').split('-').pop() || '0000';

    const allPayments = await Payment.find({ application: app._id, status: 'completed' }).sort({ paidAt: 1 });
    const seqIdx = allPayments.findIndex((p) => String(p._id) === String(payment._id));
    const seqNo = String((seqIdx >= 0 ? seqIdx : 0) + 1).padStart(3, '0');
    const receiptNumber = `${countryCode}-${yearShort}/${appLastNum}/${seqNo}`;

    const pdfBuffer = await generateReceiptPDF({
      payment: payment as any,
      appRef: app.referenceId,
      userName: user.name,
      visaType: app.visaType?.name || 'N/A',
      country: app.country?.name || 'N/A',
      receiptNumber,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${app.referenceId}.pdf"`);
    res.end(pdfBuffer);
  } catch (err) {
    sendError(res, 'Failed to generate receipt', 500);
  }
};

// Step 1: create a Razorpay order + pending Payment record
export const createPaymentOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const application = await Application.findOne({ _id: req.params.id, user: req.user!._id });
  if (!application) { sendError(res, 'Application not found', 404); return; }
  if (!['submitted', 'payment_pending'].includes(application.status)) { sendError(res, 'Payment is not required at this stage'); return; }
  if (!application.paymentAmount || application.paymentAmount <= 0) { sendError(res, 'Invalid payment amount'); return; }
  if (!isRazorpayConfigured()) { sendError(res, 'Payment gateway is not configured. Please contact support.', 503); return; }

  try {
    const order = await createRazorpayOrder(application.paymentAmount, `rcpt_${application.referenceId}`, {
      applicationId: String(application._id),
      referenceId: application.referenceId,
    });

    // Reuse the pending record across retries so abandoned checkouts don't pile up
    await Payment.findOneAndUpdate(
      { application: application._id, user: req.user!._id, status: 'pending', gateway: 'razorpay' },
      {
        application: application._id,
        user: req.user!._id,
        amount: application.paymentAmount,
        currency: order.currency,
        method: 'online',
        status: 'pending',
        gateway: 'razorpay',
        razorpayOrderId: order.id,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    sendSuccess(res, {
      keyId: getRazorpayKeyId(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: 'Pravasa Transworld',
      description: `Visa application ${application.referenceId}`,
      prefill: {
        name: req.user!.name,
        email: req.user!.email,
        contact: (req.user as any).phone || '',
      },
    });
  } catch (err) {
    console.error('Razorpay order creation failed', err);
    sendError(res, 'Could not initiate payment. Please try again.', 502);
  }
};

// Step 2: verify checkout signature, then mark payment complete
export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    sendError(res, 'Missing payment verification details'); return;
  }

  const application = await Application.findOne({ _id: req.params.id, user: req.user!._id });
  if (!application) { sendError(res, 'Application not found', 404); return; }

  const payment = await Payment.findOne({
    application: application._id,
    user: req.user!._id,
    razorpayOrderId: razorpay_order_id,
  });
  if (!payment) { sendError(res, 'Payment order not found', 404); return; }

  // Idempotent: checkout handler + retries may both hit this endpoint
  if (payment.status === 'completed') { sendSuccess(res, { payment, application }, 'Payment already verified'); return; }

  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    payment.status = 'failed';
    await payment.save();
    sendError(res, 'Payment verification failed. If money was deducted, it will be refunded automatically.', 400);
    return;
  }

  payment.status = 'completed';
  payment.transactionId = razorpay_payment_id;
  payment.razorpayPaymentId = razorpay_payment_id;
  payment.razorpaySignature = razorpay_signature;
  payment.paidAt = new Date();
  await payment.save();

  application.status = 'payment_completed';
  await application.save();

  const AdminNotification = (await import('../../models/AdminNotification')).default;
  const Notification = (await import('../../models/Notification')).default;
  const { getIO } = await import('../../utils/socket');
  
  const adminNotif = await AdminNotification.create({
    title: 'Payment Received',
    message: `Payment of $${payment.amount} received for application ${application.referenceId}.`,
    type: 'payment_received',
    application: application._id,
  });

  const userNotif = await Notification.create({
    user: req.user!._id,
    title: 'Payment Successful',
    message: `Your payment of $${payment.amount} for application ${application.referenceId} was successful.`,
    type: 'status_update',
    application: application._id,
  });

  try {
    getIO().to('admin_room').emit('admin_notification', adminNotif);
    getIO().to(`user_${req.user!._id}`).emit('notification', userNotif);
  } catch (err) {
    console.error('Socket emission failed', err);
  }

  sendSuccess(res, { payment, application }, 'Payment successful');
};
