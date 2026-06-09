'use client';
import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { getCountries, getVisaTypes, createVisaType, updateVisaType, deleteVisaType, toggleVisaType, updateCorporatePrice } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Country, VisaType, FormField, DocumentRequirement, FieldType, EntryType } from '@/types';

const FIELD_TYPES: FieldType[] = ['text', 'number', 'email', 'date', 'select', 'radio', 'textarea', 'file'];
const emptyField = (): FormField => ({ label: '', fieldName: '', type: 'text', required: false, options: [], placeholder: '', order: 0 });
const emptyDocReq = (): DocumentRequirement => ({ name: '', description: '', required: true });

const ENTRY_OPTIONS: { value: EntryType; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'multiple', label: 'Multiple' },
  { value: 'double', label: 'Double' },
];

const VISA_SUB_TYPES = [
  { value: 'e-visa', label: 'E-Visa' },
  { value: 'sticker', label: 'Sticker Visa' },
];

const JURISDICTIONS = [
  { value: 'pan-india', label: 'Pan India' },
  { value: 'mumbai', label: 'Mumbai' },
  { value: 'delhi', label: 'Delhi' },
];

const VISA_CATEGORIES = [
  { value: 'tourist', label: 'Tourist' },
  { value: 'business', label: 'Business' },
  { value: 'transit', label: 'Transit Visa' },
  { value: 'student', label: 'Student Visa' },
];

function OptionListEditor({ options, onChange }: { options: string[]; onChange: (opts: string[]) => void }) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const val = draft.trim();
    if (!val || options.includes(val)) return;
    onChange([...options, val]);
    setDraft('');
    inputRef.current?.focus();
  };

  const remove = (idx: number) => onChange(options.filter((_, i) => i !== idx));

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); add(); }
  };

  return (
    <div className="mt-2 space-y-2">
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800 font-medium">
              {opt}
              <button type="button" onClick={() => remove(idx)} className="text-blue-400 hover:text-blue-700 ml-0.5">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <Input
          ref={inputRef}
          className="h-7 text-xs flex-1"
          placeholder="Add option…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKey}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        checked
          ? 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
          : 'bg-slate-200 hover:bg-slate-300'
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] ring-0 transition duration-300 ease-in-out ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

const emptyForm = () => ({
  country: '', name: '', description: '', visaCharges: '', serviceFee: '',
  processingDays: '', validity: '',
  entry: [] as EntryType[],
  visaSubType: 'e-visa' as string,
  stayDuration: '',
  jurisdiction: 'pan-india' as string,
  visaCategory: 'tourist' as string,
  formFields: [] as FormField[],
  documentRequirements: [] as DocumentRequirement[],
});

