import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import Payment from '../../models/Payment';
import Application from '../../models/Application';
import { generateReceiptPDF } from '../../services/pdf.service';
import { uploadToCloudinary } from '../../services/cloudinary.service';
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
    const pdfBuffer = await generateReceiptPDF({
      payment: payment as any,
      appRef: app.referenceId,
      userName: user.name,
      visaType: app.visaType?.name || 'N/A',
      country: app.country?.name || 'N/A',
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${payment._id}.pdf"`);
    res.end(pdfBuffer);
  } catch (err) {
    sendError(res, 'Failed to generate receipt', 500);
  }
};

// Called when user makes payment (creates the Payment record)
export const processPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  const application = await Application.findOne({ _id: req.params.id, user: req.user!._id });
  if (!application) { sendError(res, 'Application not found', 404); return; }
  if (application.status !== 'payment_pending') { sendError(res, 'Payment is not required at this stage'); return; }

  const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

  const payment = await Payment.create({
    application: application._id,
    user: req.user!._id,
    amount: application.paymentAmount,
    method: 'online',
    status: 'completed',
    transactionId,
    markedByAdmin: false,
    paidAt: new Date(),
  });

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
