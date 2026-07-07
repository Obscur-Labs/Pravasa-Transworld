import { IVisaType } from '../models/VisaType';

export interface PriceBreakdown {
  adultBase: number;
  adultFee: number;
  childBase: number;
  childFee: number;
}

type PricingFields = Pick<
  IVisaType,
  | 'adultPrice' | 'price' | 'adultServiceFee'
  | 'childPrice' | 'childServiceFee'
  | 'corporateAdultPrice' | 'corporateAdultServiceFee'
  | 'corporateChildPrice' | 'corporateChildServiceFee'
>;

// Per-traveler pricing = base price + service fee. Falls back to legacy single price for older visa types.
// Corporate accounts use the corporate override fields when the admin has set them.
export function computeVisaPricing(visaType: PricingFields, isCorporate: boolean): PriceBreakdown {
  const useCorpAdult = isCorporate && (visaType.corporateAdultPrice != null || visaType.corporateAdultServiceFee != null);
  const useCorpChild = isCorporate && (visaType.corporateChildPrice != null || visaType.corporateChildServiceFee != null);
  return {
    adultBase: useCorpAdult && visaType.corporateAdultPrice != null ? visaType.corporateAdultPrice : (visaType.adultPrice || visaType.price || 0),
    adultFee: useCorpAdult && visaType.corporateAdultServiceFee != null ? visaType.corporateAdultServiceFee : (visaType.adultServiceFee || 0),
    childBase: useCorpChild && visaType.corporateChildPrice != null ? visaType.corporateChildPrice : (visaType.childPrice || 0),
    childFee: useCorpChild && visaType.corporateChildServiceFee != null ? visaType.corporateChildServiceFee : (visaType.childServiceFee || 0),
  };
}

export function computePaymentAmount(breakdown: PriceBreakdown, numAdults: number, numChildren: number): number {
  return numAdults * (breakdown.adultBase + breakdown.adultFee) + numChildren * (breakdown.childBase + breakdown.childFee);
}
