import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IPromoUsage {
  user: Types.ObjectId;
  userName: string;
  userEmail: string;
  applicationId?: Types.ObjectId;
  applicationRef?: string;
  usedAt: Date;
  discountApplied: number;
}

export interface IPromoCode extends Document {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  isActive: boolean;
  showOnWebsite: boolean;
  expiresAt?: Date;
  usageLimit?: number;
  usageCount: number;
  usedBy: IPromoUsage[];
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PromoUsageSchema = new Schema<IPromoUsage>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  userEmail: { type: String, required: true },
  applicationId: { type: Schema.Types.ObjectId, ref: 'Application' },
  applicationRef: { type: String },
  usedAt: { type: Date, default: Date.now },
  discountApplied: { type: Number, required: true },
}, { _id: false });

const PromoCodeSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, default: '' },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
    showOnWebsite: { type: Boolean, default: false },
    expiresAt: { type: Date },
    usageLimit: { type: Number },
    usageCount: { type: Number, default: 0 },
    usedBy: [PromoUsageSchema],
    isDeleted: { type: Boolean, default: false },
    deletedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<IPromoCode>('PromoCode', PromoCodeSchema);
