import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType =
  | 'otp'
  | 'document_approved'
  | 'document_rejected'
  | 'payment_request'
  | 'payment_failed'
  | 'courier_requested'
  | 'status_update'
  | 'visa_approved'
  | 'visa_delivered'
  | 'general';

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  application: mongoose.Types.ObjectId | null;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, required: true },
    application: { type: Schema.Types.ObjectId, ref: 'Application', default: null },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>('Notification', NotificationSchema);
