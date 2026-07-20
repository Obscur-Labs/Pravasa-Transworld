import { IVisaType } from '../models/VisaType';

// GST is a fixed 18% applied on top of every fee component (visa + VFS + service).
export const GST_RATE = 0.18;

export interface PriceBreakdown {
  adultBase: number;   // visa fee per adult
  adultVfs: number;    // VFS fee per adult
  adultFee: number;    // service fee per adult (optional component)
  childBase: number;
  childVfs: number;
  childFee: number;
}

type PricingFields = Pick<
  IVisaType,
  | 'adultPrice' | 'price' | 'adultVfsFee' | 'adultServiceFee'
  | 'childPrice' | 'childVfsFee' | 'childServiceFee'
  | 'corporateAdultServiceFee' | 'corporateChildServiceFee'
>;

// Per-traveler pricing = visa fee + VFS fee + service fee. Falls back to legacy single
// price for older visa types.
//
// The visa fee and VFS fee are pass-through government/VFS charges — identical for
// individual and corporate accounts. Only the service fee (our own margin) varies by
// account type, so it is the sole corporate override. A corporate service fee of 0
// explicitly waives it; leaving it unset charges the standard service fee.
export function computeVisaPricing(visaType: PricingFields, isCorporate: boolean): PriceBreakdown {
  const serviceFee = (corp: number | undefined, std: number | undefined) =>
    (isCorporate && corp != null ? corp : std) || 0;
  return {
    adultBase: visaType.adultPrice || visaType.price || 0,
    adultVfs: visaType.adultVfsFee || 0,
    adultFee: serviceFee(visaType.corporateAdultServiceFee, visaType.adultServiceFee),
    childBase: visaType.childPrice || 0,
    childVfs: visaType.childVfsFee || 0,
    childFee: serviceFee(visaType.corporateChildServiceFee, visaType.childServiceFee),
  };
}

// Pre-GST order subtotal across all travelers.
export function computeSubtotal(breakdown: PriceBreakdown, numAdults: number, numChildren: number): number {
  return (
    numAdults * (breakdown.adultBase + breakdown.adultVfs + breakdown.adultFee) +
    numChildren * (breakdown.childBase + breakdown.childVfs + breakdown.childFee)
  );
}

export function computeGst(subtotal: number): number {
  return Math.round(subtotal * GST_RATE);
}

// Final payable amount: subtotal + 18% GST.
export function computePaymentAmount(breakdown: PriceBreakdown, numAdults: number, numChildren: number): number {
  const subtotal = computeSubtotal(breakdown, numAdults, numChildren);
  return subtotal + computeGst(subtotal);
}