export default function VisaTypesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [corpPriceEdit, setCorpPriceEdit] = useState<string | null>(null);
  const [corpPriceDraft, setCorpPriceDraft] = useState('');
  const [savingCorpPrice, setSavingCorpPrice] = useState(false);
  const [form, setForm] = useState(emptyForm());

  useEffect(() => {
    getCountries().then((r) => setCountries(r.data.data));
  }, []);

  useEffect(() => {
    getVisaTypes(selectedCountry || undefined).then((r) => setVisaTypes(r.data.data));
  }, [selectedCountry]);

  const totalPrice = (Number(form.visaCharges) || 0) + (Number(form.serviceFee) || 0);

  const toggleEntry = (val: EntryType) => {
    setForm((f) => ({
      ...f,
      entry: f.entry.includes(val) ? f.entry.filter((e) => e !== val) : [...f.entry, val],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        visaCharges: Number(form.visaCharges),
        serviceFee: Number(form.serviceFee),
        processingDays: Number(form.processingDays),
        stayDuration: Number(form.stayDuration) || 0,
        formFields: form.formFields.map((f, i) => ({ ...f, order: i })),
      };
      if (editId) {
        await updateVisaType(editId, payload);
        toast({ title: 'Visa type updated', variant: 'success' });
      } else {
        await createVisaType(payload);
        toast({ title: 'Visa type created', variant: 'success' });
      }
      setShowForm(false);
      setEditId(null);
      getVisaTypes(selectedCountry || undefined).then((r) => setVisaTypes(r.data.data));
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this visa type?')) return;
    await deleteVisaType(id);
    toast({ title: 'Deleted' });
    getVisaTypes(selectedCountry || undefined).then((r) => setVisaTypes(r.data.data));
  };

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      const res = await toggleVisaType(id);
      setVisaTypes((prev) => prev.map((vt) => vt._id === id ? { ...vt, isActive: res.data.data.isActive } : vt));
      toast({ title: res.data.data.isActive ? 'Visa type activated' : 'Visa type deactivated', variant: 'success' });
    } catch {
      toast({ title: 'Failed to toggle status', variant: 'destructive' });
    } finally {
      setToggling(null);
    }
  };

  const addField = () => setForm((f) => ({ ...f, formFields: [...f.formFields, emptyField()] }));
  const removeField = (i: number) => setForm((f) => ({ ...f, formFields: f.formFields.filter((_, idx) => idx !== i) }));
  const updateField = (i: number, key: keyof FormField, value: any) =>
    setForm((f) => ({ ...f, formFields: f.formFields.map((field, idx) => idx === i ? { ...field, [key]: value } : field) }));

  const addDocReq = () => setForm((f) => ({ ...f, documentRequirements: [...f.documentRequirements, emptyDocReq()] }));
  const removeDocReq = (i: number) => setForm((f) => ({ ...f, documentRequirements: f.documentRequirements.filter((_, idx) => idx !== i) }));
  const updateDocReq = (i: number, key: keyof DocumentRequirement, value: any) =>
    setForm((f) => ({ ...f, documentRequirements: f.documentRequirements.map((d, idx) => idx === i ? { ...d, [key]: value } : d) }));

  const handleSaveCorpPrice = async (id: string) => {
    setSavingCorpPrice(true);
    try {
      const price = corpPriceDraft === '' ? '' : Number(corpPriceDraft);
      await updateCorporatePrice(id, price as number | '');
      setVisaTypes((prev) => prev.map((vt) => vt._id === id ? { ...vt, corporatePrice: price === '' ? undefined : Number(price) } : vt));
      toast({ title: 'Corporate price updated', variant: 'success' });
    } catch {
      toast({ title: 'Failed to update corporate price', variant: 'destructive' });
    } finally {
      setSavingCorpPrice(false);
      setCorpPriceEdit(null);
    }
  };

  const startEdit = (vt: VisaType) => {
    setForm({
      country: String(vt.country?._id || vt.country),
      name: vt.name,
      description: vt.description,
      visaCharges: String(vt.visaCharges ?? vt.price),
      serviceFee: String(vt.serviceFee ?? 0),
      processingDays: String(vt.processingDays),
      validity: vt.validity || '',
      entry: vt.entry || [],
      visaSubType: vt.visaSubType || 'e-visa',
      stayDuration: String(vt.stayDuration || ''),
      jurisdiction: vt.jurisdiction || 'pan-india',
      visaCategory: vt.visaCategory || 'tourist',
      formFields: vt.formFields || [],
      documentRequirements: vt.documentRequirements || [],
    });
    setEditId(vt._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visa Types</h1>
          <p className="text-slate-500 text-sm mt-1">Manage visa types and their dynamic form fields.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm()); setEditId(null); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Visa Type
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 mb-5">{editId ? 'Edit Visa Type' : 'Create Visa Type'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* ── Basic Info ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Country</Label>
                  <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} required className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">Select country...</option>
                    {countries.map((c) => <option key={c._id} value={c._id}>{c.flag} {c.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Visa Name</Label>
                  <Input className="mt-1" placeholder="e.g. Tourist Visa" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input className="mt-1" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>

              {/* ── Pricing ── */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-3">
                <p className="text-sm font-semibold text-blue-900">Pricing</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label>Visa Charges (₹)</Label>
                    <Input className="mt-1" type="number" min="0" placeholder="e.g. 3000" value={form.visaCharges}
                      onChange={(e) => setForm({ ...form, visaCharges: e.target.value })} required />
                  </div>
                  <div>
                    <Label>Service Fee (₹)</Label>
                    <Input className="mt-1" type="number" min="0" placeholder="e.g. 500" value={form.serviceFee}
                      onChange={(e) => setForm({ ...form, serviceFee: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-slate-500">Total Price (shown to users)</Label>
                    <div className="mt-1 h-10 px-3 rounded-lg border border-slate-200 bg-white flex items-center">
                      <span className="text-base font-bold text-blue-700">
                        {totalPrice > 0 ? `₹${totalPrice.toLocaleString('en-IN')}` : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Visa Details ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Business Days</Label>
                  <Input className="mt-1" type="number" min="1" placeholder="e.g. 15" value={form.processingDays} onChange={(e) => setForm({ ...form, processingDays: e.target.value })} required />
                </div>
                <div>
                  <Label>Validity</Label>
                  <Input className="mt-1" placeholder="e.g. 30 days, 1 year" value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} />
                </div>
                <div>
                  <Label>Stay Duration (days)</Label>
                  <Input className="mt-1" type="number" min="0" placeholder="e.g. 30" value={form.stayDuration} onChange={(e) => setForm({ ...form, stayDuration: e.target.value })} />
                </div>

                <div>
                  <Label>Visa Type</Label>
                  <div className="mt-1 flex gap-3">
                    {VISA_SUB_TYPES.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="visaSubType"
                          value={opt.value}
                          checked={form.visaSubType === opt.value}
                          onChange={() => setForm({ ...form, visaSubType: opt.value })}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <Label>Jurisdiction</Label>
                  <select value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {JURISDICTIONS.map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
                  </select>
                </div>

                <div>
                  <Label>Visa Category</Label>
                  <select value={form.visaCategory} onChange={(e) => setForm({ ...form, visaCategory: e.target.value })}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {VISA_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Entry Type (multi-select) ── */}
              <div>
                <Label>Entry</Label>
                <p className="text-xs text-slate-400 mb-2">Select all applicable entry types</p>
                <div className="flex flex-wrap gap-3">
                  {ENTRY_OPTIONS.map((opt) => {
                    const checked = form.entry.includes(opt.value);
                    return (
                      <label key={opt.value} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                        checked ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-blue-200'
                      }`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleEntry(opt.value)}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── Application Form Fields ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900 text-sm">Application Form Fields</h4>
                  <Button type="button" size="sm" variant="outline" onClick={addField}><Plus className="w-3.5 h-3.5 mr-1" />Add Field</Button>
                </div>
                <div className="space-y-3">
                  {form.formFields.map((field, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                        <div>
                          <label className="text-xs text-slate-500">Label</label>
                          <Input className="mt-0.5 h-8 text-xs" placeholder="Field label" value={field.label} onChange={(e) => updateField(i, 'label', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Field Name</label>
                          <Input className="mt-0.5 h-8 text-xs" placeholder="camelCase" value={field.fieldName} onChange={(e) => updateField(i, 'fieldName', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Type</label>
                          <select value={field.type} onChange={(e) => updateField(i, 'type', e.target.value)} className="mt-0.5 w-full h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Placeholder</label>
                          <Input className="mt-0.5 h-8 text-xs" placeholder="Hint text" value={field.placeholder} onChange={(e) => updateField(i, 'placeholder', e.target.value)} />
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                          <input type="checkbox" checked={field.required} onChange={(e) => updateField(i, 'required', e.target.checked)} className="rounded" />
                          Required
                        </label>
                        <button type="button" onClick={() => removeField(i)} className="text-red-400 hover:text-red-600 ml-auto">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {(field.type === 'select' || field.type === 'radio') && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-xs text-slate-500 font-medium mb-1">Selection Options</p>
                          <OptionListEditor
                            options={field.options}
                            onChange={(opts) => updateField(i, 'options', opts)}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Document Requirements ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900 text-sm">Document Requirements</h4>
                  <Button type="button" size="sm" variant="outline" onClick={addDocReq}><Plus className="w-3.5 h-3.5 mr-1" />Add Document</Button>
                </div>
                <div className="space-y-2">
                  {form.documentRequirements.map((doc, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-3 gap-2 items-center">
                      <Input className="h-8 text-xs" placeholder="Document name" value={doc.name} onChange={(e) => updateDocReq(i, 'name', e.target.value)} />
                      <Input className="h-8 text-xs" placeholder="Description (optional)" value={doc.description} onChange={(e) => updateDocReq(i, 'description', e.target.value)} />
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="checkbox" checked={doc.required} onChange={(e) => updateDocReq(i, 'required', e.target.checked)} />
                          Required
                        </label>
                        <button type="button" onClick={() => removeDocReq(i)} className="text-red-400 hover:text-red-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Update Visa Type' : 'Create Visa Type'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm text-slate-500">Filter by country:</label>
        <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Countries</option>
          {countries.map((c) => <option key={c._id} value={c._id}>{c.flag} {c.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Visa Type', 'Country', 'Charges', 'Service Fee', 'Total Price', 'Corporate', 'Days', 'Entry', 'Category', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visaTypes.length === 0 ? (
              <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-400">No visa types. Create one above.</td></tr>
            ) : (
              visaTypes.map((vt) => (
                <tr key={vt._id} className={`hover:bg-slate-50 ${!vt.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{vt.name}</p>
                    {vt.description && <p className="text-xs text-slate-400">{vt.description}</p>}
                    {vt.visaSubType && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                        {vt.visaSubType === 'e-visa' ? 'E-Visa' : 'Sticker'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <img src={`https://flagcdn.com/w20/${vt.country?.flag}.png`} alt="" className="w-5 h-3 object-cover rounded" />
                      {vt.country?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {vt.visaCharges != null ? formatCurrency(vt.visaCharges) : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {vt.serviceFee != null ? formatCurrency(vt.serviceFee) : '—'}
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-700">{formatCurrency(vt.price)}</td>
                  <td className="px-4 py-3">
                    {corpPriceEdit === vt._id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="number"
                          min="0"
                          className="h-7 w-24 text-xs"
                          placeholder="e.g. 120"
                          value={corpPriceDraft}
                          onChange={(e) => setCorpPriceDraft(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCorpPrice(vt._id);
                            if (e.key === 'Escape') setCorpPriceEdit(null);
                          }}
                        />
                        <button
                          onClick={() => handleSaveCorpPrice(vt._id)}
                          disabled={savingCorpPrice}
                          className="text-xs px-2 py-1 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {savingCorpPrice ? '…' : 'Save'}
                        </button>
                        <button onClick={() => setCorpPriceEdit(null)} className="text-xs text-slate-400 hover:text-slate-600">✕</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setCorpPriceEdit(vt._id); setCorpPriceDraft(vt.corporatePrice != null ? String(vt.corporatePrice) : ''); }}
                        className="flex items-center gap-1 group"
                        title="Set corporate price"
                      >
                        <span className={`font-semibold ${vt.corporatePrice != null ? 'text-amber-700' : 'text-slate-300'}`}>
                          {vt.corporatePrice != null ? formatCurrency(vt.corporatePrice) : '—'}
                        </span>
                        <Pencil className="w-3 h-3 text-slate-300 group-hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">{vt.processingDays}d</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(vt.entry || []).map((e) => (
                        <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium capitalize">{e}</span>
                      ))}
                      {(!vt.entry || vt.entry.length === 0) && <span className="text-slate-300 text-xs">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs capitalize text-slate-600">{vt.visaCategory || '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Toggle
                        checked={vt.isActive}
                        onChange={() => handleToggle(vt._id)}
                        disabled={toggling === vt._id}
                      />
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          {vt.isActive && (
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          )}
                          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${vt.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                        </span>
                        <span className={`text-xs font-semibold ${vt.isActive ? 'text-emerald-700' : 'text-slate-400'}`}>
                          {vt.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(vt)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(vt._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
