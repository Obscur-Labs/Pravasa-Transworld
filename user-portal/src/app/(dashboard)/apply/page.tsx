'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Loader2, Check, Upload, X, FileText, AlertCircle, Search, Vault, CreditCard, BookOpen, Calendar, Globe, Clock, MapPin, Tag, Copy } from 'lucide-react';
import PassportUploadCard from '@/components/passport/PassportUploadCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { getPublicCountries, getPublicVisaTypes, createApplication, uploadDocument, addDocumentFromVault, makePayment, getVaultDocuments } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { useAuthStore } from '@/store/auth.store';
import type { Country, VisaType, FormField, DocumentRequirement, VaultDocument } from '@/types';

type Step = 1 | 2 | 3 | 4 | 5;
type DocSource =
  | { type: 'vault'; vaultDocId: string; label: string; url: string }
  | { type: 'file'; file: File };

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

/* ── Travel Date Modal ── */
function TravelDateModal({ country, onConfirm }: { country: Country; onConfirm: (date: string) => void }) {
  const [date, setDate] = useState('');
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(2,6,23,0.7)', backdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-6 pb-4" style={{ background: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#0ea5e9 100%)' }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">When are you travelling?</h2>
              <p className="text-blue-200 text-xs mt-0.5 flex items-center gap-1">
                <Globe className="w-3 h-3" /> {country.name}
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-5">
          <label className="block text-sm font-semibold text-slate-700 mb-2">Expected Travel Date</label>
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full h-11 px-3 rounded-xl border-2 border-slate-200 text-sm focus:outline-none focus:border-blue-500 transition-colors"
          />
          <p className="text-xs text-slate-400 mt-2">This helps us process your application faster.</p>
          <button
            onClick={() => date && onConfirm(date)}
            disabled={!date}
            className="mt-4 w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={date ? { background: 'linear-gradient(135deg,#1e3a8a,#2563eb)', color: 'white', boxShadow: '0 4px 15px rgba(37,99,235,0.35)' } : { background: '#f1f5f9', color: '#94a3b8' }}
          >
            <ChevronRight className="w-4 h-4" /> Continue
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
  effectivePrice,
  onClose,
  onContinue,
}: {
  country: Country;
  visa: VisaType;
  isCorporate: boolean;
  effectivePrice: (v: VisaType) => number;
  onClose: () => void;
  onContinue: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [visible, setVisible] = useState(false);

  const requiredDocs = visa.documentRequirements.filter((r) => r.required);
  const optionalDocs = visa.documentRequirements.filter((r) => !r.required);
  const docsText =
    `Documents for ${visa.name}:\n` +
    visa.documentRequirements.map((r) => `- ${r.name}${r.required ? ' (required)' : ' (optional)'}`).join('\n');

  useEffect(() => {
    const t = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleContinue = () => {
    setVisible(false);
    setTimeout(onContinue, 300);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(docsText);
      setCopied(true);
      toast({ title: 'Copied!', description: 'Document list copied to clipboard.', variant: 'success' });
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
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      />

      {/* Panel — slides up from bottom on mobile, scales in on desktop */}
      <div
        className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl z-10 flex flex-col overflow-hidden max-h-[92dvh] sm:max-h-[88vh] transition-all duration-300 ease-out"
        style={{
          transform: visible ? 'translateY(0) scale(1)' : 'translateY(40px) scale(0.97)',
          opacity: visible ? 1 : 0,
        }}
      >
        {/* Mobile drag handle */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>

        {/* ── Header: country + visa name + price chips ── */}
        <div className="px-4 sm:px-6 pt-3 sm:pt-0 flex-shrink-0">
          {/* Gradient banner */}
          <div className="rounded-2xl px-4 py-4 mb-3" style={{ background: 'linear-gradient(135deg,#0f2d6b 0%,#1a3a8f 60%,#1e40af 100%)' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={`https://flagcdn.com/w40/${country.flag}.png`}
                  alt={country.name}
                  className="w-10 h-7 object-cover rounded shadow"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <div>
                  <p className="text-blue-200 text-xs font-medium">{country.name}</p>
                  <h2 className="text-white font-bold text-base leading-tight">{visa.name}</h2>
                  {visa.description && (
                    <p className="text-blue-200/80 text-xs mt-0.5 line-clamp-1">{visa.description}</p>
                  )}
                </div>
              </div>
              <button onClick={handleClose} className="text-white/60 hover:text-white transition-colors -mt-0.5 ml-2 flex-shrink-0">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Price + meta chips */}
            <div className="flex flex-wrap gap-1.5 mt-3">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/20 text-white px-2.5 py-1 rounded-full">
                <CreditCard className="w-3 h-3" />
                {isCorporate && visa.corporatePrice
                  ? `${formatCurrency(effectivePrice(visa))} (Corporate)`
                  : formatCurrency(effectivePrice(visa))}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/10 text-blue-100 px-2.5 py-1 rounded-full">
                <Loader2 className="w-3 h-3" />
                {visa.processingDays} days
              </span>
              {visa.validity && (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-white/10 text-blue-100 px-2.5 py-1 rounded-full">
                  <Check className="w-3 h-3" />
                  Valid: {visa.validity}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 pb-2 space-y-4">

          {/* Visa metadata grid */}
          <div className="grid grid-cols-2 gap-2.5">
            {visa.visaSubType && (
              <div className="bg-indigo-50 rounded-xl p-3">
                <p className="text-xs text-indigo-500 font-medium mb-0.5">Visa Type</p>
                <p className="text-sm font-semibold text-indigo-900">{visa.visaSubType === 'e-visa' ? 'E-Visa' : 'Sticker Visa'}</p>
              </div>
            )}
            {visa.visaCategory && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <Tag className="w-3 h-3 text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium">Category</p>
                </div>
                <p className="text-sm font-semibold text-slate-800">{CATEGORY_LABELS[visa.visaCategory] || visa.visaCategory}</p>
              </div>
            )}
            {visa.processingDays > 0 && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium">Processing Time</p>
                </div>
                <p className="text-sm font-semibold text-slate-800">{visa.processingDays} business days</p>
              </div>
            )}
            {visa.stayDuration > 0 && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium">Stay Duration</p>
                </div>
                <p className="text-sm font-semibold text-slate-800">{visa.stayDuration} days</p>
              </div>
            )}
            {visa.jurisdiction && (
              <div className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1 mb-0.5">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  <p className="text-xs text-slate-500 font-medium">Jurisdiction</p>
                </div>
                <p className="text-sm font-semibold text-slate-800">{JURISDICTION_LABELS[visa.jurisdiction] || visa.jurisdiction}</p>
              </div>
            )}
          </div>

          {/* Entry types */}
          {visa.entry && visa.entry.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Entry</p>
              <div className="flex flex-wrap gap-2">
                {visa.entry.map((e) => (
                  <span key={e} className="text-xs font-semibold px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 capitalize">
                    {e} Entry
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Description */}
          {visa.description && (
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">About</p>
              <p className="text-sm text-slate-600 leading-relaxed">{visa.description}</p>
            </div>
          )}

          {/* ── Document Requirements Section ── */}
          {visa.documentRequirements.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-slate-800">
                  Documents Required
                  <span className="ml-1.5 text-xs font-normal text-slate-400">({visa.documentRequirements.length} total)</span>
                </p>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 active:scale-95 px-2.5 py-1.5 rounded-lg transition-all duration-150"
                >
                  {copied ? (
                    <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Copied!</span></>
                  ) : (
                    <><Copy className="w-3.5 h-3.5" />Copy List</>
                  )}
                </button>
              </div>

              {/* Required docs */}
              {requiredDocs.length > 0 && (
                <div className="mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-red-500 mb-2">Required</p>
                  <ul className="space-y-2">
                    {requiredDocs.map((req, i) => (
                      <li
                        key={req._id || req.name}
                        className="flex items-start gap-2.5 p-3 bg-red-50/60 rounded-xl border border-red-100 transition-all duration-200 hover:bg-red-50 hover:border-red-200 hover:shadow-sm"
                        style={{ transitionDelay: `${i * 40}ms`, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)' }}
                      >
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText className="w-3.5 h-3.5" />
                        </span>
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

              {/* Optional docs */}
              {optionalDocs.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Optional</p>
                  <ul className="space-y-2">
                    {optionalDocs.map((req, i) => (
                      <li
                        key={req._id || req.name}
                        className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-xl border border-slate-100 transition-all duration-200 hover:bg-slate-100 hover:border-slate-200 hover:shadow-sm"
                        style={{ transitionDelay: `${(requiredDocs.length + i) * 40}ms`, opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(8px)' }}
                      >
                        <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <FileText className="w-3.5 h-3.5" />
                        </span>
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

        {/* ── Footer CTA ── */}
        <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-white flex-shrink-0">
          <button
            onClick={handleContinue}
            className="w-full py-3 sm:py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm sm:text-base rounded-xl flex items-center justify-center gap-2 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md"
          >
            Continue with {visa.name}
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleClose}
            className="w-full mt-2 py-2 text-sm text-slate-400 hover:text-slate-600 transition-colors duration-150"
          >
            Choose a different visa
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApplyPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isCorporate = user?.accountType === 'corporate';
  const effectivePrice = (v: VisaType) =>
    isCorporate && v.corporatePrice ? v.corporatePrice : v.price;

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

  // Modal visibility
  const [showTravelDateModal, setShowTravelDateModal] = useState(false);
  const [pendingCountry, setPendingCountry] = useState<Country | null>(null);
  const [showVisaOverview, setShowVisaOverview] = useState(false);

  useEffect(() => {
    getPublicCountries().then((r) => setCountries(r.data.data));
    getVaultDocuments()
      .then((r) => setVaultDocs(r.data.data || []))
      .catch(() => {});

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
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    setDraftRestored(true);
  }, []);

  useEffect(() => {
    if (!draftRestored || !selectedCountry) return;
    const draft = { step, selectedCountry, selectedVisa, formData, visaTypes, travelDate };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draftRestored, step, selectedCountry, selectedVisa, formData, visaTypes, travelDate]);

  useEffect(() => {
    if (step !== 4 || !selectedVisa || vaultDocs.length === 0) return;
    const requirements = selectedVisa.documentRequirements;
    setDocSources((prev) => {
      const next = { ...prev };
      for (const req of requirements) {
        if (next[req.name]) continue;
        const vaultType = getVaultType(req.name);
        if (!vaultType) continue;
        const matches = vaultDocs.filter((v) => v.type === vaultType);
        if (matches.length === 1) {
          next[req.name] = { type: 'vault', vaultDocId: matches[0]._id, label: matches[0].label, url: matches[0].url };
        }
      }
      return next;
    });
  }, [step, selectedVisa, vaultDocs]);

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
  };

  // Country click → travel date modal
  const handleCountrySelect = (country: Country) => {
    setPendingCountry(country);
    setShowTravelDateModal(true);
  };

  const confirmTravelDate = async (date: string) => {
    setTravelDate(date);
    setShowTravelDateModal(false);
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
      const responses = { ...formData };
      if (travelDate) responses['travelDate'] = travelDate;
      const r = await createApplication({ visaTypeId: selectedVisa._id, formResponses: responses });
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

      setSubmitStatus('Processing payment…');
      await makePayment(appId);

      localStorage.removeItem(DRAFT_KEY);
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

  const renderField = (field: FormField) => {
    const common = {
      id: field.fieldName,
      value: formData[field.fieldName] || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setFormData({ ...formData, [field.fieldName]: e.target.value }),
    };

    if (field.type === 'select') {
      return (
        <Select
          value={formData[field.fieldName] || ''}
          onValueChange={(v) => setFormData({ ...formData, [field.fieldName]: v })}
        >
          <SelectTrigger><SelectValue placeholder={field.placeholder || 'Select an option'} /></SelectTrigger>
          <SelectContent>
            {field.options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectContent>
        </Select>
      );
    }
    if (field.type === 'textarea') {
      return (
        <textarea
          {...common}
          rows={3}
          placeholder={field.placeholder}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      );
    }
    if (field.type === 'radio' && field.options.length > 0) {
      return (
        <div className="flex flex-wrap gap-4 mt-1">
          {field.options.map((o) => (
            <label key={o} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={field.fieldName}
                value={o}
                checked={formData[field.fieldName] === o}
                onChange={() => setFormData({ ...formData, [field.fieldName]: o })}
                className="text-blue-600 focus:ring-blue-500"
              />
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
            {formData[field.fieldName]
              ? <span className="text-sm text-green-700 font-medium truncate">✓ {formData[field.fieldName]}</span>
              : <span className="text-sm text-slate-400">{field.placeholder || 'No file selected'}</span>}
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors flex-shrink-0"
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = ACCEPTED;
              input.onchange = (e: any) => {
                const file = e.target?.files?.[0];
                if (file) setFormData({ ...formData, [field.fieldName]: file.name });
              };
              input.click();
            }}
          >
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

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Travel Date Modal — shown when user clicks a country */}
      {showTravelDateModal && pendingCountry && (
        <TravelDateModal country={pendingCountry} onConfirm={confirmTravelDate} />
      )}

      {/* Visa Overview Modal — shown when user clicks a visa card (info + docs + price) */}
      {showVisaOverview && selectedVisa && selectedCountry && (
        <VisaOverviewModal
          country={selectedCountry}
          visa={selectedVisa}
          isCorporate={isCorporate}
          effectivePrice={effectivePrice}
          onClose={() => setShowVisaOverview(false)}
          onContinue={() => {
            setShowVisaOverview(false);
            goNext();
          }}
        />
      )}

      <div className="flex items-start justify-between mb-1">
        <h1 className="text-2xl font-bold text-slate-900">Apply for Visa</h1>
        {(step > 1 || !!selectedCountry) && (
          <button
            onClick={startOver}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors mt-1.5 flex-shrink-0"
          >
            Start over
          </button>
        )}
      </div>
      <p className="text-slate-500 text-sm mb-8">
        {step > 1 || selectedCountry
          ? 'Your progress has been saved — continue where you left off.'
          : 'Complete the steps below to submit your application.'}
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
              <span className={`text-xs font-medium hidden sm:block ml-1.5 mr-1 ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-slate-400'}`}>
                {label}
              </span>
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
              <Input
                className="pl-9"
                placeholder="Search countries..."
                value={countrySearch}
                onChange={(e) => setCountrySearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {countries
                .filter((c) => c.name.toLowerCase().includes(countrySearch.toLowerCase()))
                .map((c) => (
                  <button
                    key={c._id}
                    onClick={() => handleCountrySelect(c)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedCountry?._id === c._id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
                    }`}
                  >
                    <img
                      src={`https://flagcdn.com/w40/${c.flag}.png`}
                      alt={c.name}
                      className="w-8 h-5 object-cover rounded mb-2"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
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
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-semibold text-slate-900">Select Visa Type</h2>
              {travelDate && (
                <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full font-medium">
                  <Calendar className="w-3 h-3" /> Travel: {new Date(travelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              )}
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
              <div className="space-y-3">
                {visaTypes.map((v) => (
                  <button
                    key={v._id}
                    onClick={() => {
                      setSelectedVisa(v);
                      setDocSources({});
                      setShowVisaOverview(true);
                    }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedVisa?._id === v._id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-slate-900">{v.name}</p>
                          {v.visaSubType && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                              {v.visaSubType === 'e-visa' ? 'E-Visa' : 'Sticker'}
                            </span>
                          )}
                        </div>
                        {v.visaCategory && (
                          <p className="text-xs text-slate-500 mt-0.5">{CATEGORY_LABELS[v.visaCategory] || v.visaCategory}</p>
                        )}
                        {v.entry && v.entry.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {v.entry.map((e) => (
                              <span key={e} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 capitalize font-medium">{e}</span>
                            ))}
                          </div>
                        )}
                        {v.documentRequirements.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1 font-medium">
                            {v.documentRequirements.length} document{v.documentRequirements.length > 1 ? 's' : ''} required
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="font-bold text-blue-700">{formatCurrency(effectivePrice(v))}</p>
                        {isCorporate && v.corporatePrice && (
                          <>
                            <p className="text-[11px] font-semibold text-violet-600">Corporate rate</p>
                            <p className="text-[11px] text-slate-400 line-through">{formatCurrency(v.price)}</p>
                          </>
                        )}
                        <p className="text-xs text-slate-400">{v.processingDays} days</p>
                        {v.stayDuration > 0 && <p className="text-xs text-slate-400">Stay: {v.stayDuration}d</p>}
                        {v.validity && <p className="text-xs text-slate-400">Valid: {v.validity}</p>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Application Form ── */}
        {step === 3 && selectedVisa && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Application Details</h2>
            <div className="space-y-4">
              {[...selectedVisa.formFields].sort((a, b) => a.order - b.order).map((field) => (
                <div key={field._id}>
                  <Label htmlFor={field.fieldName}>
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </Label>
                  <div className="mt-1">{renderField(field)}</div>
                </div>
              ))}
              {selectedVisa.formFields.length === 0 && (
                <div className="text-center py-6 text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No additional form fields required for this visa type.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Step 4: Documents ── */}
        {step === 4 && selectedVisa && (
          <div>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Upload Documents</h2>
                <p className="text-slate-500 text-sm mt-0.5">
                  Upload the required documents for your {selectedVisa.name} application.
                </p>
              </div>
              <span className="text-xs text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full font-medium flex-shrink-0">
                {readyCount}/{requirements.length} ready
              </span>
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
                  const isAutoFilled = source?.type === 'vault' && vaultMatches.some((v) => v._id === source.vaultDocId);

                  return (
                    <div
                      key={req._id || req.name}
                      className={`rounded-xl border-2 p-4 transition-all ${
                        source
                          ? 'border-green-200 bg-green-50'
                          : req.required
                          ? 'border-slate-200 bg-white hover:border-blue-200'
                          : 'border-dashed border-slate-200 bg-slate-50/50'
                      }`}
                    >
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
                        {isAutoFilled && (
                          <span className="text-xs bg-green-100 text-green-700 font-medium px-2 py-0.5 rounded-full flex-shrink-0">
                            Auto-filled from vault
                          </span>
                        )}
                      </div>

                      {source && (
                        <div className="flex items-center gap-2 mb-3 ml-11">
                          {source.type === 'vault' ? (
                            <span className="text-xs text-green-700 font-medium flex items-center gap-1">
                              <Vault className="w-3 h-3" /> From vault: {source.label}
                            </span>
                          ) : (
                            <span className="text-xs text-green-700 font-medium truncate max-w-[200px]">
                              {source.file.name}
                              <span className="text-slate-400 ml-1">· {formatBytes(source.file.size)}</span>
                            </span>
                          )}
                          <button onClick={() => clearDocSource(req.name)} className="p-0.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {vaultMatches.length > 0 && (
                        <div className="flex flex-wrap gap-2 ml-11 mb-2">
                          {vaultMatches.map((vd) => {
                            const isSelected = source?.type === 'vault' && source.vaultDocId === vd._id;
                            return (
                              <button
                                key={vd._id}
                                onClick={() => isSelected ? clearDocSource(req.name) : selectVaultDoc(req.name, vd)}
                                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                                  isSelected ? 'bg-green-100 border-green-300 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50'
                                }`}
                              >
                                <Vault className="w-3 h-3" />
                                {isSelected ? `Selected: ${vd.label} ✓` : `Use from vault: ${vd.label}`}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="ml-11">
                        <button
                          onClick={() => pickFile(req.name)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-100 transition-colors"
                        >
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

            <p className="text-xs text-slate-400 mt-4">
              Accepted formats: PDF, JPG, PNG, DOC, DOCX · Max 10 MB per file
            </p>
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
                    <p className="text-xs text-slate-400">Processing Time</p>
                    <p className="font-medium mt-0.5">{selectedVisa.processingDays} business days</p>
                  </div>
                  {travelDate && (
                    <div>
                      <p className="text-xs text-slate-400">Travel Date</p>
                      <p className="font-medium mt-0.5">{new Date(travelDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  )}
                  {selectedVisa.validity && (
                    <div>
                      <p className="text-xs text-slate-400">Validity</p>
                      <p className="font-medium mt-0.5">{selectedVisa.validity}</p>
                    </div>
                  )}
                  {selectedVisa.entry && selectedVisa.entry.length > 0 && (
                    <div>
                      <p className="text-xs text-slate-400">Entry</p>
                      <p className="font-medium mt-0.5 capitalize">{selectedVisa.entry.join(', ')}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Form responses */}
              {Object.keys(formData).filter((k) => k !== 'travelDate').length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wide">Your Responses</p>
                  <div className="space-y-2 text-sm">
                    {Object.entries(formData).filter(([k]) => k !== 'travelDate').map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-4">
                        <span className="text-slate-500 capitalize shrink-0">{k.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-medium text-slate-900 text-right truncate">{v}</span>
                      </div>
                    ))}
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
                              <span className="text-slate-700 flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400" /> {req.name} — Front
                              </span>
                              {fSrc?.type === 'file'
                                ? <span className="text-green-700 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {fSrc.file.name}</span>
                                : <span className="text-slate-400 italic text-xs">Not provided</span>}
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-700 flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400" /> {req.name} — Back
                              </span>
                              {bSrc?.type === 'file'
                                ? <span className="text-green-700 font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" /> {bSrc.file.name}</span>
                                : <span className="text-slate-400 italic text-xs">Not provided</span>}
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
                              <span className="text-green-700 font-medium flex items-center gap-1">
                                <Vault className="w-3.5 h-3.5" /> {source.label}
                              </span>
                            ) : (
                              <span className="text-green-700 font-medium flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> {source.file.name}
                              </span>
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

              {/* Pricing breakdown */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-600 font-semibold uppercase tracking-wide mb-3">Payment Summary</p>
                <div className="space-y-2">
                  {selectedVisa.visaCharges > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Visa Charges</span>
                      <span className="font-medium text-slate-800">{formatCurrency(selectedVisa.visaCharges)}</span>
                    </div>
                  )}
                  {selectedVisa.serviceFee > 0 && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">Service Fee</span>
                      <span className="font-medium text-slate-800">{formatCurrency(selectedVisa.serviceFee)}</span>
                    </div>
                  )}
                  {(selectedVisa.visaCharges > 0 || selectedVisa.serviceFee > 0) && (
                    <div className="border-t border-blue-200 pt-2" />
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-blue-800">Total</p>
                      {isCorporate && selectedVisa.corporatePrice && (
                        <span className="text-[10px] font-bold bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full uppercase tracking-wide">Corporate</span>
                      )}
                    </div>
                    <p className="text-2xl font-bold text-blue-900">{formatCurrency(effectivePrice(selectedVisa))}</p>
                  </div>
                  {isCorporate && selectedVisa.corporatePrice && (
                    <p className="text-xs text-slate-400 line-through text-right">Regular: {formatCurrency(selectedVisa.price)}</p>
                  )}
                </div>
                <div className="flex items-center justify-end mt-3">
                  <CreditCard className="w-6 h-6 text-blue-400" />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-sm text-amber-700">
                  <strong>Simulated payment</strong> — in production this connects to a payment gateway. Your application will be submitted and payment confirmed immediately.
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
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">{submitStatus || 'Submitting…'}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Pay &amp; Submit Application
              </span>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
