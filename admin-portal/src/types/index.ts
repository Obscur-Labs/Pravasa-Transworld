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

export const ALL_STATUSES: ApplicationStatus[] = [
  'submitted', 'documents_under_review', 'documents_approved', 'payment_pending',
  'payment_completed', 'visa_processing', 'embassy_review', 'visa_approved',
  'visa_rejected', 'visa_delivered',
];

export type FieldType = 'text' | 'number' | 'email' | 'date' | 'select' | 'radio' | 'textarea' | 'file';

export interface FormField {
  _id?: string;
  label: string;
  fieldName: string;
  type: FieldType;
  required: boolean;
  options: string[];
  placeholder: string;
  order: number;
  childOnly?: boolean;
}

export interface DocumentRequirement {
  _id?: string;
  name: string;
  description: string;
  required: boolean;
  childOnly?: boolean;
}

export interface Country {
  _id: string;
  name: string;
  flag: string;
  description: string;
  isActive: boolean;
}

export type EntryType = 'single' | 'multiple' | 'double';
export type VisaSubType = 'e-visa' | 'sticker';
export type JurisdictionType = 'pan-india' | 'mumbai' | 'delhi';
export type VisaCategoryType = 'tourist' | 'business' | 'transit' | 'student';
export type ProcessType = 'normal' | 'express';

export interface VisaType {
  _id: string;
  country: Country;
  name: string;
  description: string;
  price: number;
  visaCharges: number;
  serviceFee: number;
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
  validity: string;
  entry: EntryType[];
  visaSubType: VisaSubType;
  stayDuration: string;
  jurisdiction: JurisdictionType;
  visaCategory: VisaCategoryType;
  process: ProcessType;
  formFields: FormField[];
  documentRequirements: DocumentRequirement[];
  isActive: boolean;
}

export interface FormPreset {
  _id: string;
  name: string;
  description: string;
  formFields: FormField[];
  documentRequirements: DocumentRequirement[];
  createdAt: string;
  updatedAt: string;
}

export interface VaultDocument {
  _id: string;
  type: string;
  label: string;
  url: string;
  publicId: string;
  createdAt: string;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  accountType: 'individual' | 'corporate';
  gstNumber?: string;
  isActive: boolean;
  createdAt: string;
}

export interface Application {
  _id: string;
  user: User;
  visaType: VisaType;
  country: Country;
  status: ApplicationStatus;
  formResponses: Record<string, string>;
  adults: number;
  children: number;
  travelDate: string;
  travelEndDate?: string;
  rejectionReason: string;
  adminNotes: string;
  processingReferenceNumber?: string;
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
  reviewedAt: string | null;
  createdAt: string;
}

export interface VisaFile {
  _id: string;
  url: string;
}

export type TrashEntityType = 'country' | 'visaType' | 'formPreset' | 'contactLead' | 'application';

export interface TrashItem {
  _id: string;
  entityType: TrashEntityType;
  entityLabel: string;
  label: string;
  sublabel: string;
  originalId: string;
  deletedAt: string;
}

export interface ContactLead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  read: boolean;
  createdAt: string;
}
