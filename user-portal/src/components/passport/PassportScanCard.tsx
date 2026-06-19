'use client';
import { useRef, useState, useCallback } from 'react';
import { Camera, Check, X, Upload, FileText, Loader2, ScanLine } from 'lucide-react';
import { scanPassport } from '@/lib/api';

// Fixed Passport Details schema. Field keys match the OCR output labels exactly,
// so extracted values map straight into the form.
export const PASSPORT_FRONT_FIELDS = [
  'Passport No.', 'Surname', 'Given Name(s)', 'Nationality', 'Date of Birth',
  'Sex', 'Place of Birth', 'Place of Issue', 'Date of Issue', 'Date of Expiry',
];
export const PASSPORT_BACK_FIELDS = ['Father / Legal Guardian', 'Mother', 'Spouse', 'Address'];
export const PASSPORT_FIELDS = [...PASSPORT_FRONT_FIELDS, ...PASSPORT_BACK_FIELDS];

interface Props {
  requirementName: string;
  // 'pair' shows front+back; 'front'/'back' show a single side (separate doc types).
  mode?: 'pair' | 'front' | 'back';
  frontFile: File | null;
  backFile: File | null;
  values: Record<string, string>;
  onFrontChange: (file: File | null) => void;
  onBackChange: (file: File | null) => void;
  onValuesChange: (values: Record<string, string>) => void;
}

interface SideProps {
  side: 'front' | 'back';
  file: File | null;
  preview: string | null;
  scanning: boolean;
  dragging: boolean;
  onPick: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onClear: () => void;
}

function SideCard({ side, file, preview, scanning, dragging, onPick, onDrop, onDragOver, onDragLeave, onClear }: SideProps) {
  const isFront = side === 'front';
  const hasFile = !!file;
  return (
    <div
      className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
        hasFile ? 'border-green-300 bg-green-50' : dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 bg-slate-50 hover:border-blue-300'
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="px-3 py-2 flex items-center justify-between" style={{ background: isFront ? 'linear-gradient(135deg,#0f2d6b,#1a3a8f)' : 'linear-gradient(135deg,#111e42,#1a2a5c)' }}>
        <span style={{ color: 'rgba(212,175,55,0.9)', fontSize: 9, fontWeight: 700, letterSpacing: '0.28em' }}>
          {isFront ? 'PASSPORT FRONT' : 'PASSPORT BACK'}
        </span>
        {hasFile && !scanning && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center"><Check style={{ width: 9, height: 9, color: 'white' }} /></div>
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500 transition-colors">
              <X style={{ width: 9, height: 9, color: 'rgba(255,255,255,0.8)' }} />
            </button>
          </div>
        )}
        {scanning && <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />}
      </div>

      <div className="flex flex-col items-center justify-center p-3 cursor-pointer" style={{ minHeight: 150 }} onClick={onPick}>
        {preview ? (
          <div className="relative w-full h-36 rounded-lg overflow-hidden border border-green-200">
            <img src={preview} alt={`Passport ${side}`} className="w-full h-full object-cover" />
            {scanning && (
              <div className="absolute inset-0 bg-blue-900/40 flex flex-col items-center justify-center gap-1 text-white">
                <ScanLine className="w-5 h-5 animate-pulse" />
                <span className="text-[10px] font-semibold">Reading…</span>
              </div>
            )}
          </div>
        ) : hasFile ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-10 h-10 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center"><FileText className="w-5 h-5 text-green-600" /></div>
            <p className="text-[11px] font-semibold text-green-700 max-w-[140px] truncate">{file!.name}</p>
            <p className="text-[10px] text-green-500">PDF — fill the details manually</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className={`w-10 h-10 rounded-xl border-2 border-dashed flex items-center justify-center ${dragging ? 'border-blue-400 bg-blue-100' : 'border-slate-300 bg-white'}`}>
              <Camera className={`w-5 h-5 ${dragging ? 'text-blue-500' : 'text-slate-400'}`} />
            </div>
            <p className="text-[11px] font-semibold text-slate-600">{isFront ? 'Bio-data page' : 'Back / address page'}</p>
            <p className="text-[10px] text-slate-400">Click or drag & drop</p>
          </div>
        )}
      </div>

      <div className="px-3 pb-3">
        <button onClick={onPick} className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold border transition-all"
          style={{ background: hasFile ? 'rgba(255,255,255,0.8)' : undefined, borderColor: hasFile ? '#86efac' : '#e2e8f0', color: hasFile ? '#15803d' : '#64748b' }}>
          <Upload className="w-3 h-3" />{hasFile ? 'Replace' : 'Upload'}
        </button>
      </div>
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 flex items-center justify-center text-center min-h-[150px]">
      <p className="text-xs text-slate-400 max-w-[220px]">{text}</p>
    </div>
  );
}

