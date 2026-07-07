'use client';
import { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/use-toast';
import {
  getAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  deleteAdminNotification,
  deleteAllAdminNotifications,
} from '@/lib/api';

interface AdminNotification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  const fetchNotifications = async () => {
    try {
      const r = await getAdminNotifications();
      setNotifications(Array.isArray(r.data.data) ? r.data.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id: string) => {
    await markAdminNotificationRead(id);
    setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
  };

  const handleMarkAll = async () => {
    await markAllAdminNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast({ title: 'All notifications marked as read', variant: 'success' });
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteAdminNotification(id);
    setNotifications((prev) => prev.filter((n) => n._id !== id));
  };

  const handleDeleteAll = async () => {
    await deleteAllAdminNotifications();
    setNotifications([]);
    toast({ title: 'All notifications deleted', variant: 'success' });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const typeColor: Record<string, string> = {
    new_application: 'bg-primary',
    payment_received: 'bg-success',
    status_update: 'bg-warning',
    general: 'bg-muted-foreground',
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <PageHeader
        title="Notifications"
        description={unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
        action={
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAll}>
                <CheckCheck className="w-4 h-4 mr-2" />Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDeleteAll(true)}
                className="text-destructive hover:text-destructive hover:border-destructive/30"
              >
                <Trash2 className="w-4 h-4 mr-2" />Delete all
              </Button>
            )}
          </div>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState icon={Bell} title="No notifications yet" />
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden divide-y divide-border">
          {notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => !n.read && handleMarkRead(n._id)}
              className={`group p-4 transition-colors cursor-pointer ${
                n.read ? 'hover:bg-muted/40' : 'bg-primary/5 hover:bg-primary/10'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${typeColor[n.type] ?? 'bg-muted-foreground'} ${n.read ? 'opacity-30' : ''}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${n.read ? 'text-muted-foreground' : 'text-foreground'}`}>{n.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                </div>
                <button
                  onClick={(e) => handleDelete(n._id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all flex-shrink-0"
                  title="Delete notification"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmDeleteAll}
        onOpenChange={setConfirmDeleteAll}
        title="Delete all notifications?"
        description="This cannot be undone."
        confirmLabel="Delete all"
        onConfirm={handleDeleteAll}
      />
    </div>
  );
}
