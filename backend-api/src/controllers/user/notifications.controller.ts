import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth.middleware';
import Notification from '../../models/Notification';
import { sendSuccess } from '../../utils/response';

export const getNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  const notifications = await Notification.find({ user: req.user!._id })
    .sort({ createdAt: -1 })
    .limit(50);
  const unreadCount = await Notification.countDocuments({ user: req.user!._id, read: false });
  sendSuccess(res, { notifications, unreadCount });
};

export const markAsRead = async (req: AuthRequest, res: Response): Promise<void> => {
  await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user!._id }, { read: true });
  sendSuccess(res, null, 'Marked as read');
};

export const markAllRead = async (req: AuthRequest, res: Response): Promise<void> => {
  await Notification.updateMany({ user: req.user!._id, read: false }, { read: true });
  sendSuccess(res, null, 'All notifications marked as read');
};

export const deleteNotification = async (req: AuthRequest, res: Response): Promise<void> => {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.user!._id });
  sendSuccess(res, null, 'Notification deleted');
};

export const deleteAllNotifications = async (req: AuthRequest, res: Response): Promise<void> => {
  await Notification.deleteMany({ user: req.user!._id });
  sendSuccess(res, null, 'All notifications deleted');
};
