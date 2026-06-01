import mongoose, { Document, Schema } from 'mongoose';

export type PaymentMethod = 'online' | 'cash' | 'manual_override';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface IPayment extends Document {
  application: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId: string;
  markedByAdmin: boolean;
  adminNote: string;
  receiptUrl: string;
  paidAt: Date | null;
  createdAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    application: { type: Schema.Types.ObjectId, ref: 'Application', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'USD' },
    method: { type: String, enum: ['online', 'cash', 'manual_override'], default: 'online' },
    status: { type: String, enum: ['pending', 'completed', 'failed', 'refunded'], default: 'pending' },
    transactionId: { type: String, default: '' },
    markedByAdmin: { type: Boolean, default: false },
    adminNote: { type: String, default: '' },
    receiptUrl: { type: String, default: '' },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export default mongoose.model<IPayment>('Payment', PaymentSchema);
