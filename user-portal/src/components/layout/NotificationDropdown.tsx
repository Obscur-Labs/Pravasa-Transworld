'use client';
import { useState } from 'react';
import { Bell, X } from 'lucide-react';
import { useSocket } from '@/components/providers/SocketProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export default function NotificationDropdown() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useSocket();
  const [open, setOpen] = useState(false);

  const sorted = [...notifications].sort((a, b) => {
    if (a.read === b.read) return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return a.read ? 1 : -1;
  });

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-slate-600 hover:bg-slate-100">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 overflow-hidden border border-slate-200 shadow-xl rounded-xl bg-white">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
          <h3 className="font-semibold text-slate-800">Notifications</h3>
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="text-xs font-medium text-blue-600 hover:text-blue-700">
              Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {sorted.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</div>
          ) : (
            sorted.map((notif) => (
              <div
                key={notif._id}
                onClick={() => !notif.read && markAsRead(notif._id)}
                className={`group px-4 py-3 cursor-pointer border-b border-slate-50 last:border-0 transition-colors ${
                  notif.read ? 'bg-white hover:bg-slate-50 opacity-75' : 'bg-blue-50/50 hover:bg-blue-50'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className={`text-sm flex-1 min-w-0 pr-2 ${notif.read ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>
                    {notif.title}
                  </h4>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {!notif.read && <span className="w-2 h-2 bg-blue-600 rounded-full" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteNotification(notif._id); }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="Delete"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className={`text-xs ${notif.read ? 'text-slate-500' : 'text-slate-600'}`}>{notif.message}</p>
                <span className="text-[10px] text-slate-400 mt-2 block">{new Date(notif.createdAt).toLocaleString()}</span>
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
