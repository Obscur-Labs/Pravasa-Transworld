'use client';
import { useEffect, useState } from 'react';
import { Upload, Trash2, Loader2, Vault, Eye, Scan } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { getVaultDocuments, uploadVaultDocument, deleteVaultDocument } from '@/lib/api';
import { formatDate } from '@/lib/utils';

type DocType = 'passport' | 'aadhar' | 'pan' | 'photograph' | 'bank_statement' | 'degree' | 'other';

const DOC_TYPES: { value: DocType; label: string }[] = [
  { value: 'passport', label: 'Passport' },
  { value: 'aadhar', label: 'Aadhar Card' },
  { value: 'pan', label: 'PAN Card' },
  { value: 'photograph', label: 'Photograph' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'degree', label: 'Degree Certificate' },
  { value: 'other', label: 'Other' },
];

const ocrTypes = ['passport', 'aadhar', 'pan'];

interface VaultDoc {
  _id: string;
  type: DocType;
  label: string;
  url: string;
  extractedData: Record<string, string>;
  createdAt: string;
}

export default function DocumentVaultPage() {
  const [docs, setDocs] = useState<VaultDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState<{ type: DocType; label: string; file: File | null }>({ type: 'passport', label: '', file: null });

  const fetchDocs = () =>
    getVaultDocuments()
      .then((r) => setDocs(r.data.data))
      .finally(() => setLoading(false));

  useEffect(() => { fetchDocs(); }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.file || !form.label) return;
    setUploading(true);
    const fd = new FormData();
    fd.append('file', form.file);
    fd.append('type', form.type);
    fd.append('label', form.label);
    try {
      await uploadVaultDocument(fd);
      toast({
        title: ocrTypes.includes(form.type) ? 'Document uploaded & OCR processed!' : 'Document saved to vault',
        description: ocrTypes.includes(form.type) ? 'Fields were automatically extracted.' : undefined,
        variant: 'success',
      });
      setShowUpload(false);
      setForm({ type: 'passport', label: '', file: null });
      fetchDocs();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this document from your vault?')) return;
    await deleteVaultDocument(id);
    toast({ title: 'Document removed' });
    setDocs((d) => d.filter((doc) => doc._id !== id));
  };

  const typeLabel = (t: DocType) => DOC_TYPES.find((d) => d.value === t)?.label ?? t;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Document Vault</h1>
          <p className="text-slate-500 text-sm mt-1">
            Save identity documents once. OCR auto-extracts fields for 1-click reuse in applications.
          </p>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Upload className="w-4 h-4 mr-2" />Add Document
        </Button>
      </div>

      {showUpload && (
        <Card className="mb-6 border-blue-200">
          <CardContent className="p-5">
            <h3 className="font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <Scan className="w-4 h-4 text-blue-600" />
              Upload Document
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Passport, Aadhar, and PAN cards are automatically scanned via OCR to extract your details.
            </p>
            <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label>Document Type</Label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as DocType })}
                  className="mt-1 w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DOC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Label</Label>
                <input
                  className="mt-1 flex h-10 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="e.g. My Passport"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label>File</Label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  className="mt-1 flex h-10 w-full rounded-lg border border-slate-200 bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none"
                  onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                  required
                />
              </div>
              <div className="sm:col-span-3 flex gap-2">
                <Button type="submit" disabled={uploading}>
                  {uploading ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Processing OCR...</> : 'Save to Vault'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowUpload(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-400">Loading vault...</div>
      ) : docs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <Vault className="w-12 h-12 text-slate-200 mx-auto mb-4" />
          <h3 className="font-semibold text-slate-700 mb-2">Vault is empty</h3>
          <p className="text-slate-400 text-sm">Add your identity documents to auto-fill visa applications.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {docs.map((doc) => (
            <Card key={doc._id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{doc.label}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">{typeLabel(doc.type)}</Badge>
                  </div>
                  <div className="flex gap-1">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye className="w-3.5 h-3.5" />
                    </a>
                    <button onClick={() => handleDelete(doc._id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {Object.keys(doc.extractedData).length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-3">
                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1 mb-2">
                      <Scan className="w-3 h-3" /> OCR Extracted
                    </p>
                    <div className="space-y-1">
                      {Object.entries(doc.extractedData).slice(0, 4).map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                          <span className="text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                          <span className="text-slate-700 font-medium truncate ml-2 max-w-[120px]">{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-xs text-slate-400">Added {formatDate(doc.createdAt)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
