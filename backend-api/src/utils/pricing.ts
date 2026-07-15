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
  | 'corporateAdultPrice' | 'corporateAdultVfsFee' | 'corporateAdultServiceFee'
  | 'corporateChildPrice' | 'corporateChildVfsFee' | 'corporateChildServiceFee'
>;

// Per-traveler pricing = visa fee + VFS fee + service fee. Falls back to legacy single
// price for older visa types. Corporate accounts use the corporate override fields when
// the admin has set them (service fee is the optional component — often waived for corporate).
export function computeVisaPricing(visaType: PricingFields, isCorporate: boolean): PriceBreakdown {
  const useCorpAdult = isCorporate && (visaType.corporateAdultPrice != null || visaType.corporateAdultVfsFee != null || visaType.corporateAdultServiceFee != null);
  const useCorpChild = isCorporate && (visaType.corporateChildPrice != null || visaType.corporateChildVfsFee != null || visaType.corporateChildServiceFee != null);
  return {
    adultBase: useCorpAdult && visaType.corporateAdultPrice != null ? visaType.corporateAdultPrice : (visaType.adultPrice || visaType.price || 0),
    adultVfs: useCorpAdult && visaType.corporateAdultVfsFee != null ? visaType.corporateAdultVfsFee : (visaType.adultVfsFee || 0),
    adultFee: useCorpAdult && visaType.corporateAdultServiceFee != null ? visaType.corporateAdultServiceFee : (visaType.adultServiceFee || 0),
    childBase: useCorpChild && visaType.corporateChildPrice != null ? visaType.corporateChildPrice : (visaType.childPrice || 0),
    childVfs: useCorpChild && visaType.corporateChildVfsFee != null ? visaType.corporateChildVfsFee : (visaType.childVfsFee || 0),
    childFee: useCorpChild && visaType.corporateChildServiceFee != null ? visaType.corporateChildServiceFee : (visaType.childServiceFee || 0),
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
