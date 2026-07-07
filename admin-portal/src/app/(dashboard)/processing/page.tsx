'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { getApplications } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Application, ApplicationStatus } from '@/types';

const BOARD_COLUMNS: { status: ApplicationStatus; label: string; tone: string }[] = [
  { status: 'payment_completed', label: 'Payment Confirmed', tone: 'text-violet-600 bg-violet-500/10 border-violet-500/20' },
  { status: 'visa_processing', label: 'Visa Processing', tone: 'text-info bg-info/10 border-info/20' },
  { status: 'embassy_review', label: 'Embassy Review', tone: 'text-warning bg-warning/10 border-warning/20' },
  { status: 'visa_approved', label: 'Visa Approved', tone: 'text-success bg-success/10 border-success/20' },
];

export default function ProcessingBoardPage() {
  const [allApps, setAllApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all(BOARD_COLUMNS.map((c) => getApplications({ status: c.status, limit: 50 })))
      .then((results) => {
        const combined: Application[] = results.flatMap((r) => r.data.data.applications);
        setAllApps(combined);
      })
      .finally(() => setLoading(false));
  }, []);

  const getColApps = (status: ApplicationStatus) => allApps.filter((a) => a.status === status);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <PageHeader title="Processing Board" description="Active applications in the processing pipeline." />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
        {BOARD_COLUMNS.map((col) => {
          const apps = loading ? [] : getColApps(col.status);
          return (
            <div key={col.status} className="bg-card rounded-xl border border-border overflow-hidden">
              <div className={`px-4 py-3 border-b flex items-center justify-between ${col.tone}`}>
                <h3 className="text-sm font-bold">{col.label}</h3>
                {!loading && (
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${col.tone}`}>
                    {apps.length}
                  </span>
                )}
              </div>
              <div className="p-3 space-y-3 min-h-[200px]">
                {loading ? (
                  Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
                ) : apps.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center pt-8">No applications</p>
                ) : (
                  apps.map((app) => (
                    <Link
                      key={app._id}
                      href={`/applications/${app._id}`}
                      className="block p-3 bg-muted/50 rounded-lg border border-border hover:border-primary/30 hover:bg-accent transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <img
                          src={`https://flagcdn.com/w20/${app.country?.flag}.png`}
                          alt=""
                          className="w-5 h-3 object-cover rounded"
                        />
                        <span className="text-xs font-semibold text-foreground/90 truncate">{app.country?.name}</span>
                      </div>
                      <p className="text-sm font-bold text-foreground mb-1">{app.visaType?.name}</p>
                      <p className="text-xs text-muted-foreground mb-2">{app.user?.name}</p>
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs text-muted-foreground">{app.referenceId?.slice(-8)}</span>
                        <span className="text-xs text-muted-foreground">{formatDate(app.updatedAt)}</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
