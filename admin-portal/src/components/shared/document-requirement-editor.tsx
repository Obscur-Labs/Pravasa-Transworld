'use client';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApplicantTypeSelector } from './applicant-type-selector';
import { DOC_TYPE_OPTIONS } from '@/types';
import type { DocumentRequirement, DocumentType } from '@/types';

const isOcrDocType = (t: string) => t === 'passport_front' || t === 'passport_back';

interface DocumentRequirementEditorProps {
  docs: DocumentRequirement[];
  onAdd: () => void;
  onUpdate: (i: number, key: keyof DocumentRequirement, value: any) => void;
  onUpdateType: (i: number, value: DocumentType) => void;
  onRemove: (i: number) => void;
}

// The dynamic "Document Requirements" editor — shared by the Visa Types and
// Form Presets pages, which both build the same DocumentRequirement[] shape.
export function DocumentRequirementEditor({ docs, onAdd, onUpdate, onUpdateType, onRemove }: DocumentRequirementEditorProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-foreground text-sm">Document Requirements</h4>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}><Plus className="w-3.5 h-3.5 mr-1" />Add Document</Button>
      </div>
      <div className="space-y-2">
        {docs.map((doc, i) => (
          <div key={i} className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <select value={doc.docType || 'custom'} onChange={(e) => onUpdateType(i, e.target.value as DocumentType)}
                  className="mt-0.5 w-full h-8 px-2 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                  {DOC_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Name</label>
                <Input className="mt-0.5 h-8 text-xs" placeholder="Document name" value={doc.name} onChange={(e) => onUpdate(i, 'name', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description</label>
                <Input className="mt-0.5 h-8 text-xs" placeholder="Optional" value={doc.description} onChange={(e) => onUpdate(i, 'description', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={doc.required} onChange={(e) => onUpdate(i, 'required', e.target.checked)} className="rounded" />
                Required
              </label>
              <ApplicantTypeSelector value={doc.applicantType} onChange={(v) => onUpdate(i, 'applicantType', v)} />
              {isOcrDocType(doc.docType || 'custom') && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer" title="Run OCR to auto-extract details when applicant uploads this document">
                  <input type="checkbox" checked={doc.ocrEnabled !== false} onChange={(e) => onUpdate(i, 'ocrEnabled', e.target.checked)} className="rounded" />
                  OCR extraction
                </label>
              )}
              <button type="button" onClick={() => onRemove(i)} className="text-destructive/70 hover:text-destructive ml-auto"><X className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
