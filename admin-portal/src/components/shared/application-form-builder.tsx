'use client';
import { useState } from 'react';
import { Plus, X, ChevronUp, ChevronDown, TextCursorInput, Paperclip, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OptionListEditor } from './option-list-editor';
import { ApplicantTypeSelector } from './applicant-type-selector';
import { DOC_TYPE_OPTIONS, mergeFormItems, toFieldName } from '@/types';
import type { FormField, FormItem, DocumentRequirement, DocumentType, FieldType } from '@/types';

const FIELD_TYPES: FieldType[] = ['text', 'number', 'email', 'date', 'select', 'radio', 'textarea'];
const isOcrDocType = (t: string) => t === 'passport_front' || t === 'passport_back';

const emptyField = (): FormField => ({ label: '', fieldName: '', type: 'text', required: false, options: [], placeholder: '', order: 0, applicantType: 'adult' });
const emptyDoc = (): DocumentRequirement => ({ name: '', description: '', required: true, applicantType: 'adult', docType: 'custom', ocrEnabled: false, order: 0 });

interface ApplicationFormBuilderProps {
  fields: FormField[];
  docs: DocumentRequirement[];
  onChange: (next: { formFields: FormField[]; documentRequirements: DocumentRequirement[] }) => void;
}

/**
 * The single "Application Form" builder — shared by the Visa Types and Form Presets
 * pages. Questions and document uploads are one interleaved list here, so an admin can
 * put Passport Front, Passport Back, Phone Number, PAN Card in exactly that order.
 *
 * The two shapes stay in separate arrays on the way out because they have different
 * lifecycles downstream (a field's answer is a string on the application; a document is
 * an upload with review + OCR). Only the ordering is shared, via `order`.
 */
