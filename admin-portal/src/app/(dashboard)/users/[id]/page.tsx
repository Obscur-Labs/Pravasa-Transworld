'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, Calendar, FileText, ExternalLink, FolderArchive, Download, Loader2, Building2, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { getUsers, getUserApplications, getUserVaultDocuments, downloadUserVaultZip } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { User as IUser, Application, ApplicationStatus, VaultDocument } from '@/types';
import { STATUS_LABELS } from '@/types';

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  submitted: 'bg-blue-100 text-blue-700',
  documents_under_review: 'bg-yellow-100 text-yellow-700',
  documents_approved: 'bg-teal-100 text-teal-700',
  payment_pending: 'bg-orange-100 text-orange-700',
  payment_completed: 'bg-cyan-100 text-cyan-700',
  visa_processing: 'bg-purple-100 text-purple-700',
  embassy_review: 'bg-indigo-100 text-indigo-700',
  visa_approved: 'bg-green-100 text-green-700',
  visa_rejected: 'bg-red-100 text-red-700',
  visa_delivered: 'bg-emerald-100 text-emerald-700',
};

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<IUser | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingZip, setDownloadingZip] = useState(false);

  useEffect(() => {
    Promise.all([
      getUsers().then((r) => {
        const found = (r.data.data as IUser[]).find((u) => u._id === id);
        setUser(found || null);
      }),
      getUserApplications(id).then((r) => setApplications(r.data.data)),
      getUserVaultDocuments(id).then((r) => setVaultDocs(r.data.data)).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [id]);

  const handleDownloadVaultZip = async () => {
    setDownloadingZip(true);
    try {
      const response = await downloadUserVaultZip(id);
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vault-${user?.name?.replace(/\s+/g, '-') ?? id}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'Download failed', description: 'Could not create zip file.', variant: 'destructive' });
    } finally {
      setDownloadingZip(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-64">
        <p className="text-slate-400">Loading customer profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-4">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <p className="text-slate-400">Customer not found.</p>
      </div>
    );
  }

  const appsByStatus = applications.reduce<Record<string, number>>((acc, a) => {
    acc[a.status] = (acc[a.status] || 0) + 1;
    return acc;
  }, {});

  const totalSpend = applications
    .filter((a) => ['payment_completed', 'visa_processing', 'embassy_review', 'visa_approved', 'visa_delivered'].includes(a.status))
    .reduce((sum, a) => sum + (a.paymentAmount || 0), 0);

  return (
    <div className="p-6 max-w-5xl">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 text-sm mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Customers
      </button>

      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
        <div className="flex items-start gap-5">
          <div className={`w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 ${user.accountType === 'corporate' ? 'bg-amber-100' : 'bg-blue-100'}`}>
            <span className={`text-2xl font-bold ${user.accountType === 'corporate' ? 'text-amber-700' : 'text-blue-700'}`}>{user.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900">{user.name}</h1>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${user.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {user.isActive ? 'Active' : 'Inactive'}
              </span>
              {user.accountType === 'corporate' ? (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-700">
                  <Building2 className="w-3 h-3" /> Corporate
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                  <User className="w-3 h-3" /> Individual
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-slate-500">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{user.email}</span>
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />{user.phone}</span>
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {formatDate(user.createdAt)}</span>
              {user.accountType === 'corporate' && user.gstNumber && (
                <span className="flex items-center gap-1.5 font-mono text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md border border-amber-200">
                  GST: {user.gstNumber}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-slate-900">{applications.length}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Applications</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-green-700">{appsByStatus['visa_approved'] || 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Visas Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-red-600">{appsByStatus['visa_rejected'] || 0}</p>
            <p className="text-xs text-slate-500 mt-0.5">Rejected</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(totalSpend)}</p>
            <p className="text-xs text-slate-500 mt-0.5">Total Spend</p>
          </CardContent>
        </Card>
      </div>

      {/* Vault Documents */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-slate-500" />
            Document Vault
            <span className="text-sm font-normal text-slate-400">({vaultDocs.length})</span>
          </h2>
          {vaultDocs.length > 0 && (
            <Button size="sm" variant="outline" onClick={handleDownloadVaultZip} disabled={downloadingZip}>
              {downloadingZip ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Download ZIP
            </Button>
          )}
        </div>
        {vaultDocs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400">
            No documents in vault.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {vaultDocs.map((doc) => (
              <div key={doc._id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-slate-900 text-sm truncate">{doc.label}</p>
                  <p className="text-xs text-slate-400 capitalize">{doc.type.replace('_', ' ')}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(doc.createdAt)}</p>
                </div>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex-shrink-0"
                  title="View document"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Applications */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-slate-500" />
          Applied Applications
          <span className="text-sm font-normal text-slate-400">({applications.length})</span>
        </h2>

        {applications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400">
            No applications submitted by this customer.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Application No.', 'Country & Visa', 'Amount', 'Status', 'Applied On', ''].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                        {app.referenceId}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {app.country?.flag && (
                          <img src={`https://flagcdn.com/w20/${app.country.flag}.png`} alt="" className="w-5 h-3 object-cover rounded flex-shrink-0" />
                        )}
                        <div>
                          <p className="font-medium text-slate-900">{app.country?.name}</p>
                          <p className="text-xs text-slate-400">{app.visaType?.name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {app.paymentAmount ? formatCurrency(app.paymentAmount) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[app.status] || 'bg-slate-100 text-slate-600'}`}>
                        {STATUS_LABELS[app.status] || app.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(app.createdAt)}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => router.push(`/applications/${app._id}`)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View application"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
