'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAdminAuthStore } from '@/store/auth.store';
import { useToast } from '@/components/ui/use-toast';

interface SocketContextType {
  socket: Socket | null;
  unreadCount: number;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  notifications: any[];
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  unreadCount: 0,
  fetchNotifications: async () => {},
  markAsRead: async () => {},
  markAllAsRead: async () => {},
  notifications: [],
});

export const useSocket = () => useContext(SocketContext);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const { token, isAuthenticated } = useAdminAuthStore();
  const { toast } = useToast();

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setNotifications(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
    } catch (err) {}
  };

  const markAllAsRead = async () => {
    if (!token) return;
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {}
  };

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchNotifications();

      const socketInstance = io(process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000', {
        auth: { token },
      });

      socketInstance.on('connect', () => {
        console.log('Admin Socket connected');
      });

      socketInstance.on('admin_notification', (newNotif) => {
        setNotifications((prev) => [newNotif, ...prev]);
        toast({
          title: newNotif.title,
          description: newNotif.message,
        });
      });

      setSocket(socketInstance);

      return () => {
        socketInstance.disconnect();
      };
    }
  }, [isAuthenticated, token]);

  const unreadCount = Array.isArray(notifications)
    ? notifications.filter((n) => !n.read).length
    : 0;

  return (
    <SocketContext.Provider value={{ socket, notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead }}>
      {children}
    </SocketContext.Provider>
  );
}
