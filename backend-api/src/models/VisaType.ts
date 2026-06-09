import mongoose, { Document, Schema } from 'mongoose';

export type FieldType = 'text' | 'number' | 'email' | 'date' | 'select' | 'radio' | 'textarea' | 'file';

export interface IFormField {
  _id?: mongoose.Types.ObjectId;
  label: string;
  fieldName: string;
  type: FieldType;
  required: boolean;
  options: string[];
  placeholder: string;
  order: number;
}

export interface IDocumentRequirement {
  _id?: mongoose.Types.ObjectId;
  name: string;
  description: string;
  required: boolean;
}

export type EntryType = 'single' | 'multiple' | 'double';
export type VisaSubType = 'e-visa' | 'sticker';
export type JurisdictionType = 'pan-india' | 'mumbai' | 'delhi';
export type VisaCategoryType = 'tourist' | 'business' | 'transit' | 'student';

export interface IVisaType extends Document {
  country: mongoose.Types.ObjectId;
  name: string;
  description: string;
  price: number;
  visaCharges: number;
  serviceFee: number;
  corporatePrice?: number;
  processingTime: string;
  validity: string;
  entry: EntryType[];
  visaSubType: VisaSubType;
  stayDuration: string;
  jurisdiction: JurisdictionType;
  visaCategory: VisaCategoryType;
  formFields: IFormField[];
  documentRequirements: IDocumentRequirement[];
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
});

const DocumentRequirementSchema = new Schema<IDocumentRequirement>({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  required: { type: Boolean, default: true },
});

const VisaTypeSchema = new Schema<IVisaType>(
  {
    country: { type: Schema.Types.ObjectId, ref: 'Country', required: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    visaCharges: { type: Number, default: 0, min: 0 },
    serviceFee: { type: Number, default: 0, min: 0 },
    corporatePrice: { type: Number, min: 0 },
    processingTime: { type: String, required: true, default: '' },
    validity: { type: String, default: '' },
    entry: [{ type: String, enum: ['single', 'multiple', 'double'] }],
    visaSubType: { type: String, enum: ['e-visa', 'sticker'], default: 'e-visa' },
    stayDuration: { type: String, default: '' },
    jurisdiction: { type: String, enum: ['pan-india', 'mumbai', 'delhi'], default: 'pan-india' },
    visaCategory: { type: String, enum: ['tourist', 'business', 'transit', 'student'], default: 'tourist' },
    formFields: [FormFieldSchema],
    documentRequirements: [DocumentRequirementSchema],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model<IVisaType>('VisaType', VisaTypeSchema);
