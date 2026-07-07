'use client';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OptionListEditor } from './option-list-editor';
import { ApplicantTypeSelector } from './applicant-type-selector';
import type { FormField, FieldType } from '@/types';

const FIELD_TYPES: FieldType[] = ['text', 'number', 'email', 'date', 'select', 'radio', 'textarea', 'file'];

interface FormFieldEditorProps {
  fields: FormField[];
  onAdd: () => void;
  onUpdate: (i: number, key: keyof FormField, value: any) => void;
  onRemove: (i: number) => void;
}

// The dynamic "Application Form Fields" editor — shared by the Visa Types and
// Form Presets pages, which both build the same FormField[] shape.
export function FormFieldEditor({ fields, onAdd, onUpdate, onRemove }: FormFieldEditorProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-foreground text-sm">Application Form Fields</h4>
        <Button type="button" size="sm" variant="outline" onClick={onAdd}><Plus className="w-3.5 h-3.5 mr-1" />Add Field</Button>
      </div>
      {fields.length === 0 && <p className="text-xs text-muted-foreground mb-2">No fields yet. Add the fields applicants should fill.</p>}
      {fields.length > 0 && (
        <p className="text-xs text-muted-foreground mb-2">Use <span className="font-medium">Applies to</span> to control which traveller type sees each field: Adult (default), Child, or Both.</p>
      )}
      <div className="space-y-3">
        {fields.map((field, i) => (
          <div key={i} className="p-3 bg-muted/50 rounded-lg border border-border">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
              <div>
                <label className="text-xs text-muted-foreground">Label</label>
                <Input className="mt-0.5 h-8 text-xs" placeholder="Field label" value={field.label} onChange={(e) => onUpdate(i, 'label', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Field Name</label>
                <Input className="mt-0.5 h-8 text-xs" placeholder="camelCase" value={field.fieldName} onChange={(e) => onUpdate(i, 'fieldName', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <select value={field.type} onChange={(e) => onUpdate(i, 'type', e.target.value)} className="mt-0.5 w-full h-8 px-2 rounded-lg border border-input bg-card text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-ring">
                  {FIELD_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Placeholder</label>
                <Input className="mt-0.5 h-8 text-xs" placeholder="Hint text" value={field.placeholder} onChange={(e) => onUpdate(i, 'placeholder', e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={field.required} onChange={(e) => onUpdate(i, 'required', e.target.checked)} className="rounded" />
                Required
              </label>
              <ApplicantTypeSelector value={field.applicantType} onChange={(v) => onUpdate(i, 'applicantType', v)} />
              <button type="button" onClick={() => onRemove(i)} className="text-destructive/70 hover:text-destructive ml-auto"><X className="w-4 h-4" /></button>
            </div>
            {(field.type === 'select' || field.type === 'radio') && (
              <div className="mt-2 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground font-medium mb-1">Selection Options</p>
                <OptionListEditor options={field.options} onChange={(opts) => onUpdate(i, 'options', opts)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
