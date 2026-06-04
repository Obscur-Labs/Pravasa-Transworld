'use client';
import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { getCountries, getVisaTypes, createVisaType, updateVisaType, deleteVisaType, toggleVisaType } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import type { Country, VisaType, FormField, DocumentRequirement, FieldType } from '@/types';

const FIELD_TYPES: FieldType[] = ['text', 'number', 'email', 'date', 'select', 'radio', 'textarea', 'file'];
const emptyField = (): FormField => ({ label: '', fieldName: '', type: 'text', required: false, options: [], placeholder: '', order: 0 });
const emptyDocReq = (): DocumentRequirement => ({ name: '', description: '', required: true });

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

export default function VisaTypesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [form, setForm] = useState({
    country: '', name: '', description: '', price: '', processingDays: '', validity: '',
    formFields: [] as FormField[],
    documentRequirements: [] as DocumentRequirement[],
  });

  useEffect(() => {
    getCountries().then((r) => setCountries(r.data.data));
  }, []);

  useEffect(() => {
    getVisaTypes(selectedCountry || undefined).then((r) => setVisaTypes(r.data.data));
  }, [selectedCountry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        price: Number(form.price),
        processingDays: Number(form.processingDays),
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

  const startEdit = (vt: VisaType) => {
    setForm({
      country: String(vt.country?._id || vt.country),
      name: vt.name,
      description: vt.description,
      price: String(vt.price),
      processingDays: String(vt.processingDays),
      validity: vt.validity || '',
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
        <Button onClick={() => { setForm({ country: '', name: '', description: '', price: '', processingDays: '', validity: '', formFields: [], documentRequirements: [] }); setEditId(null); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Visa Type
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 border-blue-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 mb-5">{editId ? 'Edit Visa Type' : 'Create Visa Type'}</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
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
                  <Label>Visa Category</Label>
                  <Input className="mt-1" placeholder="e.g. Tourist, Business" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
                <div>
                  <Label>Price (USD)</Label>
                  <Input className="mt-1" type="number" min="0" placeholder="e.g. 150" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div>
                  <Label>Business Days</Label>
                  <Input className="mt-1" type="number" min="1" placeholder="e.g. 15" value={form.processingDays} onChange={(e) => setForm({ ...form, processingDays: e.target.value })} required />
                </div>
                <div>
                  <Label>Validity</Label>
                  <Input className="mt-1" placeholder="e.g. 30 days, 1 year" value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} />
                </div>
              </div>

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
              {['Visa Type', 'Country', 'Price', 'Business Days', 'Validity', 'Fields', 'Documents', 'Status', ''].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visaTypes.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-400">No visa types. Create one above.</td></tr>
            ) : (
              visaTypes.map((vt) => (
                <tr key={vt._id} className={`hover:bg-slate-50 ${!vt.isActive ? 'opacity-60' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{vt.name}</p>
                    {vt.description && <p className="text-xs text-slate-400">{vt.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1.5">
                      <img src={`https://flagcdn.com/w20/${vt.country?.flag}.png`} alt="" className="w-5 h-3 object-cover rounded" />
                      {vt.country?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-bold text-blue-700">{formatCurrency(vt.price)}</td>
                  <td className="px-4 py-3 text-slate-500">{vt.processingDays} days</td>
                  <td className="px-4 py-3 text-slate-500">{vt.validity || '—'}</td>
                  <td className="px-4 py-3"><Badge variant="secondary">{vt.formFields?.length || 0} fields</Badge></td>
                  <td className="px-4 py-3"><Badge variant="secondary">{vt.documentRequirements?.length || 0} docs</Badge></td>
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
