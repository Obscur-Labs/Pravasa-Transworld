'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { FileText, Clock, CheckCircle, XCircle, Activity, ArrowRight, Mail, Phone, ChevronLeft, ChevronRight, MessageSquare, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/components/ui/use-toast';
import { getDashboardStats, getApplications, getLeads, markLeadRead } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { Application, ContactLead } from '@/types';
import { STATUS_LABELS } from '@/types';

export default function AdminDashboard() {
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, approved: 0, rejected: 0 });
  const [recent, setRecent] = useState<Application[]>([]);
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [leadIdx, setLeadIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    getDashboardStats().then((r) => setStats(r.data.data));
    getApplications({ limit: 8 }).then((r) => setRecent(r.data.data.applications));
    getLeads().then((r) => setLeads(r.data.data));
  }, []);

  const maxLeadIdx = Math.max(0, leads.length - 3);

  const nextLead = () => setLeadIdx((i) => (i >= maxLeadIdx ? 0 : i + 1));
  const prevLead = () => setLeadIdx((i) => (i <= 0 ? maxLeadIdx : i - 1));

  const resetLeadTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (leads.length > 3) timerRef.current = setInterval(nextLead, 5000);
  };

  useEffect(() => {
    if (leads.length <= 3) return;
    timerRef.current = setInterval(nextLead, 5000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [leads.length]);

  const handleMarkRead = async (id: string) => {
    try {
      await markLeadRead(id);
      setLeads((prev) => prev.map((l) => l._id === id ? { ...l, read: true } : l));
      toast({ title: 'Lead marked as read', variant: 'success' });
    } catch {
      toast({ title: 'Failed to update lead', variant: 'destructive' });
    }
  };

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

  const unreadLeads = leads.filter((l) => !l.read).length;

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

      {/* Contact Leads Slider */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="font-semibold text-slate-900 text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Contact Leads
            </h2>
            {unreadLeads > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {unreadLeads} new
              </span>
            )}
          </div>
          {leads.length > 3 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { prevLead(); resetLeadTimer(); }}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => { nextLead(); resetLeadTimer(); }}
                className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {leads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
            No contact leads yet.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl">
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${leadIdx * 33.333}%)` }}
              >
                {leads.map((lead) => (
                  <div key={lead._id} className="w-1/3 flex-none px-2">
                    <div className={`bg-white rounded-xl border p-5 h-full ${!lead.read ? 'border-blue-200 shadow-sm shadow-blue-50' : 'border-slate-200'}`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-blue-700 text-sm font-bold">{lead.name?.[0]?.toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">{lead.name}</p>
                            <p className="text-xs text-slate-400">{formatDate(lead.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {!lead.read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                          {!lead.read && (
                            <button
                              onClick={() => handleMarkRead(lead._id)}
                              className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Mark as read"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 line-clamp-3 mb-3">{lead.message}</p>

                      <div className="space-y-1 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                        {lead.phone && (
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Phone className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <span>{lead.phone}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {leads.length > 3 && (
              <div className="flex justify-center gap-1.5 mt-4">
                {Array.from({ length: maxLeadIdx + 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => { setLeadIdx(i); resetLeadTimer(); }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === leadIdx ? 'w-5 bg-blue-600' : 'w-1.5 bg-slate-300 hover:bg-slate-400'
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        )}
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
                {['Reference', 'Applicant', 'Visa', 'Country', 'Date', 'Status', ''].map((h) => (
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
