'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, Search } from 'lucide-react';
import AdminSidebar, { SidebarContent } from '@/components/layout/AdminSidebar';
import { useAdminAuthStore } from '@/store/auth.store';

import { SocketProvider } from '@/components/providers/SocketProvider';
import NotificationDropdown from '@/components/layout/NotificationDropdown';
import { ThemeToggle } from '@/components/theme-toggle';
import { CommandPalette } from '@/components/command-palette';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useCommandPaletteStore } from '@/store/command-palette.store';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, _hasHydrated } = useAdminAuthStore();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const openPalette = useCommandPaletteStore((s) => s.setOpen);

  useEffect(() => {
    if (_hasHydrated && !isAuthenticated) router.push('/login');
  }, [isAuthenticated, _hasHydrated, router]);

  if (!_hasHydrated) {
    return (
      <div className="flex min-h-screen bg-background items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <SocketProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <AdminSidebar />

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="flex flex-col w-72">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <SidebarContent onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 sm:px-6 shrink-0 z-10">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open navigation"
              className="md:hidden text-muted-foreground hover:text-foreground"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            <button
              onClick={() => openPalette(true)}
              className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-muted/50 text-sm text-muted-foreground hover:bg-muted transition-colors w-64"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="flex-1 text-left">Search...</span>
              <kbd className="text-[10px] font-mono bg-background border border-border rounded px-1.5 py-0.5">⌘K</kbd>
            </button>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Search"
                className="sm:hidden text-muted-foreground hover:text-foreground"
                onClick={() => openPalette(true)}
              >
                <Search className="w-4 h-4" />
              </Button>
              <ThemeToggle />
              <NotificationDropdown />
            </div>
          </header>
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette />
    </SocketProvider>
  );
}
