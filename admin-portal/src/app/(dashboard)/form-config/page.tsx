'use client';
import { useEffect, useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, LayoutTemplate, FileText, FileStack } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { getFormPresets, createFormPreset, updateFormPreset, deleteFormPreset } from '@/lib/api';
import { DOC_TYPE_OPTIONS } from '@/types';
import type { FormField, DocumentRequirement, FieldType, FormPreset, DocumentType, ApplicantType } from '@/types';

const FIELD_TYPES: FieldType[] = ['text', 'number', 'email', 'date', 'select', 'radio', 'textarea', 'file'];
const APPLICANT_OPTS: { value: ApplicantType; label: string; active: string }[] = [
  { value: 'adult', label: 'Adult', active: 'bg-blue-600 text-white' },
  { value: 'both', label: 'Both', active: 'bg-violet-600 text-white' },
  { value: 'child', label: 'Child', active: 'bg-emerald-600 text-white' },
];
const emptyField = (): FormField => ({ label: '', fieldName: '', type: 'text', required: false, options: [], placeholder: '', order: 0, applicantType: 'adult' });
const isOcrDocType = (t: string) => t === 'passport_front' || t === 'passport_back';
const emptyDocReq = (): DocumentRequirement => ({ name: '', description: '', required: true, applicantType: 'adult', docType: 'custom', ocrEnabled: false });

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
  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter') { e.preventDefault(); add(); } };

  return (
    <div className="mt-2 space-y-2">
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt, idx) => (
            <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 border border-blue-200 text-xs text-blue-800 font-medium">
              {opt}
              <button type="button" onClick={() => remove(idx)} className="text-blue-400 hover:text-blue-700 ml-0.5"><X className="w-3 h-3" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <Input ref={inputRef} className="h-7 text-xs flex-1" placeholder="Add option…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={handleKey} />
        <button type="button" onClick={add} disabled={!draft.trim()}
          className="h-7 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

const emptyForm = () => ({
  name: '', description: '',
  formFields: [] as FormField[],
  documentRequirements: [] as DocumentRequirement[],
});

export default function FormConfigPage() {
  const [presets, setPresets] = useState<FormPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm());

  const load = () => {
    setLoading(true);
    getFormPresets().then((r) => setPresets(r.data.data)).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setForm(emptyForm()); setEditId(null); setShowForm(true); };
  const openEdit = (p: FormPreset) => {
    setForm({
      name: p.name,
      description: p.description || '',
      formFields: (p.formFields || []).map((f) => ({ ...f, options: [...(f.options || [])] })),
      documentRequirements: (p.documentRequirements || []).map((d) => ({ ...d })),
    });
    setEditId(p._id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addField = () => setForm((f) => ({ ...f, formFields: [...f.formFields, emptyField()] }));
  const removeField = (i: number) => setForm((f) => ({ ...f, formFields: f.formFields.filter((_, idx) => idx !== i) }));
  const updateField = (i: number, key: keyof FormField, value: any) =>
    setForm((f) => ({ ...f, formFields: f.formFields.map((field, idx) => idx === i ? { ...field, [key]: value } : field) }));

  const addDocReq = () => setForm((f) => ({ ...f, documentRequirements: [...f.documentRequirements, emptyDocReq()] }));
  const removeDocReq = (i: number) => setForm((f) => ({ ...f, documentRequirements: f.documentRequirements.filter((_, idx) => idx !== i) }));
  const updateDocReq = (i: number, key: keyof DocumentRequirement, value: any) =>
    setForm((f) => ({ ...f, documentRequirements: f.documentRequirements.map((d, idx) => idx === i ? { ...d, [key]: value } : d) }));

  // Changing the type pre-fills the document name (unless the admin already typed a custom one).
  const updateDocType = (i: number, value: DocumentType) =>
    setForm((f) => ({ ...f, documentRequirements: f.documentRequirements.map((d, idx) => {
      if (idx !== i) return d;
      const opt = DOC_TYPE_OPTIONS.find((o) => o.value === value);
      const prevDefault = DOC_TYPE_OPTIONS.find((o) => o.value === (d.docType || 'custom'))?.defaultName;
      const name = (!d.name.trim() || d.name === prevDefault) && opt?.defaultName ? opt.defaultName : d.name;
      return { ...d, docType: value, name, ocrEnabled: isOcrDocType(value) };
    }) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast({ title: 'Preset name is required', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description,
        formFields: form.formFields.map((f, i) => ({ ...f, order: i })),
        documentRequirements: form.documentRequirements,
      };
      if (editId) {
        await updateFormPreset(editId, payload);
        toast({ title: 'Preset updated', variant: 'success' });
      } else {
        await createFormPreset(payload);
        toast({ title: 'Preset created', variant: 'success' });
      }
      setShowForm(false);
      setEditId(null);
      load();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Move this preset to Trash? You can restore it later from the Trash page.')) return;
    await deleteFormPreset(id);
    toast({ title: 'Moved to Trash' });
    load();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Form Config</h1>
          <p className="text-slate-500 text-sm mt-1">Build reusable form layouts (fields + documents) and apply them to any visa type in one click.</p>
        </div>
        <Button onClick={() => (showForm ? (setShowForm(false), setEditId(null)) : openCreate())}>
          <Plus className="w-4 h-4 mr-2" /> New Preset
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6 border-violet-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <LayoutTemplate className="w-4 h-4 text-violet-600" />
              {editId ? 'Edit Preset' : 'Create Preset'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Preset Name</Label>
                  <Input className="mt-1" placeholder="e.g. Tourist – Standard Layout" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                </div>
                <div>
                  <Label>Description</Label>
                  <Input className="mt-1" placeholder="Short note about this layout" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>

              {/* ── Application Form Fields ── */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-slate-900 text-sm">Application Form Fields</h4>
                  <Button type="button" size="sm" variant="outline" onClick={addField}><Plus className="w-3.5 h-3.5 mr-1" />Add Field</Button>
                </div>
                {form.formFields.length === 0 && <p className="text-xs text-slate-400 mb-2">No fields yet. Add the fields applicants should fill.</p>}
                {form.formFields.length > 0 && <p className="text-xs text-slate-400 mb-2">Use <span className="font-medium">Applies to</span> to control which traveller type sees each field: Adult (default), Child, or Both.</p>}
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
                      <div className="flex items-center gap-4 flex-wrap">
                        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                          <input type="checkbox" checked={field.required} onChange={(e) => updateField(i, 'required', e.target.checked)} className="rounded" />
                          Required
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">Applies to:</span>
                          <div className="flex rounded-md border border-slate-200 overflow-hidden text-[11px] font-semibold">
                            {APPLICANT_OPTS.map((opt) => (
                              <button key={opt.value} type="button"
                                onClick={() => updateField(i, 'applicantType', opt.value)}
                                className={`px-2.5 py-1 transition-colors ${(field.applicantType || 'adult') === opt.value ? opt.active : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <button type="button" onClick={() => removeField(i)} className="text-red-400 hover:text-red-600 ml-auto"><X className="w-4 h-4" /></button>
                      </div>
                      {(field.type === 'select' || field.type === 'radio') && (
                        <div className="mt-2 pt-2 border-t border-slate-200">
                          <p className="text-xs text-slate-500 font-medium mb-1">Selection Options</p>
                          <OptionListEditor options={field.options} onChange={(opts) => updateField(i, 'options', opts)} />
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
                  {form.documentRequirements.map((doc, i) => {
                    const typeOpt = DOC_TYPE_OPTIONS.find((o) => o.value === (doc.docType || 'custom'));
                    return (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                        <div>
                          <label className="text-xs text-slate-500">Type</label>
                          <select value={doc.docType || 'custom'} onChange={(e) => updateDocType(i, e.target.value as DocumentType)}
                            className="mt-0.5 w-full h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500">
                            {DOC_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Name</label>
                          <Input className="mt-0.5 h-8 text-xs" placeholder="Document name" value={doc.name} onChange={(e) => updateDocReq(i, 'name', e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs text-slate-500">Description</label>
                          <Input className="mt-0.5 h-8 text-xs" placeholder="Optional" value={doc.description} onChange={(e) => updateDocReq(i, 'description', e.target.value)} />
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-wrap">
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                          <input type="checkbox" checked={doc.required} onChange={(e) => updateDocReq(i, 'required', e.target.checked)} className="rounded" />
                          Required
                        </label>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">Applies to:</span>
                          <div className="flex rounded-md border border-slate-200 overflow-hidden text-[11px] font-semibold">
                            {APPLICANT_OPTS.map((opt) => (
                              <button key={opt.value} type="button"
                                onClick={() => updateDocReq(i, 'applicantType', opt.value)}
                                className={`px-2.5 py-1 transition-colors ${(doc.applicantType || 'adult') === opt.value ? opt.active : 'bg-white text-slate-500 hover:bg-slate-50'}`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <label className="flex items-center gap-1.5 text-xs cursor-pointer" title="Run OCR to auto-extract details when applicant uploads this document">
                          <input type="checkbox" checked={doc.ocrEnabled !== false} onChange={(e) => updateDocReq(i, 'ocrEnabled', e.target.checked)} className="rounded" />
                          OCR extraction
                        </label>
                        <button type="button" onClick={() => removeDocReq(i)} className="text-red-400 hover:text-red-600 ml-auto"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Update Preset' : 'Create Preset'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Preset list */}
      {loading ? (
        <div className="text-center py-16"><Loader2 className="w-6 h-6 animate-spin text-blue-600 mx-auto" /></div>
      ) : presets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <LayoutTemplate className="w-10 h-10 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500 font-medium">No form presets yet</p>
          <p className="text-slate-400 text-sm mt-1">Create a layout to reuse across visa types.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map((p) => (
            <div key={p._id} className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{p.name}</p>
                  {p.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{p.description}</p>}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(p)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(p._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <div className="flex gap-3 mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-slate-400" /> {p.formFields?.length || 0} field{(p.formFields?.length || 0) !== 1 ? 's' : ''}</span>
                <span className="flex items-center gap-1.5"><FileStack className="w-3.5 h-3.5 text-slate-400" /> {p.documentRequirements?.length || 0} doc{(p.documentRequirements?.length || 0) !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-slate-400 mt-6 flex items-center gap-1.5">
        <LayoutTemplate className="w-3.5 h-3.5" />
        Apply these presets from the Visa Types form using the “Form Presets” panel.
      </p>
    </div>
  );
}
