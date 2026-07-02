'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Loader2, Search, Globe, FileText, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { getCountries, createCountry, updateCountry, deleteCountry, toggleCountry, toggleCountryWebsite } from '@/lib/api';
import type { Country } from '@/types';

interface CountryForm { name: string; flag: string; description: string; }
const emptyForm: CountryForm = { name: '', flag: '', description: '' };

function Toggle({
  checked, onChange, disabled, color = 'emerald',
}: {
  checked: boolean; onChange: () => void; disabled?: boolean; color?: 'emerald' | 'violet';
}) {
  const on = color === 'violet'
    ? 'bg-violet-500 hover:bg-violet-600 shadow-[0_0_12px_rgba(139,92,246,0.25)]'
    : 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_12px_rgba(16,185,129,0.25)]';
  const ring = color === 'violet' ? 'focus:ring-violet-500' : 'focus:ring-emerald-500';
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-all duration-300 ease-in-out focus:outline-none focus:ring-2 ${ring} focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${checked ? on : 'bg-slate-200 hover:bg-slate-300'}`}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.15)] ring-0 transition duration-300 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );
}

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name-asc' | 'name-desc' | 'active-first' | 'inactive-first' | 'website-first'>('name-asc');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterWeb, setFilterWeb] = useState<'all' | 'shown' | 'hidden'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CountryForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [togglingWeb, setTogglingWeb] = useState<string | null>(null);

  const fetchCountries = () => getCountries().then((r) => setCountries(r.data.data));

  useEffect(() => { fetchCountries(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editId) {
        await updateCountry(editId, form);
        toast({ title: 'Country updated', variant: 'success' });
      } else {
        await createCountry(form);
        toast({ title: 'Country created', variant: 'success' });
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      fetchCountries();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Move this country to Trash? You can restore it later from the Trash page.')) return;
    await deleteCountry(id);
    toast({ title: 'Moved to Trash', description: 'Restore it anytime from the Trash page.' });
    fetchCountries();
  };

  const handleToggle = async (id: string) => {
    setToggling(id);
    try {
      const res = await toggleCountry(id);
      setCountries((prev) => prev.map((c) => c._id === id ? { ...c, isActive: res.data.data.isActive } : c));
      toast({ title: res.data.data.isActive ? 'Country activated' : 'Country deactivated', variant: 'success' });
    } catch {
      toast({ title: 'Failed to toggle status', variant: 'destructive' });
    } finally {
      setToggling(null);
    }
  };

  const handleToggleWeb = async (id: string) => {
    setTogglingWeb(id);
    try {
      const res = await toggleCountryWebsite(id);
      setCountries((prev) => prev.map((c) => c._id === id ? { ...c, showOnWebsite: res.data.data.showOnWebsite } : c));
      toast({ title: res.data.data.showOnWebsite ? 'Shown on website' : 'Hidden from website', variant: 'success' });
    } catch {
      toast({ title: 'Failed to toggle website visibility', variant: 'destructive' });
    } finally {
      setTogglingWeb(null);
    }
  };

  const startEdit = (c: Country) => {
    setForm({ name: c.name, flag: c.flag, description: c.description });
    setEditId(c._id);
    setShowForm(true);
  };

  const filtered = countries
    .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
    .filter((c) => filterStatus === 'all' ? true : filterStatus === 'active' ? c.isActive : !c.isActive)
    .filter((c) => filterWeb === 'all' ? true : filterWeb === 'shown' ? c.showOnWebsite : !c.showOnWebsite)
    .sort((a, b) => {
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'active-first') return (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0);
      if (sortBy === 'inactive-first') return (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0);
      if (sortBy === 'website-first') return (b.showOnWebsite ? 1 : 0) - (a.showOnWebsite ? 1 : 0);
      return 0;
    });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Countries</h1>
          <p className="text-slate-500 text-sm mt-1">Manage destination countries and their website pages.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              className="pl-9 w-56"
              placeholder="Search countries..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(!showForm); }}>
            <Plus className="w-4 h-4 mr-2" /> Add Country
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Sort</span>
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-40 h-8 text-sm bg-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Name A–Z</SelectItem>
            <SelectItem value="name-desc">Name Z–A</SelectItem>
            <SelectItem value="active-first">Active First</SelectItem>
            <SelectItem value="inactive-first">Inactive First</SelectItem>
            <SelectItem value="website-first">On Website First</SelectItem>
          </SelectContent>
        </Select>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Status</span>
        {(['all', 'active', 'inactive'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilterStatus(v)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filterStatus === v
                ? v === 'active' ? 'bg-emerald-500 text-white' : v === 'inactive' ? 'bg-slate-500 text-white' : 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {v === 'all' ? 'All' : v === 'active' ? 'Active' : 'Inactive'}
          </button>
        ))}

        <div className="w-px h-5 bg-slate-200 mx-1" />

        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Website</span>
        {(['all', 'shown', 'hidden'] as const).map((v) => (
          <button
            key={v}
            onClick={() => setFilterWeb(v)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              filterWeb === v
                ? v === 'shown' ? 'bg-violet-500 text-white' : v === 'hidden' ? 'bg-slate-500 text-white' : 'bg-slate-900 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {v === 'all' ? 'All' : v === 'shown' ? 'On Website' : 'Hidden'}
          </button>
        ))}

        {(filterStatus !== 'all' || filterWeb !== 'all' || sortBy !== 'name-asc') && (
          <>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button
              onClick={() => { setFilterStatus('all'); setFilterWeb('all'); setSortBy('name-asc'); }}
              className="px-3 py-1 rounded-full text-xs font-semibold text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
            >
              Reset
            </button>
          </>
        )}

        <span className="ml-auto text-xs text-slate-400">{filtered.length} of {countries.length}</span>
      </div>

      {showForm && (
        <Card className="mb-6 border-blue-200">
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-4">{editId ? 'Edit Country' : 'Add New Country'}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Country Name</Label>
                <Input className="mt-1" placeholder="e.g. Canada" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <Label>Flag Code (ISO 2-letter)</Label>
                <Input className="mt-1" placeholder="e.g. ca, us, gb" value={form.flag} onChange={(e) => setForm({ ...form, flag: e.target.value.toLowerCase() })} required />
              </div>
              <div>
                <Label>Description</Label>
                <Input className="mt-1" placeholder="Short description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="sm:col-span-3 flex gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? 'Update' : 'Create'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(null); }}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((c) => (
          <Card key={c._id} className={`hover:shadow-md transition-shadow ${!c.isActive ? 'opacity-60' : ''}`}>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <img src={`https://flagcdn.com/w40/${c.flag}.png`} alt={c.name} className="w-10 h-7 object-cover rounded" />
                <div className="flex gap-1 items-center">
                  <button onClick={() => startEdit(c)} title="Edit basic info" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <Link href={`/countries/${c._id}/content`} title="Edit website content">
                    <span className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors flex items-center">
                      <FileText className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                  <button onClick={() => handleDelete(c._id)} title="Move to trash" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="font-semibold text-slate-900">{c.name}</p>
              {c.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>}

              <div className="mt-4 pt-3 border-t border-slate-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      {c.isActive && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${c.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                    </span>
                    <span className={`text-xs font-semibold ${c.isActive ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {c.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <Toggle checked={c.isActive} onChange={() => handleToggle(c._id)} disabled={toggling === c._id} color="emerald" />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className={`w-3 h-3 ${c.showOnWebsite ? 'text-violet-500' : 'text-slate-300'}`} />
                    <span className={`text-xs font-semibold ${c.showOnWebsite ? 'text-violet-700' : 'text-slate-500'}`}>
                      {c.showOnWebsite ? 'On Website' : 'Hidden'}
                    </span>
                  </div>
                  <Toggle checked={!!c.showOnWebsite} onChange={() => handleToggleWeb(c._id)} disabled={togglingWeb === c._id} color="violet" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-4 text-center text-slate-400 py-8">
            {search ? `No countries match "${search}".` : 'No countries yet. Add one above.'}
          </p>
        )}
      </div>
    </div>
  );
}
