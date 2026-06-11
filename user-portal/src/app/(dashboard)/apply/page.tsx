'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Loader2, Check, Upload, X, FileText, AlertCircle, Search, Vault, CreditCard, BookOpen, Calendar, Globe, Clock, MapPin, Tag, Copy, Plane, Ticket, Hourglass, Home, Users, Minus, Plus } from 'lucide-react';
import PassportUploadCard from '@/components/passport/PassportUploadCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { getPublicCountries, getPublicVisaTypes, createApplication, uploadDocument, addDocumentFromVault, createPaymentOrder, verifyPayment, getVaultDocuments } from '@/lib/api';
import { loadRazorpayScript, openRazorpayCheckout, PaymentCancelledError } from '@/lib/razorpay';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import type { Country, VisaType, FormField, DocumentRequirement, VaultDocument } from '@/types';

type Step = 1 | 2 | 3 | 4 | 5;
type DocSource =
  | { type: 'vault'; vaultDocId: string; label: string; url: string }
  | { type: 'file'; file: File };
type Traveler = { key: string; label: string; type: 'adult' | 'child' };

const STEPS = ['Country', 'Visa Type', 'Application Form', 'Documents', 'Review & Pay'];
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
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const buildTravelers = (adults: number, children: number): Traveler[] => {
  const list: Traveler[] = [];
  for (let i = 0; i < adults; i++) list.push({ key: `a${i}`, label: `Adult ${i + 1}`, type: 'adult' });
  for (let i = 0; i < children; i++) list.push({ key: `c${i}`, label: `Child ${i + 1}`, type: 'child' });
  return list;
};

