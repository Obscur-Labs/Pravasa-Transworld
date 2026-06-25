'use client';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, Plus, X, Save, Globe, ImagePlus,
  HelpCircle, Eye, MapPin, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { getCountries, updateCountryWebContent, uploadCountryImage, removeCountryImage } from '@/lib/api';
import type { Country, CountryWebContent, CountryFaq } from '@/types';

const emptyContent: CountryWebContent = {
  heroTagline: '', overview: '', highlights: [],
  requirements: '', processingInfo: '', tips: '', faqs: [],
};

/* ─── Location badge config ─── */
const LOC = {
  header:      { label: 'Page Header',        color: 'bg-violet-100 text-violet-700 border-violet-200' },
  slider:      { label: 'Photo Slider',        color: 'bg-orange-100 text-orange-700 border-orange-200' },
  overview:    { label: 'Overview Card',       color: 'bg-blue-100 text-blue-700 border-blue-200'   },
  requirements:{ label: 'Requirements Card',   color: 'bg-teal-100 text-teal-700 border-teal-200'   },
  processing:  { label: 'Processing Card',     color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
  tips:        { label: 'Tips Card',           color: 'bg-amber-100 text-amber-700 border-amber-200' },
  faq:         { label: 'FAQ Accordion',       color: 'bg-rose-100 text-rose-700 border-rose-200'   },
} as const;

function LocationBadge({ loc }: { loc: keyof typeof LOC }) {
  const { label, color } = LOC[loc];
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${color}`}>
      <MapPin className="w-2.5 h-2.5" />
      {label}
    </span>
  );
}

/* ─── Section card wrapper ─── */
function Section({ loc, title, subtitle, children }: {
  loc: keyof typeof LOC; title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</p>
          {subtitle && <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{subtitle}</p>}
        </div>
        <LocationBadge loc={loc} />
      </div>
      <CardContent className="p-5">{children}</CardContent>
    </Card>
  );
}

function TA({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors"
    />
  );
}

/* ─── Mini Page Map (right panel) ─── */
function PageMap() {
  const zones = [
    {
      label: 'Page Header',
      color: 'bg-violet-100 border-violet-200 text-violet-700',
      dot: 'bg-violet-400',
      fields: ['Country name + flag', 'Hero Tagline', 'Highlights (chips)'],
      auto: false,
    },
    {
      label: 'Photo Slider',
      color: 'bg-orange-100 border-orange-200 text-orange-700',
      dot: 'bg-orange-400',
      fields: ['Photos you upload'],
      auto: false,
    },
    {
      label: 'Visa Info Grid',
      color: 'bg-slate-100 border-slate-200 text-slate-500',
      dot: 'bg-slate-400',
      fields: ['Visa type, stay, entry, validity, processing time'],
      auto: true,
    },
    {
      label: 'Overview Card',
      color: 'bg-blue-100 border-blue-200 text-blue-700',
      dot: 'bg-blue-400',
      fields: ['Overview text'],
      auto: false,
    },
    {
      label: 'Requirements Card',
      color: 'bg-teal-100 border-teal-200 text-teal-700',
      dot: 'bg-teal-400',
      fields: ['Visa requirements text'],
      auto: false,
    },
    {
      label: 'Processing & Tips',
      color: 'bg-amber-100 border-amber-200 text-amber-700',
      dot: 'bg-amber-400',
      fields: ['Processing info (left)', 'Tips (right)'],
      auto: false,
    },
    {
      label: 'FAQ Accordion',
      color: 'bg-rose-100 border-rose-200 text-rose-700',
      dot: 'bg-rose-400',
      fields: ['All your FAQs'],
      auto: false,
    },
    {
      label: 'Sidebar (right)',
      color: 'bg-slate-100 border-slate-200 text-slate-500',
      dot: 'bg-slate-400',
      fields: ['Visa types', 'Pricing', 'Apply CTA'],
      auto: true,
    },
  ];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <Eye className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-extrabold text-slate-700 uppercase tracking-widest">What users see</span>
      </div>

      {/* Wireframe zones */}
      <div className="p-4 space-y-2">
        {zones.map((z) => (
          <div key={z.label} className={`rounded-xl border p-3 ${z.color}`}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${z.dot}`} />
                <span className="text-[10px] font-extrabold uppercase tracking-wider">{z.label}</span>
              </div>
              {z.auto && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold bg-white/70 text-slate-500 px-1.5 py-0.5 rounded-full border border-slate-200">
                  <Zap className="w-2 h-2" /> auto
                </span>
              )}
            </div>
            <ul className="space-y-0.5">
              {z.fields.map((f) => (
                <li key={f} className="text-[10px] font-medium opacity-80 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-current opacity-50 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-4 pb-4 flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-slate-400" />
          <span className="text-[10px] text-slate-400 font-semibold">Auto = pulled from visa types, no editing needed</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Main ─── */
export default function CountryContentPage() {
  const { id } = useParams<{ id: string }>();
  const [country, setCountry] = useState<Country | null>(null);
  const [content, setContent] = useState<CountryWebContent>(emptyContent);
  const [newHighlight, setNewHighlight] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [removingImage, setRemovingImage] = useState<string | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getCountries()
      .then((r) => {
        const found = r.data.data.find((c: Country) => c._id === id);
        if (found) {
          setCountry(found);
          setImages(found.images || []);
          setContent({ ...emptyContent, ...(found.webContent || {}), faqs: found.webContent?.faqs || [] });
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  const setField = <K extends keyof CountryWebContent>(key: K, value: CountryWebContent[K]) =>
    setContent((prev) => ({ ...prev, [key]: value }));

  const addHighlight = () => {
    const t = newHighlight.trim();
    if (!t) return;
    setField('highlights', [...content.highlights, t]);
    setNewHighlight('');
  };
  const removeHighlight = (i: number) =>
    setField('highlights', content.highlights.filter((_, idx) => idx !== i));

  const addFaq = () =>
    setField('faqs', [...(content.faqs || []), { question: '', answer: '' }]);
  const updateFaq = (i: number, key: keyof CountryFaq, val: string) => {
    const updated = [...(content.faqs || [])];
    updated[i] = { ...updated[i], [key]: val };
    setField('faqs', updated);
  };
  const removeFaq = (i: number) =>
    setField('faqs', (content.faqs || []).filter((_, idx) => idx !== i));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await uploadCountryImage(id, fd);
      setImages(res.data.data.images || []);
      toast({ title: 'Image uploaded', variant: 'success' });
    } catch {
      toast({ title: 'Upload failed', variant: 'destructive' });
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async (url: string) => {
    setRemovingImage(url);
    try {
      const res = await removeCountryImage(id, url);
      setImages(res.data.data.images || []);
      toast({ title: 'Image removed', variant: 'success' });
    } catch {
      toast({ title: 'Failed to remove image', variant: 'destructive' });
    } finally {
      setRemovingImage(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateCountryWebContent(id, content);
      toast({ title: 'Content saved', description: 'Website page updated.', variant: 'success' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message || 'Failed to save', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!country) {
    return (
      <div className="p-6">
        <p className="text-slate-500">Country not found.</p>
        <Link href="/countries" className="text-blue-600 hover:underline text-sm mt-2 inline-block">← Back to Countries</Link>
      </div>
    );
  }

  return (
    <div className="p-6 pb-16 max-w-6xl mx-auto">
      {/* ── Page Header ── */}
      <div className="mb-7">
        <Link href="/countries" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> Back to Countries
        </Link>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src={`https://flagcdn.com/w40/${country.flag}.png`} alt={country.name} className="w-10 h-7 object-cover rounded shadow-sm" />
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{country.name} — Website Content</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Globe className={`w-3.5 h-3.5 ${country.showOnWebsite ? 'text-violet-500' : 'text-slate-300'}`} />
                <span className={`text-xs font-semibold ${country.showOnWebsite ? 'text-violet-600' : 'text-slate-400'}`}>
                  {country.showOnWebsite ? 'Live on website' : 'Hidden — enable "Show on Website" on the Countries page'}
                </span>
              </div>
            </div>
          </div>
          <Button onClick={handleSave} disabled={saving} className="gap-2 shrink-0">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Content
          </Button>
        </div>
      </div>

      {/* ── Two-column layout ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* LEFT: Form */}
        <div className="xl:col-span-2 space-y-5">

          {/* Photos */}
          <Section loc="slider" title="Photos" subtitle="First image = cover. Multiple images create a slider on the public page.">
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3 mb-4">
                {images.map((url, i) => (
                  <div key={url} className="relative group rounded-xl overflow-hidden aspect-video bg-slate-100">
                    <img src={url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                    {i === 0 && (
                      <span className="absolute top-1.5 left-1.5 text-[10px] font-bold bg-blue-600 text-white px-1.5 py-0.5 rounded-full">Cover</span>
                    )}
                    <button
                      onClick={() => handleRemoveImage(url)}
                      disabled={removingImage === url}
                      className="absolute top-1.5 right-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      {removingImage === url ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" onChange={handleImageUpload} />
            <Button
              type="button" variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="gap-2 w-full border-dashed border-slate-300 hover:border-orange-400 hover:text-orange-600 text-slate-500"
            >
              {uploadingImage
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                : <><ImagePlus className="w-4 h-4" /> Upload Photo</>}
            </Button>
          </Section>

          {/* Hero Tagline + Highlights */}
          <Section loc="header" title="Page Header" subtitle="Shown in the header banner of the country detail page.">
            <div className="space-y-4">
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Hero Tagline</Label>
                <Input
                  placeholder="e.g. The Land of Maple Leaves and Mountain Majesty"
                  value={content.heroTagline}
                  onChange={(e) => setField('heroTagline', e.target.value)}
                />
                <p className="text-[11px] text-slate-400 mt-1">Shown as a subtitle next to "Visa" under the country name.</p>
              </div>
              <div>
                <Label className="mb-1.5 block text-xs font-semibold text-slate-600">Key Highlights</Label>
                <p className="text-[11px] text-slate-400 mb-2">Shown as badge chips — e.g. "eVisa available", "10-year multiple entry"</p>
                {content.highlights.length > 0 && (
                  <ul className="space-y-1.5 mb-3">
                    {content.highlights.map((h, i) => (
                      <li key={i} className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-lg px-3 py-2">
                        <span className="text-sm text-slate-700 flex-1">{h}</span>
                        <button onClick={() => removeHighlight(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a highlight and press Enter"
                    value={newHighlight}
                    onChange={(e) => setNewHighlight(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHighlight())}
                  />
                  <Button type="button" variant="outline" onClick={addHighlight} className="shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Section>

          {/* Overview */}
          <Section loc="overview" title="Overview" subtitle="A paragraph describing the country and visa experience.">
            <TA
              value={content.overview}
              onChange={(v) => setField('overview', v)}
              placeholder="Write a compelling overview of the country and visa journey..."
              rows={5}
            />
          </Section>

          {/* Requirements */}
          <Section loc="requirements" title="Visa Requirements" subtitle="Documents needed, eligibility, and conditions.">
            <TA
              value={content.requirements}
              onChange={(v) => setField('requirements', v)}
              placeholder="General visa requirements — documents needed, eligibility criteria..."
              rows={5}
            />
          </Section>

          {/* Processing Info */}
          <Section loc="processing" title="Processing Information" subtitle="Shown in the left card of the two-column row.">
            <TA
              value={content.processingInfo}
              onChange={(v) => setField('processingInfo', v)}
              placeholder="Processing timeline, stages, what applicants can expect..."
              rows={4}
            />
          </Section>

          {/* Tips */}
          <Section loc="tips" title="Tips for Applicants" subtitle="Shown in the right card next to Processing Info.">
            <TA
              value={content.tips}
              onChange={(v) => setField('tips', v)}
              placeholder="Helpful tips, common mistakes to avoid, best practices..."
              rows={4}
            />
          </Section>

          {/* FAQs */}
          <Card className="overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Frequently Asked Questions</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {(content.faqs || []).length === 0
                    ? 'No FAQs yet — add as many as you need'
                    : `${(content.faqs || []).length} FAQ${(content.faqs || []).length !== 1 ? 's' : ''}`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(content.faqs || []).length > 0 && (
                  <span className="text-xs bg-rose-100 text-rose-700 font-bold px-2 py-0.5 rounded-full border border-rose-200">
                    {(content.faqs || []).length}
                  </span>
                )}
                <LocationBadge loc="faq" />
              </div>
            </div>
            <CardContent className="p-5">
              <div className="space-y-3 mb-4">
                {(content.faqs || []).map((faq, i) => (
                  <div key={i} className="rounded-xl border border-rose-100 bg-rose-50/30 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-white border-b border-rose-100">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question {i + 1}</span>
                      </div>
                      <button onClick={() => removeFaq(i)} className="text-slate-300 hover:text-red-500 transition-colors p-0.5 rounded" title="Remove">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="p-4 space-y-2.5">
                      <Input
                        placeholder="Enter the question..."
                        value={faq.question}
                        onChange={(e) => updateFaq(i, 'question', e.target.value)}
                        className="bg-white font-medium text-sm"
                      />
                      <TA
                        value={faq.answer}
                        onChange={(v) => updateFaq(i, 'answer', v)}
                        placeholder="Enter the answer..."
                        rows={3}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {(content.faqs || []).length === 0 && (
                <div className="rounded-xl border border-dashed border-rose-200 bg-rose-50/30 py-8 text-center mb-4">
                  <HelpCircle className="w-8 h-8 text-rose-200 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">No FAQs added yet.</p>
                  <p className="text-xs text-slate-300 mt-0.5">Add as many questions and answers as you need.</p>
                </div>
              )}

              <Button type="button" variant="outline" onClick={addFaq} className="gap-2 w-full border-dashed border-rose-200 hover:border-rose-400 hover:text-rose-600 text-slate-500">
                <Plus className="w-4 h-4" /> Add FAQ
              </Button>
            </CardContent>
          </Card>

          {/* Save row */}
          <div className="flex items-center justify-between pt-2">
            <Link href="/countries">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Content
            </Button>
          </div>
        </div>

        {/* RIGHT: Page map */}
        <div className="xl:sticky xl:top-4 xl:self-start space-y-4">
          <PageMap />

          {/* Quick status */}
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4 space-y-2.5">
            <p className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3">Content Status</p>
            {[
              { label: 'Photos',           filled: images.length > 0,           hint: `${images.length} uploaded` },
              { label: 'Hero Tagline',     filled: !!content.heroTagline.trim(), hint: content.heroTagline.trim() ? '✓ set' : 'empty' },
              { label: 'Highlights',       filled: content.highlights.length > 0, hint: `${content.highlights.length} added` },
              { label: 'Overview',         filled: !!content.overview.trim(),    hint: content.overview.trim() ? '✓ set' : 'empty' },
              { label: 'Requirements',     filled: !!content.requirements.trim(),hint: content.requirements.trim() ? '✓ set' : 'empty' },
              { label: 'Processing Info',  filled: !!content.processingInfo.trim(), hint: content.processingInfo.trim() ? '✓ set' : 'empty' },
              { label: 'Tips',             filled: !!content.tips.trim(),        hint: content.tips.trim() ? '✓ set' : 'empty' },
              { label: 'FAQs',             filled: (content.faqs || []).length > 0, hint: `${(content.faqs || []).length} added` },
            ].map(({ label, filled, hint }) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${filled ? 'bg-emerald-500' : 'bg-slate-200'}`} />
                  <span className="text-xs text-slate-600 font-medium">{label}</span>
                </div>
                <span className={`text-[10px] font-bold ${filled ? 'text-emerald-600' : 'text-slate-300'}`}>{hint}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
