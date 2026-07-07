'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Clock, Loader2, Upload, ExternalLink, Download, Trash2, Circle, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import {
  getApplication, reviewDocument, approveAllDocuments, updateStatus, uploadVisaFile,
  manualPaymentOverride, downloadApplicationDocumentsZip, deleteApplication, downloadApplicationReceipt,
} from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import type { Application, Document, VisaFile } from '@/types';
import { STATUS_LABELS, SELECTABLE_STATUSES } from '@/types';

// ── 4-step simplified status ──
const SIMPLIFIED_STEPS = [
  { label: 'Application Submitted', statuses: ['submitted', 'documents_under_review', 'documents_approved', 'payment_pending'] },
  { label: 'Payment Completed', statuses: ['payment_completed'] },
  { label: 'Visa Processing', statuses: ['visa_processing', 'embassy_review'] },
  { label: 'Visa Approved', statuses: ['visa_approved', 'visa_delivered'] },
] as const;

function getStepState(status: string, stepIdx: number): 'done' | 'active' | 'pending' {
  for (let i = 0; i < SIMPLIFIED_STEPS.length; i++) {
    if ((SIMPLIFIED_STEPS[i].statuses as readonly string[]).includes(status)) {
      if (i > stepIdx) return 'done';
      if (i === stepIdx) return 'active';
      return 'pending';
    }
  }
  return 'pending';
}

// Parse traveler label from document requirementName (e.g. "Adult 1 - Passport" → "Adult 1")
function getDocTravelerLabel(requirementName: string): string {
  const m = requirementName.match(/^(Adult \d+|Child \d+)\s*[-–—]\s*/i);
  return m ? m[1] : 'Other';
}

// Parse traveler label from form response key (e.g. "Adult 1 — Full Name" → "Adult 1")
function getFormTravelerLabel(key: string): string {
  const m = key.match(/^(Adult \d+|Child \d+)\s*[-–—]\s*/i);
  return m ? m[1] : 'General';
}

