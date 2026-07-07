'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogOut, Settings, Shield, MoreHorizontal, type LucideIcon } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useAdminAuthStore } from '@/store/auth.store';
import { topNavItems, configNavItems, bottomNavItems, otherNavItems, type NavItem } from '@/config/nav';

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

function NavLink({ href, label, icon: Icon, active, onNavigate }: NavItem & { active: boolean; onNavigate?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-3 rounded-lg border-l-2 pl-[10px] pr-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-accent text-primary'
          : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {label}
    </Link>
  );
}

// One reusable accordion group — used for both "Configurations" and "Other Options"
// so the sidebar doesn't repeat the same trigger/content markup twice.
function NavGroup({
  value, label, icon: Icon, items, pathname, onNavigate,
}: {
  value: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = items.some(({ href }) => isActivePath(pathname, href));
  return (
    <AccordionItem value={value} className="border-none">
      <AccordionTrigger
        className={cn(
          'rounded-lg px-3 py-2.5 text-sm font-medium hover:no-underline hover:bg-muted',
          isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
        )}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-4 w-4 flex-shrink-0" />
          {label}
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-0 pl-3 ml-[18px] border-l border-border space-y-1">
        {items.map((item) => (
          <NavLink key={item.href} {...item} active={isActivePath(pathname, item.href)} onNavigate={onNavigate} />
        ))}
      </AccordionContent>
    </AccordionItem>
  );
}

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAdminAuthStore();

  const isConfigRoute = configNavItems.some(({ href }) => isActivePath(pathname, href));
  const isOtherRoute = otherNavItems.some(({ href }) => isActivePath(pathname, href));
  const [openGroups, setOpenGroups] = useState<string[]>(() => {
    const initial: string[] = [];
    if (isConfigRoute) initial.push('config');
    if (isOtherRoute) initial.push('other');
    return initial;
  });

  const handleLogout = () => {
    onNavigate?.();
    logout();
    router.push('/login');
  };

  return (
    <>
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <span className="text-foreground font-semibold text-sm block truncate">Pravasa Transworld</span>
            <p className="text-muted-foreground text-xs">Admin Console</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarFallback>{admin?.name?.[0]?.toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{admin?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{admin?.email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {topNavItems.map((item) => (
          <NavLink key={item.href} {...item} active={isActivePath(pathname, item.href)} onNavigate={onNavigate} />
        ))}

        {bottomNavItems.map((item) => (
          <NavLink key={item.href} {...item} active={isActivePath(pathname, item.href)} onNavigate={onNavigate} />
        ))}

        <Accordion type="multiple" value={openGroups} onValueChange={setOpenGroups}>
          <NavGroup value="config" label="Configurations" icon={Settings} items={configNavItems} pathname={pathname} onNavigate={onNavigate} />
          <NavGroup value="other" label="Other Options" icon={MoreHorizontal} items={otherNavItems} pathname={pathname} onNavigate={onNavigate} />
        </Accordion>
      </nav>

      <div className="p-4 border-t border-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </>
  );
}

export default function AdminSidebar() {
  return (
    <aside className="hidden md:flex w-64 bg-card border-r border-border flex-col h-screen overflow-y-auto flex-shrink-0 sticky top-0">
      <SidebarContent />
    </aside>
  );
}
