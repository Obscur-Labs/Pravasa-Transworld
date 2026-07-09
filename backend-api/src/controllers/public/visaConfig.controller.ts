import { Request, Response } from 'express';
import VisaConfigOption from '../../models/VisaConfigOption';
import { sendSuccess } from '../../utils/response';

// Public, read-only: only active options, and only the fields needed to render labels
// on the website (no order/timestamps/etc).
export const getPublicVisaConfig = async (_req: Request, res: Response): Promise<void> => {
  const options = await VisaConfigOption.find({ isActive: true })
    .select('category value label')
    .sort({ category: 1, order: 1 });
  sendSuccess(res, options);
};