export function ApplicationFormBuilder({ fields, docs, onChange }: ApplicationFormBuilderProps) {
  const items = mergeFormItems(fields, docs);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // Single source of truth for ordering: position in the merged list *is* the order,
  // rewritten on every edit so the two arrays always agree about the sequence.
  const commit = (next: FormItem[]) =>
    onChange({
      formFields: next.flatMap((it, i) => (it.kind === 'field' ? [{ ...it.field, order: i }] : [])),
      documentRequirements: next.flatMap((it, i) => (it.kind === 'document' ? [{ ...it.doc, order: i }] : [])),
    });

  const addField = () => commit([...items, { kind: 'field', order: items.length, field: emptyField() }]);
  const addDoc = () => commit([...items, { kind: 'document', order: items.length, doc: emptyDoc() }]);
  const remove = (i: number) => commit(items.filter((_, idx) => idx !== i));

  const move = (i: number, dir: -1 | 1) => {
    const target = i + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[i], next[target]] = [next[target], next[i]];
    commit(next);
  };

  /** Lifts the row out of `from` and reinserts it at `to` — the rest closes the gap. */
  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    commit(next);
  };

  const handleDrop = (target: number) => {
    if (dragIndex !== null) reorder(dragIndex, target);
    setDragIndex(null);
    setDropIndex(null);
  };

  const updateField = (i: number, key: keyof FormField, value: unknown) =>
    commit(items.map((it, idx) => (idx === i && it.kind === 'field' ? { ...it, field: { ...it.field, [key]: value } } : it)));

  // fieldName is the storage key, not something an admin should have to think about:
  // keep it in step with the label until they deliberately type their own.
  const updateFieldLabel = (i: number, label: string) =>
    commit(items.map((it, idx) => {
      if (idx !== i || it.kind !== 'field') return it;
      const autoNamed = !it.field.fieldName || it.field.fieldName === toFieldName(it.field.label);
      return { ...it, field: { ...it.field, label, fieldName: autoNamed ? toFieldName(label) : it.field.fieldName } };
    }));

  const updateDoc = (i: number, key: keyof DocumentRequirement, value: unknown) =>
    commit(items.map((it, idx) => (idx === i && it.kind === 'document' ? { ...it, doc: { ...it.doc, [key]: value } } : it)));

  // Changing the type pre-fills the document name (unless the admin already typed a custom one).
  const updateDocType = (i: number, value: DocumentType) =>
    commit(items.map((it, idx) => {
      if (idx !== i || it.kind !== 'document') return it;
      const d = it.doc;
      const opt = DOC_TYPE_OPTIONS.find((o) => o.value === value);
      const prevDefault = DOC_TYPE_OPTIONS.find((o) => o.value === (d.docType || 'custom'))?.defaultName;
      const name = !d.name.trim() || d.name === prevDefault ? opt?.defaultName ?? d.name : d.name;
      return { ...it, doc: { ...d, docType: value, name, ocrEnabled: isOcrDocType(value) } };
    }));

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div>
          <h4 className="font-semibold text-foreground text-sm">Application Form</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
              Questions and document uploads in one list — applicants see them in this exact order.
            Drag a row by its handle, or use the arrows, to rearrange.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={addField}>
            <Plus className="w-3.5 h-3.5 mr-1" />Add Field
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={addDoc}>
            <Plus className="w-3.5 h-3.5 mr-1" />Add Document
          </Button>
        </div>
      </div>

      {items.length === 0 && (
        <p className="text-xs text-muted-foreground mb-2">
          Nothing yet. Add the questions applicants answer and the documents they upload — in any order.
        </p>
      )}
      {items.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2">
          Use <span className="font-medium">Applies to</span> to control which traveller type sees each row: Adult (default), Child, or Both.
        </p>
      )}

      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            onDragOver={(e) => { if (dragIndex !== null) { e.preventDefault(); setDropIndex(i); } }}
            onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
            className={`p-3 bg-muted/50 rounded-lg border transition-all ${
              dragIndex === i ? 'border-primary opacity-40'
                : dropIndex === i && dragIndex !== null ? 'border-primary border-dashed bg-primary/5'
                : 'border-border'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {/* The row itself isn't draggable — only this handle is — so text inputs
                  inside it stay selectable with the mouse. */}
              <span
                draggable
                onDragStart={(e) => { setDragIndex(i); e.dataTransfer.effectAllowed = 'move'; }}
                onDragEnd={() => { setDragIndex(null); setDropIndex(null); }}
                title="Drag to reorder"
                className="cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground -ml-1 p-0.5 rounded"
              >
                <GripVertical className="w-4 h-4" />
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded ${
                item.kind === 'field' ? 'text-primary bg-primary/10' : 'text-violet-600 bg-violet-500/10'
              }`}>
                {item.kind === 'field' ? <TextCursorInput className="w-2.5 h-2.5" /> : <Paperclip className="w-2.5 h-2.5" />}
                {item.kind === 'field' ? 'Field' : 'Document'}
              </span>
              <span className="text-xs font-semibold text-muted-foreground tabular-nums">#{i + 1}</span>
              <div className="ml-auto flex items-center gap-0.5">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up"
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent">
                  <ChevronUp className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down"
                  className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent disabled:opacity-30 disabled:hover:bg-transparent">
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                <button type="button" onClick={() => remove(i)} aria-label="Remove"
                  className="p-1 rounded text-destructive/70 hover:text-destructive hover:bg-destructive/10">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {item.kind === 'field' ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Label</label>
                    <Input className="mt-0.5 h-8 text-xs" placeholder="e.g. Phone Number" value={item.field.label} onChange={(e) => updateFieldLabel(i, e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground" title="Auto-filled from the label — only change it if you need a specific key">Field Name</label>
                    <Input className="mt-0.5 h-8 text-xs" placeholder={toFieldName(item.field.label) || 'auto'} value={item.field.fieldName} onChange={(e) => updateField(i, 'fieldName', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Type</label>
                    <select value={item.field.type} onChange={(e) => updateField(i, 'type', e.target.value)}
                      className="mt-0.5 w-full h-8 px-2 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                      {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Placeholder</label>
                    <Input className="mt-0.5 h-8 text-xs" placeholder="Hint text" value={item.field.placeholder} onChange={(e) => updateField(i, 'placeholder', e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={item.field.required} onChange={(e) => updateField(i, 'required', e.target.checked)} className="rounded" />
                    Required
                  </label>
                  <ApplicantTypeSelector value={item.field.applicantType} onChange={(v) => updateField(i, 'applicantType', v)} />
                </div>
                {(item.field.type === 'select' || item.field.type === 'radio') && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground font-medium mb-1">Selection Options</p>
                    <OptionListEditor options={item.field.options} onChange={(opts) => updateField(i, 'options', opts)} />
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Type</label>
                    <select value={item.doc.docType || 'custom'} onChange={(e) => updateDocType(i, e.target.value as DocumentType)}
                      className="mt-0.5 w-full h-8 px-2 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                      {DOC_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Name</label>
                    <Input className="mt-0.5 h-8 text-xs" placeholder="Document name" value={item.doc.name} onChange={(e) => updateDoc(i, 'name', e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground">Description</label>
                    <Input className="mt-0.5 h-8 text-xs" placeholder="Optional" value={item.doc.description} onChange={(e) => updateDoc(i, 'description', e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={item.doc.required} onChange={(e) => updateDoc(i, 'required', e.target.checked)} className="rounded" />
                    Required
                  </label>
                  <ApplicantTypeSelector value={item.doc.applicantType} onChange={(v) => updateDoc(i, 'applicantType', v)} />
                  {isOcrDocType(item.doc.docType || 'custom') && (
                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer" title="Run OCR to auto-extract details when applicant uploads this document">
                      <input type="checkbox" checked={item.doc.ocrEnabled !== false} onChange={(e) => updateDoc(i, 'ocrEnabled', e.target.checked)} className="rounded" />
                      OCR extraction
                    </label>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
