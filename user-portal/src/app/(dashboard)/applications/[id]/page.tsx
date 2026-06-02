'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Download, CreditCard, Loader2, CheckCircle2, XCircle, Clock, FileText, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import { getApplication, uploadDocument, makePayment } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import StatusTimeline from '@/components/dashboard/StatusTimeline';
import type { Application, Document as AppDocument, VisaFile, DocumentRequirement } from '@/types';
import { STATUS_LABELS } from '@/types';

const docStatusIcon = (status: string) => {
  if (status === 'approved') return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === 'rejected') return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-yellow-500" />;
};

function triggerFileUpload(onFile: (file: File) => void) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.jpg,.jpeg,.png,.pdf,.doc,.docx';
  input.onchange = (e: any) => {
    const file = e.target?.files?.[0];
    if (file) onFile(file);
  };
  input.click();
}

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [visaFile, setVisaFile] = useState<VisaFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  // Free-form extra upload
  const [extraDocName, setExtraDocName] = useState('');
  const [showExtraUpload, setShowExtraUpload] = useState(false);

  const fetchData = async () => {
    try {
      const r = await getApplication(id);
      setApplication(r.data.data.application);
      setDocuments(r.data.data.documents);
      setVisaFile(r.data.data.visaFile);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleUpload = async (file: File, requirementName: string) => {
    if (!requirementName.trim()) {
      toast({ title: 'Document name required', description: 'Please enter a name for this document.', variant: 'destructive' });
      return;
    }
    setUploading(requirementName);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('requirementName', requirementName.trim());
    try {
      await uploadDocument(id, fd);
      toast({ title: 'Uploaded', description: `${requirementName} uploaded successfully.`, variant: 'success' });
      setExtraDocName('');
      setShowExtraUpload(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.response?.data?.message || 'Try again', variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handlePayment = async () => {
    setPaying(true);
    try {
      await makePayment(id);
      toast({ title: 'Payment successful!', description: 'Your application is now being processed.', variant: 'success' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Payment failed', description: err.response?.data?.message || 'Try again', variant: 'destructive' });
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-400">Loading application...</div>;
  if (!application) return <div className="p-6 text-center text-slate-400">Application not found.</div>;

  const docMap = Object.fromEntries(documents.map((d) => [d.requirementName, d]));
  const canUploadDocs = ['submitted', 'documents_under_review'].includes(application.status);
  const requirements: DocumentRequirement[] = application.visaType?.documentRequirements || [];

  // Extra uploaded docs that aren't in the requirements list
  const extraDocs = documents.filter((d) => !requirements.some((r) => r.name === d.requirementName));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/applications" className="text-slate-400 hover:text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Application Details</h1>
          <p className="text-xs text-slate-400 font-mono">{application.referenceId}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
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
                <Badge
                  variant={
                    application.status === 'visa_approved' || application.status === 'visa_delivered'
                      ? 'success'
                      : application.status === 'visa_rejected'
                      ? 'destructive'
                      : 'info'
                  }
                >
                  {STATUS_LABELS[application.status]}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-400 text-xs">Submitted</p>
                  <p className="font-medium">{formatDate(application.createdAt)}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-xs">Visa Fee</p>
                  <p className="font-bold text-blue-700">{formatCurrency(application.paymentAmount)}</p>
                </div>
              </div>
              {application.rejectionReason && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs font-semibold text-red-700 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-600">{application.rejectionReason}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Action */}
          {application.status === 'payment_pending' && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-blue-900 mb-1">Payment Required</h3>
                    <p className="text-blue-700 text-sm">Your documents are approved. Complete payment to proceed.</p>
                    <p className="text-2xl font-bold text-blue-900 mt-2">{formatCurrency(application.paymentAmount)}</p>
                  </div>
                  <Button onClick={handlePayment} disabled={paying} className="ml-4">
                    {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <><CreditCard className="w-4 h-4 mr-2" />Pay Now</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Visa Download */}
          {visaFile && application.status === 'visa_delivered' && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-green-900 mb-1">Your Visa is Ready!</h3>
                    <p className="text-green-700 text-sm">Download your approved visa document.</p>
                  </div>
                  <Button
                    className="bg-green-700 hover:bg-green-800 ml-4"
                    onClick={() => window.open(visaFile.url, '_blank')}
                  >
                    <Download className="w-4 h-4 mr-2" />Download Visa
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Documents Section ── always visible when status allows or docs exist */}
          {(canUploadDocs || documents.length > 0) && (
            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Documents</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {canUploadDocs
                      ? 'Upload your required documents to continue.'
                      : 'Documents submitted for this application.'}
                  </p>
                </div>
                <Badge variant="secondary">{documents.length} uploaded</Badge>
              </div>

              <CardContent className="p-0">
                {/* Configured requirements */}
                {requirements.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {requirements.map((req) => {
                      const doc = docMap[req.name];
                      return (
                        <div key={req._id || req.name} className="p-4 flex items-center justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className="mt-0.5 flex-shrink-0">
                              {doc ? docStatusIcon(doc.status) : (
                                <div className="w-4 h-4 rounded-full border-2 border-slate-300" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900">
                                {req.name}
                                {req.required && <span className="text-red-400 ml-1">*</span>}
                              </p>
                              {req.description && <p className="text-xs text-slate-400">{req.description}</p>}
                              {doc?.status === 'rejected' && doc.rejectionReason && (
                                <p className="text-xs text-red-500 mt-1">Reason: {doc.rejectionReason}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {doc?.status === 'approved' ? (
                              <Badge variant="success">Approved</Badge>
                            ) : canUploadDocs ? (
                              <Button
                                size="sm"
                                variant={doc ? 'outline' : 'default'}
                                disabled={uploading === req.name}
                                onClick={() => triggerFileUpload((file) => handleUpload(file, req.name))}
                              >
                                {uploading === req.name ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <><Upload className="w-3.5 h-3.5 mr-1.5" />{doc ? 'Re-upload' : 'Upload'}</>
                                )}
                              </Button>
                            ) : doc ? (
                              <Badge variant={doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                                {doc.status === 'rejected' ? 'Rejected' : 'Under Review'}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Not Uploaded</Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="px-5 py-4 flex items-start gap-3 bg-slate-50 border-b border-slate-100">
                    <FileText className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-slate-500">
                      No specific document requirements for this visa type.
                      {canUploadDocs && ' You can upload any supporting documents below.'}
                    </p>
                  </div>
                )}

                {/* Extra / free-form uploaded docs (not in requirements) */}
                {extraDocs.length > 0 && (
                  <div className="border-t border-slate-100">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-4 pt-3 pb-1">Additional Documents</p>
                    {extraDocs.map((doc) => (
                      <div key={doc._id} className="px-4 py-3 flex items-center justify-between gap-4 border-b border-slate-50">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex-shrink-0">{docStatusIcon(doc.status)}</div>
                          <p className="text-sm font-medium text-slate-900 truncate">{doc.requirementName}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {doc.status === 'approved' ? (
                            <Badge variant="success">Approved</Badge>
                          ) : canUploadDocs ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={uploading === doc.requirementName}
                              onClick={() => triggerFileUpload((file) => handleUpload(file, doc.requirementName))}
                            >
                              {uploading === doc.requirementName
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <><Upload className="w-3.5 h-3.5 mr-1.5" />Re-upload</>}
                            </Button>
                          ) : (
                            <Badge variant={doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {doc.status === 'rejected' ? 'Rejected' : 'Under Review'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add extra document */}
                {canUploadDocs && (
                  <div className="p-4 border-t border-slate-100 bg-slate-50/50">
                    {!showExtraUpload ? (
                      <button
                        onClick={() => setShowExtraUpload(true)}
                        className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                      >
                        <PlusCircle className="w-4 h-4" />
                        Upload additional document
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Document name (e.g. Bank Statement)"
                          value={extraDocName}
                          onChange={(e) => setExtraDocName(e.target.value)}
                          className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <Button
                          size="sm"
                          disabled={!extraDocName.trim() || uploading !== null}
                          onClick={() => triggerFileUpload((file) => handleUpload(file, extraDocName))}
                        >
                          {uploading && uploading === extraDocName
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <><Upload className="w-3.5 h-3.5 mr-1" />Upload</>}
                        </Button>
                        <button
                          onClick={() => { setShowExtraUpload(false); setExtraDocName(''); }}
                          className="text-xs text-slate-400 hover:text-slate-600 px-2"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Form Responses */}
          {Object.keys(application.formResponses).length > 0 && (
            <Card>
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Application Responses</h3>
              </div>
              <CardContent className="p-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Object.entries(application.formResponses).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-xs text-slate-400 capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                      <p className="text-sm font-medium text-slate-900 mt-0.5">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Timeline */}
        <div>
          <Card>
            <div className="p-5 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">Application Progress</h3>
            </div>
            <CardContent className="p-5">
              <StatusTimeline currentStatus={application.status} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
