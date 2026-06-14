'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Download, CreditCard, Loader2, CheckCircle2, XCircle,
  Clock, FileText, PlusCircle, Archive, ChevronDown, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/use-toast';
import {
  getApplication, uploadDocument, createPaymentOrder, verifyPayment,
  getVaultDocuments, addDocumentFromVault,
} from '@/lib/api';
import { loadRazorpayScript, openRazorpayCheckout, PaymentCancelledError } from '@/lib/razorpay';
import { formatDate, formatCurrency } from '@/lib/utils';
import StatusTimeline from '@/components/dashboard/StatusTimeline';
import type { Application, Document as AppDocument, VisaFile, DocumentRequirement, VaultDocument } from '@/types';
import { STATUS_LABELS } from '@/types';

const VAULT_TYPE_LABELS: Record<string, string> = {
  passport: 'Passport',
  aadhar: 'Aadhaar',
  pan: 'PAN Card',
  photograph: 'Photograph',
  bank_statement: 'Bank Statement',
  degree: 'Degree / Diploma',
  other: 'Other',
};

function getVaultType(reqName: string): string | null {
  const n = reqName.toLowerCase();
  if (n.includes('passport')) return 'passport';
  if (n.includes('aadhaar') || n.includes('aadhar') || n.includes('adhar')) return 'aadhar';
  if (n.includes('pan')) return 'pan';
  if (n.includes('photograph') || n.includes('photo')) return 'photograph';
  if (n.includes('bank')) return 'bank_statement';
  if (n.includes('degree') || n.includes('diploma')) return 'degree';
  return null;
}

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

  const [vaultDocs, setVaultDocs] = useState<VaultDocument[]>([]);
  const [vaultPickerFor, setVaultPickerFor] = useState<string | null>(null);

  // Extra doc upload
  const [extraDocName, setExtraDocName] = useState('');
  const [showExtraUpload, setShowExtraUpload] = useState(false);
  const [extraVaultOpen, setExtraVaultOpen] = useState(false);

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

  useEffect(() => {
    fetchData();
    getVaultDocuments().then((r) => setVaultDocs(r.data.data || [])).catch(() => {});
  }, [id]);

  const handleUpload = async (file: File, requirementName: string) => {
    setUploading(requirementName);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('requirementName', requirementName.trim());
    try {
      await uploadDocument(id, fd);
      toast({ title: 'Uploaded', description: `${requirementName} uploaded successfully.`, variant: 'success' });
      setExtraDocName('');
      setShowExtraUpload(false);
      setExtraVaultOpen(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.response?.data?.message || 'Try again', variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handleVaultImport = async (vaultDoc: VaultDocument, requirementName: string) => {
    setUploading(requirementName);
    setVaultPickerFor(null);
    setExtraVaultOpen(false);
    try {
      await addDocumentFromVault(id, { vaultDocId: vaultDoc._id, requirementName });
      toast({ title: 'Imported from vault', description: `${requirementName} linked from vault.`, variant: 'success' });
      setExtraDocName('');
      setShowExtraUpload(false);
      fetchData();
    } catch (err: any) {
      toast({ title: 'Import failed', description: err.response?.data?.message || 'Try again', variant: 'destructive' });
    } finally {
      setUploading(null);
    }
  };

  const handlePayment = async () => {
    setPaying(true);
    try {
      const orderRes = await createPaymentOrder(id);
      const order = orderRes.data.data;
      await loadRazorpayScript();
      const checkout = await openRazorpayCheckout(order);
      await verifyPayment(id, checkout);
      toast({ title: 'Payment successful!', description: 'Your application is now being processed.', variant: 'success' });
      fetchData();
    } catch (err: any) {
      if (err instanceof PaymentCancelledError) {
        toast({ title: 'Payment cancelled', description: 'You can complete the payment anytime from this page.' });
      } else {
        toast({ title: 'Payment failed', description: err.response?.data?.message || 'Try again', variant: 'destructive' });
      }
    } finally {
      setPaying(false);
    }
  };

  if (loading) return <div className="p-6 text-center text-slate-400">Loading application...</div>;
  if (!application) return <div className="p-6 text-center text-slate-400">Application not found.</div>;

  const docMap = Object.fromEntries(documents.map((d) => [d.requirementName, d]));
  const canUploadDocs = ['payment_completed', 'documents_under_review'].includes(application.status);
  const requirements: DocumentRequirement[] = application.visaType?.documentRequirements || [];
  const extraDocs = documents.filter((d) => !requirements.some((r) => r.name === d.requirementName));

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/applications" className="text-slate-400 hover:text-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Application Details</h1>
          <p className="text-xs text-slate-400">Application No. <span className="font-mono text-slate-500">{application.referenceId}</span></p>
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
                <Badge variant={
                  application.status === 'visa_approved' || application.status === 'visa_delivered' ? 'success'
                    : application.status === 'visa_rejected' ? 'destructive' : 'info'
                }>
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

          {/* Awaiting payment (fresh submission or admin-requested) */}
          {['submitted', 'payment_pending'].includes(application.status) && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-blue-900 mb-1">Payment Required</h3>
                    <p className="text-blue-700 text-sm">Complete the payment securely via Razorpay to start processing your application.</p>
                    <p className="text-2xl font-bold text-blue-900 mt-2">{formatCurrency(application.paymentAmount)}</p>
                  </div>
                  <Button onClick={handlePayment} disabled={paying} className="ml-4">
                    {paying ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4 mr-2" />Pay Now</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment confirmed */}
          {application.status === 'payment_completed' && (
            <Card className="border-green-200 bg-green-50">
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-green-900 mb-0.5">Payment Confirmed!</h3>
                    <p className="text-green-700 text-sm">Our team will review your documents shortly.</p>
                  </div>
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
                  <Button className="bg-green-700 hover:bg-green-800 ml-4" onClick={() => window.open(visaFile.url, '_blank')}>
                    <Download className="w-4 h-4 mr-2" />Download Visa
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Visa Submission — embassy details shared by our team during processing */}
          {['visa_processing', 'embassy_review'].includes(application.status) &&
            (application.processingReferenceNumber || application.embassyName || application.submissionDate) && (
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <h3 className="font-bold text-blue-900">Visa Submission</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                  {application.processingReferenceNumber && (
                    <div>
                      <p className="text-xs text-blue-600">Reference Number</p>
                      <p className="font-semibold text-blue-900 font-mono">{application.processingReferenceNumber}</p>
                    </div>
                  )}
                  {application.embassyName && (
                    <div>
                      <p className="text-xs text-blue-600">Embassy</p>
                      <p className="font-semibold text-blue-900">{application.embassyName}</p>
                    </div>
                  )}
                  {application.submissionDate && (
                    <div>
                      <p className="text-xs text-blue-600">Submission Date</p>
                      <p className="font-semibold text-blue-900">{formatDate(application.submissionDate)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents Section */}
          {(canUploadDocs || documents.length > 0) && (
            <Card>
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-900">Documents</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {canUploadDocs ? 'Upload or import required documents.' : 'Documents submitted for this application.'}
                  </p>
                </div>
                <Badge variant="secondary">{documents.length} uploaded</Badge>
              </div>

              <CardContent className="p-0">
                {requirements.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {requirements.map((req) => {
                      const doc = docMap[req.name];
                      const isUploading = uploading === req.name;
                      const pickerOpen = vaultPickerFor === req.name;
                      const suggestedType = getVaultType(req.name);
                      const suggested = suggestedType ? vaultDocs.filter((v) => v.type === suggestedType) : [];
                      const others = vaultDocs.filter((v) => !suggested.includes(v));

                      return (
                        <div key={req._id || req.name}>
                          <div className="p-4 flex items-center justify-between gap-4">
                            {/* Doc info */}
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="mt-0.5 flex-shrink-0">
                                {doc ? docStatusIcon(doc.status) : <div className="w-4 h-4 rounded-full border-2 border-slate-300" />}
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

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {doc?.status === 'approved' ? (
                                <Badge variant="success">Approved</Badge>
                              ) : canUploadDocs ? (
                                isUploading ? (
                                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading…
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    {/* Import from Vault */}
                                    <button
                                      onClick={() => setVaultPickerFor(pickerOpen ? null : req.name)}
                                      className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                                        pickerOpen
                                          ? 'bg-purple-100 border-purple-300 text-purple-700'
                                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700'
                                      }`}
                                    >
                                      <Archive className="w-3.5 h-3.5" />
                                      From Vault
                                      <ChevronDown className={`w-3 h-3 transition-transform ${pickerOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {/* Upload New */}
                                    <button
                                      onClick={() => triggerFileUpload((file) => handleUpload(file, req.name))}
                                      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border bg-blue-600 border-blue-600 text-white hover:bg-blue-700 transition-colors"
                                    >
                                      <Upload className="w-3.5 h-3.5" />
                                      {doc ? 'Replace' : 'Upload New'}
                                    </button>
                                  </div>
                                )
                              ) : doc ? (
                                <Badge variant={doc.status === 'rejected' ? 'destructive' : 'secondary'}>
                                  {doc.status === 'rejected' ? 'Rejected' : 'Under Review'}
                                </Badge>
                              ) : (
                                <Badge variant="secondary">Not Uploaded</Badge>
                              )}
                            </div>
                          </div>

                          {/* Inline Vault Picker */}
                          {pickerOpen && (
                            <div className="mx-4 mb-4 rounded-xl border border-purple-200 bg-purple-50 overflow-hidden">
                              <div className="flex items-center justify-between px-4 py-2.5 border-b border-purple-200 bg-purple-100/60">
                                <p className="text-xs font-semibold text-purple-800 flex items-center gap-1.5">
                                  <Archive className="w-3.5 h-3.5" /> Select from Document Vault
                                </p>
                                <button onClick={() => setVaultPickerFor(null)} className="text-purple-400 hover:text-purple-700">
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              {vaultDocs.length === 0 ? (
                                <p className="text-xs text-slate-500 text-center py-4">No documents in vault.</p>
                              ) : (
                                <div className="divide-y divide-purple-100 max-h-56 overflow-y-auto">
                                  {/* Suggested (matched) docs first */}
                                  {suggested.length > 0 && (
                                    <>
                                      <p className="text-[10px] font-semibold text-purple-600 uppercase tracking-wide px-4 pt-2.5 pb-1">
                                        Suggested for "{req.name}"
                                      </p>
                                      {suggested.map((vd) => (
                                        <button
                                          key={vd._id}
                                          onClick={() => handleVaultImport(vd, req.name)}
                                          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-purple-100 transition-colors text-left"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-7 h-7 rounded-lg bg-purple-200 flex items-center justify-center flex-shrink-0">
                                              <FileText className="w-3.5 h-3.5 text-purple-700" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium text-slate-900 truncate">{vd.label}</p>
                                              <p className="text-xs text-slate-500">{VAULT_TYPE_LABELS[vd.type] || vd.type}</p>
                                            </div>
                                          </div>
                                          <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                            Use this
                                          </span>
                                        </button>
                                      ))}
                                    </>
                                  )}

                                  {/* Other vault docs */}
                                  {others.length > 0 && (
                                    <>
                                      {suggested.length > 0 && (
                                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-4 pt-2.5 pb-1">
                                          Other Documents
                                        </p>
                                      )}
                                      {others.map((vd) => (
                                        <button
                                          key={vd._id}
                                          onClick={() => handleVaultImport(vd, req.name)}
                                          className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-purple-100 transition-colors text-left"
                                        >
                                          <div className="flex items-center gap-2.5 min-w-0">
                                            <div className="w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                                              <FileText className="w-3.5 h-3.5 text-slate-500" />
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-sm font-medium text-slate-900 truncate">{vd.label}</p>
                                              <p className="text-xs text-slate-500">{VAULT_TYPE_LABELS[vd.type] || vd.type}</p>
                                            </div>
                                          </div>
                                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                            Use this
                                          </span>
                                        </button>
                                      ))}
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
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

                {/* Extra uploaded docs */}
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
                            uploading === doc.requirementName ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                            ) : (
                              <button
                                onClick={() => triggerFileUpload((file) => handleUpload(file, doc.requirementName))}
                                className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border bg-blue-600 border-blue-600 text-white hover:bg-blue-700 transition-colors"
                              >
                                <Upload className="w-3.5 h-3.5" /> Replace
                              </button>
                            )
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
                        Add additional document
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Document name (e.g. Bank Statement)"
                            value={extraDocName}
                            onChange={(e) => setExtraDocName(e.target.value)}
                            className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            onClick={() => { setShowExtraUpload(false); setExtraDocName(''); setExtraVaultOpen(false); }}
                            className="text-xs text-slate-400 hover:text-slate-600 px-2"
                          >
                            Cancel
                          </button>
                        </div>
                        {extraDocName.trim() && (
                          <div className="flex items-center gap-2">
                            {/* From Vault option */}
                            <button
                              onClick={() => setExtraVaultOpen(!extraVaultOpen)}
                              className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-colors ${
                                extraVaultOpen
                                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700'
                              }`}
                            >
                              <Archive className="w-3.5 h-3.5" />
                              From Vault
                              <ChevronDown className={`w-3 h-3 transition-transform ${extraVaultOpen ? 'rotate-180' : ''}`} />
                            </button>
                            {/* Upload New */}
                            <button
                              disabled={!extraDocName.trim() || uploading !== null}
                              onClick={() => triggerFileUpload((file) => handleUpload(file, extraDocName))}
                              className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border bg-blue-600 border-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                              {uploading === extraDocName
                                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                : <><Upload className="w-3.5 h-3.5" /> Upload New</>}
                            </button>
                          </div>
                        )}

                        {/* Extra vault picker */}
                        {extraVaultOpen && extraDocName.trim() && (
                          <div className="rounded-xl border border-purple-200 bg-purple-50 overflow-hidden">
                            <div className="px-4 py-2 border-b border-purple-200 bg-purple-100/60">
                              <p className="text-xs font-semibold text-purple-800 flex items-center gap-1.5">
                                <Archive className="w-3.5 h-3.5" /> Select from Document Vault
                              </p>
                            </div>
                            {vaultDocs.length === 0 ? (
                              <p className="text-xs text-slate-500 text-center py-4">No documents in vault.</p>
                            ) : (
                              <div className="divide-y divide-purple-100 max-h-48 overflow-y-auto">
                                {vaultDocs.map((vd) => (
                                  <button
                                    key={vd._id}
                                    onClick={() => handleVaultImport(vd, extraDocName)}
                                    className="w-full flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-purple-100 transition-colors text-left"
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-purple-200 flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-3.5 h-3.5 text-purple-700" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-sm font-medium text-slate-900 truncate">{vd.label}</p>
                                        <p className="text-xs text-slate-500">{VAULT_TYPE_LABELS[vd.type] || vd.type}</p>
                                      </div>
                                    </div>
                                    <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full flex-shrink-0">
                                      Use this
                                    </span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
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
