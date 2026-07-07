import { Response } from 'express';
import { AdminRequest } from '../../middleware/adminAuth.middleware';
import ActivityLog from '../../models/ActivityLog';
import { sendSuccess } from '../../utils/response';

export const getActivityLogs = async (_req: AdminRequest, res: Response): Promise<void> => {
  const logs = await ActivityLog.find().sort({ createdAt: -1 }).limit(100);
  sendSuccess(res, logs);
};
