'use client';
import { Fragment, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, X, Save, LayoutTemplate, Check, Copy, Eraser, ChevronLeft, ChevronRight, Search as SearchIcon, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PageHeader } from '@/components/ui/page-header';
import { Switch } from '@/components/ui/switch';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from '@/components/ui/use-toast';
import { FormFieldEditor } from '@/components/shared/form-field-editor';
import { DocumentRequirementEditor } from '@/components/shared/document-requirement-editor';
import {
  getCountries, getVisaTypes, createVisaType, updateVisaType, deleteVisaType, toggleVisaType,
  getFormPresets, createFormPreset, deleteFormPreset, getVisaConfig,
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { DOC_TYPE_OPTIONS } from '@/types';
import type { Country, VisaType, FormField, DocumentRequirement, EntryType, FormPreset, DocumentType, VisaConfigOption, VisaConfigCategory } from '@/types';

const emptyField = (): FormField => ({ label: '', fieldName: '', type: 'text', required: false, options: [], placeholder: '', order: 0, applicantType: 'adult' });
const isOcrDocType = (t: string) => t === 'passport_front' || t === 'passport_back';
const emptyDocReq = (): DocumentRequirement => ({ name: '', description: '', required: true, applicantType: 'adult', docType: 'custom', ocrEnabled: false });

function TabButton({ step, label, active, done, onClick }: { step: number; label: string; active: boolean; done: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
        active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
      }`}>
      <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-bold flex-shrink-0 transition-colors ${
        done ? 'bg-success text-white' : active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
      }`}>
        {done ? <Check className="w-3 h-3" /> : step}
      </span>
      {label}
    </button>
  );
}

// The pricing card renders like the receipt it produces: one line per fee component
// (Adult + Child columns), then computed GST and "Customer pays" lines underneath.
type PriceField =
  | 'adultPrice' | 'childPrice'
  | 'adultVfsFee' | 'childVfsFee'
  | 'adultServiceFee' | 'childServiceFee'
  | 'corporateAdultPrice' | 'corporateChildPrice'
  | 'corporateAdultVfsFee' | 'corporateChildVfsFee'
  | 'corporateAdultServiceFee' | 'corporateChildServiceFee';

const PRICE_ROWS: { label: string; required?: boolean; hint?: string; std: [PriceField, PriceField]; corp: [PriceField, PriceField] }[] = [
  { label: 'Visa fee', required: true, std: ['adultPrice', 'childPrice'], corp: ['corporateAdultPrice', 'corporateChildPrice'] },
  { label: 'VFS fee', std: ['adultVfsFee', 'childVfsFee'], corp: ['corporateAdultVfsFee', 'corporateChildVfsFee'] },
  { label: 'Service fee', hint: 'optional', std: ['adultServiceFee', 'childServiceFee'], corp: ['corporateAdultServiceFee', 'corporateChildServiceFee'] },
];

const emptyForm = () => ({
  country: '', name: '', description: '',
  adultPrice: '', childPrice: '', adultVfsFee: '', childVfsFee: '', adultServiceFee: '', childServiceFee: '',
  corporateAdultPrice: '', corporateChildPrice: '', corporateAdultVfsFee: '', corporateChildVfsFee: '',
  corporateAdultServiceFee: '', corporateChildServiceFee: '',
  processingTime: '', validity: '',
  entry: [] as EntryType[],
  visaSubType: 'e-visa' as string,
  stayDuration: '',
  jurisdiction: 'pan-india' as string,
  visaCategory: 'tourist' as string,
  process: 'normal' as string,
  formFields: [] as FormField[],
  documentRequirements: [] as DocumentRequirement[],
  additionalNotes: '',
});

