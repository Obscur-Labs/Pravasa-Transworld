'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Filter, FileSearch } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApplications } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Application, ApplicationStatus } from '@/types';
import { STATUS_LABELS, ALL_STATUSES } from '@/types';

const statusVariant = (s: string) => {
  if (s === 'visa_approved' || s === 'visa_delivered') return 'success';
  if (s === 'visa_rejected') return 'destructive';
  if (s === 'payment_pending' || s === 'submitted') return 'warning';
  return 'info';
};

const COLUMNS = ['Application No.', 'Applicant', 'Visa Type', 'Country', 'Amount', 'Date', 'Status', ''];

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
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Applications</h1>
        <p className="text-muted-foreground text-sm mt-1">{total} total applications</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name, email, application no..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-input bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>
        </div>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/40">
              {COLUMNS.map((h) => <TableHead key={h}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {COLUMNS.map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-20" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              filtered.map((app) => (
                <TableRow key={app._id}>
                  <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">{app.referenceId}</TableCell>
                  <TableCell>
                    <p className="font-medium text-foreground whitespace-nowrap">{app.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{app.user?.email}</p>
                  </TableCell>
                  <TableCell className="text-foreground/90 whitespace-nowrap">{app.visaType?.name}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="flex items-center gap-1.5">
                      <img src={`https://flagcdn.com/w20/${app.country?.flag}.png`} alt="" className="w-5 h-3 object-cover rounded" />
                      {app.country?.name}
                    </span>
                  </TableCell>
                  <TableCell className="font-semibold text-foreground whitespace-nowrap tabular-nums">{formatCurrency(app.paymentAmount)}</TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(app.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(app.status) as any} className="text-xs whitespace-nowrap">
                      {STATUS_LABELS[app.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/applications/${app._id}`} className="text-primary hover:underline text-xs font-medium whitespace-nowrap">
                      Review →
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && filtered.length === 0 && (
          <EmptyState
            icon={FileSearch}
            title="No applications found"
            description={search || statusFilter ? 'Try adjusting your search or filter.' : 'Applications will show up here once submitted.'}
          />
        )}
      </Card>
    </div>
  );
}
