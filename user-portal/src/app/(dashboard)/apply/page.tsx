'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Loader2, Check, Upload, X, FileText, AlertCircle, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { getPublicCountries, getPublicVisaTypes, createApplication, uploadDocument } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Country, VisaType, FormField, DocumentRequirement } from '@/types';

type Step = 1 | 2 | 3 | 4 | 5;

const STEPS = ['Country', 'Visa Type', 'Application Form', 'Documents', 'Review'];
const DRAFT_KEY = 'visa_app_draft';
const ACCEPTED = '.jpg,.jpeg,.png,.pdf,.doc,.docx';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedVisa, setSelectedVisa] = useState<VisaType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [docFiles, setDocFiles] = useState<Record<string, File>>({});
  const [countrySearch, setCountrySearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);

  // Restore draft on mount, then load countries
  useEffect(() => {
    getPublicCountries().then((r) => setCountries(r.data.data));

    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw);
        if (d.selectedCountry) setSelectedCountry(d.selectedCountry);
        if (d.selectedVisa) setSelectedVisa(d.selectedVisa);
        if (d.visaTypes) setVisaTypes(d.visaTypes);
        if (d.formData) setFormData(d.formData);
        if (d.step) setStep(d.step as Step);
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
    setDraftRestored(true);
  }, []);

  // Auto-save draft whenever key state changes (skip until restore is done)
  useEffect(() => {
    if (!draftRestored || !selectedCountry) return;
    const draft = { step, selectedCountry, selectedVisa, formData, visaTypes };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [draftRestored, step, selectedCountry, selectedVisa, formData, visaTypes]);

  const startOver = () => {
    localStorage.removeItem(DRAFT_KEY);
    setStep(1);
    setSelectedCountry(null);
    setSelectedVisa(null);
    setFormData({});
    setDocFiles({});
    setVisaTypes([]);
    setCountrySearch('');
  };

  const handleCountrySelect = async (country: Country) => {
    setSelectedCountry(country);
    setSelectedVisa(null);
    setDocFiles({});
    setLoading(true);
    try {
      const r = await getPublicVisaTypes(country._id);
      setVisaTypes(r.data.data);
    } finally {
      setLoading(false);
    }
  };

  const pickFile = (requirementName: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = ACCEPTED;
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) setDocFiles((prev) => ({ ...prev, [requirementName]: file }));
    };
    input.click();
  };

  const removeFile = (requirementName: string) => {
    setDocFiles((prev) => {
      const next = { ...prev };
      delete next[requirementName];
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedVisa) return;
    setSubmitting(true);
    try {
      // 1. Create the application
      setSubmitStatus('Creating application…');
      const r = await createApplication({ visaTypeId: selectedVisa._id, formResponses: formData });
      const appId = r.data.data._id;

      // 2. Upload collected documents one by one
      const docEntries = Object.entries(docFiles);
      for (let i = 0; i < docEntries.length; i++) {
        const [requirementName, file] = docEntries[i];
        setSubmitStatus(`Uploading ${requirementName} (${i + 1}/${docEntries.length})…`);
        const fd = new FormData();
        fd.append('file', file);
        fd.append('requirementName', requirementName);
        await uploadDocument(appId, fd);
      }

      localStorage.removeItem(DRAFT_KEY);
      toast({ title: 'Application submitted!', description: 'Your documents have been uploaded.', variant: 'success' });
      router.push(`/applications/${appId}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to submit', variant: 'destructive' });
    } finally {
      setSubmitting(false);
      setSubmitStatus('');
    }
  };

  // Navigate forward — skip step 4 if visa has no document requirements
  const goNext = () => {
    if (step === 3 && selectedVisa?.documentRequirements.length === 0) {
      setStep(5);
    } else {
      setStep((s) => Math.min(s + 1, 5) as Step);
    }
  };

  // Navigate back — skip step 4 if visa has no document requirements
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
      // All required documents must have a file
      return selectedVisa.documentRequirements
        .filter((r) => r.required)
        .every((r) => docFiles[r.name]);
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
    // file type in the application form — just store the name
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
  const requiredMissing = requirements.filter((r) => r.required && !docFiles[r.name]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
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
          // If no doc requirements, visually hide step 4 from indicator
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
                    <img src={`https://flagcdn.com/w40/${c.flag}.png`} alt={c.name} className="w-8 h-5 object-cover rounded mb-2"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Select Visa Type</h2>
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
                    onClick={() => { setSelectedVisa(v); setDocFiles({}); }}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedVisa?._id === v._id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{v.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{v.description}</p>
                        {v.documentRequirements.length > 0 && (
                          <p className="text-xs text-blue-600 mt-1 font-medium">
                            {v.documentRequirements.length} document{v.documentRequirements.length > 1 ? 's' : ''} required
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="font-bold text-blue-700">{formatCurrency(v.price)}</p>
                        <p className="text-xs text-slate-400">{v.processingDays} days</p>
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

        {/* ── Step 4: Upload Documents ── */}
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
                {Object.keys(docFiles).length}/{requirements.length} uploaded
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
                  const file = docFiles[req.name];
                  return (
                    <div
                      key={req._id || req.name}
                      className={`rounded-xl border-2 p-4 transition-all ${
                        file
                          ? 'border-green-200 bg-green-50'
                          : req.required
                          ? 'border-slate-200 bg-white hover:border-blue-200'
                          : 'border-dashed border-slate-200 bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            file ? 'bg-green-100' : 'bg-slate-100'
                          }`}>
                            {file
                              ? <Check className="w-4 h-4 text-green-600" />
                              : <FileText className="w-4 h-4 text-slate-400" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900">
                              {req.name}
                              {req.required && <span className="text-red-500 ml-1">*</span>}
                              {!req.required && <span className="text-slate-400 ml-1.5 text-xs font-normal">(optional)</span>}
                            </p>
                            {req.description && (
                              <p className="text-xs text-slate-400 mt-0.5">{req.description}</p>
                            )}
                            {file && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="text-xs text-green-700 font-medium truncate max-w-[200px]">{file.name}</span>
                                <span className="text-xs text-slate-400">· {formatBytes(file.size)}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          {file ? (
                            <>
                              <button
                                onClick={() => pickFile(req.name)}
                                className="text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg border border-blue-100 transition-colors"
                              >
                                Replace
                              </button>
                              <button
                                onClick={() => removeFile(req.name)}
                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => pickFile(req.name)}
                              className="flex items-center gap-1.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Upload
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Missing required docs warning */}
            {requiredMissing.length > 0 && (
              <div className="mt-4 flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">Required: </span>
                  {requiredMissing.map((r) => r.name).join(', ')} must be uploaded before proceeding.
                </p>
              </div>
            )}

            <p className="text-xs text-slate-400 mt-4">
              Accepted formats: PDF, JPG, PNG, DOC, DOCX · Max 10 MB per file
            </p>
          </div>
        )}

        {/* ── Step 5: Review ── */}
        {step === 5 && selectedVisa && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Review &amp; Submit</h2>
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
                    <p className="text-xs text-slate-400">Fee</p>
                    <p className="font-bold text-blue-700 mt-0.5">{formatCurrency(selectedVisa.price)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Processing Time</p>
                    <p className="font-medium mt-0.5">{selectedVisa.processingDays} business days</p>
                  </div>
                </div>
              </div>

              {/* Form responses */}
              {Object.keys(formData).length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-semibold mb-3 uppercase tracking-wide">Your Responses</p>
                  <div className="space-y-2 text-sm">
                    {Object.entries(formData).map(([k, v]) => (
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
                      const file = docFiles[req.name];
                      return (
                        <div key={req._id || req.name} className="flex items-center justify-between text-sm">
                          <span className="text-slate-700">{req.name}{req.required && <span className="text-red-400 ml-1">*</span>}</span>
                          {file ? (
                            <span className="text-green-700 font-medium flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> {file.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Not provided</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info banner */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Payment is only charged after our team reviews and approves your documents.
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
          <Button onClick={handleSubmit} disabled={submitting} className="min-w-[160px]">
            {submitting ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">{submitStatus || 'Submitting…'}</span>
              </span>
            ) : (
              'Submit Application'
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
