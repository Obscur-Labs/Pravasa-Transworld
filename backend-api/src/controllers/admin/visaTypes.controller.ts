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
  const {
    country, name, description, adultPrice, childPrice, corporateAdultPrice, corporateChildPrice,
    processingTime, formFields, documentRequirements, entry, visaSubType, stayDuration,
    jurisdiction, visaCategory, process, validity,
  } = req.body;
  if (!country || !name || adultPrice === undefined || !processingTime) {
    sendError(res, 'Country, name, adult price, and processingTime are required');
    return;
  }
  // `price` / `corporatePrice` mirror the per-adult rate for backward compatibility (listing "from" price).
  const price = Number(adultPrice);
  const corporatePrice = corporateAdultPrice !== undefined && corporateAdultPrice !== '' ? Number(corporateAdultPrice) : undefined;
  const visaType = await VisaType.create({
    country, name, description,
    price,
    adultPrice: Number(adultPrice),
    childPrice: Number(childPrice || 0),
    corporateAdultPrice: corporatePrice,
    corporateChildPrice: corporateChildPrice !== undefined && corporateChildPrice !== '' ? Number(corporateChildPrice) : undefined,
    corporatePrice,
    processingTime, formFields, documentRequirements, entry, visaSubType, stayDuration,
    jurisdiction, visaCategory, process, validity,
  });
  const populated = await VisaType.findById(visaType._id).populate('country', 'name flag');
  sendSuccess(res, populated, 'Visa type created', 201);
};

export const updateVisaType = async (req: AdminRequest, res: Response): Promise<void> => {
  const body = { ...req.body };
  // Keep legacy `price` / `corporatePrice` mirrored to the per-adult rates.
  if (body.adultPrice !== undefined) {
    body.adultPrice = Number(body.adultPrice);
    body.price = body.adultPrice;
  }
  if (body.childPrice !== undefined) body.childPrice = Number(body.childPrice);
  if (body.corporateAdultPrice !== undefined) {
    body.corporateAdultPrice = body.corporateAdultPrice === '' ? undefined : Number(body.corporateAdultPrice);
    body.corporatePrice = body.corporateAdultPrice;
  }
  if (body.corporateChildPrice !== undefined) {
    body.corporateChildPrice = body.corporateChildPrice === '' ? undefined : Number(body.corporateChildPrice);
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
