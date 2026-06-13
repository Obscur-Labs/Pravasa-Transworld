'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronRight, ChevronLeft, Loader2, Check, Upload, X, FileText, Search,
  Vault, CreditCard, BookOpen, Calendar, Globe, Clock, MapPin, Tag, Copy,
  Ticket, Hourglass, Users, Minus, Plus, Shield, ArrowRight, Info,
} from 'lucide-react';
import PassportUploadCard from '@/components/passport/PassportUploadCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import {
  getPublicCountries, getPublicVisaTypes, createApplication, uploadDocument,
  addDocumentFromVault, createPaymentOrder, verifyPayment, getVaultDocuments,
} from '@/lib/api';
import { loadRazorpayScript, openRazorpayCheckout, PaymentCancelledError } from '@/lib/razorpay';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import type { Country, VisaType, FormField, DocumentRequirement, VaultDocument } from '@/types';

type Step = 1 | 2 | 3 | 4;
type DocSource =
  | { type: 'vault'; vaultDocId: string; label: string; url: string }
  | { type: 'file'; file: File };
type Traveler = { key: string; label: string; type: 'adult' | 'child' };

const STEPS = ['Country', 'Visa Type', 'Applicant Details', 'Review & Pay'];
const DRAFT_KEY = 'visa_app_draft';
const ACCEPTED = '.jpg,.jpeg,.png,.pdf,.doc,.docx';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const isPassportReq = (name: string) => name.toLowerCase().includes('passport');

function getVaultType(reqName: string): string | null {
  const lower = reqName.toLowerCase();
  if (lower.includes('passport')) return 'passport';
  if (lower.includes('aadhaar') || lower.includes('aadhar') || lower.includes('adhar')) return 'aadhar';
  if (lower.includes('pan')) return 'pan';
  if (lower.includes('photograph') || lower.includes('photo')) return 'photograph';
  if (lower.includes('bank')) return 'bank_statement';
  if (lower.includes('degree') || lower.includes('diploma')) return 'degree';
  return null;
}

const CATEGORY_LABELS: Record<string, string> = {
  tourist: 'Tourist', business: 'Business', transit: 'Transit Visa', student: 'Student Visa',
};
const JURISDICTION_LABELS: Record<string, string> = {
  'pan-india': 'Pan India', mumbai: 'Mumbai', delhi: 'Delhi',
};

const fmtDate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const fmtDisplay = (s: string) => s ? new Date(s).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const buildTravelers = (adults: number, children: number): Traveler[] => {
  const list: Traveler[] = [];
  for (let i = 0; i < adults; i++) list.push({ key: `a${i}`, label: `Adult ${i + 1}`, type: 'adult' });
  for (let i = 0; i < children; i++) list.push({ key: `c${i}`, label: `Child ${i + 1}`, type: 'child' });
  return list;
};

const fieldsForTraveler = (fields: FormField[], tr: Traveler) =>
  tr.type === 'child' ? fields : fields.filter((f) => !f.childOnly);

const docsForTraveler = (docs: DocumentRequirement[], tr: Traveler) =>
  tr.type === 'child' ? docs : docs.filter((d) => !d.childOnly);

function Counter({ value, onChange, min }: { value: number; onChange: (v: number) => void; min: number }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min}
        className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-5 text-center text-base font-bold text-slate-900 tabular-nums">{value}</span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ── Travel Plan Modal with date RANGE ── */
