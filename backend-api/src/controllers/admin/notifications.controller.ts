import { Response } from 'express';
import { AdminRequest } from '../../middleware/adminAuth.middleware';
import AdminNotification from '../../models/AdminNotification';
import { sendSuccess, sendError } from '../../utils/response';

export const getNotifications = async (_req: AdminRequest, res: Response): Promise<void> => {
  const notifications = await AdminNotification.find()
    .sort({ createdAt: -1 })
    .limit(50);
  sendSuccess(res, notifications);
};

export const markAsRead = async (req: AdminRequest, res: Response): Promise<void> => {
  const notification = await AdminNotification.findByIdAndUpdate(
    req.params.id,
    { read: true },
    { new: true }
  );
  if (!notification) {
    sendError(res, 'Notification not found', 404);
    return;
  }
  sendSuccess(res, notification, 'Notification marked as read');
};

export const markAllAsRead = async (_req: AdminRequest, res: Response): Promise<void> => {
  await AdminNotification.updateMany({ read: false }, { read: true });
  sendSuccess(res, null, 'All notifications marked as read');
};

export const deleteNotification = async (req: AdminRequest, res: Response): Promise<void> => {
  const notification = await AdminNotification.findByIdAndDelete(req.params.id);
  if (!notification) { sendError(res, 'Notification not found', 404); return; }
  sendSuccess(res, null, 'Notification deleted');
};

export const deleteAllNotifications = async (_req: AdminRequest, res: Response): Promise<void> => {
  await AdminNotification.deleteMany({});
  sendSuccess(res, null, 'All notifications deleted');
};
