import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import PromoCode from '../../models/PromoCode';
import { sendSuccess, sendError } from '../../utils/response';

export const validatePromoCode = async (req: AuthRequest, res: Response): Promise<void> => {
  const { code, orderAmount } = req.body;
  const user = req.user!;

  if (user.promoApplicable === false) {
    sendError(res, 'Promo codes are not applicable to your account', 403);
    return;
  }

  if (!code) { sendError(res, 'Promo code is required', 400); return; }

  const promo = await PromoCode.findOne({ code: String(code).toUpperCase(), isDeleted: false });
  if (!promo) { sendError(res, 'Invalid promo code', 404); return; }
  if (!promo.isActive) { sendError(res, 'This promo code is no longer active', 400); return; }
  if (promo.expiresAt && new Date() > promo.expiresAt) { sendError(res, 'This promo code has expired', 400); return; }
  if (promo.usageLimit !== undefined && promo.usageCount >= promo.usageLimit) {
    sendError(res, 'This promo code has reached its usage limit', 400);
    return;
  }

  const baseAmount = Number(orderAmount) || 0;
  let discount = 0;
  if (promo.discountType === 'percentage') {
    discount = Math.round((baseAmount * promo.discountValue) / 100);
  } else {
    discount = Math.min(promo.discountValue, baseAmount);
  }
  const finalAmount = Math.max(0, baseAmount - discount);

  sendSuccess(res, {
    valid: true,
    promoId: promo._id,
    code: promo.code,
    description: promo.description,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discount,
    finalAmount,
  });
};
