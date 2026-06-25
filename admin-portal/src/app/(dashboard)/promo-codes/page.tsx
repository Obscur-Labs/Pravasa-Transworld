'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Tag, ToggleLeft, ToggleRight, Globe, GlobeLock, Trash2,
  Pencil, History, X, Check, Copy, Loader2, AlertCircle, Percent, DollarSign,
  Calendar, Users, TrendingUp, Search, ChevronRight,
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import {
  getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode,
  togglePromoActive, togglePromoWebsite, getPromoHistory,
} from '@/lib/api';
import type { PromoCode, PromoHistory } from '@/types';

const DISCOUNT_TYPES = [
  { value: 'percentage', label: 'Percentage (%)', icon: Percent },
  { value: 'fixed', label: 'Fixed Amount (₹)', icon: DollarSign },
];

const empty = (): Partial<PromoCode> => ({
  code: '',
  description: '',
  discountType: 'percentage',
  discountValue: 10,
  isActive: true,
  showOnWebsite: false,
  expiresAt: undefined,
  usageLimit: undefined,
});

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-green-500' : 'bg-slate-400'}`} />
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}

function DiscountBadge({ type, value }: { type: string; value: number }) {
  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-bold px-2.5 py-0.5 rounded-full ${type === 'percentage' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'}`}>
      {type === 'percentage' ? <Percent className="w-3 h-3" /> : <span>₹</span>}
      {value}{type === 'percentage' ? ' off' : ' off'}
    </span>
  );
}

