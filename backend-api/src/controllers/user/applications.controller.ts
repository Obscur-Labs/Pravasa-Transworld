import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import Application from '../../models/Application';
import Document from '../../models/Document';
import VisaFile from '../../models/VisaFile';
import VisaType from '../../models/VisaType';
import Country from '../../models/Country';
import { uploadToCloudinary } from '../../services/cloudinary.service';
import { sendSuccess, sendError } from '../../utils/response';

export const getDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
  const userId = req.user!._id;
  const [active, pending, approved, rejected, total] = await Promise.all([
    Application.countDocuments({ user: userId, status: { $in: ['visa_processing', 'embassy_review', 'payment_completed'] } }),
    Application.countDocuments({ user: userId, status: { $in: ['submitted', 'documents_under_review', 'payment_pending'] } }),
    Application.countDocuments({ user: userId, status: { $in: ['visa_approved', 'visa_delivered'] } }),
    Application.countDocuments({ user: userId, status: 'visa_rejected' }),
    Application.countDocuments({ user: userId }),
  ]);

  const recent = await Application.find({ user: userId })
    .populate('visaType', 'name price')
    .populate('country', 'name flag')
    .sort({ createdAt: -1 })
    .limit(5);

  sendSuccess(res, { stats: { active, pending, approved, rejected, total }, recent });
};

export const getApplications = async (req: AuthRequest, res: Response): Promise<void> => {
  const applications = await Application.find({ user: req.user!._id })
    .populate('visaType', 'name price processingDays')
    .populate('country', 'name flag')
    .sort({ createdAt: -1 });
  sendSuccess(res, applications);
};

export const createApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  const { visaTypeId, formResponses } = req.body;
  if (!visaTypeId) { sendError(res, 'Visa type is required'); return; }

  const visaType = await VisaType.findById(visaTypeId);
  if (!visaType || !visaType.isActive) { sendError(res, 'Visa type not found', 404); return; }

  const application = await Application.create({
    user: req.user!._id,
    visaType: visaType._id,
    country: visaType.country,
    status: 'submitted',
    formResponses: formResponses || {},
    paymentAmount: visaType.price,
  });

  const populated = await Application.findById(application._id)
    .populate('visaType', 'name price processingDays')
    .populate('country', 'name flag');

  const AdminNotification = (await import('../../models/AdminNotification')).default;
  const { getIO } = await import('../../utils/socket');
  
  const notif = await AdminNotification.create({
    title: 'New Application Submitted',
    message: `A new application (${application.referenceId}) was submitted for ${visaType.name}.`,
    type: 'new_application',
    application: application._id,
  });

  try {
    getIO().to('admin_room').emit('admin_notification', notif);
  } catch (err) {
    console.error('Socket emission failed', err);
  }

  sendSuccess(res, populated, 'Application submitted successfully', 201);
};

export const getApplication = async (req: AuthRequest, res: Response): Promise<void> => {
  const application = await Application.findOne({ _id: req.params.id, user: req.user!._id })
    .populate('visaType')
    .populate('country');
  if (!application) { sendError(res, 'Application not found', 404); return; }

  const documents = await Document.find({ application: application._id });
  const visaFile = await VisaFile.findOne({ application: application._id });
  sendSuccess(res, { application, documents, visaFile });
};

export const uploadDocument = async (req: AuthRequest, res: Response): Promise<void> => {
  if (!req.file) { sendError(res, 'File is required'); return; }
  const { requirementName } = req.body;
  if (!requirementName) { sendError(res, 'requirementName is required'); return; }

  const application = await Application.findOne({ _id: req.params.id, user: req.user!._id });
  if (!application) { sendError(res, 'Application not found', 404); return; }

  if (!['submitted', 'documents_under_review', 'documents_approved'].includes(application.status)) {
    sendError(res, 'Cannot upload documents at this stage'); return;
  }

  const { url, publicId } = await uploadToCloudinary(req.file.buffer, 'visa-documents');

  const existing = await Document.findOne({ application: application._id, requirementName });
  let doc;
  if (existing) {
    existing.url = url;
    existing.publicId = publicId;
    existing.status = 'pending';
    existing.rejectionReason = '';
    existing.reviewedAt = null;
    doc = await existing.save();
  } else {
    doc = await Document.create({ application: application._id, requirementName, url, publicId });
  }

  if (application.status === 'submitted') {
    application.status = 'documents_under_review';
    await application.save();
  }

  sendSuccess(res, doc, 'Document uploaded');
};

export const makePayment = async (req: AuthRequest, res: Response): Promise<void> => {
  const application = await Application.findOne({ _id: req.params.id, user: req.user!._id });
  if (!application) { sendError(res, 'Application not found', 404); return; }

  if (application.status !== 'payment_pending') {
    sendError(res, 'Payment is not currently required for this application'); return;
  }

  // Simulate payment — in production integrate Stripe/Razorpay here
  application.status = 'payment_completed';
  await application.save();

  sendSuccess(res, application, 'Payment completed successfully');
};

export const getPublicCountries = async (_req: AuthRequest, res: Response): Promise<void> => {
  const countries = await Country.find({ isActive: true }).sort({ name: 1 });
  sendSuccess(res, countries);
};

export const getPublicVisaTypes = async (req: AuthRequest, res: Response): Promise<void> => {
  const filter: Record<string, unknown> = { isActive: true };
  if (req.query.country) filter.country = req.query.country;
  const visaTypes = await VisaType.find(filter).populate('country', 'name flag').sort({ name: 1 });
  sendSuccess(res, visaTypes);
};
