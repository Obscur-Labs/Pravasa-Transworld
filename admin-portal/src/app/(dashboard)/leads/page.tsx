'use client';
import { useEffect, useState } from 'react';
import { Mail, Phone, Trash2, Eye, MessageSquare, Search, Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { getLeads, markLeadRead, deleteLead } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { ContactLead } from '@/types';

export default function LeadsPage() {
  const [leads, setLeads] = useState<ContactLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    getLeads()
      .then((r) => setLeads(r.data.data))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await markLeadRead(id);
      setLeads((prev) => prev.map((l) => (l._id === id ? { ...l, read: true } : l)));
      toast({ title: 'Marked as read', variant: 'success' });
    } catch {
      toast({ title: 'Failed to update lead', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      await deleteLead(id);
      setLeads((prev) => prev.filter((l) => l._id !== id));
      toast({ title: 'Lead deleted', variant: 'success' });
    } catch {
      toast({ title: 'Failed to delete lead', variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      l.name.toLowerCase().includes(s) ||
      l.email.toLowerCase().includes(s) ||
      l.message.toLowerCase().includes(s) ||
      (l.phone || '').includes(s)
    );
  });

  const unread = leads.filter((l) => !l.read).length;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-blue-600" />
          Contact Leads
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {leads.length} total &nbsp;·&nbsp;
          <span className="text-blue-600 font-medium">{unread} unread</span>
        </p>
      </div>

      <div className="relative max-w-sm mb-5">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by name, email, message…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 h-9 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
          {leads.length === 0 ? 'No contact leads yet.' : 'No leads match your search.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((lead) => (
            <div
              key={lead._id}
              className={`bg-white rounded-xl border p-5 flex gap-4 transition-all ${
                !lead.read ? 'border-blue-200 shadow-sm' : 'border-slate-200'
              }`}
            >
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-700 font-bold text-sm">{lead.name?.[0]?.toUpperCase()}</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    <span className="font-semibold text-slate-900 text-sm">{lead.name}</span>
                    {!lead.read && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        New
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 flex-shrink-0">{formatDate(lead.createdAt)}</span>
                </div>

                <p className="text-sm text-slate-600 mb-3 leading-relaxed">{lead.message}</p>

                <div className="flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    {lead.email}
                  </span>
                  {lead.phone && (
                    <span className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {lead.phone}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col items-center gap-2 flex-shrink-0">
                {!lead.read && (
                  <button
                    onClick={() => handleMarkRead(lead._id)}
                    className="p-2 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Mark as read"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(lead._id)}
                  disabled={deleting === lead._id}
                  className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
                  title="Delete lead"
                >
                  {deleting === lead._id
                    ? <Loader2 className="w-4 h-4 animate-spin" />
                    : <Trash2 className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
