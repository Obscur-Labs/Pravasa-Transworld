'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Filter } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getApplications } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Application, ApplicationStatus } from '@/types';
import { STATUS_LABELS, ALL_STATUSES } from '@/types';

const statusVariant = (s: string) => {
  if (s === 'visa_approved' || s === 'visa_delivered') return 'success';
  if (s === 'visa_rejected') return 'destructive';
  if (s === 'payment_pending' || s === 'submitted') return 'warning';
  return 'info';
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (statusFilter) params.status = statusFilter;
    getApplications(params)
      .then((r) => {
        setApplications(r.data.data.applications);
        setTotal(r.data.data.total);
      })
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = applications.filter((a) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.referenceId?.toLowerCase().includes(s) ||
      a.user?.name?.toLowerCase().includes(s) ||
      a.user?.email?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Applications</h1>
        <p className="text-slate-500 text-sm mt-1">{total} total applications</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, application no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Application No.', 'Applicant', 'Visa Type', 'Country', 'Amount', 'Date', 'Status', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">No applications found.</td></tr>
              ) : (
                filtered.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs text-slate-500 whitespace-nowrap">{app.referenceId}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900 whitespace-nowrap">{app.user?.name}</p>
                      <p className="text-xs text-slate-400">{app.user?.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{app.visaType?.name}</td>
                    <td className="px-4 py-3 whitespace-nowrap"><span className="flex items-center gap-1.5"><img src={`https://flagcdn.com/w20/${app.country?.flag}.png`} alt="" className="w-5 h-3 object-cover rounded" />{app.country?.name}</span></td>
                    <td className="px-4 py-3 font-semibold text-slate-900 whitespace-nowrap">${app.paymentAmount}</td>
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{formatDate(app.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(app.status) as any} className="text-xs whitespace-nowrap">
                        {STATUS_LABELS[app.status]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/applications/${app._id}`} className="text-blue-600 hover:underline text-xs font-medium whitespace-nowrap">
                        Review →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
