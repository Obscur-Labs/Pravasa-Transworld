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
}

export interface DocumentRequirement {
  _id?: string;
  name: string;
  description: string;
  required: boolean;
}

export interface Country {
  _id: string;
  name: string;
  flag: string;
  description: string;
  isActive: boolean;
}

export interface VisaType {
  _id: string;
  country: Country;
  name: string;
  description: string;
  price: number;
  processingDays: number;
  formFields: FormField[];
  documentRequirements: DocumentRequirement[];
  isActive: boolean;
}

export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
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
  rejectionReason: string;
  adminNotes: string;
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

export interface ContactLead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  read: boolean;
  createdAt: string;
}
