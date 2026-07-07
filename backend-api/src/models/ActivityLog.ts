import mongoose, { Document, Schema } from 'mongoose';

export type ActivityAction = 'create' | 'update' | 'delete';

export interface IActivityLog extends Document {
  admin: mongoose.Types.ObjectId | null;
  adminName: string;
  action: ActivityAction;
  entityType: string;
  entityLabel: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    admin: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
    adminName: { type: String, required: true },
    action: { type: String, enum: ['create', 'update', 'delete'], required: true },
    entityType: { type: String, required: true },
    entityLabel: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
