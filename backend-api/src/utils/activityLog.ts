import { AdminRequest } from '../middleware/adminAuth.middleware';
import ActivityLog, { ActivityAction } from '../models/ActivityLog';

// Fire-and-forget: recording an activity entry should never fail the actual request.
export function logActivity(req: AdminRequest, action: ActivityAction, entityType: string, entityLabel: string): void {
  ActivityLog.create({
    admin: req.admin?._id || null,
    adminName: req.admin?.name || 'Admin',
    action,
    entityType,
    entityLabel,
  }).catch((err) => console.error('Failed to record activity log', err));
}
