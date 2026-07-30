import mongoose, { Document, Schema } from 'mongoose';
import { IFormField, IDocumentRequirement } from './VisaType';

export interface IFormPreset extends Document {
  name: string;
  description: string;
  formFields: IFormField[];
  documentRequirements: IDocumentRequirement[];
  createdAt: Date;
  updatedAt: Date;
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
  order: { type: Number, default: 0 },
});

const FormPresetSchema = new Schema<IFormPreset>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    formFields: [FormFieldSchema],
    documentRequirements: [DocumentRequirementSchema],
  },
  { timestamps: true }
);

export default mongoose.model<IFormPreset>('FormPreset', FormPresetSchema);
