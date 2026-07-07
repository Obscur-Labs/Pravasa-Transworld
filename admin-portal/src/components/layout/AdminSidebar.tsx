'use client';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, FileText, Globe2, CreditCard, Users, LogOut, Shield, Kanban,
  Bell, MessageSquare, LayoutTemplate, Trash2, Tag, Settings, ChevronDown,
} from 'lucide-react';
import { useAdminAuthStore } from '@/store/auth.store';

const topNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/applications', label: 'Applications', icon: FileText },
  { href: '/processing', label: 'Processing Board', icon: Kanban },
];

// Grouped under the "Configurations" accordion in the sidebar.
const configNavItems = [
  { href: '/countries', label: 'Countries', icon: Globe2 },
  { href: '/form-config', label: 'Form Presets', icon: LayoutTemplate },
];

const bottomNavItems = [
  { href: '/visa-types', label: 'Visa Types', icon: CreditCard },
  { href: '/users', label: 'Customers', icon: Users },
  { href: '/promo-codes', label: 'Promo Codes', icon: Tag },
  { href: '/leads', label: 'Contact Leads', icon: MessageSquare },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/trash', label: 'Trash', icon: Trash2 },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/');
}

function NavLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: React.ElementType; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
      }`}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {label}
    </Link>
  );
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, logout } = useAdminAuthStore();

  const isConfigRoute = configNavItems.some(({ href }) => isActivePath(pathname, href));
  const [configOpen, setConfigOpen] = useState(isConfigRoute);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 flex flex-col h-screen overflow-y-auto flex-shrink-0 sticky top-0">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-white font-bold">Pravasa Transworld</span>
            <p className="text-slate-400 text-xs">Admin Console</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center">
            <span className="text-white font-semibold text-sm">{admin?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{admin?.name}</p>
            <p className="text-xs text-slate-400 truncate">{admin?.email}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {topNavItems.map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon} active={isActivePath(pathname, href)} />
        ))}

        <div>
          <button
            type="button"
            onClick={() => setConfigOpen((o) => !o)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isConfigRoute ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">Configurations</span>
            <ChevronDown className={`w-3.5 h-3.5 flex-shrink-0 transition-transform ${configOpen ? 'rotate-180' : ''}`} />
          </button>
          {configOpen && (
            <div className="mt-1 ml-4 pl-3 border-l border-slate-800 space-y-1">
              {configNavItems.map(({ href, label, icon }) => (
                <NavLink key={href} href={href} label={label} icon={icon} active={isActivePath(pathname, href)} />
              ))}
            </div>
          )}
        </div>

        {bottomNavItems.map(({ href, label, icon }) => (
          <NavLink key={href} href={href} label={label} icon={icon} active={isActivePath(pathname, href)} />
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
