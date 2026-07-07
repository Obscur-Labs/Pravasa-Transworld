import { Response } from 'express';
import { AdminRequest } from '../../middleware/adminAuth.middleware';
import VisaType from '../../models/VisaType';
import { sendSuccess, sendError } from '../../utils/response';
import { moveToTrash } from '../../utils/trash';
import { logActivity } from '../../utils/activityLog';

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

const optNum = (v: unknown): number | undefined =>
  v === undefined || v === null || v === '' ? undefined : Number(v);

export const createVisaType = async (req: AdminRequest, res: Response): Promise<void> => {
  const {
    country, name, description, adultPrice, childPrice, adultServiceFee, childServiceFee,
    corporateAdultPrice, corporateChildPrice, corporateAdultServiceFee, corporateChildServiceFee,
    processingTime, formFields, documentRequirements, entry, visaSubType, stayDuration,
    jurisdiction, visaCategory, process, validity,
  } = req.body;
  if (!country || !name || adultPrice === undefined || !processingTime) {
    sendError(res, 'Country, name, adult price, and processingTime are required');
    return;
  }
  const corporateAdult = optNum(corporateAdultPrice);
  // `price` / `corporatePrice` mirror the per-adult base rate for backward compatibility (listing "from" price).
  const price = Number(adultPrice);
  const visaType = await VisaType.create({
    country, name, description,
    price,
    adultPrice: Number(adultPrice),
    childPrice: Number(childPrice || 0),
    adultServiceFee: Number(adultServiceFee || 0),
    childServiceFee: Number(childServiceFee || 0),
    corporateAdultPrice: corporateAdult,
    corporateChildPrice: optNum(corporateChildPrice),
    corporateAdultServiceFee: optNum(corporateAdultServiceFee),
    corporateChildServiceFee: optNum(corporateChildServiceFee),
    corporatePrice: corporateAdult,
    processingTime, formFields, documentRequirements, entry, visaSubType, stayDuration,
    jurisdiction, visaCategory, process, validity,
  });
  const populated = await VisaType.findById(visaType._id).populate('country', 'name flag');
  logActivity(req, 'create', 'Visa Type', name);
  sendSuccess(res, populated, 'Visa type created', 201);
};

export const updateVisaType = async (req: AdminRequest, res: Response): Promise<void> => {
  const body = { ...req.body };
  // Keep legacy `price` / `corporatePrice` mirrored to the per-adult base rates.
  if (body.adultPrice !== undefined) {
    body.adultPrice = Number(body.adultPrice);
    body.price = body.adultPrice;
  }
  if (body.childPrice !== undefined) body.childPrice = Number(body.childPrice);
  if (body.adultServiceFee !== undefined) body.adultServiceFee = Number(body.adultServiceFee || 0);
  if (body.childServiceFee !== undefined) body.childServiceFee = Number(body.childServiceFee || 0);
  if (body.corporateAdultPrice !== undefined) {
    body.corporateAdultPrice = optNum(body.corporateAdultPrice);
    body.corporatePrice = body.corporateAdultPrice;
  }
  if (body.corporateChildPrice !== undefined) body.corporateChildPrice = optNum(body.corporateChildPrice);
  if (body.corporateAdultServiceFee !== undefined) body.corporateAdultServiceFee = optNum(body.corporateAdultServiceFee);
  if (body.corporateChildServiceFee !== undefined) body.corporateChildServiceFee = optNum(body.corporateChildServiceFee);
  const visaType = await VisaType.findByIdAndUpdate(req.params.id, body, { new: true, runValidators: true })
    .populate('country', 'name flag');
  if (!visaType) { sendError(res, 'Visa type not found', 404); return; }
  logActivity(req, 'update', 'Visa Type', visaType.name);
  sendSuccess(res, visaType, 'Visa type updated');
};

export const deleteVisaType = async (req: AdminRequest, res: Response): Promise<void> => {
  const visaType = await VisaType.findById(req.params.id);
  if (!visaType) { sendError(res, 'Visa type not found', 404); return; }
  await moveToTrash('visaType', visaType);
  logActivity(req, 'delete', 'Visa Type', visaType.name);
  sendSuccess(res, null, 'Visa type moved to trash');
};

export const toggleVisaTypeStatus = async (req: AdminRequest, res: Response): Promise<void> => {
  const visaType = await VisaType.findById(req.params.id).populate('country', 'name flag');
  if (!visaType) { sendError(res, 'Visa type not found', 404); return; }
  visaType.isActive = !visaType.isActive;
  await visaType.save();
  sendSuccess(res, visaType, `Visa type ${visaType.isActive ? 'activated' : 'deactivated'}`);
};
