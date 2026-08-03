'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Mail, Paperclip, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import { getEmbassyMailDraft, sendEmbassyMail } from '@/lib/api';
import type { EmbassyMailDraft } from '@/types';

interface EmbassyMailDialogProps {
  applicationId: string;
  applicationRef: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fired after a successful send, so the caller can refresh its history. */
  onSent?: () => void;
}

/**
 * Composes the covering mail that forwards an application to an embassy or agency.
 *
 * The draft arrives already written from the saved format (Embassy Mail Config) with
 * this application's answers filled in — the admin's job is to check it, pick which
 * documents ride along, and confirm. Everything stays editable right up to the send,
 * because one mission always wants something phrased its own way.
 */
export function EmbassyMailDialog({
  applicationId, applicationRef, open, onOpenChange, onSent,
}: EmbassyMailDialogProps) {
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState<EmbassyMailDraft | null>(null);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selected, setSelected] = useState<string[]>([]);

  // Reload every time it opens — documents get approved and templates get edited
  // between one send and the next.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setConfirming(false);
    getEmbassyMailDraft(applicationId)
      .then((r) => {
        const d = r.data.data as EmbassyMailDraft;
        setDraft(d);
        setTo(d.to);
        setCc(d.cc);
        setSubject(d.subject);
        setBody(d.body);
        setSelected(d.documents.filter((doc) => doc.selected).map((doc) => doc._id));
      })
      .catch(() => toast({ title: 'Could not open the composer', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [open, applicationId]);

  const toggleDoc = (id: string) => {
    setConfirming(false);
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSend = async () => {
    setSending(true);
    try {
      await sendEmbassyMail(applicationId, { to: to.trim(), cc, subject, body, documentIds: selected });
      toast({ title: `Mail sent to ${to.trim()}`, variant: 'success' });
      onOpenChange(false);
      onSent?.();
    } catch (err: any) {
      toast({
        title: 'Mail not sent',
        description: err.response?.data?.message || 'Something went wrong — nothing was delivered.',
        variant: 'destructive',
      });
      setConfirming(false);
    } finally {
      setSending(false);
    }
  };

  const rejectedSelected = (draft?.documents || []).filter(
    (d) => d.status === 'rejected' && selected.includes(d._id),
  ).length;
  const canSend = !!to.trim() && !!subject.trim() && !!body.trim();

  // The message was written listing the documents that were ticked when it loaded. Once
  // that set changes, the list in the text no longer matches what will actually be
  // attached — the body is the admin's to fix, so say so rather than rewriting it.
  const initialSelection = (draft?.documents || []).filter((d) => d.selected).map((d) => d._id);
  const selectionChanged =
    initialSelection.length !== selected.length || initialSelection.some((id) => !selected.includes(id));

  return (
    <Dialog open={open} onOpenChange={(v) => !sending && onOpenChange(v)}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            Send to Embassy / Agency
          </DialogTitle>
          <DialogDescription>
            Application <span className="font-mono">{applicationRef}</span> — drafted from your saved format.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="px-6 pb-6 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            <Skeleton className="h-48 w-full" />
          </div>
        ) : (
          <>
            <div className="px-6 pb-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="embassy-to">To</Label>
                  <Input
                    id="embassy-to"
                    type="email"
                    className="mt-1"
                    placeholder="visa@embassy.example"
                    value={to}
                    onChange={(e) => { setTo(e.target.value); setConfirming(false); }}
                  />
                </div>
                <div>
                  <Label htmlFor="embassy-cc">Cc <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input
                    id="embassy-cc"
                    className="mt-1"
                    placeholder="Comma-separated"
                    value={cc}
                    onChange={(e) => { setCc(e.target.value); setConfirming(false); }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="embassy-subject">Subject</Label>
                <Input
                  id="embassy-subject"
                  className="mt-1"
                  value={subject}
                  onChange={(e) => { setSubject(e.target.value); setConfirming(false); }}
                />
              </div>

              <div>
                <Label htmlFor="embassy-body">Message</Label>
                <textarea
                  id="embassy-body"
                  rows={16}
                  value={body}
                  onChange={(e) => { setBody(e.target.value); setConfirming(false); }}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-[13px] font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Sent exactly as written — line breaks and spacing are preserved.
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <Label className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5" /> Attachments
                  </Label>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    {selected.length} of {draft?.documents.length || 0} selected
                  </span>
                </div>

                {draft?.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-3">
                    This application has no uploaded documents to attach.
                  </p>
                ) : (
                  <div className="rounded-xl border border-border divide-y divide-border max-h-56 overflow-y-auto">
                    {draft?.documents.map((doc) => (
                      <label key={doc._id} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/50">
                        <input
                          type="checkbox"
                          checked={selected.includes(doc._id)}
                          onChange={() => toggleDoc(doc._id)}
                          className="w-4 h-4 rounded border-input accent-primary flex-shrink-0"
                        />
                        <span className="text-sm text-foreground flex-1 min-w-0 truncate">{doc.requirementName}</span>
                        <Badge variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'destructive' : 'warning'}>
                          {doc.status === 'approved' ? 'Approved' : doc.status === 'rejected' ? 'Rejected' : 'Pending'}
                        </Badge>
                      </label>
                    ))}
                  </div>
                )}

                {selectionChanged && (
                  <p className="text-xs text-warning mt-2 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                    You changed the selection — the document list written in the message above no longer
                    matches it. Edit the message if the embassy should see the correct list.
                  </p>
                )}

                {rejectedSelected > 0 && (
                  <p className="text-xs text-destructive mt-2 flex items-start gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-px" />
                    {rejectedSelected} rejected document(s) are selected — the embassy will receive the version you turned down.
                  </p>
                )}
              </div>
            </div>

            {/* Confirmation lives in the footer: the draft stays on screen while it is
                being confirmed, so the last thing checked is the mail itself. */}
            <div className="border-t border-border px-6 py-4">
              {confirming ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground">
                    Send this to <span className="font-semibold">{to.trim()}</span>
                    {cc.trim() ? <> (cc <span className="font-semibold">{cc.trim()}</span>)</> : null} with{' '}
                    <span className="font-semibold">{selected.length} attachment{selected.length === 1 ? '' : 's'}</span>?
                    This cannot be recalled.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setConfirming(false)} disabled={sending}>
                      Back to draft
                    </Button>
                    <Button onClick={handleSend} disabled={sending}>
                      {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                      Yes, send now
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-end gap-2">
                  <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                  <Button onClick={() => setConfirming(true)} disabled={!canSend}>
                    <Send className="w-4 h-4 mr-2" /> Send Mail
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
