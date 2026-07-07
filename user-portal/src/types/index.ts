export type ApplicationStatus =
  | 'submitted'
  | 'documents_under_review'
  | 'documents_approved'
  | 'payment_pending'
  | 'payment_completed'
  | 'visa_processing'
  | 'embassy_review'
  | 'visa_approved'
  | 'visa_rejected'
  | 'visa_delivered';

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Application Submitted',
  documents_under_review: 'Documents Under Review',
  documents_approved: 'Documents Approved',
  payment_pending: 'Payment Pending',
  payment_completed: 'Payment Completed',
  visa_processing: 'Visa Processing',
  embassy_review: 'Embassy Review',
  visa_approved: 'Visa Approved',
  visa_rejected: 'Visa Rejected',
  visa_delivered: 'Visa Delivered',
};

export interface CountryFaq {
  question: string;
  answer: string;
}

export interface CountryWebContent {
  heroTagline?: string;
  overview?: string;
  highlights?: string[];
  requirements?: string;
  processingInfo?: string;
  tips?: string;
  faqs?: CountryFaq[];
}

export interface Country {
  _id: string;
  name: string;
  flag: string;
  description: string;
  slug?: string;
  showOnWebsite?: boolean;
  images?: string[];
  webContent?: CountryWebContent;
}

// Widened to plain string — these value sets are admin-configurable on the Visa Config page.
export type EntryType = string;
export type VisaSubType = string;
export type JurisdictionType = string;
export type VisaCategoryType = string;
export type ProcessType = 'normal' | 'express';

export interface VisaType {
  _id: string;
  country: Country;
  name: string;
  description: string;
  price: number;
  corporatePrice?: number;
  adultPrice: number;
  childPrice: number;
  adultServiceFee: number;
  childServiceFee: number;
  corporateAdultPrice?: number;
  corporateChildPrice?: number;
  corporateAdultServiceFee?: number;
  corporateChildServiceFee?: number;
  processingTime: string;
  validity?: string;
  entry: EntryType[];
  visaSubType: VisaSubType;
  stayDuration: string;
  jurisdiction: JurisdictionType;
  visaCategory: VisaCategoryType;
  process: ProcessType;
  formFields: FormField[];
  documentRequirements: DocumentRequirement[];
}

export interface VaultDocument {
  _id: string;
  type: string;
  label: string;
  url: string;
  publicId: string;
  createdAt: string;
}

export type ApplicantType = 'adult' | 'child' | 'both';

export interface FormField {
  _id: string;
  label: string;
  fieldName: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'radio' | 'textarea' | 'file';
  required: boolean;
  options: string[];
  placeholder: string;
  order: number;
  applicantType?: ApplicantType;
}

export interface DocumentRequirement {
  _id: string;
  name: string;
  description: string;
  required: boolean;
  applicantType?: ApplicantType;
  docType?: string;
  ocrEnabled?: boolean;
}

export interface Application {
  _id: string;
  visaType: VisaType;
  country: Country;
  status: ApplicationStatus;
  formResponses: Record<string, string>;
  adults: number;
  children: number;
  travelDate: string;
  rejectionReason: string;
  processingReferenceNumber?: string;
  embassyName?: string;
  submissionDate?: string;
  paymentAmount: number;
  referenceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Document {
  _id: string;
  requirementName: string;
  url: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string;
  docType?: string;
  extractedData?: Record<string, string>;
}

export interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface VisaFile {
  _id: string;
  url: string;
}

export interface PromoCode {
  _id: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  showOnWebsite: boolean;
}