/* ── Counter control ── */
function Counter({ value, onChange, min }: { value: number; onChange: (v: number) => void; min: number }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-5 text-center text-base font-bold text-slate-900 tabular-nums">{value}</span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

/* ── Travel Plan Modal: travelers + calendar ── */
function TravelPlanModal({
  country,
  initial,
  onConfirm,
  onClose,
}: {
  country: Country;
  initial: { date: string; adults: number; children: number };
  onConfirm: (data: { date: string; adults: number; children: number }) => void;
  onClose: () => void;
}) {
  const today = useMemo(() => { const t = new Date(); t.setHours(0, 0, 0, 0); return t; }, []);
  const [adults, setAdults] = useState(initial.adults || 1);
  const [children, setChildren] = useState(initial.children || 0);
  const [selected, setSelected] = useState<Date | null>(initial.date ? new Date(initial.date) : null);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = initial.date ? new Date(initial.date) : today;
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-6">
        <div className="px-6 pt-5 pb-4 flex items-start justify-between" style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#0ea5e9 100%)' }}>
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">When are you planning to go?</h2>
            <p className="text-blue-200 text-xs mt-0.5 flex items-center gap-1"><Globe className="w-3 h-3" /> {country.name}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-5 space-y-4">
          {/* Travelers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Adults</p>
                <p className="text-[11px] text-slate-400 leading-tight">Travellers aged 18 and above</p>
              </div>
              <Counter value={adults} onChange={setAdults} min={1} />
            </div>
            <div className="rounded-xl border border-slate-200 p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-800">Children</p>
                <p className="text-[11px] text-slate-400 leading-tight">Travellers below the age of 18</p>
              </div>
              <Counter value={children} onChange={setChildren} min={0} />
            </div>
          </div>

          {/* Info banner */}
          <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5">
            <p className="text-xs font-medium text-amber-700 text-center">Selected dates will be reflected on your visa, so please choose them carefully.</p>
          </div>

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
                const isSel = selected && sameDay(d, selected);
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={disabled}
                    onClick={() => setSelected(new Date(d))}
                    className={`mx-auto w-9 h-9 rounded-full text-sm flex items-center justify-center transition-colors ${
                      isSel ? 'bg-blue-600 text-white font-bold shadow'
                      : disabled ? 'text-slate-300 cursor-not-allowed'
                      : 'text-slate-700 hover:bg-blue-50'
                    }`}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            onClick={() => selected && onConfirm({ date: fmtDate(selected), adults, children })}
            disabled={!selected}
            className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={selected ? { background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', color: 'white', boxShadow: '0 4px 15px rgba(37,99,235,0.35)' } : { background: '#f1f5f9', color: '#94a3b8' }}
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Visa Overview Modal (visa info + document requirements + price confirmation) ── */
function VisaOverviewModal({
  country,
  visa,
  isCorporate,
  adults,
  children,
  onClose,
  onContinue,
}: {
  country: Country;
  visa: VisaType;
  isCorporate: boolean;
  adults: number;
  children: number;
  onClose: () => void;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const adultRate = isCorporate && visa.corporateAdultPrice ? visa.corporateAdultPrice : (visa.adultPrice || visa.price);
  const childRate = isCorporate && visa.corporateChildPrice != null ? visa.corporateChildPrice : (visa.childPrice || 0);

  const requiredDocs = visa.documentRequirements.filter((r) => r.required);
  const optionalDocs = visa.documentRequirements.filter((r) => !r.required);

  // Copy full visa details — info, form fields, and documents.
  const fullText = (() => {
    const lines: string[] = [];
    lines.push(`${visa.name} — ${country.name}`);
    if (visa.description) lines.push(visa.description);
    lines.push('');
    lines.push('VISA DETAILS');
    lines.push(`- Visa Type: ${visa.visaSubType === 'e-visa' ? 'E-Visa' : 'Sticker Visa'}`);
    if (visa.visaCategory) lines.push(`- Category: ${CATEGORY_LABELS[visa.visaCategory] || visa.visaCategory}`);
    if (visa.entry?.length) lines.push(`- Entry: ${visa.entry.join(', ')}`);
    if (visa.stayDuration) lines.push(`- Stay Duration: ${visa.stayDuration}`);
    if (visa.validity) lines.push(`- Validity: ${visa.validity}`);
    if (visa.processingTime) lines.push(`- Processing Time: ${visa.processingTime}`);
    lines.push(`- Adult Price: ${formatCurrency(adultRate)}`);
    lines.push(`- Child Price: ${formatCurrency(childRate)}`);
    if (visa.formFields?.length) {
      lines.push('');
      lines.push('APPLICATION FORM FIELDS');
      [...visa.formFields].sort((a, b) => a.order - b.order).forEach((f) => {
        lines.push(`- ${f.label}${f.required ? ' (required)' : ''}${f.type !== 'text' ? ` [${f.type}]` : ''}`);
      });
    }
    if (visa.documentRequirements?.length) {
      lines.push('');
      lines.push('DOCUMENTS');
      visa.documentRequirements.forEach((r) => {
        lines.push(`- ${r.name}${r.required ? ' (required)' : ' (optional)'}`);
      });
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
      <div onClick={handleClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300" style={{ opacity: visible ? 1 : 0 }} />

      <div
        className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden max-h-[92dvh] sm:max-h-[88vh] transition-all duration-300 ease-out"
        style={{ transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.97)', opacity: visible ? 1 : 0 }}
      >
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        <div className="px-4 sm:px-6 pt-3 sm:pt-0 flex-shrink-0">
          <div className="rounded-2xl px-4 py-4 mb-3" style={{ background: 'linear-gradient(135deg,#0f2d6b 0%,#1a3a8f 60%,#1e40af 100%)' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img src={`https://flagcdn.com/w40/${country.flag}.png`} alt={country.name} className="w-10 h-7 object-cover rounded shadow" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div>
                  <p className="text-blue-200 text-xs font-medium">{country.name}</p>
                  <h2 className="text-white font-bold text-base leading-tight">{visa.name}</h2>
                  {visa.description && <p className="text-blue-200/80 text-xs mt-0.5 line-clamp-1">{visa.description}</p>}
                </div>
              </div>
              <button onClick={handleClose} className="text-white/60 hover:text-white transition-colors -mt-0.5 ml-2 flex-shrink-0"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">
                <CreditCard className="w-3 h-3" />
                {formatCurrency(adultRate)} / adult{isCorporate ? ' (Corporate)' : ''}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/10 text-blue-100 px-2.5 py-1 rounded-full"><Clock className="w-3 h-3" />{visa.processingTime}</span>
              {visa.validity && <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/10 text-blue-100 px-2.5 py-1 rounded-full"><Check className="w-3 h-3" />Valid: {visa.validity}</span>}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 pb-2 space-y-4">
          <div className="grid grid-cols-2 gap-2.5">
            {visa.visaSubType && (
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-xs text-indigo-500 font-medium mb-0.5">Visa Type</p>
                <p className="text-sm font-semibold text-indigo-900">{visa.visaSubType === 'e-visa' ? 'E-Visa' : 'Sticker Visa'}</p>
              </div>
            )}
            {visa.visaCategory && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-0.5"><Tag className="w-3 h-3 text-slate-400" /><p className="text-xs text-slate-500 font-medium">Category</p></div>
                <p className="text-sm font-semibold text-slate-800">{CATEGORY_LABELS[visa.visaCategory] || visa.visaCategory}</p>
              </div>
            )}
            {visa.processingTime && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-0.5"><Clock className="w-3 h-3 text-slate-400" /><p className="text-xs text-slate-500 font-medium">Processing Time</p></div>
                <p className="text-sm font-semibold text-slate-800">{visa.processingTime}</p>
              </div>
            )}
            {visa.stayDuration && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-0.5"><Calendar className="w-3 h-3 text-slate-400" /><p className="text-xs text-slate-500 font-medium">Stay Duration</p></div>
                <p className="text-sm font-semibold text-slate-800">{visa.stayDuration}</p>
              </div>
            )}
            {visa.jurisdiction && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-0.5"><MapPin className="w-3 h-3 text-slate-400" /><p className="text-xs text-slate-500 font-medium">Jurisdiction</p></div>
                <p className="text-sm font-semibold text-slate-800">{JURISDICTION_LABELS[visa.jurisdiction] || visa.jurisdiction}</p>
              </div>
            )}
          </div>

          {visa.entry && visa.entry.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Entry</p>
              <div className="flex flex-wrap gap-2">
                {visa.entry.map((e) => <span key={e} className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 capitalize">{e} Entry</span>)}
              </div>
            </div>
          )}

          {visa.description && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">About</p>
              <p className="text-sm text-slate-600 leading-relaxed">{visa.description}</p>
            </div>
          )}

          {visa.documentRequirements.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-slate-800">
                  Documents Required
                  <span className="ml-1.5 text-xs font-normal text-slate-400">({visa.documentRequirements.length} total)</span>
                </p>
                <button onClick={handleCopy} className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95 px-2.5 py-1.5 rounded-lg transition-all duration-150">
                  {copied ? (<><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Copied!</span></>) : (<><Copy className="w-3.5 h-3.5" />Copy Details</>)}
                </button>
              </div>

              {requiredDocs.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-2">Required</p>
                  <ul className="space-y-2">
                    {requiredDocs.map((req) => (
                      <li key={req._id || req.name} className="flex items-start gap-2.5 p-3 bg-red-50/60 rounded-xl border border-red-100">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5"><FileText className="w-3.5 h-3.5" /></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 leading-snug">{req.name}</p>
                          {req.description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{req.description}</p>}
                        </div>
                        <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full flex-shrink-0 self-start">Required</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {optionalDocs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Optional</p>
                  <ul className="space-y-2">
                    {optionalDocs.map((req) => (
                      <li key={req._id || req.name} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center flex-shrink-0 mt-0.5"><FileText className="w-3.5 h-3.5" /></span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-700 leading-snug">{req.name}</p>
                          {req.description && <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{req.description}</p>}
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 bg-slate-200 px-2 py-0.5 rounded-full flex-shrink-0 self-start">Optional</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <button onClick={handleContinue} className="w-full py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm sm:text-base rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md">
            Continue with {visa.name}
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={handleClose} className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors duration-150">Choose a different visa</button>
        </div>
      </div>
    </div>
  );
}

/* ── Visa selection card (green, per design) ── */
function VisaCard({ visa, selected, priceLabel, onClick }: { visa: VisaType; selected: boolean; priceLabel: string; onClick: () => void }) {
  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Ticket className="w-4 h-4" />, label: 'Visa Types', value: visa.visaSubType === 'e-visa' ? 'eVisa' : 'Sticker' },
  ];
  if (visa.stayDuration) rows.push({ icon: <Home className="w-4 h-4" />, label: 'Stay duration', value: visa.stayDuration });
  if (visa.validity) rows.push({ icon: <Hourglass className="w-4 h-4" />, label: 'Visa validity', value: visa.validity });
  if (visa.processingTime) rows.push({ icon: <Clock className="w-4 h-4" />, label: 'Processing time', value: visa.processingTime });

  return (
    <button
      onClick={onClick}
      className={`w-full rounded-2xl overflow-hidden border-2 text-left transition-all ${selected ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-transparent hover:shadow-md'}`}
    >
      {/* Green header */}
      <div className="px-5 py-4 relative" style={{ background: 'linear-gradient(135deg,#0f9d6b 0%,#10b981 100%)' }}>
        <Plane className="w-5 h-5 text-white/90 mb-1.5" />
        <p className="text-white font-bold text-base leading-tight">{visa.name}</p>
        {visa.entry?.[0] && <p className="text-white/80 text-xs mt-0.5 capitalize">{visa.entry[0]}</p>}
      </div>
      {/* Detail rows */}
      <div className="bg-white divide-y divide-slate-100">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-5 py-2.5">
            <span className="flex items-center gap-2.5 text-sm text-slate-500"><span className="text-slate-400">{r.icon}</span>{r.label}</span>
            <span className="text-sm font-bold text-slate-800">{r.value}</span>
          </div>
        ))}
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50">
          <span className="text-xs text-slate-500">Starting from</span>
          <span className="text-base font-bold text-emerald-700">{priceLabel}</span>
        </div>
      </div>
    </button>
  );
}

export default function ApplyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isCorporate = user?.accountType === 'corporate';

  const adultRate = (v: VisaType) => (isCorporate && v.corporateAdultPrice ? v.corporateAdultPrice : (v.adultPrice || v.price));
  const childRate = (v: VisaType) => (isCorporate && v.corporateChildPrice != null ? v.corporateChildPrice : (v.childPrice || 0));

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
  const [travelDate, setTravelDate] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);

  // Modal visibility
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
        if (d.travelDate) setTravelDate(d.travelDate);
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
    const draft = { step, selectedCountry, selectedVisa, formData, visaTypes, travelDate, adults, children };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draftRestored, step, selectedCountry, selectedVisa, formData, visaTypes, travelDate, adults, children]);

  const startOver = () => {
    localStorage.removeItem(DRAFT_KEY);
    setStep(1);
    setSelectedCountry(null);
    setSelectedVisa(null);
    setFormData({});
    setDocSources({});
    setVisaTypes([]);
    setCountrySearch('');
    setTravelDate('');
    setAdults(1);
    setChildren(0);
  };

  // Country click → travel plan modal
  const handleCountrySelect = (country: Country) => {
    setPendingCountry(country);
    setShowTravelModal(true);
  };

  const confirmTravelPlan = async (data: { date: string; adults: number; children: number }) => {
    setTravelDate(data.date);
    setAdults(data.adults);
    setChildren(data.children);
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

  const pickFile = (requirementName: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED;
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) setDocSources((prev) => ({ ...prev, [requirementName]: { type: 'file', file } }));
    };
    input.click();
  };

  const clearDocSource = (requirementName: string) => {
    setDocSources((prev) => {
      const next = { ...prev };
      delete next[requirementName];
      return next;
    });
  };

  const selectVaultDoc = (requirementName: string, vaultDoc: VaultDocument) => {
    setDocSources((prev) => ({
      ...prev,
      [requirementName]: { type: 'vault', vaultDocId: vaultDoc._id, label: vaultDoc.label, url: vaultDoc.url },
    }));
  };

  const handleSubmit = async () => {
    if (!selectedVisa) return;
    setSubmitting(true);
    try {
      setSubmitStatus('Creating application…');
      // Build per-traveler responses with readable keys.
      const responses: Record<string, string> = {};
      const sortedFields = [...selectedVisa.formFields].sort((a, b) => a.order - b.order);
      for (const tr of travelers) {
        for (const f of sortedFields) {
          const val = formData[`${tr.key}__${f.fieldName}`];
          // Mongo Map keys cannot contain dots — sanitize the composed label.
          const key = `${tr.label} — ${f.label || f.fieldName}`.replace(/\./g, ' ');
          if (val && String(val).trim()) responses[key] = String(val);
        }
      }
      if (travelDate) responses['travelDate'] = travelDate;

      const r = await createApplication({ visaTypeId: selectedVisa._id, formResponses: responses, adults, children, travelDate });
      const appId = r.data.data._id;

      const reqs = selectedVisa.documentRequirements;
      let uploadIdx = 0;

      for (const req of reqs) {
        if (isPassportReq(req.name)) {
          const frontSrc = docSources[`${req.name}__front`];
          const backSrc  = docSources[`${req.name}__back`];
          if (frontSrc?.type === 'file') {
            uploadIdx++;
            setSubmitStatus(`Uploading documents (${uploadIdx})…`);
            const fd = new FormData();
            fd.append('file', frontSrc.file);
            fd.append('requirementName', `${req.name} (Front)`);
            await uploadDocument(appId, fd);
          }
          if (backSrc?.type === 'file') {
            uploadIdx++;
            setSubmitStatus(`Uploading documents (${uploadIdx})…`);
            const fd = new FormData();
            fd.append('file', backSrc.file);
            fd.append('requirementName', `${req.name} (Back)`);
            await uploadDocument(appId, fd);
          }
        } else {
          const source = docSources[req.name];
          if (!source) continue;
          uploadIdx++;
          setSubmitStatus(`Uploading documents (${uploadIdx})…`);
          if (source.type === 'vault') {
            await addDocumentFromVault(appId, { vaultDocId: source.vaultDocId, requirementName: req.name });
          } else {
            const fd = new FormData();
            fd.append('file', source.file);
            fd.append('requirementName', req.name);
            await uploadDocument(appId, fd);
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

  const goNext = () => {
    if (step === 3 && selectedVisa?.documentRequirements.length === 0) {
      setStep(5);
    } else {
      setStep((s) => Math.min(s + 1, 5) as Step);
    }
  };

  const goBack = () => {
    if (step === 5 && selectedVisa?.documentRequirements.length === 0) {
      setStep(3);
    } else {
      setStep((s) => Math.max(s - 1, 1) as Step);
    }
  };

  const canProceed = () => {
    if (step === 1) return !!selectedCountry;
    if (step === 2) return !!selectedVisa && !loading;
    if (step === 3 && selectedVisa) {
      const reqFields = selectedVisa.formFields.filter((f) => f.required);
      return travelers.every((tr) => reqFields.every((f) => !!formData[`${tr.key}__${f.fieldName}`]?.trim()));
    }
    if (step === 4 && selectedVisa) {
      return selectedVisa.documentRequirements
        .filter((r) => r.required)
        .every((r) => {
          if (isPassportReq(r.name)) {
            return !!docSources[`${r.name}__front`] && !!docSources[`${r.name}__back`];
          }
          return !!docSources[r.name];
        });
    }
    return true;
  };

  const renderField = (field: FormField, prefix: string) => {
    const key = `${prefix}__${field.fieldName}`;
    const common = {
      id: key,
      value: formData[key] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFormData({ ...formData, [key]: e.target.value }),
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
      return (
        <textarea {...common} rows={3} placeholder={field.placeholder}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      );
    }
    if (field.type === 'radio' && field.options.length > 0) {
      return (
        <div className="flex flex-wrap gap-4 mt-1">
          {field.options.map((o) => (
            <label key={o} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name={key} value={o} checked={formData[key] === o}
                onChange={() => setFormData({ ...formData, [key]: o })} className="text-blue-600 focus:ring-blue-500" />
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
            {formData[key]
              ? <span className="text-sm text-green-700 font-medium truncate">✓ {formData[key]}</span>
              : <span className="text-sm text-slate-400">{field.placeholder || 'No file selected'}</span>}
          </div>
          <button type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors flex-shrink-0"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = ACCEPTED;
              input.onchange = (e: any) => {
                const file = e.target?.files?.[0];
                if (file) setFormData({ ...formData, [key]: file.name });
              };
              input.click();
            }}>
            <Upload className="w-3.5 h-3.5" /> Browse
          </button>
        </div>
      );
    }
    return <Input {...common} type={field.type} placeholder={field.placeholder} />;
  };

  const requirements: DocumentRequirement[] = selectedVisa?.documentRequirements || [];
  const requiredMissing = requirements.filter((r) => {
    if (!r.required) return false;
    if (isPassportReq(r.name)) return !docSources[`${r.name}__front`] || !docSources[`${r.name}__back`];
    return !docSources[r.name];
  });
  const readyCount = requirements.filter((r) => {
    if (isPassportReq(r.name)) return !!docSources[`${r.name}__front`] && !!docSources[`${r.name}__back`];
    return !!docSources[r.name];
  }).length;

  const sortedFields = selectedVisa ? [...selectedVisa.formFields].sort((a, b) => a.order - b.order) : [];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {showTravelModal && pendingCountry && (
        <TravelPlanModal
          country={pendingCountry}
          initial={{ date: travelDate, adults, children }}
          onConfirm={confirmTravelPlan}
          onClose={() => { setShowTravelModal(false); setPendingCountry(null); }}
        />
      )}

      {showVisaOverview && selectedVisa && selectedCountry && (
        <VisaOverviewModal
          country={selectedCountry}
          visa={selectedVisa}
          isCorporate={isCorporate}
          adults={adults}
          children={children}
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
          if (n === 4 && selectedVisa && requirements.length === 0) return null;
          const done = step > n;
          const active = step === n;
          return (
            <div key={label} className="flex items-center flex-1 min-w-0">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ml-1.5 mr-1 ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-slate-400'}`}>{label}</span>
              {i < STEPS.length - 1 && !(n === 4 && selectedVisa && requirements.length === 0) && (
                <div className={`flex-1 h-0.5 mx-1 ${step > n ? 'bg-green-300' : 'bg-slate-200'}`} />
              )}
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
              {countries
                .filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
                .map((c) => (
                  <button key={c._id} onClick={() => handleCountrySelect(c)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedCountry?._id === c._id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                    }`}>
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
                {travelDate && (
                  <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                    <Calendar className="w-3 h-3" /> {new Date(travelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
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
                    priceLabel={`${formatCurrency(adultRate(v))} / adult`}
                    onClick={() => { setSelectedVisa(v); setDocSources({}); setShowVisaOverview(true); }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Application Form (per traveler) ── */}
        {step === 3 && selectedVisa && (
          <div>
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold text-slate-900">Application Details</h2>
              <span className="flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                <Users className="w-3 h-3" /> {travelers.length} traveller{travelers.length > 1 ? 's' : ''}
              </span>
            </div>

            {sortedFields.length === 0 ? (
              <div className="text-center py-6 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No additional form fields required for this visa type.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {travelers.map((tr) => (
                  <div key={tr.key} className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className={`px-4 py-2.5 flex items-center gap-2 ${tr.type === 'adult' ? 'bg-blue-50' : 'bg-emerald-50'}`}>
                      <Users className={`w-4 h-4 ${tr.type === 'adult' ? 'text-blue-500' : 'text-emerald-500'}`} />
                      <p className={`text-sm font-bold ${tr.type === 'adult' ? 'text-blue-800' : 'text-emerald-800'}`}>{tr.label}</p>
                    </div>
                    <div className="p-4 space-y-4">
                      {sortedFields.map((field) => (
                        <div key={field._id || field.fieldName}>
                          <Label htmlFor={`${tr.key}__${field.fieldName}`}>
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                          </Label>
                          <div className="mt-1">{renderField(field, tr.key)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Documents ── */}
        {step === 4 && selectedVisa && (
          <div>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Upload Documents</h2>
                <p className="text-slate-500 text-sm mt-0.5">Upload the required documents for your {selectedVisa.name} application.</p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium flex-shrink-0">{readyCount}/{requirements.length} ready</span>
            </div>

            {requirements.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No documents required for this visa type.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {requirements.map((req) => {
                  if (isPassportReq(req.name)) {
                    const frontSrc = docSources[`${req.name}__front`];
                    const backSrc  = docSources[`${req.name}__back`];
                    return (
                      <PassportUploadCard
                        key={req._id || req.name}
                        requirementName={req.name}
                        frontFile={frontSrc?.type === 'file' ? frontSrc.file : null}
                        backFile={backSrc?.type === 'file' ? backSrc.file : null}
                        onFrontChange={(file) => {
                          if (file) setDocSources((p) => ({ ...p, [`${req.name}__front`]: { type: 'file', file } }));
                          else setDocSources((p) => { const n = { ...p }; delete n[`${req.name}__front`]; return n; });
                        }}
                        onBackChange={(file) => {
                          if (file) setDocSources((p) => ({ ...p, [`${req.name}__back`]: { type: 'file', file } }));
                          else setDocSources((p) => { const n = { ...p }; delete n[`${req.name}__back`]; return n; });
                        }}
                      />
                    );
                  }

                  const source = docSources[req.name];
                  const vaultType = getVaultType(req.name);
                  const vaultMatches = vaultType ? vaultDocs.filter((v) => v.type === vaultType) : [];
                  return (
                    <div key={req._id || req.name}
                      className={`rounded-xl border-2 p-4 transition-all ${
                        source ? 'border-green-200 bg-green-50' : req.required ? 'border-slate-200 bg-white hover:border-blue-200' : 'border-dashed border-slate-200 bg-slate-50/50'
                      }`}>
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${source ? 'bg-green-100' : 'bg-slate-100'}`}>
                          {source ? <Check className="w-4 h-4 text-green-600" /> : <FileText className="w-4 h-4 text-slate-400" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {req.name}
                            {req.required && <span className="text-red-500 ml-1">*</span>}
                            {!req.required && <span className="text-slate-400 ml-1.5 text-xs font-normal">(optional)</span>}
                          </p>
                          {req.description && <p className="text-xs text-slate-400 mt-0.5">{req.description}</p>}
                        </div>
                      </div>

                      {source && (
                        <div className="flex items-center gap-2 mb-3 ml-11">
                          {source.type === 'vault' ? (
                            <span className="text-xs text-green-700 font-medium flex items-center gap-1"><Vault className="w-3 h-3" /> From vault: {source.label}</span>
                          ) : (
                            <span className="text-xs text-green-700 font-medium truncate max-w-[200px]">
                              {source.file.name}<span className="text-slate-400 ml-1">· {formatBytes(source.file.size)}</span>
                            </span>
                          )}
                          <button onClick={() => clearDocSource(req.name)} className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      )}

                      {vaultMatches.length > 0 && (
                        <div className="flex flex-wrap gap-2 ml-11 mb-2">
                          {vaultMatches.map((vd) => {
                            const isSelected = source?.type === 'vault' && source.vaultDocId === vd._id;
                            return (
                              <button key={vd._id}
                                onClick={() => isSelected ? clearDocSource(req.name) : selectVaultDoc(req.name, vd)}
                                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                                  isSelected ? 'bg-green-100 border-green-300 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                                }`}>
                                <Vault className="w-3 h-3" />
                                {isSelected ? `Selected: ${vd.label} ✓` : `Use from vault: ${vd.label}`}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="ml-11">
                        <button onClick={() => pickFile(req.name)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors">
                          <Upload className="w-3.5 h-3.5" />
                          {source?.type === 'file' ? 'Replace file' : 'Upload new file'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {requiredMissing.length > 0 && (
              <div className="mt-4 flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">Required: </span>
                  {requiredMissing.map((r) => r.name).join(', ')} must be provided before proceeding.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-400 mt-4">Accepted formats: PDF, JPG, PNG, DOC, DOCX · Max 10 MB per file</p>
          </div>
        )}

        {/* ── Step 5: Review & Pay ── */}
        {step === 5 && selectedVisa && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Review &amp; Pay</h2>
            <div className="space-y-4">
              {/* Visa details */}
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
                  {travelDate && (
                    <div>
                      <p className="text-xs text-slate-400">Travel Date</p>
                      <p className="font-medium mt-0.5">{new Date(travelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
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

              {/* Per-traveler responses */}
              {sortedFields.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wide">Traveller Details</p>
                  <div className="space-y-3">
                    {travelers.map((tr) => {
                      const entries = sortedFields
                        .map((f) => [f.label || f.fieldName, formData[`${tr.key}__${f.fieldName}`]] as const)
                        .filter(([, v]) => v && String(v).trim());
                      return (
                        <div key={tr.key}>
                          <p className={`text-xs font-bold mb-1 ${tr.type === 'adult' ? 'text-blue-700' : 'text-emerald-700'}`}>{tr.label}</p>
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
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Documents summary */}
              {requirements.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wide">Documents</p>
                  <div className="space-y-2">
                    {requirements.map((req) => {
                      if (isPassportReq(req.name)) {
                        const fSrc = docSources[`${req.name}__front`];
                        const bSrc = docSources[`${req.name}__back`];
                        return (
                          <div key={req._id || req.name} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-700 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> {req.name} — Front</span>
                              {fSrc?.type === 'file' ? <span className="text-green-700 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {fSrc.file.name}</span> : <span className="text-slate-400 italic text-xs">Not provided</span>}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-700 flex items-center gap-1"><BookOpen className="w-3.5 h-3.5 text-slate-400" /> {req.name} — Back</span>
                              {bSrc?.type === 'file' ? <span className="text-green-700 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {bSrc.file.name}</span> : <span className="text-slate-400 italic text-xs">Not provided</span>}
                            </div>
                          </div>
                        );
                      }
                      const source = docSources[req.name];
                      return (
                        <div key={req._id || req.name} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{req.name}{req.required && <span className="text-red-400 ml-1">*</span>}</span>
                          {source ? (
                            source.type === 'vault' ? (
                              <span className="text-green-700 font-medium flex items-center gap-1"><Vault className="w-3.5 h-3.5" /> {source.label}</span>
                            ) : (
                              <span className="text-green-700 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {source.file.name}</span>
                            )
                          ) : (
                            <span className="text-slate-400 italic text-xs">Not provided</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Pricing breakdown (per traveler) */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-3">Payment Summary</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{adults} × Adult {isCorporate && selectedVisa.corporateAdultPrice ? '(Corporate)' : ''} @ {formatCurrency(adultRate(selectedVisa))}</span>
                    <span className="font-medium text-slate-800">{formatCurrency(adults * adultRate(selectedVisa))}</span>
                  </div>
                  {children > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{children} × Child {isCorporate && selectedVisa.corporateChildPrice != null ? '(Corporate)' : ''} @ {formatCurrency(childRate(selectedVisa))}</span>
                      <span className="font-medium text-slate-800">{formatCurrency(children * childRate(selectedVisa))}</span>
                    </div>
                  )}
                  <div className="border-t border-blue-200 pt-2" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-blue-800">Total</p>
                      {isCorporate && (selectedVisa.corporateAdultPrice || selectedVisa.corporateChildPrice != null) && (
                        <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Corporate</span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(orderTotal(selectedVisa))}</p>
                  </div>
                </div>
                <div className="flex items-center justify-end mt-3"><CreditCard className="w-6 h-6 text-blue-400" /></div>
              </div>

              <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                <p className="text-sm text-emerald-700">
                  <strong>Secure payment via Razorpay</strong> — you&apos;ll be redirected to a secure checkout to pay with UPI, card, or netbanking. Currently in test mode: use card <span className="font-mono">4111 1111 1111 1111</span>, any future expiry and any CVV.
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

        {step < 5 ? (
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
