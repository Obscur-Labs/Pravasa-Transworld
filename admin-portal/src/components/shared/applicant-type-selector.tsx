import type { ApplicantType } from '@/types';

export const APPLICANT_OPTS: { value: ApplicantType; label: string; active: string }[] = [
  { value: 'adult', label: 'Adult', active: 'bg-primary text-primary-foreground' },
  { value: 'both', label: 'Both', active: 'bg-violet-600 text-white' },
  { value: 'child', label: 'Child', active: 'bg-emerald-600 text-white' },
];

// The "Applies to: Adult / Both / Child" 3-way selector, shared by the form-field and
// document-requirement editors (Visa Types + Form Presets pages).
export function ApplicantTypeSelector({ value, onChange }: { value: ApplicantType | undefined; onChange: (v: ApplicantType) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Applies to:</span>
      <div className="flex rounded-md border border-border overflow-hidden text-[11px] font-semibold">
        {APPLICANT_OPTS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`px-2.5 py-1 transition-colors ${(value || 'adult') === opt.value ? opt.active : 'bg-card text-muted-foreground hover:bg-muted'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