export default function AdminApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [visaFile, setVisaFile] = useState<VisaFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [trashing, setTrashing] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [processingRef, setProcessingRef] = useState('');
  const [embassyName, setEmbassyName] = useState('');
  const [submissionDate, setSubmissionDate] = useState('');
  const [expectedDate, setExpectedDate] = useState('');
  const [activeDocTab, setActiveDocTab] = useState('');
  const [activeFormTab, setActiveFormTab] = useState('');

  const fetchData = async () => {
    try {
      const r = await getApplication(id);
      const app = r.data.data.application;
      setApplication(app);
      setDocuments(r.data.data.documents);
      setVisaFile(r.data.data.visaFile);
      setNewStatus(app.status);
      setProcessingRef(app.processingReferenceNumber || '');
      setEmbassyName(app.embassyName || '');
      setSubmissionDate(app.submissionDate || '');
      setExpectedDate(app.expectedDate || '');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // Group documents by traveler tab
  const docGroups = useMemo(() => {
    const groups: Record<string, Document[]> = {};
    for (const doc of documents) {
      const tab = getDocTravelerLabel(doc.requirementName);
      if (!groups[tab]) groups[tab] = [];
      groups[tab].push(doc);
    }
    return groups;
  }, [documents]);

  const docTabs = Object.keys(docGroups);

  useEffect(() => {
    if (docTabs.length > 0 && !docTabs.includes(activeDocTab)) {
      setActiveDocTab(docTabs[0]);
    }
  }, [docTabs.join(',')]);

  // Group form responses by traveler tab
  const formGroups = useMemo(() => {
    if (!application) return {};
    const groups: Record<string, Record<string, string>> = {};
    for (const [k, v] of Object.entries(application.formResponses)) {
      const tab = getFormTravelerLabel(k);
      if (!groups[tab]) groups[tab] = {};
      const displayKey = k.replace(/^(Adult \d+|Child \d+)\s*[-–—]\s*/i, '');
      groups[tab][displayKey] = v;
    }
    return groups;
  }, [application]);

  const formTabs = Object.keys(formGroups);

  useEffect(() => {
    if (formTabs.length > 0 && !formTabs.includes(activeFormTab)) {
      setActiveFormTab(formTabs[0]);
    }
  }, [formTabs.join(',')]);

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const response = await downloadApplicationDocumentsZip(id);
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `docs-${application?.referenceId || id}.zip`;
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

  const handleDownloadReceipt = async () => {
    setDownloadingReceipt(true);
    try {
      const response = await downloadApplicationReceipt(id);
      const url = URL.createObjectURL(response.data as Blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `receipt-${application?.referenceId || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: 'No receipt', description: 'No completed payment found for this application.', variant: 'destructive' });
    } finally {
      setDownloadingReceipt(false);
    }
  };

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
      toast({ title: 'All documents approved!', variant: 'success' });
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
      await updateStatus(id, {
        status: newStatus,
        rejectionReason,
        adminNotes,
        processingReferenceNumber: processingRef,
        embassyName,
        submissionDate,
        expectedDate,
      });
      toast({ title: 'Status updated', variant: 'success' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Error', description: err.response?.data?.message, variant: 'destructive' });
    } finally {
      setProcessing(false);
    }
  };

  // Save embassy submission details without changing the current status.
  const handleSaveVisaSubmission = async () => {
    if (!application) return;
    setProcessing(true);
    try {
      await updateStatus(id, {
        status: application.status,
        processingReferenceNumber: processingRef,
        embassyName,
        submissionDate,
        expectedDate,
      });
      toast({ title: 'Visa submission details saved', variant: 'success' });
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

  const handleTrash = async () => {
    if (!confirm('Move this application to Trash? You can restore it later from the Trash page.')) return;
    setTrashing(true);
    try {
      await deleteApplication(id);
      toast({ title: 'Moved to Trash', description: 'Restore it anytime from the Trash page.', variant: 'success' });
      router.push('/applications');
    } catch (err: any) {
      toast({ title: 'Failed to move to trash', description: err.response?.data?.message, variant: 'destructive' });
      setTrashing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-5 w-5 rounded" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-xl" />
          </div>
          <Skeleton className="h-96 w-full rounded-xl" />
        </div>
      </div>
    );
  }
  if (!application) return <div className="p-6 text-center text-muted-foreground">Application not found.</div>;

  const pendingDocs = documents.filter((d) => d.status === 'pending');
  const currentDocList = docGroups[activeDocTab] || [];

  // Manual dropdown mirrors the 4-step progress (+ Rejected). Keep the current status
  // visible even if it's an internal sub-status set automatically by the workflow.
  const statusOptions = SELECTABLE_STATUSES.includes(application.status)
    ? SELECTABLE_STATUSES
    : [application.status, ...SELECTABLE_STATUSES];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/applications" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Application Review</h1>
          <p className="text-xs text-muted-foreground">Application No. <span className="font-mono text-muted-foreground/80">{application.referenceId}</span></p>
        </div>
        <Button variant="outline" onClick={handleTrash} disabled={trashing}
          className="ml-auto text-destructive border-destructive/20 hover:bg-destructive/10">
          {trashing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Trash2 className="w-4 h-4 mr-2" /> Move to Trash</>}
        </Button>
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
                    <h2 className="font-bold text-foreground">{application.visaType?.name}</h2>
                    <p className="text-sm text-muted-foreground">{application.country?.name}</p>
                  </div>
                </div>
                <Badge variant={application.status === 'visa_approved' || application.status === 'visa_delivered' ? 'success' : application.status === 'visa_rejected' ? 'destructive' : 'info'}>
                  {STATUS_LABELS[application.status]}
                </Badge>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Applicant</p>
                  <p className="font-medium text-foreground">{application.user?.name}</p>
                  <p className="text-xs text-muted-foreground">{application.user?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Phone</p>
                  <p className="font-medium text-foreground">{application.user?.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Fee</p>
                  <p className="font-bold text-primary tabular-nums">{formatCurrency(application.paymentAmount)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Submitted</p>
                  <p className="font-medium text-foreground">{formatDate(application.createdAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Document Review - tab by traveler */}
          {documents.length > 0 && (
            <Card>
              <div className="p-5 border-b border-border flex items-center justify-between flex-wrap gap-2">
                <div>
                  <h3 className="font-semibold text-foreground">Documents</h3>
                  <p className="text-xs text-muted-foreground">{documents.length} document(s) submitted</p>
                </div>
                <div className="flex items-center gap-2">
                  {documents.length > 0 && (
                    <Button size="sm" variant="outline" onClick={handleDownloadZip} disabled={downloadingZip}>
                      {downloadingZip ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Download className="w-3.5 h-3.5 mr-1.5" />Download All</>}
                    </Button>
                  )}
                  {pendingDocs.length > 0 && (
                    <Button size="sm" onClick={handleApproveAll} disabled={processing}>
                      {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Approve All'}
                    </Button>
                  )}
                </div>
              </div>

              {/* Traveler tabs */}
              {docTabs.length > 1 && (
                <div className="flex gap-1 px-5 pt-3 border-b border-border pb-0">
                  {docTabs.map((tab) => {
                    const isChild = tab.toLowerCase().startsWith('child');
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveDocTab(tab)}
                        className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                          activeDocTab === tab
                            ? (isChild ? 'border-success text-success bg-success/10' : 'border-primary text-primary bg-accent')
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tab}
                        <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                          {docGroups[tab]?.length}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="divide-y divide-border">
                {currentDocList.map((doc) => (
                  <div key={doc._id} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {doc.status === 'approved' ? (
                          <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                        ) : doc.status === 'rejected' ? (
                          <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        ) : (
                          <Clock className="w-4 h-4 text-warning flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground text-sm">
                            {doc.requirementName.replace(/^(Adult \d+|Child \d+)\s*[-–—]\s*/i, '')}
                          </p>
                          {doc.rejectionReason && (
                            <p className="text-xs text-destructive">Reason: {doc.rejectionReason}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        {doc.status !== 'approved' && (
                          <Button size="sm" variant="outline" className="text-success border-success/20 hover:bg-success/10"
                            onClick={() => handleDocReview(doc._id, 'approved')} disabled={processing}>
                            Approve
                          </Button>
                        )}
                        {doc.status !== 'rejected' && (
                          <Button size="sm" variant="outline" className="text-destructive border-destructive/20 hover:bg-destructive/10"
                            onClick={() => {
                              const reason = prompt('Rejection reason:');
                              if (reason) handleDocReview(doc._id, 'rejected', reason);
                            }}
                            disabled={processing}>
                            Reject
                          </Button>
                        )}
                      </div>
                    </div>
                    {doc.extractedData && Object.keys(doc.extractedData).length > 0 && (
                      <div className="mt-3 ml-7 p-3 bg-muted/50 rounded-lg border border-border">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-2">Auto-extracted details</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
                          {Object.entries(doc.extractedData).map(([k, v]) => (
                            <div key={k} className="text-xs">
                              <span className="text-muted-foreground">{k}: </span>
                              <span className="font-medium text-foreground">{v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Form Responses - tab by traveler */}
          {Object.keys(application.formResponses).length > 0 && (
            <Card>
              <div className="p-5 border-b border-border">
                <h3 className="font-semibold text-foreground">Application Responses</h3>
              </div>

              {/* Form traveler tabs */}
              {formTabs.length > 1 && (
                <div className="flex gap-1 px-5 pt-3 border-b border-border">
                  {formTabs.map((tab) => {
                    const isChild = tab.toLowerCase().startsWith('child');
                    return (
                      <button
                        key={tab}
                        onClick={() => setActiveFormTab(tab)}
                        className={`px-4 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors ${
                          activeFormTab === tab
                            ? (isChild ? 'border-success text-success bg-success/10' : 'border-primary text-primary bg-accent')
                            : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {tab}
                      </button>
                    );
                  })}
                </div>
              )}

              <CardContent className="p-5">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(formGroups[activeFormTab] || {}).map(([k, v]) => (
                    <div key={k}>
                      <p className="text-xs text-muted-foreground capitalize">{k.replace(/([A-Z])/g, ' $1')}</p>
                      <p className="font-medium text-foreground">{String(v)}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-5">
          {/* 4-Step Status + Update */}
          <Card>
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Application Progress</h3>
            </div>
            <CardContent className="p-4 space-y-4">
              {/* 4-step visual */}
              {application.status === 'visa_rejected' ? (
                <div className="flex items-center gap-3 p-3 bg-destructive/10 rounded-xl border border-destructive/20">
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0" />
                  <p className="text-sm font-semibold text-destructive">Visa Rejected</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {SIMPLIFIED_STEPS.map((step, idx) => {
                    const state = getStepState(application.status, idx);
                    const isLast = idx === SIMPLIFIED_STEPS.length - 1;
                    return (
                      <div key={step.label} className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                            state === 'done' ? 'bg-success border-success' :
                            state === 'active' ? 'bg-primary border-primary' :
                            'bg-card border-border'
                          }`}>
                            {state === 'done' ? <CheckCircle2 className="w-4 h-4 text-success-foreground" /> :
                             state === 'active' ? <Clock className="w-3.5 h-3.5 text-primary-foreground animate-pulse" /> :
                             <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
                          </div>
                          {!isLast && <div className={`w-0.5 h-8 my-0.5 ${state === 'done' ? 'bg-success/50' : 'bg-border'}`} />}
                        </div>
                        <div className="pt-1.5">
                          <p className={`text-sm font-medium ${
                            state === 'done' ? 'text-success' :
                            state === 'active' ? 'text-primary' :
                            'text-muted-foreground'
                          }`}>{step.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Visa Submission — embassy details entered during processing, shared with the applicant */}
              {application.status === 'visa_processing' && (
                <div className="p-3 bg-accent rounded-xl border border-primary/20 space-y-3">
                  <h4 className="text-xs font-bold text-primary uppercase tracking-wide">Visa Submission</h4>
                  <div>
                    <label className="text-xs font-semibold text-primary block mb-1">Reference Number</label>
                    <input
                      type="text"
                      value={processingRef}
                      onChange={(e) => setProcessingRef(e.target.value)}
                      placeholder="Reference shared by the embassy"
                      className="w-full h-9 px-3 rounded-lg border border-primary/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-primary block mb-1">Embassy Name</label>
                    <input
                      type="text"
                      value={embassyName}
                      onChange={(e) => setEmbassyName(e.target.value)}
                      placeholder="e.g. Embassy of Japan, New Delhi"
                      className="w-full h-9 px-3 rounded-lg border border-primary/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-primary block mb-1">Submission Date</label>
                    <input
                      type="date"
                      value={submissionDate}
                      onChange={(e) => setSubmissionDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-primary/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-primary block mb-1">Expected Date</label>
                    <input
                      type="date"
                      value={expectedDate}
                      onChange={(e) => setExpectedDate(e.target.value)}
                      className="w-full h-9 px-3 rounded-lg border border-primary/30 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-card text-foreground"
                    />
                  </div>
                  <Button size="sm" className="w-full" onClick={handleSaveVisaSubmission} disabled={processing}>
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Visa Submission'}
                  </Button>
                </div>
              )}

              {/* Visa upload for visa_approved */}
              {application.status === 'visa_approved' && (
                <div className="p-3 bg-success/10 rounded-xl border border-success/20 space-y-2">
                  <p className="text-xs font-semibold text-success">Upload Approved Visa Document</p>
                  <p className="text-xs text-success/80">Upload the PDF to deliver it to the applicant.</p>
                  <input type="file" id="visaUpload" accept=".pdf" className="hidden"
                    onChange={(e) => { const file = e.target.files?.[0]; if (file) handleVisaUpload(file); }} />
                  <Button className="w-full bg-success text-success-foreground hover:bg-success/90" size="sm"
                    onClick={() => document.getElementById('visaUpload')?.click()} disabled={processing}>
                    <Upload className="w-3.5 h-3.5 mr-2" />
                    {processing ? 'Uploading...' : 'Upload Visa PDF'}
                  </Button>
                  {visaFile && (
                    <a href={visaFile.url} target="_blank" rel="noopener noreferrer"
                      className="text-success text-xs hover:underline flex items-center gap-1">
                      <ExternalLink className="w-3 h-3" /> View current visa file
                    </a>
                  )}
                </div>
              )}

              {/* Visa delivered info */}
              {visaFile && application.status === 'visa_delivered' && (
                <div className="p-3 bg-success/10 rounded-xl border border-success/20">
                  <p className="font-semibold text-success text-sm mb-1">Visa Delivered</p>
                  <a href={visaFile.url} target="_blank" rel="noopener noreferrer"
                    className="text-success text-xs hover:underline flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> View delivered visa
                  </a>
                </div>
              )}

              {/* Download Receipt */}
              <Button variant="outline" className="w-full" onClick={handleDownloadReceipt} disabled={downloadingReceipt}>
                {downloadingReceipt
                  ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  : <Receipt className="w-4 h-4 mr-2" />}
                Download Payment Receipt
              </Button>

              <div className="border-t border-border pt-3 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Update Status</p>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full h-9 px-2 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {statusOptions.map((s) => (
                      <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                    ))}
                  </select>
                </div>
                {newStatus === 'visa_rejected' && (
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1">Rejection Reason</label>
                    <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} rows={2}
                      className="w-full px-2 py-1.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                  </div>
                )}
                {newStatus === 'visa_processing' && application.status !== 'visa_processing' && (
                  <p className="text-xs text-primary bg-accent rounded-lg px-2 py-1.5">
                    After saving, enter the embassy reference, name and submission date in the Visa Submission box above.
                  </p>
                )}
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1">Admin Notes (internal)</label>
                  <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2}
                    className="w-full px-2 py-1.5 rounded-lg border border-input bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                </div>
                <Button className="w-full" onClick={handleStatusUpdate} disabled={processing}>
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update Status'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cash Payment Override */}
          {['payment_pending', 'submitted'].includes(application.status) && (
            <Card className="border-warning/30">
              <div className="p-4 border-b border-warning/20 bg-warning/10">
                <h3 className="font-semibold text-warning">Cash Payment Override</h3>
                <p className="text-xs text-warning/80 mt-0.5">Mark as paid if user paid in cash</p>
              </div>
              <CardContent className="p-4 space-y-3">
                <textarea id="cashNote" rows={2} placeholder="Note (e.g. 'Cash received at office')"
                  className="w-full px-2 py-1.5 rounded-lg border border-input bg-card text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-warning resize-none" />
                <Button className="w-full bg-warning text-warning-foreground hover:bg-warning/90"
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
                  disabled={processing}>
                  {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Mark as Paid (Cash)'}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
