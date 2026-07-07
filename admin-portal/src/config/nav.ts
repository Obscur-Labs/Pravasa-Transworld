import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, FileText, Globe2, CreditCard, Users, Kanban,
  Bell, MessageSquare, LayoutTemplate, Trash2, Tag, History,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

// Single source of truth for sidebar nav + the command palette, so the two never drift.
export const topNavItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/applications', label: 'Applications', icon: FileText },
  { href: '/processing', label: 'Processing Board', icon: Kanban },
];

// Grouped under the "Configurations" accordion in the sidebar.
export const configNavItems: NavItem[] = [
  { href: '/countries', label: 'Countries', icon: Globe2 },
  { href: '/form-config', label: 'Form Presets', icon: LayoutTemplate },
];

export const bottomNavItems: NavItem[] = [
  { href: '/visa-types', label: 'Visa Types', icon: CreditCard },
  { href: '/users', label: 'Customers', icon: Users },
  { href: '/promo-codes', label: 'Promo Codes', icon: Tag },
  { href: '/leads', label: 'Contact Leads', icon: MessageSquare },
];

// Grouped under the "Other Options" accordion in the sidebar.
export const otherNavItems: NavItem[] = [
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/trash', label: 'Trash', icon: Trash2 },
  { href: '/logs', label: 'Activity Logs', icon: History },
];

export const allNavItems: NavItem[] = [...topNavItems, ...configNavItems, ...bottomNavItems, ...otherNavItems];
