'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getApplications } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Application, ApplicationStatus } from '@/types';
import { STATUS_LABELS } from '@/types';

const BOARD_COLUMNS: { status: ApplicationStatus; label: string; color: string; headerBg: string }[] = [
  { status: 'payment_completed', label: 'Payment Confirmed', color: 'text-purple-700', headerBg: 'bg-purple-50 border-purple-200' },
  { status: 'visa_processing', label: 'Visa Processing', color: 'text-blue-700', headerBg: 'bg-blue-50 border-blue-200' },
  { status: 'embassy_review', label: 'Embassy Review', color: 'text-orange-700', headerBg: 'bg-orange-50 border-orange-200' },
  { status: 'visa_approved', label: 'Visa Approved', color: 'text-green-700', headerBg: 'bg-green-50 border-green-200' },
];

export default function ProcessingBoardPage() {
  const [allApps, setAllApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const statuses = BOARD_COLUMNS.map((c) => c.status).join(',');
    // Fetch each status in parallel
    Promise.all(BOARD_COLUMNS.map((c) => getApplications({ status: c.status, limit: 50 })))
      .then((results) => {
        const combined: Application[] = results.flatMap((r) => r.data.data.applications);
        setAllApps(combined);
      })
      .finally(() => setLoading(false));
  }, []);

  const getColApps = (status: ApplicationStatus) => allApps.filter((a) => a.status === status);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Processing Board</h1>
        <p className="text-slate-500 text-sm mt-1">Active applications in the processing pipeline.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {BOARD_COLUMNS.map((col) => {
            const apps = getColApps(col.status);
            return (
              <div key={col.status} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className={`px-4 py-3 border-b ${col.headerBg} flex items-center justify-between`}>
                  <h3 className={`text-sm font-bold ${col.color}`}>{col.label}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.headerBg} ${col.color} border`}>
                    {apps.length}
                  </span>
                </div>
                <div className="p-3 space-y-3 min-h-[200px]">
                  {apps.length === 0 ? (
                    <p className="text-xs text-slate-300 text-center pt-8">No applications</p>
                  ) : (
                    apps.map((app) => (
                      <Link
                        key={app._id}
                        href={`/applications/${app._id}`}
                        className="block p-3 bg-slate-50 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/30 transition-all"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <img
                            src={`https://flagcdn.com/w20/${app.country?.flag}.png`}
                            alt=""
                            className="w-5 h-3 object-cover rounded"
                          />
                          <span className="text-xs font-semibold text-slate-700 truncate">{app.country?.name}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 mb-1">{app.visaType?.name}</p>
                        <p className="text-xs text-slate-500 mb-2">{app.user?.name}</p>
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs text-slate-400">{app.referenceId?.slice(-8)}</span>
                          <span className="text-xs text-slate-400">{formatDate(app.updatedAt)}</span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
