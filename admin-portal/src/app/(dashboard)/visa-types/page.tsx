'use client';
import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Save, LayoutTemplate, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import {
  getCountries, getVisaTypes, createVisaType, updateVisaType, deleteVisaType, toggleVisaType,
  getFormPresets, createFormPreset, deleteFormPreset,
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Country, VisaType, FormField, DocumentRequirement, FieldType, EntryType, FormPreset } from '@/types';

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

const PROCESS_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'express', label: 'Express' },
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

const ENTRY_LABELS: Record<string, string> = { single: 'Single', multiple: 'Multiple', double: 'Double' };
const CATEGORY_NAME: Record<string, string> = { tourist: 'Tourist', business: 'Business', transit: 'Transit', student: 'Student' };
const PROCESS_NAME: Record<string, string> = { normal: 'Normal', express: 'Express' };

/** Build the visa name from: stay duration → entry → type (category) → process. */
function buildVisaName(f: { stayDuration: string; entry: EntryType[]; visaCategory: string; process: string }): string {
  const parts: string[] = [];
  if (f.stayDuration?.trim()) parts.push(f.stayDuration.trim());
  if (f.entry?.[0]) parts.push(ENTRY_LABELS[f.entry[0]] || f.entry[0]);
  if (f.visaCategory) parts.push(CATEGORY_NAME[f.visaCategory] || f.visaCategory);
  if (f.process) parts.push(PROCESS_NAME[f.process] || f.process);
  return parts.join(' ');
}

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
  country: '', name: '', description: '',
  adultPrice: '', childPrice: '', corporateAdultPrice: '', corporateChildPrice: '',
  processingTime: '', validity: '',
  entry: [] as EntryType[],
  visaSubType: 'e-visa' as string,
  stayDuration: '',
  jurisdiction: 'pan-india' as string,
  visaCategory: 'tourist' as string,
  process: 'normal' as string,
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
  const [form, setForm] = useState(emptyForm());

  // Form presets
  const [presets, setPresets] = useState<FormPreset[]>([]);
  const [applyPresetId, setApplyPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);

  // Tracks the last auto-generated name so we can keep syncing until the admin types a custom name.
  const lastAutoName = useRef('');

  useEffect(() => {
    getCountries().then((r) => setCountries(r.data.data));
    getFormPresets().then((r) => setPresets(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => {
    getVisaTypes(selectedCountry || undefined).then((r) => setVisaTypes(r.data.data));
  }, [selectedCountry]);

  /** Update one of the name-source fields and re-derive the name (unless admin customized it). */
  const updateNamed = (patch: Partial<ReturnType<typeof emptyForm>>) => {
    setForm((f) => {
      const next = { ...f, ...patch };
      if (f.name === lastAutoName.current || f.name.trim() === '') {
        const auto = buildVisaName(next);
        next.name = auto;
        lastAutoName.current = auto;
      }
      return next;
    });
  };

  const setEntry = (val: EntryType) => updateNamed({ entry: [val] });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adultPrice) { toast({ title: 'Adult price is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = {
        ...form,
        adultPrice: Number(form.adultPrice),
        childPrice: Number(form.childPrice || 0),
        corporateAdultPrice: form.corporateAdultPrice === '' ? '' : Number(form.corporateAdultPrice),
        corporateChildPrice: form.corporateChildPrice === '' ? '' : Number(form.corporateChildPrice),
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

  // ── Form Presets ──
  const reloadPresets = () => getFormPresets().then((r) => setPresets(r.data.data)).catch(() => {});

  const applyPreset = () => {
    const preset = presets.find((p) => p._id === applyPresetId);
    if (!preset) return;
    setForm((f) => ({
      ...f,
      formFields: preset.formFields.map((ff) => ({ ...ff, options: [...(ff.options || [])] })),
      documentRequirements: preset.documentRequirements.map((d) => ({ ...d })),
    }));
    toast({ title: `Applied preset "${preset.name}"`, description: `${preset.formFields.length} field(s) loaded.`, variant: 'success' });
  };

  const saveAsPreset = async () => {
    const name = presetName.trim();
    if (!name) { toast({ title: 'Enter a preset name', variant: 'destructive' }); return; }
    if (form.formFields.length === 0 && form.documentRequirements.length === 0) {
      toast({ title: 'Add some fields first', variant: 'destructive' }); return;
    }
    setSavingPreset(true);
    try {
      await createFormPreset({
        name,
        formFields: form.formFields.map((f, i) => ({ ...f, order: i })),
        documentRequirements: form.documentRequirements,
      });
      toast({ title: `Preset "${name}" saved`, variant: 'success' });
      setPresetName('');
      reloadPresets();
    } catch (err: any) {
      toast({ title: 'Failed to save preset', description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setSavingPreset(false);
    }
  };

  const handleDeletePreset = async (id: string) => {
    if (!confirm('Delete this preset?')) return;
    await deleteFormPreset(id);
    if (applyPresetId === id) setApplyPresetId('');
    toast({ title: 'Preset deleted' });
    reloadPresets();
  };

  const openCreate = () => {
    setForm(emptyForm());
    setEditId(null);
    lastAutoName.current = '';
    setApplyPresetId('');
    setPresetName('');
    setShowForm(!showForm);
  };

  const startEdit = (vt: VisaType) => {
    setForm({
      country: String(vt.country?._id || vt.country),
      name: vt.name,
      description: vt.description,
      adultPrice: String(vt.adultPrice || vt.price || ''),
      childPrice: vt.childPrice ? String(vt.childPrice) : '',
      corporateAdultPrice: vt.corporateAdultPrice != null ? String(vt.corporateAdultPrice) : (vt.corporatePrice != null ? String(vt.corporatePrice) : ''),
      corporateChildPrice: vt.corporateChildPrice != null ? String(vt.corporateChildPrice) : '',
      processingTime: vt.processingTime || '',
      validity: vt.validity || '',
      entry: vt.entry?.length ? [vt.entry[0]] : [],
      visaSubType: vt.visaSubType || 'e-visa',
      stayDuration: String(vt.stayDuration || ''),
      jurisdiction: vt.jurisdiction || 'pan-india',
      visaCategory: vt.visaCategory || 'tourist',
      process: vt.process || 'normal',
      formFields: vt.formFields || [],
      documentRequirements: vt.documentRequirements || [],
    });
    // Don't auto-overwrite an existing custom name on edit.
    lastAutoName.current = '';
    setEditId(vt._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Visa Types</h1>
          <p className="text-slate-500 text-sm mt-1">Manage visa types, per-traveler pricing, and dynamic form fields.</p>
        </div>
        <Button onClick={openCreate}>
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
                  <Label>Visa Name <span className="text-xs font-normal text-slate-400">(auto-generated, editable)</span></Label>
                  <Input className="mt-1" placeholder="e.g. 14 Days Single Tourist Normal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input className="mt-1" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>

              {/* ── Pricing ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 space-y-3">
                  <p className="text-sm font-semibold text-blue-900">Standard Pricing (per traveler)</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Adult Price (₹)</Label>
                      <Input className="mt-1" type="number" min="0" placeholder="e.g. 5000" value={form.adultPrice}
                        onChange={(e) => setForm({ ...form, adultPrice: e.target.value })} required />
                    </div>
                    <div>
                      <Label>Child Price (₹)</Label>
                      <Input className="mt-1" type="number" min="0" placeholder="e.g. 3000" value={form.childPrice}
                        onChange={(e) => setForm({ ...form, childPrice: e.target.value })} />
                    </div>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 space-y-3">
                  <p className="text-sm font-semibold text-amber-900">Corporate Pricing <span className="text-xs font-normal text-amber-600">(shown to corporate users only)</span></p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Corporate Adult Price (₹)</Label>
                      <Input className="mt-1" type="number" min="0" placeholder="optional" value={form.corporateAdultPrice}
                        onChange={(e) => setForm({ ...form, corporateAdultPrice: e.target.value })} />
                    </div>
                    <div>
                      <Label>Corporate Child Price (₹)</Label>
                      <Input className="mt-1" type="number" min="0" placeholder="optional" value={form.corporateChildPrice}
                        onChange={(e) => setForm({ ...form, corporateChildPrice: e.target.value })} />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Visa Details ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Stay Duration</Label>
                  <Input className="mt-1" type="text" placeholder="e.g. 14 Days" value={form.stayDuration} onChange={(e) => updateNamed({ stayDuration: e.target.value })} />
                </div>
                <div>
                  <Label>Processing Time</Label>
                  <Input className="mt-1" type="text" placeholder="e.g. 2 Working Days" value={form.processingTime} onChange={(e) => setForm({ ...form, processingTime: e.target.value })} required />
                </div>
                <div>
                  <Label>Validity</Label>
                  <Input className="mt-1" placeholder="e.g. 90 Days, 1 year" value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} />
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
                  <Label>Process</Label>
                  <div className="mt-1 flex gap-3">
                    {PROCESS_OPTIONS.map((opt) => (
                      <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="process"
                          value={opt.value}
                          checked={form.process === opt.value}
                          onChange={() => updateNamed({ process: opt.value })}
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
                  <select value={form.visaCategory} onChange={(e) => updateNamed({ visaCategory: e.target.value })}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {VISA_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              {/* ── Entry Type (single-select) ── */}
              <div>
                <Label>Entry</Label>
                <p className="text-xs text-slate-400 mb-2">Select one entry type</p>
                <div className="flex flex-wrap gap-3">
                  {ENTRY_OPTIONS.map((opt) => {
                    const checked = form.entry[0] === opt.value;
                    return (
                      <label key={opt.value} className={`flex items-center gap-2 px-4 py-2 rounded-lg border-2 cursor-pointer transition-all ${
                        checked ? 'border-blue-500 bg-blue-50 text-blue-800' : 'border-slate-200 text-slate-600 hover:border-blue-200'
                      }`}>
                        <input
                          type="radio"
                          name="entry"
                          checked={checked}
                          onChange={() => setEntry(opt.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium">{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* ── Form Presets ── */}
              <div className="p-4 rounded-xl bg-violet-50 border border-violet-100 space-y-3">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-violet-600" />
                  <p className="text-sm font-semibold text-violet-900">Form Presets</p>
                </div>
                <p className="text-xs text-violet-700/80">Apply a saved layout of form fields & documents in one click, or save the current layout as a reusable preset.</p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select
                    value={applyPresetId}
                    onChange={(e) => setApplyPresetId(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-violet-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1"
                  >
                    <option value="">Select a preset to apply…</option>
                    {presets.map((p) => (
                      <option key={p._id} value={p._id}>{p.name} ({p.formFields.length} fields, {p.documentRequirements.length} docs)</option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" disabled={!applyPresetId} onClick={applyPreset}>
                    <Check className="w-3.5 h-3.5 mr-1" /> Apply Preset
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input
                    className="h-9 flex-1"
                    placeholder="New preset name (saves current fields & docs)"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                  <Button type="button" variant="outline" disabled={savingPreset} onClick={saveAsPreset}>
                    {savingPreset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1" /> Save as Preset</>}
                  </Button>
                </div>

                {presets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {presets.map((p) => (
                      <span key={p._id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-violet-200 text-xs text-violet-800 font-medium">
                        {p.name}
                        <button type="button" onClick={() => handleDeletePreset(p._id)} className="text-violet-300 hover:text-red-500 ml-0.5">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
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

      <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['Visa Type', 'Country', 'Adult ₹', 'Child ₹', 'Corporate (A / C)', 'Process', 'Time', 'Entry', 'Category', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
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
                  <td className="px-4 py-3 font-bold text-blue-700">{formatCurrency(vt.adultPrice || vt.price)}</td>
                  <td className="px-4 py-3 text-slate-600 text-xs">
                    {vt.childPrice ? formatCurrency(vt.childPrice) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={vt.corporateAdultPrice != null ? 'text-amber-700 font-semibold' : 'text-slate-300'}>
                      {vt.corporateAdultPrice != null ? formatCurrency(vt.corporateAdultPrice) : '—'}
                    </span>
                    <span className="text-slate-300"> / </span>
                    <span className={vt.corporateChildPrice != null ? 'text-amber-700 font-semibold' : 'text-slate-300'}>
                      {vt.corporateChildPrice != null ? formatCurrency(vt.corporateChildPrice) : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${vt.process === 'express' ? 'text-rose-600 bg-rose-50' : 'text-slate-600 bg-slate-100'}`}>
                      {vt.process || 'normal'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{vt.processingTime}</td>
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
