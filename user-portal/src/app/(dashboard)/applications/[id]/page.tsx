'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Upload, Download, CreditCard, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
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

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [visaFile, setVisaFile] = useState<VisaFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<string | null>(null);

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
    setUploading(requirementName);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('requirementName', requirementName);
    try {
      await uploadDocument(id, fd);
      toast({ title: 'Uploaded', description: `${requirementName} uploaded successfully.`, variant: 'success' });
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
  const canUploadDocs = ['submitted', 'documents_under_review', 'documents_approved'].includes(application.status);

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

          {/* Documents */}
          {application.visaType?.documentRequirements?.length > 0 && (
            <Card>
              <div className="p-5 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">Documents</h3>
                <p className="text-xs text-slate-400 mt-0.5">Upload required documents for your application.</p>
              </div>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-100">
                  {application.visaType.documentRequirements.map((req: DocumentRequirement) => {
                    const doc = docMap[req.name];
                    return (
                      <div key={req._id} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="mt-0.5">{doc ? docStatusIcon(doc.status) : <div className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />}</div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {req.name}
                              {req.required && <span className="text-red-400 ml-1">*</span>}
                            </p>
                            {req.description && <p className="text-xs text-slate-400">{req.description}</p>}
                            {doc?.status === 'rejected' && doc.rejectionReason && (
                              <p className="text-xs text-red-500 mt-1">Rejected: {doc.rejectionReason}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {doc && doc.status === 'approved' ? (
                            <Badge variant="success">Approved</Badge>
                          ) : canUploadDocs ? (
                            <>
                              <input
                                type="file"
                                ref={uploadTarget === req.name ? fileInputRef : undefined}
                                className="hidden"
                                accept=".jpg,.jpeg,.png,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUpload(file, req.name);
                                }}
                              />
                              <Button
                                size="sm"
                                variant={doc ? 'outline' : 'default'}
                                disabled={uploading === req.name}
                                onClick={() => {
                                  setUploadTarget(req.name);
                                  const input = document.createElement('input');
                                  input.type = 'file';
                                  input.accept = '.jpg,.jpeg,.png,.pdf';
                                  input.onchange = (e: any) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUpload(file, req.name);
                                  };
                                  input.click();
                                }}
                              >
                                {uploading === req.name ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <><Upload className="w-3.5 h-3.5 mr-1" />{doc ? 'Re-upload' : 'Upload'}</>
                                )}
                              </Button>
                            </>
                          ) : doc ? (
                            <Badge variant={doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                              {doc.status === 'rejected' ? 'Rejected' : 'Under Review'}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
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
