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

export interface Country {
  _id: string;
  name: string;
  flag: string;
  description: string;
}

export type EntryType = 'single' | 'multiple' | 'double';
export type VisaSubType = 'e-visa' | 'sticker';
export type JurisdictionType = 'pan-india' | 'mumbai' | 'delhi';
export type VisaCategoryType = 'tourist' | 'business' | 'transit' | 'student';

export interface VisaType {
  _id: string;
  country: Country;
  name: string;
  description: string;
  price: number;
  visaCharges: number;
  serviceFee: number;
  corporatePrice?: number;
  processingTime: string;
  validity?: string;
  entry: EntryType[];
  visaSubType: VisaSubType;
  stayDuration: string;
  jurisdiction: JurisdictionType;
  visaCategory: VisaCategoryType;
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

export interface FormField {
  _id: string;
  label: string;
  fieldName: string;
  type: 'text' | 'number' | 'email' | 'date' | 'select' | 'radio' | 'textarea' | 'file';
  required: boolean;
  options: string[];
  placeholder: string;
  order: number;
}

export interface DocumentRequirement {
  _id: string;
  name: string;
  description: string;
  required: boolean;
}

export interface Application {
  _id: string;
  visaType: VisaType;
  country: Country;
  status: ApplicationStatus;
  formResponses: Record<string, string>;
  rejectionReason: string;
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