export default function PassportScanCard({ requirementName, mode = 'pair', frontFile, backFile, values, onFrontChange, onBackChange, onValuesChange }: Props) {
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState<'front' | 'back' | null>(null);
  const [dragging, setDragging] = useState<'front' | 'back' | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef = useRef<HTMLInputElement>(null);

  const readPreview = (file: File, set: (url: string | null) => void) => {
    if (file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = (e) => set(e.target?.result as string);
      r.readAsDataURL(file);
    } else set(null);
  };

  // Upload a side, then OCR it and fill any blank fields (never clobber edits).
  const handleFile = useCallback(async (side: 'front' | 'back', file: File) => {
    side === 'front' ? onFrontChange(file) : onBackChange(file);
    readPreview(file, side === 'front' ? setFrontPreview : setBackPreview);
    if (!file.type.startsWith('image/')) return; // PDFs can't be auto-read

    setScanning(side);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('side', side);
      const r = await scanPassport(fd);
      const fields: Record<string, string> = r.data?.data?.fields || {};
      const merged = { ...values };
      let added = false;
      for (const [k, v] of Object.entries(fields)) {
        if (v && !merged[k]?.trim()) { merged[k] = v; added = true; }
      }
      if (added) onValuesChange(merged);
    } catch {
      /* extraction is best-effort; the user can still type the details */
    } finally {
      setScanning(null);
    }
  }, [values, onFrontChange, onBackChange, onValuesChange]);

  const clear = (side: 'front' | 'back') => {
    side === 'front' ? (onFrontChange(null), setFrontPreview(null)) : (onBackChange(null), setBackPreview(null));
  };

  const setField = (key: string, val: string) => onValuesChange({ ...values, [key]: val });

  const isComplete = mode === 'pair' ? (!!frontFile && !!backFile) : mode === 'front' ? !!frontFile : !!backFile;
  const frontFilled = PASSPORT_FRONT_FIELDS.filter((k) => values[k]?.trim()).length;
  const backFilled = PASSPORT_BACK_FIELDS.filter((k) => values[k]?.trim()).length;

  const renderInput = (k: string) => (
    <div key={k}>
      <label className="text-[10px] font-medium text-slate-500">{k}</label>
      <input
        value={values[k] || ''}
        onChange={(e) => setField(k, e.target.value)}
        placeholder={scanning ? 'Reading…' : '—'}
        className="mt-0.5 w-full h-8 px-2 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${isComplete ? 'border-green-200 bg-green-50/40' : 'border-slate-200 bg-white'}`}>
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isComplete ? 'bg-green-100' : 'bg-slate-100'}`}>
          {isComplete ? <Check className="w-4 h-4 text-green-600" /> : <FileText className="w-4 h-4 text-slate-400" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900">{requirementName}<span className="text-red-500 ml-1">*</span></p>
          <p className="text-xs text-slate-400 mt-0.5">Upload each side — the details are read automatically and shown beside the image. Review and edit anything that looks off.</p>
        </div>
      </div>

      {/* Front page: preview | bio-data fields (revealed once uploaded) */}
      {mode !== 'back' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        <SideCard
          side="front" file={frontFile} preview={frontPreview} scanning={scanning === 'front'} dragging={dragging === 'front'}
          onPick={() => frontRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); setDragging(null); const f = e.dataTransfer.files[0]; if (f) handleFile('front', f); }}
          onDragOver={(e) => { e.preventDefault(); setDragging('front'); }}
          onDragLeave={() => setDragging(null)}
          onClear={() => clear('front')}
        />
        {frontFile ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700">Passport Details — Front</p>
              <span className="text-[10px] text-slate-400">{frontFilled}/{PASSPORT_FRONT_FIELDS.length} filled</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
              {PASSPORT_FRONT_FIELDS.map(renderInput)}
            </div>
          </div>
        ) : (
          <EmptyHint text="Upload the passport front (bio-data) page to auto-fill these details." />
        )}
      </div>
      )}

      {/* Back page: preview | family & address fields */}
      {mode !== 'front' && (
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-4 items-start ${mode === 'pair' ? 'mt-4' : ''}`}>
        <SideCard
          side="back" file={backFile} preview={backPreview} scanning={scanning === 'back'} dragging={dragging === 'back'}
          onPick={() => backRef.current?.click()}
          onDrop={(e) => { e.preventDefault(); setDragging(null); const f = e.dataTransfer.files[0]; if (f) handleFile('back', f); }}
          onDragOver={(e) => { e.preventDefault(); setDragging('back'); }}
          onDragLeave={() => setDragging(null)}
          onClear={() => clear('back')}
        />
        {backFile ? (
          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-bold text-slate-700">Passport Details — Back</p>
              <span className="text-[10px] text-slate-400">{backFilled}/{PASSPORT_BACK_FIELDS.length} filled</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5">
              {['Father / Legal Guardian', 'Mother', 'Spouse'].map(renderInput)}
            </div>
            <div className="mt-2.5">
              <label className="text-[10px] font-medium text-slate-500">Address</label>
              <textarea
                value={values['Address'] || ''}
                onChange={(e) => setField('Address', e.target.value)}
                rows={2}
                placeholder={scanning ? 'Reading…' : '—'}
                className="mt-0.5 w-full px-2 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </div>
        ) : (
          <EmptyHint text="Upload the passport back page to auto-fill family details and address." />
        )}
      </div>
      )}

      <input ref={frontRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile('front', f); e.target.value = ''; }} />
      <input ref={backRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile('back', f); e.target.value = ''; }} />
    </div>
  );
}