export default function PromoCodesPage() {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<PromoCode | null>(null);
  const [form, setForm] = useState<Partial<PromoCode>>(empty());
  const [saving, setSaving] = useState(false);
  const [codeError, setCodeError] = useState('');

  // History drawer
  const [historyPromo, setHistoryPromo] = useState<PromoCode | null>(null);
  const [history, setHistory] = useState<PromoHistory | null>(null);
  const [histLoading, setHistLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<PromoCode | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getPromoCodes()
      .then((r) => setPromos(r.data.data || []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(empty());
    setCodeError('');
    setModalOpen(true);
  };

  const openEdit = (p: PromoCode) => {
    setEditTarget(p);
    setForm({
      code: p.code,
      description: p.description,
      discountType: p.discountType,
      discountValue: p.discountValue,
      isActive: p.isActive,
      showOnWebsite: p.showOnWebsite,
      expiresAt: p.expiresAt ? p.expiresAt.slice(0, 10) : undefined,
      usageLimit: p.usageLimit,
    });
    setCodeError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    const code = (form.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) { setCodeError('Code must contain letters or numbers.'); return; }
    if (!form.discountValue || form.discountValue <= 0) return;
    setSaving(true);
    try {
      const payload = { ...form, code, expiresAt: form.expiresAt || null, usageLimit: form.usageLimit || null };
      if (editTarget) {
        await updatePromoCode(editTarget._id, payload);
      } else {
        await createPromoCode(payload);
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      setCodeError(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (p: PromoCode) => {
    setPromos((prev) => prev.map((x) => x._id === p._id ? { ...x, isActive: !x.isActive } : x));
    try { await togglePromoActive(p._id); } catch { load(); }
  };

  const handleToggleWebsite = async (p: PromoCode) => {
    setPromos((prev) => prev.map((x) => x._id === p._id ? { ...x, showOnWebsite: !x.showOnWebsite } : x));
    try { await togglePromoWebsite(p._id); } catch { load(); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePromoCode(deleteTarget._id);
      setDeleteTarget(null);
      load();
    } finally {
      setDeleting(false);
    }
  };

  const openHistory = async (p: PromoCode) => {
    setHistoryPromo(p);
    setHistory(null);
    setHistLoading(true);
    try {
      const r = await getPromoHistory(p._id);
      setHistory(r.data.data);
    } finally {
      setHistLoading(false);
    }
  };

  const filtered = promos.filter((p) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return p.code.toLowerCase().includes(s) || p.description.toLowerCase().includes(s);
  });

  const totalUsage = promos.reduce((acc, p) => acc + p.usageCount, 0);
  const activeCount = promos.filter((p) => p.isActive).length;
  const websiteCount = promos.filter((p) => p.showOnWebsite).length;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Promo Codes</h1>
          <p className="text-slate-500 text-sm mt-1">{promos.length} codes total</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" /> New Promo Code
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Codes', value: promos.length, icon: Tag, color: 'blue' },
          { label: 'Active', value: activeCount, icon: ToggleRight, color: 'green' },
          { label: 'On Website', value: websiteCount, icon: Globe, color: 'violet' },
          { label: 'Total Uses', value: totalUsage, icon: TrendingUp, color: 'amber' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-100`}>
              <Icon className={`w-5 h-5 text-${color}-600`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by code or description…"
          className="w-full pl-9 pr-3 h-9 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Code', 'Description', 'Discount', 'Status', 'Website', 'Expiry', 'Uses', 'Actions'].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-400">
                {search ? 'No matching promo codes.' : 'No promo codes yet. Create your first one!'}
              </td></tr>
            ) : filtered.map((p) => (
              <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg tracking-widest text-xs">{p.code}</span>
                </td>
                <td className="px-4 py-3 text-slate-600 max-w-[180px] truncate">{p.description || <span className="text-slate-300 italic">No description</span>}</td>
                <td className="px-4 py-3">
                  <DiscountBadge type={p.discountType} value={p.discountValue} />
                </td>
                <td className="px-4 py-3"><StatusBadge active={p.isActive} /></td>
                <td className="px-4 py-3">
                  {p.showOnWebsite
                    ? <span className="text-xs font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full flex items-center gap-1 w-fit"><Globe className="w-3 h-3" />Visible</span>
                    : <span className="text-xs text-slate-400">Hidden</span>}
                </td>
                <td className="px-4 py-3 text-slate-500 text-xs">
                  {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : <span className="text-slate-300">Never</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-slate-800">{p.usageCount}</span>
                  {p.usageLimit && <span className="text-slate-400 text-xs"> / {p.usageLimit}</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => handleToggle(p)} title={p.isActive ? 'Deactivate' : 'Activate'}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                      {p.isActive ? <ToggleRight className="w-4 h-4 text-green-600" /> : <ToggleLeft className="w-4 h-4" />}
                    </button>
                    <button onClick={() => handleToggleWebsite(p)} title={p.showOnWebsite ? 'Hide from website' : 'Show on website'}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                      {p.showOnWebsite ? <Globe className="w-4 h-4 text-violet-600" /> : <GlobeLock className="w-4 h-4" />}
                    </button>
                    <button onClick={() => openEdit(p)} title="Edit"
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => openHistory(p)} title="Usage history"
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-blue-50 text-blue-500 transition-colors">
                      <History className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setDeleteTarget(p)} title="Delete"
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Create / Edit Modal ── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">{editTarget ? 'Edit Promo Code' : 'New Promo Code'}</h2>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {/* Code */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Promo Code *</label>
                <input
                  value={form.code || ''}
                  onChange={(e) => { setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }); setCodeError(''); }}
                  placeholder="e.g. SAVE20 or 2024PROMO"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm font-mono font-bold tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {codeError && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{codeError}</p>}
                <p className="text-xs text-slate-400 mt-1">Only letters and numbers. Auto-uppercased.</p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Description</label>
                <input
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. 20% off on all visa applications"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Discount type + value */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Discount Type *</label>
                  <div className="flex rounded-xl border border-slate-200 overflow-hidden">
                    {DISCOUNT_TYPES.map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm({ ...form, discountType: value as any })}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold transition-colors ${form.discountType === value ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
                      >
                        <Icon className="w-3.5 h-3.5" />{value === 'percentage' ? '%' : '₹'}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">
                    Value {form.discountType === 'percentage' ? '(%)' : '(₹)'} *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={form.discountType === 'percentage' ? 100 : undefined}
                    value={form.discountValue || ''}
                    onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Expiry + Usage limit */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={form.expiresAt || ''}
                    min={new Date().toISOString().slice(0, 10)}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value || undefined })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1">Usage Limit</label>
                  <input
                    type="number"
                    min={1}
                    placeholder="Unlimited"
                    value={form.usageLimit || ''}
                    onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : undefined })}
                    className="w-full h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="flex gap-3">
                {[
                  { key: 'isActive' as const, label: 'Active', desc: 'Users can apply this code', on: 'bg-green-600', off: 'bg-slate-300' },
                  { key: 'showOnWebsite' as const, label: 'Show on Website', desc: 'Popup on homepage after 5s', on: 'bg-violet-600', off: 'bg-slate-300' },
                ].map(({ key, label, desc, on, off }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setForm({ ...form, [key]: !form[key] })}
                    className="flex-1 flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className={`w-9 h-5 rounded-full transition-colors flex-shrink-0 relative ${form[key] ? on : off}`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form[key] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{label}</p>
                      <p className="text-[10px] text-slate-400">{desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving || !form.code || !form.discountValue}
                className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {saving ? 'Saving…' : editTarget ? 'Update Code' : 'Create Code'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── History Drawer ── */}
      {historyPromo && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setHistoryPromo(null)} />
          <div className="relative w-full max-w-md bg-white h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <div>
                <h2 className="font-bold text-slate-900">Usage History</h2>
                <p className="text-xs text-slate-400 mt-0.5 font-mono font-semibold tracking-wider">{historyPromo.code}</p>
              </div>
              <button onClick={() => setHistoryPromo(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            {histLoading ? (
              <div className="flex-1 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
            ) : history ? (
              <div className="flex-1 overflow-y-auto">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-0 border-b border-slate-100">
                  {[
                    { label: 'Total Uses', value: history.usageCount },
                    { label: 'Limit', value: history.usageLimit ?? '∞' },
                    { label: 'Remaining', value: history.usageLimit ? Math.max(0, history.usageLimit - history.usageCount) : '∞' },
                  ].map(({ label, value }) => (
                    <div key={label} className="px-5 py-3 text-center border-r border-slate-100 last:border-r-0">
                      <p className="text-xl font-bold text-slate-900">{value}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {history.usedBy.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-300">
                    <Users className="w-10 h-10 mb-3" />
                    <p className="text-sm font-medium text-slate-400">No uses yet</p>
                    <p className="text-xs text-slate-300 mt-1">Usage will appear here once customers apply this code</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {history.usedBy.map((entry, i) => (
                      <div key={i} className="px-5 py-3.5 hover:bg-slate-50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-blue-700 text-xs font-bold">{entry.userName?.[0]?.toUpperCase() || '?'}</span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{entry.userName}</p>
                              <p className="text-xs text-slate-400 truncate">{entry.userEmail}</p>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-bold text-green-700">-₹{entry.discountApplied}</p>
                            <p className="text-xs text-slate-400">{new Date(entry.usedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                          </div>
                        </div>
                        {entry.applicationRef && (
                          <div className="mt-1.5 ml-10.5">
                            <span className="text-[10px] font-mono text-slate-400">App: {entry.applicationRef}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,6,23,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="font-bold text-slate-900 mb-1">Delete Promo Code?</h3>
            <p className="text-sm text-slate-500 mb-4">
              <span className="font-mono font-bold text-slate-800">{deleteTarget.code}</span> will be removed. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
