import { Response } from 'express';
import { AdminRequest } from '../../middleware/adminAuth.middleware';
import Country from '../../models/Country';
import { sendSuccess, sendError } from '../../utils/response';

export const getCountries = async (_req: AdminRequest, res: Response): Promise<void> => {
  const countries = await Country.find().sort({ name: 1 });
  sendSuccess(res, countries);
};

export const createCountry = async (req: AdminRequest, res: Response): Promise<void> => {
  const { name, flag, description } = req.body;
  if (!name || !flag) {
    sendError(res, 'Name and flag are required');
    return;
  }
  const country = await Country.create({ name, flag, description });
  sendSuccess(res, country, 'Country created', 201);
};

export const updateCountry = async (req: AdminRequest, res: Response): Promise<void> => {
  const country = await Country.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!country) { sendError(res, 'Country not found', 404); return; }
  sendSuccess(res, country, 'Country updated');
};

export const deleteCountry = async (req: AdminRequest, res: Response): Promise<void> => {
  const country = await Country.findByIdAndDelete(req.params.id);
  if (!country) { sendError(res, 'Country not found', 404); return; }
  sendSuccess(res, null, 'Country deleted');
};

export const toggleCountryStatus = async (req: AdminRequest, res: Response): Promise<void> => {
  const country = await Country.findById(req.params.id);
  if (!country) { sendError(res, 'Country not found', 404); return; }
  country.isActive = !country.isActive;
  await country.save();
  sendSuccess(res, country, `Country ${country.isActive ? 'activated' : 'deactivated'}`);
};
