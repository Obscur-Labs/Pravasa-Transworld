'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FileText, Plus, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getApplications } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Application } from '@/types';
import { STATUS_LABELS } from '@/types';

const statusVariant = (s: string) => {
  if (s === 'visa_approved' || s === 'visa_delivered') return 'success';
  if (s === 'visa_rejected') return 'destructive';
  if (s === 'payment_pending') return 'warning';
  return 'info';
};

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getApplications()
      .then((r) => setApplications(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Applications</h1>
          <p className="text-slate-500 text-sm mt-1">Manage and track all your visa applications.</p>
        </div>
        <Button asChild>
          <Link href="/apply"><Plus className="w-4 h-4 mr-2" />New Application</Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading applications...</div>
      ) : applications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-700 mb-2">No applications yet</h3>
          <p className="text-slate-400 text-sm mb-6">Start your visa journey today.</p>
          <Button asChild><Link href="/apply">Apply for Visa</Link></Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="hidden sm:grid grid-cols-6 gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <div className="col-span-2">Application</div>
            <div>Application No.</div>
            <div>Amount</div>
            <div>Date</div>
            <div>Status</div>
          </div>
          <div className="divide-y divide-slate-100">
            {applications.map((app) => (
              <Link
                key={app._id}
                href={`/applications/${app._id}`}
                className="grid grid-cols-1 sm:grid-cols-6 gap-2 sm:gap-4 px-6 py-4 hover:bg-slate-50 transition-colors"
              >
                <div className="sm:col-span-2 flex items-center gap-3">
                  <img src={`https://flagcdn.com/w40/${app.country?.flag}.png`} alt={app.country?.name} className="w-8 h-5 object-cover rounded flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{app.visaType?.name}</p>
                    <p className="text-xs text-slate-400">{app.country?.name}</p>
                  </div>
                </div>
                <div className="flex sm:items-center">
                  <span className="text-xs font-mono text-slate-500">{app.referenceId}</span>
                </div>
                <div className="flex sm:items-center">
                  <span className="text-sm font-semibold text-slate-900">{formatCurrency(app.paymentAmount)}</span>
                </div>
                <div className="flex sm:items-center">
                  <span className="text-sm text-slate-500">{formatDate(app.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant={statusVariant(app.status) as any} className="text-xs">
                    {STATUS_LABELS[app.status]}
                  </Badge>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400 ml-2 hidden sm:block" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
