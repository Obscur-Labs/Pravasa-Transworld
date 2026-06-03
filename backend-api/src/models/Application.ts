import mongoose, { Document, Schema } from 'mongoose';
import { encryptionPlugin } from '../plugins/encryptionPlugin';
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

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'submitted',
  'documents_under_review',
  'documents_approved',
  'payment_pending',
  'payment_completed',
  'visa_processing',
  'embassy_review',
  'visa_approved',
  'visa_rejected',
  'visa_delivered',
];

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

export interface IApplication extends Document {
  user: mongoose.Types.ObjectId;
  visaType: mongoose.Types.ObjectId;
  country: mongoose.Types.ObjectId;
  status: ApplicationStatus;
  formResponses: Map<string, string>;
  rejectionReason: string;
  adminNotes: string;
  paymentAmount: number;
  referenceId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ApplicationSchema = new Schema<IApplication>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    visaType: { type: Schema.Types.ObjectId, ref: 'VisaType', required: true },
    country: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    status: {
      type: String,
      enum: APPLICATION_STATUSES,
      default: 'submitted',
    },
    formResponses: { type: Map, of: String, default: {} },
    rejectionReason: { type: String, default: '' },
    adminNotes: { type: String, default: '' },
    paymentAmount: { type: Number, default: 0 },
    referenceId: { type: String, unique: true },
  },
  { timestamps: true }
);

ApplicationSchema.plugin(encryptionPlugin, { fields: ['formResponses'] });

ApplicationSchema.pre('save', function (next) {
  if (!this.referenceId) {
    this.referenceId = `VF-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  }
  next();
});

export default mongoose.model<IApplication>('Application', ApplicationSchema);
