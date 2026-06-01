'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2, Upload, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { getApplication, reviewDocument, approveAllDocuments, updateStatus, uploadVisaFile, manualPaymentOverride } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Application, Document, VisaFile } from '@/types';
import { STATUS_LABELS, ALL_STATUSES } from '@/types';

export default function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [visaFile, setVisaFile] = useState<VisaFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  const fetchData = async () => {
    try {
      const r = await getApplication(id);
      setApplication(r.data.data.application);
      setDocuments(r.data.data.documents);
      setVisaFile(r.data.data.visaFile);
      setNewStatus(r.data.data.application.status);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleDocReview = async (documentId: string, status: 'approved' | 'rejected', reason?: string) => {
    setProcessing(true);
    try {
      await reviewDocument(id, { documentId, status, rejectionReason: reason });
      toast({ title: `Document ${status}`, variant: status === 'approved' ? 'success' : 'destructive' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleApproveAll = async () => {
    setProcessing(true);
    try {
      await approveAllDocuments(id);
      toast({ title: 'All documents approved — payment requested!', variant: 'success' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleStatusUpdate = async () => {
    setProcessing(true);
    try {
      await updateStatus(id, { status: newStatus, rejectionReason, adminNotes });
      toast({ title: 'Status updated', variant: 'success' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  const handleVisaUpload = async (file: File) => {
    setProcessing(true);
    const fd = new FormData();
    fd.append('file', file);
    try {
      await uploadVisaFile(id, fd);
      toast({ title: 'Visa uploaded and delivered to user!', variant: 'success' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-400">Loading...</div>;
  if (!application) return <div className="p-6 text-center text-slate-400">Application not found.</div>;

  const pendingDocs = documents.filter((d) => d.status === 'pending');
  const allApproved = documents.length > 0 && documents.every((d) => d.status === 'approved');

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/applications" className="text-slate-400 hover:text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Application Review</h1>
          <p className="text-xs text-slate-400 font-mono">{application.referenceId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Application Info */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <img src={`https://flagcdn.com/w40/${application.country?.flag}.png`} alt={application.country?.name} className="w-10 h-7 object-cover rounded" />
                  <div>
                    <h2 className="font-bold text-slate-900">{application.visaType?.name}</h2>
                    <p className="text-sm text-slate-500">{application.country?.name}</p>
                  </div>
                </div>
                <Badge variant={application.status === 'visa_approved' || application.status === 'visa_delivered' ? 'success' : application.status === 'visa_rejected' ? 'destructive' : 'info'}>
                  {STATUS_LABELS[application.status]}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Applicant</p>
                  <p className="font-medium">{application.user?.name}</p>
                  <p className="text-xs text-slate-400">{application.user?.email}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Phone</p>
                  <p className="font-medium">{application.user?.phone}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Fee</p>
                  <p className="font-bold text-blue-700">{formatCurrency(application.paymentAmount)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Submitted</p>
                  <p className="font-medium">{formatDate(application.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Review */}
          {documents.length > 0 && (
            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Documents</h3>
                  <p className="text-xs text-slate-400">{documents.length} document(s) submitted</p>
                </div>
                {pendingDocs.length > 0 && (
                  <Button size="sm" onClick={handleApproveAll} disabled={processing}>
                    {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Approve All Documents'}
                  </Button>
                )}
                {allApproved && application.status === 'documents_under_review' && (
                  <Button size="sm" onClick={handleApproveAll} disabled={processing}>
                    Request Payment
                  </Button>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {documents.map((doc) => (
                  <div key={doc._id} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {doc.status === 'approved' ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : doc.status === 'rejected' ? (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900 text-sm">{doc.requirementName}</p>
                          {doc.rejectionReason && (
                            <p className="text-xs text-red-500">Reason: {doc.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {doc.status !== 'approved' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() => handleDocReview(doc._id, 'approved')}
                            disabled={processing}
                          >
                            Approve
                          </Button>
                        )}
                        {doc.status !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-700 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              const reason = prompt('Rejection reason:');
                              if (reason) handleDocReview(doc._id, 'rejected', reason);
                            }}
                            disabled={processing}
                          >
                            Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Form Responses */}
          {Object.keys(application.formResponses).length > 0 && (
            <Card>
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Application Responses</h3>
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(application.formResponses).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-xs text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                      <p className="font-medium text-slate-900">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-5">
          {/* Status Update */}
          <Card>
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Update Status</h3>
            </div>
            <CardContent className="p-4 space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full h-9 px-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              {newStatus === 'visa_rejected' && (
                <div>
                  <label className="text-xs font-medium text-slate-500 block mb-1">Rejection Reason</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={2}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1">Admin Notes (internal)</label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <Button className="w-full" onClick={handleStatusUpdate} disabled={processing}>
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Status'}
              </Button>
            </CardContent>
          </Card>

          {/* Cash Payment Override */}
          {application.status === 'payment_pending' && (
            <Card className="border-yellow-200">
              <div className="p-4 border-b border-yellow-100 bg-yellow-50">
                <h3 className="font-semibold text-yellow-900">Cash Payment Override</h3>
                <p className="text-xs text-yellow-700 mt-0.5">Mark as paid if user paid in cash</p>
              </div>
              <CardContent className="p-4 space-y-3">
                <textarea
                  id="cashNote"
                  rows={2}
                  placeholder="Note (e.g. 'Cash received at office')"
                  className="w-full px-2 py-1.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
                />
                <Button
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-white"
                  onClick={async () => {
                    const note = (document.getElementById('cashNote') as HTMLTextAreaElement)?.value;
                    setProcessing(true);
                    try {
                      await manualPaymentOverride(application._id, note);
                      toast({ title: 'Payment marked as paid (cash)', variant: 'success' });
                      fetchData();
                    } catch (err: any) {
                      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' });
                    } finally { setProcessing(false); }
                  }}
                  disabled={processing}
                >
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark as Paid (Cash)'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Upload Visa */}
          {['visa_approved', 'payment_completed', 'visa_processing', 'embassy_review'].includes(application.status) && (
            <Card>
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Deliver Visa</h3>
                <p className="text-xs text-slate-400 mt-0.5">Upload PDF to deliver to applicant</p>
              </div>
              <CardContent className="p-4">
                <input
                  type="file"
                  id="visaUpload"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleVisaUpload(file);
                  }}
                />
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => document.getElementById('visaUpload')?.click()}
                  disabled={processing}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {processing ? 'Uploading...' : 'Upload Visa PDF'}
                </Button>
                {visaFile && (
                  <a href={visaFile.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline mt-2 block text-center">
                    View current visa file →
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Visa Delivered Info */}
          {visaFile && application.status === 'visa_delivered' && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-4">
                <p className="font-semibold text-green-800 text-sm mb-2">Visa Delivered</p>
                <a href={visaFile.url} target="_blank" rel="noopener noreferrer" className="text-green-700 text-xs hover:underline flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" /> View delivered visa
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