export default function VisaTypesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [visaTypes, setVisaTypes] = useState<VisaType[]>([]);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStatus, setFilterStatus] = useState<'' | 'active' | 'inactive'>('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'newest' | 'oldest'>('name-asc');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [pricingTab, setPricingTab] = useState<'standard' | 'corporate'>('standard');
  const [activeTab, setActiveTab] = useState<'info' | 'form' | 'notes'>('info');
  const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePresetId, setDeletePresetId] = useState<string | null>(null);

  // Form presets
  const [presets, setPresets] = useState<FormPreset[]>([]);
  const [applyPresetId, setApplyPresetId] = useState('');
  const [presetName, setPresetName] = useState('');
  const [savingPreset, setSavingPreset] = useState(false);

  // Jurisdiction / category / sub-type / entry option lists — managed on the Visa Config page.
  const [configOptions, setConfigOptions] = useState<VisaConfigOption[]>([]);

  useEffect(() => {
    getCountries().then((r) => setCountries(r.data.data));
    getFormPresets().then((r) => setPresets(r.data.data)).catch(() => {});
    getVisaConfig().then((r) => setConfigOptions(r.data.data)).catch(() => {});
  }, []);

  // Active options for a category, plus the currently-selected value even if it's since
  // been deactivated — so editing an older visa type never silently resets the field.
  const optionsFor = (category: VisaConfigCategory, currentValue?: string) => {
    const active = configOptions
      .filter((o) => o.category === category && o.isActive)
      .sort((a, b) => a.order - b.order);
    if (currentValue && !active.some((o) => o.value === currentValue)) {
      const stale = configOptions.find((o) => o.category === category && o.value === currentValue);
      if (stale) return [...active, { ...stale, label: `${stale.label} (inactive)` }];
    }
    return active;
  };

  useEffect(() => {
    getVisaTypes(selectedCountry || undefined).then((r) => setVisaTypes(r.data.data));
  }, [selectedCountry]);

  // Fields that live on the Information tab still need to be validated when the Form
  // tab is active — hidden/unmounted fields don't participate in native HTML validation,
  // so this replaces reliance on the `required` attribute across tab boundaries.
  const validateInfo = (): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (!form.country) errs.country = 'Select a country';
    if (!form.name.trim()) errs.name = 'Visa name is required';
    if (!form.adultPrice) errs.adultPrice = 'Adult price is required';
    if (!form.processingTime.trim()) errs.processingTime = 'Processing time is required';
    return errs;
  };

  // Clears a single field's sticky error as soon as the admin edits it, instead of
  // leaving stale red text/borders until the next validation attempt.
  const clearInfoError = (key: string) =>
    setInfoErrors((prev) => (prev[key] ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== key)) : prev));

  // Shared gate for moving past the Information tab, regardless of which later tab was clicked.
  const goToTab = (tab: 'form' | 'notes') => {
    const errs = validateInfo();
    setInfoErrors(errs);
    if (Object.keys(errs).length > 0) {
      setActiveTab('info');
      if (errs.adultPrice) setPricingTab('standard');
      toast({ title: 'Fill in the required fields', description: 'Check the highlighted fields under Information.', variant: 'destructive' });
      return;
    }
    setActiveTab(tab);
  };
  const goToFormTab = () => goToTab('form');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validateInfo();
    if (Object.keys(errs).length > 0) {
      setInfoErrors(errs);
      setActiveTab('info');
      if (errs.adultPrice) setPricingTab('standard');
      toast({ title: 'Fill in the required fields', description: 'Check the highlighted fields under Information.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        adultPrice: Number(form.adultPrice),
        childPrice: Number(form.childPrice || 0),
        adultVfsFee: Number(form.adultVfsFee || 0),
        childVfsFee: Number(form.childVfsFee || 0),
        adultServiceFee: Number(form.adultServiceFee || 0),
        childServiceFee: Number(form.childServiceFee || 0),
        corporateAdultPrice: form.corporateAdultPrice === '' ? '' : Number(form.corporateAdultPrice),
        corporateChildPrice: form.corporateChildPrice === '' ? '' : Number(form.corporateChildPrice),
        corporateAdultVfsFee: form.corporateAdultVfsFee === '' ? '' : Number(form.corporateAdultVfsFee),
        corporateChildVfsFee: form.corporateChildVfsFee === '' ? '' : Number(form.corporateChildVfsFee),
        corporateAdultServiceFee: form.corporateAdultServiceFee === '' ? '' : Number(form.corporateAdultServiceFee),
        corporateChildServiceFee: form.corporateChildServiceFee === '' ? '' : Number(form.corporateChildServiceFee),
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
    await deleteVisaType(id);
    toast({ title: 'Moved to Trash', description: 'Restore it anytime from the Trash page.' });
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

  // Changing the type pre-fills the document name (unless the admin already typed a custom one).
  const updateDocType = (i: number, value: DocumentType) =>
    setForm((f) => ({ ...f, documentRequirements: f.documentRequirements.map((d, idx) => {
      if (idx !== i) return d;
      const opt = DOC_TYPE_OPTIONS.find((o) => o.value === value);
      const prevDefault = DOC_TYPE_OPTIONS.find((o) => o.value === (d.docType || 'custom'))?.defaultName;
      const name = (!d.name.trim() || d.name === prevDefault) && opt?.defaultName ? opt.defaultName : d.name;
      return { ...d, docType: value, name, ocrEnabled: isOcrDocType(value) };
    }) }));

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
    await deleteFormPreset(id);
    if (applyPresetId === id) setApplyPresetId('');
    toast({ title: 'Moved to Trash' });
    reloadPresets();
  };

  // Clicking the chip's "x" only clears the current selection — it never deletes the
  // saved preset. Deleting is a separate, deliberate action via the trash icon.
  const deselectPreset = (id: string) => {
    if (applyPresetId === id) setApplyPresetId('');
  };

  const duplicatePreset = async (p: FormPreset) => {
    try {
      await createFormPreset({
        name: `${p.name} (Copy)`,
        description: p.description,
        formFields: p.formFields,
        documentRequirements: p.documentRequirements,
      });
      toast({ title: `Duplicated "${p.name}"`, variant: 'success' });
      reloadPresets();
    } catch (err: any) {
      toast({ title: 'Failed to duplicate preset', description: err.response?.data?.message, variant: 'destructive' });
    }
  };

  // Clears only the Fields/Documents sections of the current form — does not touch any saved preset.
  const clearFormFields = () => {
    setForm((f) => ({ ...f, formFields: [], documentRequirements: [] }));
    setApplyPresetId('');
  };

  const openCreate = () => {
    setForm(emptyForm());
    setEditId(null);
    setApplyPresetId('');
    setPresetName('');
    setActiveTab('info');
    setPricingTab('standard');
    setInfoErrors({});
    setShowForm(!showForm);
  };

  const startEdit = (vt: VisaType) => {
    setForm({
      country: String(vt.country?._id || vt.country),
      name: vt.name,
      description: vt.description,
      adultPrice: String(vt.adultPrice || vt.price || ''),
      childPrice: vt.childPrice ? String(vt.childPrice) : '',
      adultVfsFee: vt.adultVfsFee ? String(vt.adultVfsFee) : '',
      childVfsFee: vt.childVfsFee ? String(vt.childVfsFee) : '',
      adultServiceFee: vt.adultServiceFee ? String(vt.adultServiceFee) : '',
      childServiceFee: vt.childServiceFee ? String(vt.childServiceFee) : '',
      corporateAdultPrice: vt.corporateAdultPrice != null ? String(vt.corporateAdultPrice) : (vt.corporatePrice != null ? String(vt.corporatePrice) : ''),
      corporateChildPrice: vt.corporateChildPrice != null ? String(vt.corporateChildPrice) : '',
      corporateAdultVfsFee: vt.corporateAdultVfsFee != null ? String(vt.corporateAdultVfsFee) : '',
      corporateChildVfsFee: vt.corporateChildVfsFee != null ? String(vt.corporateChildVfsFee) : '',
      corporateAdultServiceFee: vt.corporateAdultServiceFee != null ? String(vt.corporateAdultServiceFee) : '',
      corporateChildServiceFee: vt.corporateChildServiceFee != null ? String(vt.corporateChildServiceFee) : '',
      processingTime: vt.processingTime || '',
      validity: vt.validity || '',
      entry: vt.entry?.length ? [vt.entry[0]] : [],
      visaSubType: vt.visaSubType || 'e-visa',
      stayDuration: String(vt.stayDuration || ''),
      jurisdiction: vt.jurisdiction || 'pan-india',
      visaCategory: vt.visaCategory || 'tourist',
      process: vt.process || 'normal',
      formFields: (vt.formFields || []).map((f) => ({ ...f })),
      documentRequirements: (vt.documentRequirements || []).map((d) => ({ ...d })),
      additionalNotes: vt.additionalNotes || '',
    });
    setEditId(vt._id);
    setActiveTab('info');
    setPricingTab('standard');
    setInfoErrors({});
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // GST-inclusive charged totals (visa + VFS + service, +18% GST) — matches checkout.
  const GST_MULT = 1.18;
  const num = (s: string) => Number(s || 0);
  const inclGst = (n: number) => Math.round(n * GST_MULT);
  // Live receipt preview for the pricing card. Corporate fields fall back to the
  // standard value when left blank — same rule as backend computeVisaPricing.
  const corpAnySet = [form.corporateAdultPrice, form.corporateAdultVfsFee, form.corporateAdultServiceFee, form.corporateChildPrice, form.corporateChildVfsFee, form.corporateChildServiceFee].some((v) => v !== '');
  const corpOrStd = (corp: string, std: string) => (corp !== '' ? num(corp) : num(std));
  const pricingSubAdult = pricingTab === 'standard'
    ? num(form.adultPrice) + num(form.adultVfsFee) + num(form.adultServiceFee)
    : corpOrStd(form.corporateAdultPrice, form.adultPrice) + corpOrStd(form.corporateAdultVfsFee, form.adultVfsFee) + corpOrStd(form.corporateAdultServiceFee, form.adultServiceFee);
  const pricingSubChild = pricingTab === 'standard'
    ? num(form.childPrice) + num(form.childVfsFee) + num(form.childServiceFee)
    : corpOrStd(form.corporateChildPrice, form.childPrice) + corpOrStd(form.corporateChildVfsFee, form.childVfsFee) + corpOrStd(form.corporateChildServiceFee, form.childServiceFee);
  const pricingTotalAdult = inclGst(pricingSubAdult);
  const pricingTotalChild = inclGst(pricingSubChild);
  const stdAdultTotal = (vt: VisaType) => Math.round(((vt.adultPrice || vt.price) + (vt.adultVfsFee || 0) + (vt.adultServiceFee || 0)) * GST_MULT);
  const stdChildTotal = (vt: VisaType) => Math.round(((vt.childPrice || 0) + (vt.childVfsFee || 0) + (vt.childServiceFee || 0)) * GST_MULT);
  const corpAdultTotal = (vt: VisaType) => Math.round(((vt.corporateAdultPrice || 0) + (vt.corporateAdultVfsFee || 0) + (vt.corporateAdultServiceFee || 0)) * GST_MULT);
  const corpChildTotal = (vt: VisaType) => Math.round(((vt.corporateChildPrice || 0) + (vt.corporateChildVfsFee || 0) + (vt.corporateChildServiceFee || 0)) * GST_MULT);

  const displayedVisaTypes = visaTypes
    .filter((vt) => {
      if (search && !vt.name.toLowerCase().includes(search.toLowerCase()) && !(vt.description || '').toLowerCase().includes(search.toLowerCase())) return false;
      if (filterCategory && vt.visaCategory !== filterCategory) return false;
      if (filterStatus === 'active' && !vt.isActive) return false;
      if (filterStatus === 'inactive' && vt.isActive) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name-desc': return b.name.localeCompare(a.name);
        case 'price-asc': return stdAdultTotal(a) - stdAdultTotal(b);
        case 'price-desc': return stdAdultTotal(b) - stdAdultTotal(a);
        case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default: return a.name.localeCompare(b.name);
      }
    });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <PageHeader
        title="Visa Types"
        description="Manage visa types, per-traveler pricing, and dynamic form fields."
        action={
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Add Visa Type
          </Button>
        }
      />

      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) setEditId(null); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 flex flex-col gap-0">
          <DialogHeader className="border-b border-border pb-0 flex-shrink-0">
            <DialogTitle>{editId ? 'Edit Visa Type' : 'Create Visa Type'}</DialogTitle>
            <div className="flex gap-1 -mb-px">
              <TabButton step={1} label="Information" active={activeTab === 'info'} done={Object.keys(validateInfo()).length === 0} onClick={() => setActiveTab('info')} />
              <TabButton step={2} label="Form" active={activeTab === 'form'} done={false} onClick={() => goToTab('form')} />
              <TabButton step={3} label="Additional Notes" active={activeTab === 'notes'} done={false} onClick={() => goToTab('notes')} />
            </div>
          </DialogHeader>
          <form onSubmit={handleSubmit} noValidate className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">

              <div className={activeTab === 'info' ? 'space-y-6' : 'hidden'}>
              {/* ── Basic Info ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Country</Label>
                  <select value={form.country} onChange={(e) => { setForm({ ...form, country: e.target.value }); clearInfoError('country'); }} required
                    className={`mt-1 w-full h-10 px-3 rounded-lg border bg-card text-foreground text-sm focus:outline-none focus:ring-2 ${infoErrors.country ? 'border-destructive focus:ring-destructive' : 'border-input focus:ring-ring'}`}>
                    <option value="">Select country...</option>
                    {countries.map((c) => <option key={c._id} value={c._id}>{c.flag} {c.name}</option>)}
                  </select>
                  {infoErrors.country && <p className="text-xs text-destructive mt-1">{infoErrors.country}</p>}
                </div>
                <div>
                  <Label>Visa Name</Label>
                  <Input className={`mt-1 ${infoErrors.name ? 'border-destructive focus-visible:ring-destructive' : ''}`} placeholder="e.g. 14 Days Single Tourist" value={form.name} onChange={(e) => { setForm({ ...form, name: e.target.value }); clearInfoError('name'); }} required />
                  {infoErrors.name && <p className="text-xs text-destructive mt-1">{infoErrors.name}</p>}
                </div>
                <div>
                  <Label>Description</Label>
                  <Input className="mt-1" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>

              {/* ── Pricing: a rate card that reads like the receipt it produces ── */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-muted/40 border-b border-border">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Pricing</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Fees per traveler. 18% GST is added automatically.</p>
                  </div>
                  <div className="flex gap-1 bg-muted rounded-lg p-1">
                    <button
                      type="button"
                      onClick={() => setPricingTab('standard')}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${pricingTab === 'standard' ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Standard
                    </button>
                    <button
                      type="button"
                      onClick={() => setPricingTab('corporate')}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${pricingTab === 'corporate' ? 'bg-card text-warning shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Corporate
                      {corpAnySet && <span className="w-1.5 h-1.5 rounded-full bg-warning" title="Corporate overrides are set" />}
                    </button>
                  </div>
                </div>

                <div className="p-5">
                  {pricingTab === 'corporate' && (
                    <p className="text-xs text-muted-foreground mb-4">
                      Corporate accounts pay these fees instead. Leave a field blank to charge the standard fee — enter 0 in Service fee to waive it.
                    </p>
                  )}

                  <div className="grid grid-cols-[minmax(7rem,1fr)_minmax(6.5rem,9rem)_minmax(6.5rem,9rem)] gap-x-3 gap-y-2.5 items-center max-w-xl">
                    <span />
                    <span className="text-xs font-semibold text-muted-foreground text-right pr-3">Adult</span>
                    <span className="text-xs font-semibold text-muted-foreground text-right pr-3">Child</span>

                    {PRICE_ROWS.map((row) => {
                      const fields = pricingTab === 'standard' ? row.std : row.corp;
                      return (
                        <Fragment key={row.label}>
                          <span className="text-sm text-foreground">
                            {row.label}
                            {row.required && pricingTab === 'standard' && <span className="text-destructive ml-0.5">*</span>}
                            {row.hint && <span className="text-xs text-muted-foreground ml-1.5">({row.hint})</span>}
                          </span>
                          {fields.map((name, i) => (
                            <div key={name} className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">₹</span>
                              <Input
                                type="number"
                                min="0"
                                className={`pl-7 pr-3 text-right tabular-nums ${name === 'adultPrice' && infoErrors.adultPrice ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                placeholder={pricingTab === 'corporate' ? (form[row.std[i]] || '0') : '0'}
                                value={form[name]}
                                onChange={(e) => { setForm({ ...form, [name]: e.target.value }); if (name === 'adultPrice') clearInfoError('adultPrice'); }}
                              />
                            </div>
                          ))}
                        </Fragment>
                      );
                    })}

                    <div className="col-span-3 border-t border-border my-1" />

                    <span className="text-xs text-muted-foreground">GST (18%)</span>
                    <span className="text-xs text-muted-foreground text-right pr-3 tabular-nums">{pricingSubAdult > 0 ? formatCurrency(pricingTotalAdult - pricingSubAdult) : '—'}</span>
                    <span className="text-xs text-muted-foreground text-right pr-3 tabular-nums">{pricingSubChild > 0 ? formatCurrency(pricingTotalChild - pricingSubChild) : '—'}</span>

                    <span className="text-sm font-semibold text-foreground">
                      Customer pays <span className="text-xs font-normal text-muted-foreground">incl. GST</span>
                    </span>
                    <span className={`text-sm font-bold text-right pr-3 tabular-nums ${pricingTab === 'corporate' ? 'text-warning' : 'text-primary'}`}>
                      {pricingSubAdult > 0 ? formatCurrency(pricingTotalAdult) : '—'}
                    </span>
                    <span className={`text-sm font-bold text-right pr-3 tabular-nums ${pricingTab === 'corporate' ? 'text-warning' : 'text-primary'}`}>
                      {pricingSubChild > 0 ? formatCurrency(pricingTotalChild) : '—'}
                    </span>
                  </div>

                  {infoErrors.adultPrice && <p className="text-xs text-destructive mt-3">{infoErrors.adultPrice}</p>}
                </div>
              </div>

              {/* ── Visa Details ── */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label>Stay Duration</Label>
                  <Input className="mt-1" type="text" placeholder="e.g. 14 Days" value={form.stayDuration} onChange={(e) => setForm({ ...form, stayDuration: e.target.value })} />
                </div>
                <div>
                  <Label>Processing Time</Label>
                  <Input className={`mt-1 ${infoErrors.processingTime ? 'border-destructive focus-visible:ring-destructive' : ''}`} type="text" placeholder="e.g. 2 Working Days" value={form.processingTime} onChange={(e) => { setForm({ ...form, processingTime: e.target.value }); clearInfoError('processingTime'); }} required />
                  {infoErrors.processingTime && <p className="text-xs text-destructive mt-1">{infoErrors.processingTime}</p>}
                </div>
                <div>
                  <Label>Validity</Label>
                  <Input className="mt-1" placeholder="e.g. 90 Days, 1 year" value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} />
                </div>

                <div>
                  <Label>Visa Type</Label>
                  <select value={form.visaSubType} onChange={(e) => setForm({ ...form, visaSubType: e.target.value })}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {optionsFor('visaSubType', form.visaSubType).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <Label>Entry</Label>
                  <select value={form.entry[0] || ''} onChange={(e) => setForm({ ...form, entry: e.target.value ? [e.target.value as EntryType] : [] })}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">Select entry…</option>
                    {optionsFor('entryType', form.entry[0]).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <div>
                  <Label>Process</Label>
                  <label className="mt-1 flex gap-2 h-10 items-center cursor-pointer">
                    <input type="checkbox" checked={form.process === 'express'} onChange={(e) => setForm({ ...form, process: e.target.checked ? 'express' : 'normal' })} className="rounded text-primary focus:ring-ring" />
                    <span className="text-sm text-foreground/90">Express processing <span className="text-xs text-muted-foreground">(unchecked = Normal)</span></span>
                  </label>
                </div>

                <div>
                  <Label>Jurisdiction</Label>
                  <select value={form.jurisdiction} onChange={(e) => setForm({ ...form, jurisdiction: e.target.value })}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {optionsFor('jurisdiction', form.jurisdiction).map((j) => <option key={j.value} value={j.value}>{j.label}</option>)}
                  </select>
                </div>

                <div>
                  <Label>Visa Category</Label>
                  <select value={form.visaCategory} onChange={(e) => setForm({ ...form, visaCategory: e.target.value })}
                    className="mt-1 w-full h-10 px-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {optionsFor('visaCategory', form.visaCategory).map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>
              </div>

              <div className={activeTab === 'form' ? 'space-y-6' : 'hidden'}>
              {/* ── Form Presets ── */}
              <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/15 space-y-3">
                <div className="flex items-center gap-2">
                  <LayoutTemplate className="w-4 h-4 text-violet-600" />
                  <p className="text-sm font-semibold text-violet-600">Form Presets</p>
                </div>
                <p className="text-xs text-violet-600/70">Apply a saved layout of form fields & documents in one click, or save the current layout as a reusable preset.</p>

                <div className="flex flex-col sm:flex-row gap-2">
                  <select value={applyPresetId} onChange={(e) => setApplyPresetId(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-violet-500/20 text-sm bg-card focus:outline-none focus:ring-2 focus:ring-violet-500 flex-1">
                    <option value="">Select a preset to apply…</option>
                    {presets.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.formFields.length} fields, {p.documentRequirements.length} docs)</option>)}
                  </select>
                  <Button type="button" variant="outline" disabled={!applyPresetId} onClick={applyPreset}>
                    <Check className="w-3.5 h-3.5 mr-1" /> Apply Preset
                  </Button>
                  <Button type="button" variant="outline" onClick={clearFormFields} title="Clear the current fields & documents (does not delete any saved preset)">
                    <Eraser className="w-3.5 h-3.5 mr-1" /> Clear Form
                  </Button>
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <Input className="h-9 flex-1" placeholder="New preset name (saves current fields & docs)" value={presetName} onChange={(e) => setPresetName(e.target.value)} />
                  <Button type="button" variant="outline" disabled={savingPreset} onClick={saveAsPreset}>
                    {savingPreset ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5 mr-1" /> Save as Preset</>}
                  </Button>
                </div>

                {presets.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {presets.map((p) => (
                      <span key={p._id} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-card border text-xs font-medium ${applyPresetId === p._id ? 'border-violet-400 text-violet-700 ring-1 ring-violet-500/20' : 'border-violet-500/20 text-violet-600'}`}>
                        {p.name}
                        <button type="button" title="Duplicate preset" onClick={() => duplicatePreset(p)} className="text-violet-400/60 hover:text-violet-600 ml-0.5"><Copy className="w-3 h-3" /></button>
                        <button type="button" title="Delete preset (moves to Trash)" onClick={() => setDeletePresetId(p._id)} className="text-violet-400/60 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                        {applyPresetId === p._id && (
                          <button type="button" title="Deselect" onClick={() => deselectPreset(p._id)} className="text-violet-400/60 hover:text-violet-700"><X className="w-3 h-3" /></button>
                        )}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <FormFieldEditor fields={form.formFields} onAdd={addField} onUpdate={updateField} onRemove={removeField} />
              <DocumentRequirementEditor docs={form.documentRequirements} onAdd={addDocReq} onUpdate={updateDocReq} onUpdateType={updateDocType} onRemove={removeDocReq} />
              </div>

              <div className={activeTab === 'notes' ? 'space-y-2' : 'hidden'}>
                <Label>Additional Notes</Label>
                <textarea
                  className="mt-1 w-full min-h-[240px] rounded-lg border border-input bg-card text-foreground text-sm p-3 focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                  placeholder="Anything worth telling the applicant about this visa…"
                  value={form.additionalNotes}
                  onChange={(e) => setForm({ ...form, additionalNotes: e.target.value })}
                />
              </div>

            </div>

            <div className="flex items-center gap-2 px-6 py-4 border-t border-border flex-shrink-0">
              {activeTab !== 'info' && (
                <Button type="button" variant="outline" onClick={() => setActiveTab(activeTab === 'notes' ? 'form' : 'info')}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
                {activeTab === 'info' && (
                  <Button type="button" onClick={() => goToTab('form')}>
                    Continue to Form <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {activeTab === 'form' && (
                  <Button type="button" onClick={() => goToTab('notes')}>
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
                {activeTab === 'notes' && (
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Update Visa Type' : 'Create Visa Type'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Filters + sorting */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search visa types..."
            className="pl-9 h-9 w-56"
          />
        </div>
        <select value={selectedCountry} onChange={(e) => setSelectedCountry(e.target.value)} className="h-9 px-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Countries</option>
          {countries.map((c) => <option key={c._id} value={c._id}>{c.flag} {c.name}</option>)}
        </select>
        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="h-9 px-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Categories</option>
          {optionsFor('visaCategory').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as '' | 'active' | 'inactive')} className="h-9 px-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="flex items-center gap-2 ml-auto">
          <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="h-9 px-3 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring">
            <option value="name-asc">Name (A–Z)</option>
            <option value="name-desc">Name (Z–A)</option>
            <option value="price-asc">Price (low to high)</option>
            <option value="price-desc">Price (high to low)</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
        {(search || filterCategory || filterStatus || selectedCountry) && (
          <button
            onClick={() => { setSearch(''); setFilterCategory(''); setFilterStatus(''); setSelectedCountry(''); }}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <X className="w-3 h-3" /> Clear filters
          </button>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent bg-muted/40">
              {['Visa Type', 'Country', 'Adult ₹', 'Child ₹', 'Corporate (A / C)', 'Process', 'Time', 'Entry', 'Category', 'Status', ''].map((h) => (
                <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedVisaTypes.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="px-4 py-10 text-center text-muted-foreground">
                {visaTypes.length === 0 ? 'No visa types. Create one above.' : 'No visa types match the current filters.'}
              </TableCell></TableRow>
            ) : (
              displayedVisaTypes.map((vt) => (
                <TableRow key={vt._id} className={!vt.isActive ? 'opacity-60' : ''}>
                  <TableCell>
                    <p className="font-semibold text-foreground">{vt.name}</p>
                    {vt.description && <p className="text-xs text-muted-foreground">{vt.description}</p>}
                    {vt.visaSubType && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        {configOptions.find((o) => o.category === 'visaSubType' && o.value === vt.visaSubType)?.label || vt.visaSubType}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      <img src={`https://flagcdn.com/w20/${vt.country?.flag}.png`} alt="" className="w-5 h-3 object-cover rounded" />
                      {vt.country?.name}
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-primary" title="Visa + VFS + service fee, incl. 18% GST">
                    {formatCurrency(stdAdultTotal(vt))}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs" title="Visa + VFS + service fee, incl. 18% GST">
                    {vt.childPrice ? formatCurrency(stdChildTotal(vt)) : '—'}
                  </TableCell>
                  <TableCell className="text-xs" title="Visa + VFS + service fee, incl. 18% GST">
                    <span className={vt.corporateAdultPrice != null ? 'text-warning font-semibold' : 'text-muted-foreground/50'}>
                      {vt.corporateAdultPrice != null ? formatCurrency(corpAdultTotal(vt)) : '—'}
                    </span>
                    <span className="text-muted-foreground/50"> / </span>
                    <span className={vt.corporateChildPrice != null ? 'text-warning font-semibold' : 'text-muted-foreground/50'}>
                      {vt.corporateChildPrice != null ? formatCurrency(corpChildTotal(vt)) : '—'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ${vt.process === 'express' ? 'text-destructive bg-destructive/10' : 'text-muted-foreground bg-muted'}`}>
                      {vt.process || 'normal'}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{vt.processingTime}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(vt.entry || []).map((e) => (
                        <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium capitalize">{e}</span>
                      ))}
                      {(!vt.entry || vt.entry.length === 0) && <span className="text-muted-foreground/50 text-xs">—</span>}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-xs capitalize text-foreground/80">{vt.visaCategory || '—'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Switch checked={vt.isActive} onChange={() => handleToggle(vt._id)} disabled={toggling === vt._id} />
                      <div className="flex items-center gap-1.5">
                        <span className="relative flex h-1.5 w-1.5">
                          {vt.isActive && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>}
                          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${vt.isActive ? 'bg-success' : 'bg-muted-foreground/40'}`}></span>
                        </span>
                        <span className={`text-xs font-semibold ${vt.isActive ? 'text-success' : 'text-muted-foreground'}`}>{vt.isActive ? 'Active' : 'Inactive'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button onClick={() => startEdit(vt)} className="p-1.5 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(vt._id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Move this visa type to Trash?"
        description="You can restore it later from the Trash page."
        confirmLabel="Move to Trash"
        onConfirm={async () => { if (deleteId) await handleDelete(deleteId); }}
      />
      <ConfirmDialog
        open={!!deletePresetId}
        onOpenChange={(open) => !open && setDeletePresetId(null)}
        title="Move this preset to Trash?"
        description="You can restore it later from the Trash page."
        confirmLabel="Move to Trash"
        onConfirm={async () => { if (deletePresetId) await handleDeletePreset(deletePresetId); }}
      />
    </div>
  );
}
