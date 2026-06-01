'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, ChevronLeft, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { getPublicCountries, getPublicVisaTypes, createApplication } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Country, VisaType, FormField } from '@/types';

type Step = 1 | 2 | 3 | 4;

export default function ApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [countries, setCountries] = useState<Country[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [selectedVisa, setSelectedVisa] = useState<VisaType | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getPublicCountries().then((r) => setCountries(r.data.data));
  }, []);

  const handleCountrySelect = async (country: Country) => {
    setSelectedCountry(country);
    setSelectedVisa(null);
    setLoading(true);
    try {
      const r = await getPublicVisaTypes(country._id);
      setVisaTypes(r.data.data);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVisa) return;
    setSubmitting(true);
    try {
      const r = await createApplication({ visaTypeId: selectedVisa._id, formResponses: formData });
      toast({ title: 'Application Submitted!', description: 'Upload your documents to continue.', variant: 'success' });
      router.push(`/applications/${r.data.data._id}`);
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to submit', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const steps = ['Country', 'Visa Type', 'Application Form', 'Review'];

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
          <SelectTrigger>
            <SelectValue placeholder={field.placeholder || 'Select an option'} />
          </SelectTrigger>
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
    return <Input {...common} type={field.type} placeholder={field.placeholder} />;
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-slate-900 mb-2">Apply for Visa</h1>
      <p className="text-slate-500 text-sm mb-8">Complete the steps below to submit your application.</p>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => {
          const n = (i + 1) as Step;
          const done = step > n;
          const active = step === n;
          return (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                done ? 'bg-green-500 text-white' : active ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'
              }`}>
                {done ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={`text-xs font-medium hidden sm:block ${active ? 'text-blue-700' : done ? 'text-green-700' : 'text-slate-400'}`}>{s}</span>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 ${step > n ? 'bg-green-300' : 'bg-slate-200'}`} />}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        {/* Step 1: Country */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Select Destination Country</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {countries.map((c) => (
                <button
                  key={c._id}
                  onClick={() => handleCountrySelect(c)}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedCountry?._id === c._id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-blue-200 hover:bg-slate-50'
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
            </div>
          </div>
        )}

        {/* Step 2: Visa Type */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">Select Visa Type</h2>
            <p className="text-slate-500 text-sm mb-4 flex items-center gap-2">
              Visas available for
              {selectedCountry && <img src={`https://flagcdn.com/w20/${selectedCountry.flag}.png`} alt="" className="w-5 h-3 object-cover rounded" />}
              {selectedCountry?.name}
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
                    onClick={() => setSelectedVisa(v)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      selectedVisa?._id === v._id ? 'border-blue-500 bg-blue-50' : 'border-slate-200 hover:border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{v.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{v.description}</p>
                      </div>
                      <div className="text-right ml-4">
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

        {/* Step 3: Form */}
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
                <p className="text-slate-400 text-sm">No additional form fields required for this visa type.</p>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && selectedVisa && (
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Review Your Application</h2>
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wide">Visa Details</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-400 text-xs">Country</p>
                    <p className="font-medium">{selectedCountry?.flag} {selectedCountry?.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Visa Type</p>
                    <p className="font-medium">{selectedVisa.name}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Fee</p>
                    <p className="font-bold text-blue-700">{formatCurrency(selectedVisa.price)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 text-xs">Processing Time</p>
                    <p className="font-medium">{selectedVisa.processingDays} business days</p>
                  </div>
                </div>
              </div>

              {Object.keys(formData).length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wide">Your Responses</p>
                  <div className="space-y-2 text-sm">
                    {Object.entries(formData).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-500 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                        <span className="font-medium text-slate-900">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="text-sm text-blue-700">
                  <strong>Next step:</strong> After submitting, you'll need to upload required documents. Payment is only
                  charged after document approval.
                </p>
              </div>

              {selectedVisa.documentRequirements.length > 0 && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 font-medium mb-3 uppercase tracking-wide">Required Documents</p>
                  <ul className="space-y-1.5">
                    {selectedVisa.documentRequirements.map((d) => (
                      <li key={d._id} className="flex items-start gap-2 text-sm">
                        <span className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${d.required ? 'bg-red-400' : 'bg-slate-400'}`} />
                        <div>
                          <span className="font-medium">{d.name}</span>
                          {!d.required && <span className="text-slate-400 ml-1">(optional)</span>}
                          {d.description && <p className="text-xs text-slate-400">{d.description}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-6">
        <Button
          variant="outline"
          onClick={() => setStep((s) => (s > 1 ? (s - 1) as Step : s))}
          disabled={step === 1}
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>

        {step < 4 ? (
          <Button
            onClick={() => setStep((s) => (s + 1) as Step)}
            disabled={
              (step === 1 && !selectedCountry) ||
              (step === 2 && !selectedVisa) ||
              loading
            }
          >
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Application'}
          </Button>
        )}
      </div>
    </div>
  );
}
