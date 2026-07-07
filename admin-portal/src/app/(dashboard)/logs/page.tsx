'use client';
import { useEffect, useState } from 'react';
import { History, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { getActivityLogs, deleteAllActivityLogs } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { ActivityLog, ActivityAction } from '@/types';

const actionVariant = (a: ActivityAction) => {
  if (a === 'create') return 'success';
  if (a === 'delete') return 'destructive';
  return 'info';
};

const COLUMNS = ['Time', 'Admin', 'Action', 'Entity Type', 'Details'];

export default function ActivityLogsPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    getActivityLogs()
      .then((r) => setLogs(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const handleDeleteAll = async () => {
    setClearing(true);
    try {
      await deleteAllActivityLogs();
      setLogs([]);
      toast({ title: 'Activity logs cleared', variant: 'success' });
    } catch {
      toast({ title: 'Failed to clear activity logs', variant: 'destructive' });
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Activity Logs"
        description="Recent admin actions — who changed what, and when."
        action={
          logs.length > 0 ? (
            <Button
              variant="outline"
              onClick={handleDeleteAll}
              disabled={clearing}
              className="text-destructive border-destructive/20 hover:bg-destructive/10"
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete All
            </Button>
          ) : undefined
        }
      />

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/40">
              {COLUMNS.map((h) => <TableHead key={h}>{h}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  {COLUMNS.map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              logs.map((log) => (
                <TableRow key={log._id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">{formatDate(log.createdAt)}</TableCell>
                  <TableCell className="font-medium text-foreground whitespace-nowrap">{log.adminName}</TableCell>
                  <TableCell>
                    <Badge variant={actionVariant(log.action) as any} className="text-xs capitalize">{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-foreground/90 whitespace-nowrap">{log.entityType}</TableCell>
                  <TableCell className="text-muted-foreground">{log.entityLabel}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {!loading && logs.length === 0 && (
          <EmptyState icon={History} title="No activity yet" description="Admin actions like creating or editing visa types, countries, and promo codes will show up here." />
        )}
      </Card>
    </div>
  );
}
