import { Response } from 'express';
import https from 'https';
import http from 'http';
import archiver from 'archiver';
import { AdminRequest } from '../../middleware/adminAuth.middleware';
import Application, { ApplicationStatus, STATUS_LABELS } from '../../models/Application';
import Document from '../../models/Document';
import Notification from '../../models/Notification';
import VisaFile from '../../models/VisaFile';
import User from '../../models/User';
import Payment from '../../models/Payment';
import { uploadToCloudinary } from '../../services/cloudinary.service';
import { sendDocumentStatusEmail, sendStatusUpdateEmail, sendVisaDeliveredEmail } from '../../services/email.service';
import { sendSuccess, sendError } from '../../utils/response';

async function fetchBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https://') ? https : http;
    const chunks: Buffer[] = [];
    const req = protocol.get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`HTTP ${res.statusCode}`)); return; }
      res.on('data', (chunk: Buffer) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

export const getApplications = async (req: AdminRequest, res: Response): Promise<void> => {
  const { status, country, page = '1', limit = '20' } = req.query;
  const filter: Record<string, unknown> = {};
  if (status) filter.status = status;
  if (country) filter.country = country;

  const skip = (Number(page) - 1) * Number(limit);
  const [applications, total] = await Promise.all([
    Application.find(filter)
      .populate('user', 'name email phone')
      .populate('visaType', 'name price')
      .populate('country', 'name flag')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Application.countDocuments(filter),
  ]);

  sendSuccess(res, { applications, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
};

export const getApplication = async (req: AdminRequest, res: Response): Promise<void> => {
  const application = await Application.findById(req.params.id)
    .populate('user', 'name email phone')
    .populate('visaType')
    .populate('country');
  if (!application) { sendError(res, 'Application not found', 404); return; }

  const documents = await Document.find({ application: application._id });
  const visaFile = await VisaFile.findOne({ application: application._id });
  sendSuccess(res, { application, documents, visaFile });
};

export const getDashboardStats = async (_req: AdminRequest, res: Response): Promise<void> => {
  const [total, pending, processing, approved, rejected] = await Promise.all([
    Application.countDocuments(),
    Application.countDocuments({ status: { $in: ['submitted', 'documents_under_review'] } }),
    Application.countDocuments({ status: { $in: ['payment_completed', 'visa_processing', 'embassy_review'] } }),
    Application.countDocuments({ status: 'visa_approved' }),
    Application.countDocuments({ status: 'visa_rejected' }),
  ]);
  sendSuccess(res, { total, pending, processing, approved, rejected });
};

export const reviewDocument = async (req: AdminRequest, res: Response): Promise<void> => {
  const { documentId, status, rejectionReason } = req.body;
  if (!documentId || !status) { sendError(res, 'documentId and status are required'); return; }

  const doc = await Document.findOne({ _id: documentId, application: req.params.id });
  if (!doc) { sendError(res, 'Document not found', 404); return; }

  doc.status = status;
  doc.rejectionReason = rejectionReason || '';
  doc.reviewedAt = new Date();
  await doc.save();

  const application = await Application.findById(req.params.id);
  if (application) {
    const notif = await Notification.create({
      user: application.user,
      title: status === 'rejected' ? 'Document Rejected' : 'Document Reviewed',
      message: status === 'rejected' 
        ? `Your document "${doc.requirementName}" was rejected: ${rejectionReason}`
        : `Your document "${doc.requirementName}" has been reviewed.`,
      type: status === 'rejected' ? 'document_rejected' : 'general',
      application: application._id,
    });

    try {
      const { getIO } = await import('../../utils/socket');
      getIO().to(`user_${application.user}`).emit('notification', notif);
    } catch (err) {
      console.error('Socket emission failed', err);
    }

    if (status === 'rejected') {
      const user = await User.findById(application.user);
      if (user) {
        try {
          await sendDocumentStatusEmail(user.email, user.name, 'rejected', rejectionReason, application.referenceId);
        } catch (err) { console.error(err); }
      }
    }
  }

  sendSuccess(res, doc, 'Document reviewed');
};

export const approveAllDocuments = async (req: AdminRequest, res: Response): Promise<void> => {
  const application = await Application.findById(req.params.id).populate('user', 'name email');
  if (!application) { sendError(res, 'Application not found', 404); return; }

  await Document.updateMany({ application: application._id, status: 'pending' }, { status: 'approved', reviewedAt: new Date() });

  const visaType = await (await import('../../models/VisaType')).default.findById(application.visaType);
  application.status = 'documents_approved';
  // Preserve the per-traveler total locked at creation; only recompute if it was never set.
  if (!application.paymentAmount || application.paymentAmount <= 0) {
    const fullUser = await (await import('../../models/User')).default.findById(application.user);
    const isCorporate = fullUser?.accountType === 'corporate';
    const adultRate = isCorporate && visaType?.corporateAdultPrice
      ? visaType.corporateAdultPrice
      : (visaType?.adultPrice || visaType?.price || 0);
    const childRate = isCorporate && visaType?.corporateChildPrice != null
      ? visaType.corporateChildPrice
      : (visaType?.childPrice || 0);
    application.paymentAmount = (application.adults || 1) * adultRate + (application.children || 0) * childRate;
  }
  await application.save();

  const user = application.user as unknown as { name: string; email: string };
  const notif = await Notification.create({
    user: application.user,
    title: 'Documents Approved',
    message: `Your documents for application ${application.referenceId} have been reviewed and approved.`,
    type: 'document_approved',
    application: application._id,
  });

  try {
    const { getIO } = await import('../../utils/socket');
    getIO().to(`user_${(application.user as any)._id}`).emit('notification', notif);
  } catch (err) {
    console.error('Socket emission failed', err);
  }

  try {
    await sendDocumentStatusEmail(user.email, user.name, 'approved', undefined, application.referenceId);
  } catch (err) { console.error(err); }

  sendSuccess(res, application, 'All documents approved');
};

export const updateStatus = async (req: AdminRequest, res: Response): Promise<void> => {
  const { status, rejectionReason, adminNotes } = req.body;
  if (!status) { sendError(res, 'Status is required'); return; }

  const application = await Application.findById(req.params.id).populate('user', 'name email');
  if (!application) { sendError(res, 'Application not found', 404); return; }

  application.status = status as ApplicationStatus;
  if (rejectionReason) application.rejectionReason = rejectionReason;
  if (adminNotes) application.adminNotes = adminNotes;
  await application.save();

  const user = application.user as unknown as { name: string; email: string };
  const label = STATUS_LABELS[status as ApplicationStatus] || status;

  const notif = await Notification.create({
    user: application.user,
    title: 'Application Status Updated',
    message: `Your application ${application.referenceId} status: ${label}`,
    type: 'status_update',
    application: application._id,
  });

  try {
    const { getIO } = await import('../../utils/socket');
    getIO().to(`user_${(application.user as any)._id}`).emit('notification', notif);
  } catch (err) {
    console.error('Socket emission failed', err);
  }

  try {
    await sendStatusUpdateEmail(user.email, user.name, label, application.referenceId);
  } catch (err) { console.error(err); }

  sendSuccess(res, application, 'Status updated');
};

export const uploadVisaFile = async (req: AdminRequest, res: Response): Promise<void> => {
  if (!req.file) { sendError(res, 'Visa file is required'); return; }

  const application = await Application.findById(req.params.id).populate('user', 'name email');
  if (!application) { sendError(res, 'Application not found', 404); return; }

  const { url, publicId } = await uploadToCloudinary(req.file.buffer, 'visa-files', 'raw');

  await VisaFile.findOneAndUpdate(
    { application: application._id },
    { application: application._id, url, publicId },
    { upsert: true, new: true }
  );

  application.status = 'visa_delivered';
  await application.save();

  const user = application.user as unknown as { name: string; email: string };
  const notif = await Notification.create({
    user: application.user,
    title: 'Visa Delivered',
    message: `Your visa for application ${application.referenceId} is ready for download!`,
    type: 'visa_delivered',
    application: application._id,
  });

  try {
    const { getIO } = await import('../../utils/socket');
    getIO().to(`user_${(application.user as any)._id}`).emit('notification', notif);
  } catch (err) {
    console.error('Socket emission failed', err);
  }

  try {
    await sendVisaDeliveredEmail(user.email, user.name, application.referenceId, url);
  } catch (err) { console.error(err); }

  sendSuccess(res, { url }, 'Visa uploaded and delivered');
};

export const manualPaymentOverride = async (req: AdminRequest, res: Response): Promise<void> => {
  const { adminNote } = req.body;

  const application = await Application.findById(req.params.id).populate('user', 'name email');
  if (!application) { sendError(res, 'Application not found', 404); return; }
  if (!['payment_pending', 'submitted'].includes(application.status)) {
    sendError(res, 'Application is not awaiting payment'); return;
  }

  const transactionId = `CASH-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

  await Payment.create({
    application: application._id,
    user: application.user,
    amount: application.paymentAmount,
    method: 'cash',
    status: 'completed',
    transactionId,
    markedByAdmin: true,
    adminNote: adminNote || 'Marked as paid by admin (cash)',
    paidAt: new Date(),
  });

  application.status = 'payment_completed';
  await application.save();

  const user = application.user as unknown as { name: string; email: string };
  const notif = await Notification.create({
    user: application.user,
    title: 'Payment Confirmed',
    message: `Your cash payment for application ${application.referenceId} has been confirmed by our team.`,
    type: 'status_update',
    application: application._id,
  });

  try {
    const { getIO } = await import('../../utils/socket');
    getIO().to(`user_${(application.user as any)._id}`).emit('notification', notif);
  } catch (err) {
    console.error('Socket emission failed', err);
  }

  try {
    await sendStatusUpdateEmail(user.email, user.name, 'Payment Confirmed (Cash)', application.referenceId);
  } catch (err) { console.error(err); }

  sendSuccess(res, application, 'Payment marked as paid (cash override)');
};

export const getAdminPayments = async (_req: AdminRequest, res: Response): Promise<void> => {
  const payments = await Payment.find({ status: 'completed' })
    .populate({ path: 'application', populate: [{ path: 'visaType', select: 'name' }, { path: 'country', select: 'name flag' }] })
    .populate('user', 'name email')
    .sort({ createdAt: -1 })
    .limit(200);
  sendSuccess(res, payments);
};

export const getUsers = async (req: AdminRequest, res: Response): Promise<void> => {
  const filter: Record<string, unknown> = {};
  if (req.query.accountType) filter.accountType = req.query.accountType;
  const users = await User.find(filter).sort({ createdAt: -1 });
  sendSuccess(res, users);
};

export const getUserApplications = async (req: AdminRequest, res: Response): Promise<void> => {
  const applications = await Application.find({ user: req.params.userId })
    .populate('visaType', 'name')
    .populate('country', 'name flag')
    .sort({ createdAt: -1 });
  sendSuccess(res, applications);
};

export const downloadApplicationDocumentsZip = async (req: AdminRequest, res: Response): Promise<void> => {
  const docs = await Document.find({ application: req.params.id });

  if (docs.length === 0) {
    sendError(res, 'No documents found for this application', 404);
    return;
  }

  const application = await Application.findById(req.params.id).populate('visaType', 'name');
  const appRef = (application as any)?.referenceId || req.params.id;

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="docs-${appRef}.zip"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

  const archive = archiver('zip', { zlib: { level: 6 } });
  const closePromise = new Promise<void>((resolve, reject) => {
    archive.on('close', resolve);
    archive.on('error', reject);
  });
  archive.pipe(res);

  for (const doc of docs) {
    try {
      const buffer = await fetchBuffer(doc.url);
      const urlPath = doc.url.split('?')[0];
      const ext = urlPath.split('.').pop() || 'bin';
      const safeName = doc.requirementName.replace(/[^a-zA-Z0-9\-_]/g, '_');
      archive.append(buffer, { name: `${safeName}.${ext}` });
    } catch (err) {
      console.error(`Skipping doc ${doc._id}:`, err);
    }
  }

  archive.finalize();
  await closePromise;
};
