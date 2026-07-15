import mongoose, { Document, Schema } from 'mongoose';

export type FieldType = 'text' | 'number' | 'email' | 'date' | 'select' | 'radio' | 'textarea' | 'file';
export type ApplicantType = 'adult' | 'child' | 'both';

export interface IFormField {
  _id?: mongoose.Types.ObjectId;
  label: string;
  fieldName: string;
  type: FieldType;
  required: boolean;
  options: string[];
  placeholder: string;
  order: number;
  applicantType: ApplicantType;
}

// docType: a saved document kind ('custom' for a free-form name). Passport kinds
// trigger automatic OCR data extraction when the applicant uploads the image.
export type DocumentType =
  | 'custom'
  | 'passport'
  | 'passport_front'
  | 'passport_back'
  | 'page'
  | 'photo'
  | 'aadhaar'
  | 'pan';

export interface IDocumentRequirement {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description: string;
  required: boolean;
  applicantType: ApplicantType;
  docType: DocumentType;
  ocrEnabled: boolean;
}

// Widened to plain string — these value sets are now admin-configurable via VisaConfigOption
// (see visaConfig.controller.ts), not fixed at build time.
export type EntryType = string;
export type VisaSubType = string;
export type JurisdictionType = string;
export type VisaCategoryType = string;
export type ProcessType = 'normal' | 'express';

export interface IVisaType extends Document {
  country: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  corporatePrice?: number;
  // Per-traveler pricing: visa fee (base) + VFS fee + service fee, GST (18%) applied on top.
  // Visa and VFS fees are mandatory components; service fee is optional (often waived for corporate).
  adultPrice: number;
  childPrice: number;
  adultVfsFee: number;
  childVfsFee: number;
  adultServiceFee: number;
  childServiceFee: number;
  corporateAdultPrice?: number;
  corporateChildPrice?: number;
  corporateAdultVfsFee?: number;
  corporateChildVfsFee?: number;
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
  formFields: IFormField[];
  documentRequirements: IDocumentRequirement[];
  additionalNotes: string;
  isActive: boolean;
}

const FormFieldSchema = new Schema<IFormField>({
  label: { type: String, required: true },
  fieldName: { type: String, required: true },
  type: { type: String, required: true },
  required: { type: Boolean, default: false },
  options: [{ type: String }],
  placeholder: { type: String, default: '' },
  order: { type: Number, default: 0 },
  applicantType: { type: String, enum: ['adult', 'child', 'both'], default: 'adult' },
});

const DocumentRequirementSchema = new Schema<IDocumentRequirement>({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  required: { type: Boolean, default: true },
  applicantType: { type: String, enum: ['adult', 'child', 'both'], default: 'adult' },
  docType: {
    type: String,
    enum: ['custom', 'passport', 'passport_front', 'passport_back', 'page', 'photo', 'aadhaar', 'pan'],
    default: 'custom',
  },
  ocrEnabled: { type: Boolean },
});

const VisaTypeSchema = new Schema<IVisaType>(
  {
    country: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    corporatePrice: { type: Number, min: 0 },
    adultPrice: { type: Number, default: 0, min: 0 },
    childPrice: { type: Number, default: 0, min: 0 },
    adultVfsFee: { type: Number, default: 0, min: 0 },
    childVfsFee: { type: Number, default: 0, min: 0 },
    adultServiceFee: { type: Number, default: 0, min: 0 },
    childServiceFee: { type: Number, default: 0, min: 0 },
    corporateAdultPrice: { type: Number, min: 0 },
    corporateChildPrice: { type: Number, min: 0 },
    corporateAdultVfsFee: { type: Number, min: 0 },
    corporateChildVfsFee: { type: Number, min: 0 },
    corporateAdultServiceFee: { type: Number, min: 0 },
    corporateChildServiceFee: { type: Number, min: 0 },
    processingTime: { type: String, required: true, default: '' },
    validity: { type: String, default: '' },
    entry: [{ type: String }],
    visaSubType: { type: String, default: 'e-visa' },
    stayDuration: { type: String, default: '' },
    jurisdiction: { type: String, default: 'pan-india' },
    visaCategory: { type: String, default: 'tourist' },
    process: { type: String, enum: ['normal', 'express'], default: 'normal' },
    formFields: [FormFieldSchema],
    documentRequirements: [DocumentRequirementSchema],
    additionalNotes: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IVisaType>('VisaType', VisaTypeSchema);
