import { Response } from 'express';
import { AdminRequest } from '../../middleware/adminAuth.middleware';
import VisaType from '../../models/VisaType';
import { sendSuccess, sendError } from '../../utils/response';

export const getVisaTypes = async (req: AdminRequest, res: Response): Promise<void> => {
  const filter = req.query.country ? { country: req.query.country } : {};
  const visaTypes = await VisaType.find(filter).populate('country', 'name flag').sort({ name: 1 });
  sendSuccess(res, visaTypes);
};

export const getVisaType = async (req: AdminRequest, res: Response): Promise<void> => {
  const visaType = await VisaType.findById(req.params.id).populate('country', 'name flag');
  if (!visaType) { sendError(res, 'Visa type not found', 404); return; }
  sendSuccess(res, visaType);
};

export const createVisaType = async (req: AdminRequest, res: Response): Promise<void> => {
  const { country, name, description, visaCharges, serviceFee, processingTime, formFields, documentRequirements, entry, visaSubType, stayDuration, jurisdiction, visaCategory, validity } = req.body;
  if (!country || !name || visaCharges === undefined || !processingTime) {
    sendError(res, 'Country, name, visaCharges, and processingTime are required');
    return;
  }
  const price = Number(visaCharges) + Number(serviceFee || 0);
  const visaType = await VisaType.create({ country, name, description, price, visaCharges: Number(visaCharges), serviceFee: Number(serviceFee || 0), processingTime, formFields, documentRequirements, entry, visaSubType, stayDuration, jurisdiction, visaCategory, validity });
  const populated = await VisaType.findById(visaType._id).populate('country', 'name flag');
  sendSuccess(res, populated, 'Visa type created', 201);
};

export const updateVisaType = async (req: AdminRequest, res: Response): Promise<void> => {
  const body = { ...req.body };
  if (body.visaCharges !== undefined || body.serviceFee !== undefined) {
    const existing = await VisaType.findById(req.params.id);
    const charges = body.visaCharges !== undefined ? Number(body.visaCharges) : (existing?.visaCharges || 0);
    const fee = body.serviceFee !== undefined ? Number(body.serviceFee) : (existing?.serviceFee || 0);
    body.price = charges + fee;
    body.visaCharges = charges;
    body.serviceFee = fee;
  }
  const visaType = await VisaType.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true })
    .populate('country', 'name flag');
  if (!visaType) { sendError(res, 'Visa type not found', 404); return; }
  sendSuccess(res, visaType, 'Visa type updated');
};

export const deleteVisaType = async (req: AdminRequest, res: Response): Promise<void> => {
  const visaType = await VisaType.findByIdAndDelete(req.params.id);
  if (!visaType) { sendError(res, 'Visa type not found', 404); return; }
  sendSuccess(res, null, 'Visa type deleted');
};

export const updateCorporatePrice = async (req: AdminRequest, res: Response): Promise<void> => {
  const { corporatePrice } = req.body;
  if (corporatePrice === undefined || corporatePrice === null) {
    sendError(res, 'corporatePrice is required');
    return;
  }
  const visaType = await VisaType.findByIdAndUpdate(
    req.params.id,
    { corporatePrice: corporatePrice === '' ? undefined : Number(corporatePrice) },
    { new: true, runValidators: true }
  ).populate('country', 'name flag');
  if (!visaType) { sendError(res, 'Visa type not found', 404); return; }
  sendSuccess(res, visaType, 'Corporate price updated');
};

export const toggleVisaTypeStatus = async (req: AdminRequest, res: Response): Promise<void> => {
  const visaType = await VisaType.findById(req.params.id).populate('country', 'name flag');
  if (!visaType) { sendError(res, 'Visa type not found', 404); return; }
  visaType.isActive = !visaType.isActive;
  await visaType.save();
  sendSuccess(res, visaType, `Visa type ${visaType.isActive ? 'activated' : 'deactivated'}`);
};
