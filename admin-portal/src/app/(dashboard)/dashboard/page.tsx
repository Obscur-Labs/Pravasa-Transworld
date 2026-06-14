'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Clock, CheckCircle, XCircle, Activity, ArrowRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getDashboardStats, getApplications } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Application } from '@/types';
import { STATUS_LABELS } from '@/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, approved: 0, rejected: 0 });
  const [recent, setRecent] = useState<Application[]>([]);

  useEffect(() => {
    getDashboardStats().then((r) => setStats(r.data.data));
    getApplications({ limit: 8 }).then((r) => setRecent(r.data.data.applications));
  }, []);

  const cards = [
    { label: 'Total Applications', value: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    { label: 'In Processing', value: stats.processing, icon: FileText, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const statusVariant = (s: string) => {
    if (s === 'visa_approved' || s === 'visa_delivered') return 'success';
    if (s === 'visa_rejected') return 'destructive';
    if (s === 'payment_pending' || s === 'submitted') return 'warning';
    return 'info';
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of all visa applications.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label}>
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${c.color}`} />
                </div>
                <p className="text-2xl font-bold text-slate-900">{c.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Applications */}
      <Card>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Recent Applications</h2>
          <Link href="/applications" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Application No.', 'Applicant', 'Visa', 'Country', 'Date', 'Status', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((app) => (
                <tr key={app._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{app.referenceId}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{app.user?.name}</p>
                    <p className="text-xs text-slate-400">{app.user?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{app.visaType?.name}</td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <img src={`https://flagcdn.com/w20/${app.country?.flag}.png`} alt="" className="w-5 h-3 object-cover rounded" />
                      {app.country?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(app.createdAt)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariant(app.status) as any} className="text-xs">
                      {STATUS_LABELS[app.status]}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/applications/${app._id}`} className="text-blue-600 hover:underline text-xs">View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {recent.length === 0 && (
            <div className="text-center py-10 text-slate-400 text-sm">No applications yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
