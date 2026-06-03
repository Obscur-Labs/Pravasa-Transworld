'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import { useAuthStore } from '@/store/auth.store';
import { SocketProvider } from '@/components/providers/SocketProvider';
import NotificationDropdown from '@/components/layout/NotificationDropdown';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar_collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleSidebar = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

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
        <DashboardSidebar collapsed={collapsed} onToggle={toggleSidebar} />
        {/* Spacer that mirrors the fixed sidebar width to push main content */}
        <div
          className={`flex-shrink-0 transition-all duration-300 ease-in-out ${
            collapsed ? 'w-16' : 'w-64'
          }`}
        />
        <main className="flex-1 flex flex-col min-w-0 min-h-screen">
          <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-end px-6 sticky top-0 z-10 shrink-0">
            <NotificationDropdown />
          </header>
          <div className="flex-1">
            {children}
          </div>
        </main>
      </div>
    </SocketProvider>
  );
}