function TravelPlanModal({
  country,
  initial,
  onConfirm,
  onClose,
}: {
  country: Country;
  initial: { startDate: string; endDate: string; adults: number; children: number };
  onConfirm: (data: { startDate: string; endDate: string; adults: number; children: number }) => void;
  onClose: () => void;
}) {
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const [adults, setAdults] = useState(initial.adults || 1);
  const [children, setChildren] = useState(initial.children || 0);
  const [startDate, setStartDate] = useState<Date | null>(initial.startDate ? new Date(initial.startDate) : null);
  const [endDate, setEndDate] = useState<Date | null>(initial.endDate ? new Date(initial.endDate) : null);
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = initial.startDate ? new Date(initial.startDate) : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const cells = useMemo(() => {
    const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
    const first = new Date(monthStart);
    first.setDate(1 - monthStart.getDay());
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(first);
      d.setDate(first.getDate() + i);
      return d;
    });
  }, [viewMonth]);

  const canGoPrev = viewMonth > new Date(today.getFullYear(), today.getMonth(), 1);
  const prevMonth = () => canGoPrev && setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  const nextMonth = () => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));

  const isInRange = (d: Date) => {
    const rangeEnd = endDate || hoverDate;
    if (!startDate || !rangeEnd) return false;
    const s = startDate < rangeEnd ? startDate : rangeEnd;
    const e = startDate < rangeEnd ? rangeEnd : startDate;
    return d > s && d < e;
  };

  const handleDayClick = (d: Date) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(new Date(d));
      setEndDate(null);
    } else {
      if (d < startDate) {
        setEndDate(startDate);
        setStartDate(new Date(d));
      } else {
        setEndDate(new Date(d));
      }
    }
  };

  const canConfirm = startDate && endDate && adults >= 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-6">
        <div className="px-6 pt-5 pb-4 flex items-start justify-between" style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#0ea5e9 100%)' }}>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">Plan Your Travel</h2>
            <p className="text-blue-200 text-xs mt-0.5 flex items-center gap-1"><Globe className="w-3 h-3" /> {country.name}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Traveler counts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Adults</p>
                <p className="text-[11px] text-slate-400 leading-tight">Age 18 and above</p>
              </div>
              <Counter value={adults} onChange={setAdults} min={1} />
            </div>
            <div className="rounded-xl border border-slate-200 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Children</p>
                <p className="text-[11px] text-slate-400 leading-tight">Below the age of 18</p>
              </div>
              <Counter value={children} onChange={setChildren} min={0} />
            </div>
          </div>

          {/* Selected range display */}
          <div className="grid grid-cols-2 gap-2">
            <div className={`rounded-xl border px-3 py-2 ${startDate ? 'border-blue-300 bg-blue-50' : 'border-dashed border-slate-200 bg-slate-50'}`}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Departure</p>
              <p className={`text-sm font-bold mt-0.5 ${startDate ? 'text-blue-800' : 'text-slate-300'}`}>
                {startDate ? fmtDisplay(fmtDate(startDate)) : 'Select date'}
              </p>
            </div>
            <div className={`rounded-xl border px-3 py-2 ${endDate ? 'border-emerald-300 bg-emerald-50' : 'border-dashed border-slate-200 bg-slate-50'}`}>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Return</p>
              <p className={`text-sm font-bold mt-0.5 ${endDate ? 'text-emerald-800' : 'text-slate-300'}`}>
                {endDate ? fmtDisplay(fmtDate(endDate)) : 'Select date'}
              </p>
            </div>
          </div>

          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 px-3 py-2 rounded-lg text-center">
            Click to select departure, click again for return date. Dates reflect on your visa.
          </p>

          {/* Calendar */}
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} disabled={!canGoPrev} className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="font-semibold text-slate-800">{MONTH_NAMES[viewMonth.getMonth()]} <span className="text-slate-400">{viewMonth.getFullYear()}</span></p>
              <button onClick={nextMonth} className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-1">
              {WEEK_DAYS.map((d) => <div key={d} className="text-center text-xs font-semibold text-violet-600 py-1">{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((d, i) => {
                const inMonth = d.getMonth() === viewMonth.getMonth();
                const past = d < today;
                const disabled = !inMonth || past;
                const isStart = startDate && sameDay(d, startDate);
                const isEnd = endDate && sameDay(d, endDate);
                const inRange = !disabled && isInRange(d);
                return (
                  <div key={i} className={`relative flex items-center justify-center ${inRange ? 'bg-blue-100' : ''} ${isStart ? 'rounded-l-full' : ''} ${isEnd ? 'rounded-r-full' : ''}`}>
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => handleDayClick(d)}
                      onMouseEnter={() => startDate && !endDate && setHoverDate(d)}
                      onMouseLeave={() => setHoverDate(null)}
                      className={`w-9 h-9 rounded-full text-sm flex items-center justify-center transition-colors z-10 relative ${
                        isStart || isEnd ? 'bg-blue-600 text-white font-bold shadow' :
                        disabled ? 'text-slate-300 cursor-not-allowed' :
                        'text-slate-700 hover:bg-blue-50'
                      }`}>
                      {d.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => canConfirm && onConfirm({ startDate: fmtDate(startDate!), endDate: fmtDate(endDate!), adults, children })}
            disabled={!canConfirm}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={canConfirm ? { background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', color: 'white', boxShadow: '0 4px 15px rgba(37,99,235,0.35)' } : { background: '#f1f5f9', color: '#94a3b8' }}>
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── New Visa Overview Modal ── */
function VisaOverviewModal({
  country, visa, isCorporate, adultRate, childRate, onClose, onContinue,
}: {
  country: Country;
  visa: VisaType;
  isCorporate: boolean;
  adultRate: number;
  childRate: number;
  onClose: () => void;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const requiredDocs = visa.documentRequirements.filter((r) => r.required);
  const optionalDocs = visa.documentRequirements.filter((r) => !r.required);

  const fullText = (() => {
    const lines: string[] = [];
    lines.push(`${visa.name} — ${country.name}`);
    if (visa.description) lines.push(visa.description);
    lines.push('');
    lines.push('VISA DETAILS');
    lines.push(`- Adult Price: ${formatCurrency(adultRate)}`);
    if (childRate > 0) lines.push(`- Child Price: ${formatCurrency(childRate)}`);
    if (visa.processingTime) lines.push(`- Processing Time: ${visa.processingTime}`);
    if (visa.validity) lines.push(`- Validity: ${visa.validity}`);
    if (visa.documentRequirements?.length) {
      lines.push('');
      lines.push('DOCUMENTS');
      visa.documentRequirements.forEach((r) => lines.push(`- ${r.name}${r.required ? ' (required)' : ' (optional)'}${r.childOnly ? ' [children only]' : ''}`));
    }
    return lines.join('\n');
  })();

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 300); };
  const handleContinue = () => { setVisible(false); setTimeout(onContinue, 300); };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Full visa details copied to clipboard.', variant: 'success' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: 'Error', description: 'Failed to copy to clipboard.', variant: 'destructive' });
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div onClick={handleClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" style={{ opacity: visible ? 1 : 0 }} />

      <div
        className="relative w-full sm:max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl z-10 flex flex-col overflow-hidden max-h-[92dvh] sm:max-h-[88vh] transition-all duration-300 ease-out"
        style={{ transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.97)', opacity: visible ? 1 : 0 }}>

        {/* Mobile handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 px-5 sm:px-6 py-4 sm:py-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <img
                  src={`https://flagcdn.com/w40/${country.flag}.png`}
                  alt={country.name}
                  className="w-12 h-8 object-cover rounded-lg shadow-lg"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div>
                <p className="text-slate-400 text-xs font-medium">{country.name}</p>
                <h2 className="text-white font-bold text-lg sm:text-xl leading-tight">{visa.name}</h2>
                {visa.description && <p className="text-slate-300/70 text-xs mt-0.5 line-clamp-1">{visa.description}</p>}
              </div>
            </div>
            <button onClick={handleClose} className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10 -mr-1 flex-shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Price + quick chips */}
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-blue-800 px-3 py-1.5 rounded-full shadow-sm">
              <CreditCard className="w-3.5 h-3.5" />
              {formatCurrency(adultRate)} / adult{isCorporate ? ' (Corp)' : ''}
            </span>
            {childRate > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 text-white px-3 py-1.5 rounded-full">
                {formatCurrency(childRate)} / child
              </span>
            )}
            {visa.processingTime && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 text-blue-100 px-3 py-1.5 rounded-full">
                <Clock className="w-3.5 h-3.5" />{visa.processingTime}
              </span>
            )}
            {visa.validity && (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/10 text-blue-100 px-3 py-1.5 rounded-full">
                <Shield className="w-3.5 h-3.5" />Valid: {visa.validity}
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 py-4 space-y-4">

          {/* Details grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {visa.visaSubType && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3.5">
                <p className="text-xs text-indigo-500 font-semibold mb-1">Visa Type</p>
                <p className="text-sm font-bold text-indigo-900">{visa.visaSubType === 'e-visa' ? 'E-Visa' : 'Sticker Visa'}</p>
              </div>
            )}
            {visa.visaCategory && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                <div className="flex items-center gap-1 mb-1"><Tag className="w-3 h-3 text-slate-400" /><p className="text-xs text-slate-500 font-semibold">Category</p></div>
                <p className="text-sm font-bold text-slate-800">{CATEGORY_LABELS[visa.visaCategory] || visa.visaCategory}</p>
              </div>
            )}
            {visa.processingTime && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                <div className="flex items-center gap-1 mb-1"><Clock className="w-3 h-3 text-slate-400" /><p className="text-xs text-slate-500 font-semibold">Processing</p></div>
                <p className="text-sm font-bold text-slate-800">{visa.processingTime}</p>
              </div>
            )}
            {visa.stayDuration && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                <div className="flex items-center gap-1 mb-1"><Calendar className="w-3 h-3 text-slate-400" /><p className="text-xs text-slate-500 font-semibold">Stay Duration</p></div>
                <p className="text-sm font-bold text-slate-800">{visa.stayDuration}</p>
              </div>
            )}
            {visa.jurisdiction && (
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5">
                <div className="flex items-center gap-1 mb-1"><MapPin className="w-3 h-3 text-slate-400" /><p className="text-xs text-slate-500 font-semibold">Jurisdiction</p></div>
                <p className="text-sm font-bold text-slate-800">{JURISDICTION_LABELS[visa.jurisdiction] || visa.jurisdiction}</p>
              </div>
            )}
          </div>

          {/* Entry */}
          {visa.entry && visa.entry.length > 0 && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Entry Type</p>
              <div className="flex flex-wrap gap-2">
                {visa.entry.map((e) => (
                  <span key={e} className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 capitalize">{e} Entry</span>
                ))}
              </div>
            </div>
          )}

          {/* About */}
          {visa.description && (
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">About</p>
              <p className="text-sm text-slate-600 leading-relaxed">{visa.description}</p>
            </div>
          )}

          {/* Documents */}
          {visa.documentRequirements.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-slate-800">
                  Documents Required
                  <span className="ml-1.5 text-xs font-normal text-slate-400">({visa.documentRequirements.length} total)</span>
                </p>
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95 px-2.5 py-1.5 rounded-lg transition-all duration-150">
                  {copied ? (<><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Copied!</span></>) : (<><Copy className="w-3.5 h-3.5" />Copy All</>)}
                </button>
              </div>

              {requiredDocs.length > 0 && (
                <div className="mb-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-500">Required</p>
                  {requiredDocs.map((req) => (
                    <div key={req._id || req.name} className="flex items-start gap-2.5 p-3 bg-red-50/60 rounded-xl border border-red-100">
                      <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5"><FileText className="w-3.5 h-3.5" /></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 leading-snug">{req.name}</p>
                        {req.description && <p className="text-xs text-slate-500 mt-0.5">{req.description}</p>}
                        {req.childOnly && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Children only</span>}
                      </div>
                      <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full flex-shrink-0">Required</span>
                    </div>
                  ))}
                </div>
              )}

              {optionalDocs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Optional</p>
                  {optionalDocs.map((req) => (
                    <div key={req._id || req.name} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center flex-shrink-0 mt-0.5"><FileText className="w-3.5 h-3.5" /></span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-700 leading-snug">{req.name}</p>
                        {req.description && <p className="text-xs text-slate-400 mt-0.5">{req.description}</p>}
                        {req.childOnly && <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Children only</span>}
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full flex-shrink-0">Optional</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer CTA */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <button onClick={handleContinue}
            className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md">
            Continue with {visa.name}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button onClick={handleClose} className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors">Choose a different visa</button>
        </div>
      </div>
    </div>
  );
}

/* ── New Modern Visa Card ── */
function VisaCard({ visa, selected, adultPrice, childPrice, onClick }: {
  visa: VisaType;
  selected: boolean;
  adultPrice: number;
  childPrice: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl overflow-hidden border-2 text-left transition-all duration-200 group ${
        selected ? 'border-blue-500 ring-2 ring-blue-100 shadow-lg' : 'border-slate-200 hover:border-blue-300 hover:shadow-lg'
      }`}
    >
      {/* Card header */}
      <div className="relative overflow-hidden px-5 py-5 bg-gradient-to-br from-slate-800 via-blue-900 to-indigo-900">
        <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
        <div className="relative z-10">
          <div className="flex items-start justify-between mb-3">
            <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${
              visa.visaSubType === 'e-visa' ? 'bg-blue-400/30 text-blue-100' : 'bg-amber-400/30 text-amber-100'
            }`}>
              {visa.visaSubType === 'e-visa' ? 'E-Visa' : 'Sticker'}
            </span>
            {visa.entry?.[0] && (
              <span className="text-[10px] text-white/60 capitalize bg-white/10 px-2 py-0.5 rounded-full">{visa.entry[0]} Entry</span>
            )}
          </div>
          <h3 className="text-white font-bold text-base leading-tight">{visa.name}</h3>
          {visa.visaCategory && (
            <p className="text-white/60 text-xs mt-1 capitalize">{CATEGORY_LABELS[visa.visaCategory] || visa.visaCategory}</p>
          )}
        </div>
      </div>

      {/* Details rows */}
      <div className="bg-white divide-y divide-slate-100">
        {visa.processingTime && (
          <div className="flex items-center justify-between px-5 py-2.5">
            <span className="flex items-center gap-2 text-sm text-slate-500"><Clock className="w-3.5 h-3.5 text-slate-400" />Processing</span>
            <span className="text-sm font-bold text-slate-800">{visa.processingTime}</span>
          </div>
        )}
        {visa.stayDuration && (
          <div className="flex items-center justify-between px-5 py-2.5">
            <span className="flex items-center gap-2 text-sm text-slate-500"><Calendar className="w-3.5 h-3.5 text-slate-400" />Stay</span>
            <span className="text-sm font-bold text-slate-800">{visa.stayDuration}</span>
          </div>
        )}
        {visa.validity && (
          <div className="flex items-center justify-between px-5 py-2.5">
            <span className="flex items-center gap-2 text-sm text-slate-500"><Shield className="w-3.5 h-3.5 text-slate-400" />Valid</span>
            <span className="text-sm font-bold text-slate-800">{visa.validity}</span>
          </div>
        )}

        {/* Price footer */}
        <div className="px-5 py-3 bg-gradient-to-r from-slate-50 to-blue-50/50 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">From</p>
            <p className="text-lg font-bold text-blue-700">{formatCurrency(adultPrice)}</p>
            <p className="text-[10px] text-slate-400">per adult</p>
          </div>
          {childPrice > 0 && (
            <div className="text-right">
              <p className="text-[10px] text-slate-400">Child</p>
              <p className="text-sm font-bold text-slate-600">{formatCurrency(childPrice)}</p>
            </div>
          )}
          <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            selected ? 'bg-blue-600' : 'bg-slate-100 group-hover:bg-blue-100'
          }`}>
            <ArrowRight className={`w-4 h-4 ${selected ? 'text-white' : 'text-slate-400 group-hover:text-blue-600'}`} />
          </div>
        </div>
      </div>
    </button>
  );
}

export default function ApplyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isCorporate = user?.accountType === 'corporate';

  const rateParts = (v: VisaType) => {
    const useCorpAdult = isCorporate && (v.corporateAdultPrice != null || v.corporateAdultServiceFee != null);
    const useCorpChild = isCorporate && (v.corporateChildPrice != null || v.corporateChildServiceFee != null);
    return {
      adultBase: useCorpAdult && v.corporateAdultPrice != null ? v.corporateAdultPrice : (v.adultPrice || v.price),
      adultFee: useCorpAdult && v.corporateAdultServiceFee != null ? v.corporateAdultServiceFee : (v.adultServiceFee || 0),
      childBase: useCorpChild && v.corporateChildPrice != null ? v.corporateChildPrice : (v.childPrice || 0),
      childFee: useCorpChild && v.corporateChildServiceFee != null ? v.corporateChildServiceFee : (v.childServiceFee || 0),
      corp: useCorpAdult || useCorpChild,
    };
  };
  const adultRate = (v: VisaType) => { const r = rateParts(v); return r.adultBase + r.adultFee; };
  const childRate = (v: VisaType) => { const r = rateParts(v); return r.childBase + r.childFee; };

  const [step, setStep] = useState<Step>(1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedVisa, setSelectedVisa] = useState<VisaType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [docSources, setDocSources] = useState<Record<string, DocSource>>({});
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [countrySearch, setCountrySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [travelStartDate, setTravelStartDate] = useState('');
  const [travelEndDate, setTravelEndDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [activeTraveler, setActiveTraveler] = useState(0);

  const [showTravelModal, setShowTravelModal] = useState(false);
  const [pendingCountry, setPendingCountry] = useState<Country | null>(null);
  const [showVisaOverview, setShowVisaOverview] = useState(false);

  const travelers = useMemo(() => buildTravelers(adults, children), [adults, children]);
  const orderTotal = (v: VisaType) => adults * adultRate(v) + children * childRate(v);

  useEffect(() => {
    getPublicCountries().then((r) => setCountries(r.data.data));
    getVaultDocuments().then((r) => setVaultDocs(r.data.data || [])).catch(() => {});

    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.selectedCountry) setSelectedCountry(d.selectedCountry);
        if (d.selectedVisa) setSelectedVisa(d.selectedVisa);
        if (d.visaTypes) setVisaTypes(d.visaTypes);
        if (d.formData) setFormData(d.formData);
        if (d.step) setStep(d.step as Step);
        if (d.travelStartDate) setTravelStartDate(d.travelStartDate);
        if (d.travelEndDate) setTravelEndDate(d.travelEndDate);
        if (d.adults) setAdults(d.adults);
        if (typeof d.children === 'number') setChildren(d.children);
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    setDraftRestored(true);
  }, []);

  useEffect(() => {
    if (!draftRestored || !selectedCountry) return;
    const draft = { step, selectedCountry, selectedVisa, formData, visaTypes, travelStartDate, travelEndDate, adults, children };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draftRestored, step, selectedCountry, selectedVisa, formData, visaTypes, travelStartDate, travelEndDate, adults, children]);

  useEffect(() => {
    if (activeTraveler > travelers.length - 1) setActiveTraveler(0);
  }, [travelers.length, activeTraveler]);

  const startOver = () => {
    localStorage.removeItem(DRAFT_KEY);
    setStep(1);
    setSelectedCountry(null);
    setSelectedVisa(null);
    setFormData({});
    setDocSources({});
    setVisaTypes([]);
    setCountrySearch('');
    setTravelStartDate('');
    setTravelEndDate('');
    setAdults(1);
    setChildren(0);
    setActiveTraveler(0);
  };

  const handleCountrySelect = (country: Country) => {
    setPendingCountry(country);
    setShowTravelModal(true);
  };

  const confirmTravelPlan = async (data: { startDate: string; endDate: string; adults: number; children: number }) => {
    setTravelStartDate(data.startDate);
    setTravelEndDate(data.endDate);
    setAdults(data.adults);
    setChildren(data.children);
    setActiveTraveler(0);
    setShowTravelModal(false);
    if (!pendingCountry) return;
    const country = pendingCountry;
    setPendingCountry(null);
    setSelectedCountry(country);
    setSelectedVisa(null);
    setDocSources({});
    setLoading(true);
    try {
      const r = await getPublicVisaTypes(country._id);
      setVisaTypes(r.data.data);
    } finally {
      setLoading(false);
    }
    setStep(2);
  };

  const docKey = (tr: Traveler, reqName: string, suffix = '') => `${tr.key}::${reqName}${suffix}`;

  const pickFileFor = (storeKey: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED;
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) setDocSources((prev) => ({ ...prev, [storeKey]: { type: 'file', file } }));
    };
    input.click();
  };

  const clearDocSource = (storeKey: string) => {
    setDocSources((prev) => { const next = { ...prev }; delete next[storeKey]; return next; });
  };

  const selectVaultDoc = (storeKey: string, vaultDoc: VaultDocument) => {
    setDocSources((prev) => ({ ...prev, [storeKey]: { type: 'vault', vaultDocId: vaultDoc._id, label: vaultDoc.label, url: vaultDoc.url } }));
  };

  const handleSubmit = async () => {
    if (!selectedVisa) return;
    setSubmitting(true);
    try {
      setSubmitStatus('Creating application…');
      const responses: Record<string, string> = {};
      const sortedFields = [...selectedVisa.formFields].sort((a, b) => a.order - b.order);
      for (const tr of travelers) {
        for (const f of fieldsForTraveler(sortedFields, tr)) {
          const val = formData[`${tr.key}__${f.fieldName}`];
          const key = `${tr.label} — ${f.label || f.fieldName}`.replace(/\./g, ' ');
          if (val && String(val).trim()) responses[key] = String(val);
        }
      }
      if (travelStartDate) responses['Travel Start Date'] = travelStartDate;
      if (travelEndDate) responses['Travel End Date'] = travelEndDate;

      const r = await createApplication({ visaTypeId: selectedVisa._id, formResponses: responses, adults, children, travelDate: travelStartDate });
      const appId = r.data.data._id;

      const reqs = selectedVisa.documentRequirements;
      let uploadIdx = 0;
      const doUpload = async (file: File, requirementName: string) => {
        uploadIdx++;
        setSubmitStatus(`Uploading documents (${uploadIdx})…`);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('requirementName', requirementName);
        await uploadDocument(appId, fd);
      };

      for (const tr of travelers) {
        for (const req of docsForTraveler(reqs, tr)) {
          const label = `${tr.label} - ${req.name}`;
          if (isPassportReq(req.name)) {
            const frontSrc = docSources[docKey(tr, req.name, '__front')];
            const backSrc = docSources[docKey(tr, req.name, '__back')];
            if (frontSrc?.type === 'file') await doUpload(frontSrc.file, `${label} (Front)`);
            if (backSrc?.type === 'file') await doUpload(backSrc.file, `${label} (Back)`);
          } else {
            const source = docSources[docKey(tr, req.name)];
            if (!source) continue;
            uploadIdx++;
            setSubmitStatus(`Uploading documents (${uploadIdx})…`);
            if (source.type === 'vault') {
              await addDocumentFromVault(appId, { vaultDocId: source.vaultDocId, requirementName: label });
            } else {
              const fd = new FormData();
              fd.append('file', source.file);
              fd.append('requirementName', label);
              await uploadDocument(appId, fd);
            }
          }
        }
      }

      setSubmitStatus('Initializing secure payment…');
      localStorage.removeItem(DRAFT_KEY);
      const orderRes = await createPaymentOrder(appId);
      const order = orderRes.data.data;
      await loadRazorpayScript();

      let checkout;
      try {
        checkout = await openRazorpayCheckout(order);
      } catch (err) {
        if (err instanceof PaymentCancelledError) {
          toast({ title: 'Payment pending', description: 'Your application was saved. You can complete payment from the application page.' });
          router.push(`/applications/${appId}`);
          return;
        }
        throw err;
      }

      setSubmitStatus('Verifying payment…');
      await verifyPayment(appId, checkout);

      toast({ title: 'Application submitted!', description: 'Payment received. Our team will review your documents shortly.', variant: 'success' });
      router.push(`/applications/${appId}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to submit', variant: 'destructive' });
    } finally {
      setSubmitting(false);
      setSubmitStatus('');
    }
  };

  const goNext = () => setStep((s) => Math.min(s + 1, 4) as Step);
  const goBack = () => setStep((s) => Math.max(s - 1, 1) as Step);

  const sortedFields = selectedVisa ? [...selectedVisa.formFields].sort((a, b) => a.order - b.order) : [];
  const requirements: DocumentRequirement[] = selectedVisa?.documentRequirements || [];

  const travelerComplete = (tr: Traveler) => {
    const fieldsOk = fieldsForTraveler(sortedFields, tr).filter((f) => f.required).every((f) => !!formData[`${tr.key}__${f.fieldName}`]?.trim());
    const trDocs = docsForTraveler(requirements, tr);
    const docsOk = trDocs.filter((r) => r.required).every((r) => {
      if (isPassportReq(r.name)) return !!docSources[docKey(tr, r.name, '__front')] && !!docSources[docKey(tr, r.name, '__back')];
      return !!docSources[docKey(tr, r.name)];
    });
    return fieldsOk && docsOk;
  };

  const canProceed = () => {
    if (step === 1) return !!selectedCountry;
    if (step === 2) return !!selectedVisa && !loading;
    if (step === 3) return travelers.every(travelerComplete);
    return true;
  };

  const renderField = (field: FormField, prefix: string) => {
    const key = `${prefix}__${field.fieldName}`;
    const common = {
      id: key,
      value: formData[key] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFormData({ ...formData, [key]: e.target.value }),
    };

    if (field.type === 'select') {
      return (
        <Select value={formData[key] || ''} onValueChange={(v) => setFormData({ ...formData, [key]: v })}>
          <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select an option'} /></SelectTrigger>
          <SelectContent>
            {field.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (field.type === 'textarea') {
      return <textarea {...common} rows={3} placeholder={field.placeholder} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />;
    }
    if (field.type === 'radio' && field.options.length > 0) {
      return (
        <div className="flex flex-wrap gap-4 mt-1">
          {field.options.map((o) => (
            <label key={o} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={key} value={o} checked={formData[key] === o} onChange={() => setFormData({ ...formData, [key]: o })} className="text-blue-600 focus:ring-blue-500" />
              <span className="text-sm text-slate-700">{o}</span>
            </label>
          ))}
        </div>
      );
    }
    if (field.type === 'file') {
      return (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-slate-300 bg-slate-50">
          <div className="flex-1 min-w-0">
            {formData[key] ? <span className="text-sm text-green-700 font-medium truncate">✓ {formData[key]}</span> : <span className="text-sm text-slate-400">{field.placeholder || 'No file selected'}</span>}
          </div>
          <button type="button" className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors flex-shrink-0"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = ACCEPTED;
              input.onchange = (e: any) => { const file = e.target?.files?.[0]; if (file) setFormData({ ...formData, [key]: file.name }); };
              input.click();
            }}>
            <Upload className="w-3.5 h-3.5" /> Browse
          </button>
        </div>
      );
    }
    return <Input {...common} type={field.type} placeholder={field.placeholder} />;
  };

  const renderDocCard = (tr: Traveler, req: DocumentRequirement) => {
    if (isPassportReq(req.name)) {
      const frontSrc = docSources[docKey(tr, req.name, '__front')];
      const backSrc = docSources[docKey(tr, req.name, '__back')];
      return (
        <PassportUploadCard
          key={req._id || req.name}
          requirementName={`${tr.label} — ${req.name}`}
          frontFile={frontSrc?.type === 'file' ? frontSrc.file : null}
          backFile={backSrc?.type === 'file' ? backSrc.file : null}
          onFrontChange={(file) => {
            if (file) setDocSources((p) => ({ ...p, [docKey(tr, req.name, '__front')]: { type: 'file', file } }));
            else clearDocSource(docKey(tr, req.name, '__front'));
          }}
          onBackChange={(file) => {
            if (file) setDocSources((p) => ({ ...p, [docKey(tr, req.name, '__back')]: { type: 'file', file } }));
            else clearDocSource(docKey(tr, req.name, '__back'));
          }}
        />
      );
    }

    const sk = docKey(tr, req.name);
    const source = docSources[sk];
    const vaultType = getVaultType(req.name);
    const vaultMatches = vaultType ? vaultDocs.filter((v) => v.type === vaultType) : [];

    return (
      <div key={req._id || req.name} className={`rounded-xl border-2 p-4 transition-all ${source ? 'border-green-200 bg-green-50' : req.required ? 'border-slate-200 bg-white hover:border-blue-200' : 'border-dashed border-slate-200 bg-slate-50/50'}`}>
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${source ? 'bg-green-100' : 'bg-slate-100'}`}>
            {source ? <Check className="w-4 h-4 text-green-600" /> : <FileText className="w-4 h-4 text-slate-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {req.name}
              {req.required && <span className="text-red-500 ml-1">*</span>}
              {!req.required && <span className="text-slate-400 ml-1.5 text-xs font-normal">(optional)</span>}
              {req.childOnly && <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">Children only</span>}
            </p>
            {req.description && <p className="text-xs text-slate-400 mt-0.5">{req.description}</p>}
          </div>
        </div>

        {source && (
          <div className="flex items-center gap-2 mb-3 ml-11">
            {source.type === 'vault' ? (
              <span className="text-xs text-green-700 font-medium flex items-center gap-1"><Vault className="w-3 h-3" /> From vault: {source.label}</span>
            ) : (
              <span className="text-xs text-green-700 font-medium truncate max-w-[200px]">{source.file.name}<span className="text-slate-400 ml-1">· {formatBytes(source.file.size)}</span></span>
            )}
            <button onClick={() => clearDocSource(sk)} className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><X className="w-3.5 h-3.5" /></button>
          </div>
        )}

        {vaultMatches.length > 0 && (
          <div className="flex flex-wrap gap-2 ml-11 mb-2">
            {vaultMatches.map((vd) => {
              const isSelected = source?.type === 'vault' && source.vaultDocId === vd._id;
              return (
                <button key={vd._id} onClick={() => isSelected ? clearDocSource(sk) : selectVaultDoc(sk, vd)}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${isSelected ? 'bg-green-100 border-green-300 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'}`}>
                  <Vault className="w-3 h-3" />
                  {isSelected ? `Selected: ${vd.label} ✓` : `Use from vault: ${vd.label}`}
                </button>
              );
            })}
          </div>
        )}

        <div className="ml-11">
          <button onClick={() => pickFileFor(sk)} className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors">
            <Upload className="w-3.5 h-3.5" />
            {source?.type === 'file' ? 'Replace file' : 'Upload new file'}
          </button>
        </div>
      </div>
    );
  };

  const activeTr = travelers[Math.min(activeTraveler, travelers.length - 1)] || travelers[0];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {showTravelModal && pendingCountry && (
        <TravelPlanModal
          country={pendingCountry}
          initial={{ startDate: travelStartDate, endDate: travelEndDate, adults, children }}
          onConfirm={confirmTravelPlan}
          onClose={() => { setShowTravelModal(false); setPendingCountry(null); }}
        />
      )}

      {showVisaOverview && selectedVisa && selectedCountry && (
        <VisaOverviewModal
          country={selectedCountry}
          visa={selectedVisa}
          isCorporate={isCorporate}
          adultRate={adultRate(selectedVisa)}
          childRate={childRate(selectedVisa)}
          onClose={() => setShowVisaOverview(false)}
          onContinue={() => { setShowVisaOverview(false); goNext(); }}
        />
      )}

      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Apply for Visa</h1>
        {(step > 1 || !!selectedCountry) && (
          <button onClick={startOver} className="text-xs text-slate-400 hover:text-red-500 transition-colors mt-1.5 flex-shrink-0">Start over</button>
        )}
      </div>
      <p className="text-slate-500 text-sm mb-8">
        {step > 1 || selectedCountry ? 'Your progress has been saved — continue where you left off.' : 'Complete the steps below to submit your application.'}
      </p>

      {/* Step Indicator */}
      <div className="flex items-center mb-8">
        {STEPS.map((label, i) => {
          const n = (i + 1) as Step;
          const done = step > n;
          const active = step === n;
          return (
            <div key={label} className="flex items-center flex-1 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ml-1.5 mr-1 ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-slate-400'}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-1 ${step > n ? 'bg-green-300' : 'bg-slate-200'}`} />}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">

        {/* ── Step 1: Country ── */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Destination Country</h2>
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input className="pl-9" placeholder="Search countries..." value={countrySearch} onChange={(e) => setCountrySearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {countries.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase())).map((c) => (
                <button key={c._id} onClick={() => handleCountrySelect(c)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${selectedCountry?._id === c._id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'}`}>
                  <img src={`https://flagcdn.com/w40/${c.flag}.png`} alt={c.name} className="w-8 h-5 object-cover rounded mb-2" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                </button>
              ))}
              {countries.filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase())).length === 0 && (
                <p className="col-span-3 text-center text-slate-400 py-6 text-sm">No countries match "{countrySearch}".</p>
              )}
            </div>
          </div>
        )}

        {/* ── Step 2: Visa Type ── */}
        {step === 2 && (
          <div>
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Select Visa Type</h2>
              <div className="flex items-center gap-2 flex-wrap">
                {travelStartDate && (
                  <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                    <Calendar className="w-3 h-3" />
                    {new Date(travelStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    {travelEndDate && <> → {new Date(travelEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</>}
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full font-medium">
                  <Users className="w-3 h-3" /> {adults} Adult{adults > 1 ? 's' : ''}{children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''}
                </span>
                <button onClick={() => { setPendingCountry(selectedCountry); setShowTravelModal(true); }} className="text-xs text-blue-600 hover:text-blue-800 font-medium underline underline-offset-2">Edit</button>
              </div>
            </div>
            <p className="text-slate-500 text-sm mb-4 flex items-center gap-1.5">
              Visas available for
              {selectedCountry && <img src={`https://flagcdn.com/w20/${selectedCountry.flag}.png`} alt="" className="w-5 h-3 object-cover rounded" />}
              <span className="font-medium">{selectedCountry?.name}</span>
            </p>
            {loading ? (
              <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" /></div>
            ) : visaTypes.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No visa types available for this country.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visaTypes.map((v) => (
                  <VisaCard
                    key={v._id}
                    visa={v}
                    selected={selectedVisa?._id === v._id}
                    adultPrice={adultRate(v)}
                    childPrice={childRate(v)}
                    onClick={() => { setSelectedVisa(v); setDocSources({}); setShowVisaOverview(true); }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Applicant Details ── */}
        {step === 3 && selectedVisa && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Applicant Details</h2>
              <span className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                <Users className="w-3 h-3" /> {travelers.length} traveller{travelers.length > 1 ? 's' : ''}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 mb-5 border-b border-slate-100 pb-3">
              {travelers.map((tr, idx) => {
                const isActive = idx === Math.min(activeTraveler, travelers.length - 1);
                const complete = travelerComplete(tr);
                return (
                  <button key={tr.key} onClick={() => setActiveTraveler(idx)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border-2 transition-all ${
                      isActive ? (tr.type === 'adult' ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-emerald-500 bg-emerald-50 text-emerald-800')
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}>
                    {complete ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Users className="w-3.5 h-3.5" />}
                    {tr.label}
                  </button>
                );
              })}
            </div>

            {activeTr && (
              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">{activeTr.label} · Details</p>
                  {fieldsForTraveler(sortedFields, activeTr).length === 0 ? (
                    <p className="text-sm text-slate-400">No form fields required for this traveller.</p>
                  ) : (
                    <div className="space-y-4">
                      {fieldsForTraveler(sortedFields, activeTr).map((field) => (
                        <div key={field._id || field.fieldName}>
                          <Label htmlFor={`${activeTr.key}__${field.fieldName}`}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                            {field.childOnly && <span className="ml-1.5 text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Child</span>}
                          </Label>
                          <div className="mt-1">{renderField(field, activeTr.key)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {docsForTraveler(requirements, activeTr).length > 0 && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-3">{activeTr.label} · Documents</p>
                    <div className="space-y-3">
                      {docsForTraveler(requirements, activeTr).map((req) => renderDocCard(activeTr, req))}
                    </div>
                    <p className="text-xs text-slate-400 mt-3">Accepted formats: PDF, JPG, PNG, DOC, DOCX · Max 10 MB per file</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button disabled={activeTraveler === 0} onClick={() => setActiveTraveler((i) => Math.max(0, i - 1))}
                    className="text-sm text-slate-500 hover:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1">
                    <ChevronLeft className="w-4 h-4" /> Previous traveller
                  </button>
                  {activeTraveler < travelers.length - 1 ? (
                    <button onClick={() => setActiveTraveler((i) => Math.min(travelers.length - 1, i + 1))}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      Next traveller <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : <span className="text-xs text-slate-400">All travellers</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Review & Pay ── */}
        {step === 4 && selectedVisa && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Review &amp; Pay</h2>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wide">Visa Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-slate-400">Country</p>
                    <p className="font-medium flex items-center gap-1.5 mt-0.5">
                      {selectedCountry && <img src={`https://flagcdn.com/w20/${selectedCountry.flag}.png`} alt="" className="w-5 h-3 object-cover rounded" />}
                      {selectedCountry?.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Visa Type</p>
                    <p className="font-medium mt-0.5">{selectedVisa.name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Travellers</p>
                    <p className="font-medium mt-0.5">{adults} Adult{adults > 1 ? 's' : ''}{children > 0 ? `, ${children} Child${children > 1 ? 'ren' : ''}` : ''}</p>
                  </div>
                  {travelStartDate && (
                    <div>
                      <p className="text-xs text-slate-400">Departure Date</p>
                      <p className="font-medium mt-0.5">{new Date(travelStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  )}
                  {travelEndDate && (
                    <div>
                      <p className="text-xs text-slate-400">Return Date</p>
                      <p className="font-medium mt-0.5">{new Date(travelEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-400">Processing Time</p>
                    <p className="font-medium mt-0.5">{selectedVisa.processingTime}</p>
                  </div>
                  {selectedVisa.validity && (
                    <div>
                      <p className="text-xs text-slate-400">Validity</p>
                      <p className="font-medium mt-0.5">{selectedVisa.validity}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Per-traveller details + documents */}
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wide">Traveller Details</p>
                <div className="space-y-4">
                  {travelers.map((tr) => {
                    const entries = fieldsForTraveler(sortedFields, tr)
                      .map((f) => [f.label || f.fieldName, formData[`${tr.key}__${f.fieldName}`]] as const)
                      .filter(([, v]) => v && String(v).trim());
                    return (
                      <div key={tr.key} className="border-t border-slate-100 first:border-t-0 pt-3 first:pt-0">
                        <p className={`text-xs font-bold mb-1.5 ${tr.type === 'adult' ? 'text-blue-700' : 'text-emerald-700'}`}>{tr.label}</p>
                        {entries.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No details provided</p>
                        ) : (
                          <div className="space-y-1 text-sm">
                            {entries.map(([k, v]) => (
                              <div key={k} className="flex justify-between gap-4">
                                <span className="text-slate-500 shrink-0">{k}</span>
                                <span className="font-medium text-slate-900 text-right truncate">{v}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {docsForTraveler(requirements, tr).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {docsForTraveler(requirements, tr).map((req) => {
                              if (isPassportReq(req.name)) {
                                const f = docSources[docKey(tr, req.name, '__front')];
                                const b = docSources[docKey(tr, req.name, '__back')];
                                const ok = f && b;
                                return (
                                  <div key={req._id || req.name} className="flex items-center justify-between text-xs">
                                    <span className="text-slate-600 flex items-center gap-1"><BookOpen className="w-3 h-3 text-slate-400" /> {req.name} (Front & Back)</span>
                                    {ok ? <span className="text-green-700 font-medium flex items-center gap-1"><Check className="w-3 h-3" /> Provided</span> : <span className="text-slate-400 italic">Not provided</span>}
                                  </div>
                                );
                              }
                              const src = docSources[docKey(tr, req.name)];
                              return (
                                <div key={req._id || req.name} className="flex items-center justify-between text-xs">
                                  <span className="text-slate-600">{req.name}{req.required && <span className="text-red-400 ml-1">*</span>}</span>
                                  {src ? <span className="text-green-700 font-medium flex items-center gap-1">{src.type === 'vault' ? <Vault className="w-3 h-3" /> : <Check className="w-3 h-3" />} {src.type === 'vault' ? src.label : src.file.name}</span> : <span className="text-slate-400 italic">Not provided</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pricing breakdown */}
              {(() => {
                const r = rateParts(selectedVisa);
                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-3">Payment Summary</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-600">{adults} × Adult @ {formatCurrency(r.adultBase)}</span>
                        <span className="font-medium text-slate-800">{formatCurrency(adults * r.adultBase)}</span>
                      </div>
                      {r.adultFee > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{adults} × Adult service fee @ {formatCurrency(r.adultFee)}</span>
                          <span className="text-slate-600">{formatCurrency(adults * r.adultFee)}</span>
                        </div>
                      )}
                      {children > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="text-slate-600">{children} × Child @ {formatCurrency(r.childBase)}</span>
                          <span className="font-medium text-slate-800">{formatCurrency(children * r.childBase)}</span>
                        </div>
                      )}
                      {children > 0 && r.childFee > 0 && (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500">{children} × Child service fee @ {formatCurrency(r.childFee)}</span>
                          <span className="text-slate-600">{formatCurrency(children * r.childFee)}</span>
                        </div>
                      )}
                      <div className="border-t border-blue-200 pt-2" />
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-blue-800">Total</p>
                          {r.corp && <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Corporate</span>}
                        </div>
                        <p className="text-2xl font-bold text-blue-900">{formatCurrency(orderTotal(selectedVisa))}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end mt-3"><CreditCard className="w-6 h-6 text-blue-400" /></div>
                  </div>
                );
              })()}

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-sm text-emerald-700">
                  <strong>Secure payment via Razorpay</strong> — you&apos;ll be redirected to a secure checkout to pay with UPI, card, or netbanking.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={goBack} disabled={step === 1 || submitting}>
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        {step < 4 ? (
          <Button onClick={goNext} disabled={!canProceed()}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting} className="min-w-[200px]">
            {submitting ? (
              <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /><span className="text-xs">{submitStatus || 'Submitting…'}</span></span>
            ) : (
              <span className="flex items-center gap-2"><CreditCard className="w-4 h-4" />Pay &amp; Submit Application</span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
