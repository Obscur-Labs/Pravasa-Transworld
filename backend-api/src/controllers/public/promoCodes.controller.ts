import { Request, Response } from 'express';
import PromoCode from '../../models/PromoCode';
import { sendSuccess } from '../../utils/response';

export const getWebsitePromos = async (req: Request, res: Response): Promise<void> => {
  const now = new Date();
  const promos = await PromoCode.find({
    isDeleted: false,
    isActive: true,
    showOnWebsite: true,
    $or: [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: now } }],
  }).select('code description discountType discountValue').sort({ createdAt: -1 });
  sendSuccess(res, promos);
};
