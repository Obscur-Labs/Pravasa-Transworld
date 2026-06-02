'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { useAuthStore } from '@/store/auth.store';

import { SocketProvider } from '@/components/providers/SocketProvider';
import NotificationDropdown from '@/components/layout/NotificationDropdown';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, _hasHydrated, router]);

  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen bg-slate-50 items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SocketProvider>
      <div className="flex min-h-screen bg-slate-50">
        <DashboardSidebar />
        <main className="flex-1 overflow-auto flex flex-col">
          <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-end px-6 sticky top-0 z-10 shrink-0">
            <NotificationDropdown />
          </header>
          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SocketProvider>
  );
}
