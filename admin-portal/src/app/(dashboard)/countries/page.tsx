'use client';
import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { getCountries, createCountry, updateCountry, deleteCountry } from '@/lib/api';
import type { Country } from '@/types';

interface CountryForm { name: string; flag: string; description: string; }
const emptyForm: CountryForm = { name: '', flag: '', description: '' };

export default function CountriesPage() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<CountryForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCountries = () =>
    getCountries().then((r) => setCountries(r.data.data));

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
    if (!confirm('Delete this country?')) return;
    await deleteCountry(id);
    toast({ title: 'Country deleted' });
    fetchCountries();
  };

  const startEdit = (c: Country) => {
    setForm({ name: c.name, flag: c.flag, description: c.description });
    setEditId(c._id);
    setShowForm(true);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Countries</h1>
          <p className="text-slate-500 text-sm mt-1">Manage available destination countries.</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setEditId(null); setShowForm(!showForm); }}>
          <Plus className="w-4 h-4 mr-2" /> Add Country
        </Button>
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
        {countries.map((c) => (
          <Card key={c._id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-2">
                <img src={`https://flagcdn.com/w40/${c.flag}.png`} alt={c.name} className="w-10 h-7 object-cover rounded" />
                <div className="flex gap-1">
                  <button onClick={() => startEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(c._id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="font-semibold text-slate-900">{c.name}</p>
              {c.description && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{c.description}</p>}
              <div className={`mt-2 inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                {c.isActive ? 'Active' : 'Inactive'}
              </div>
            </CardContent>
          </Card>
        ))}
        {countries.length === 0 && (
          <p className="col-span-4 text-center text-slate-400 py-8">No countries yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}
