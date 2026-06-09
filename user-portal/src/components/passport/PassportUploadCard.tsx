'use client';
import { useRef, useState, useCallback } from 'react';
import { Camera, Check, X, Upload, FileText } from 'lucide-react';

interface Props {
  requirementName: string;
  frontFile: File | null;
  backFile: File | null;
  onFrontChange: (file: File | null) => void;
  onBackChange: (file: File | null) => void;
}

interface SideCardProps {
  side: 'front' | 'back';
  file: File | null;
  preview: string | null;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onUploadClick: () => void;
  onClear: () => void;
}

function PassportSideCard({ side, file, preview, dragging, onDragOver, onDragLeave, onDrop, onUploadClick, onClear }: SideCardProps) {
  const isFront = side === 'front';
  const hasFile = !!file;

  return (
    <div
      className={`relative flex-1 rounded-2xl overflow-hidden border-2 transition-all ${
        hasFile
          ? 'border-green-300 bg-green-50'
          : dragging
          ? 'border-blue-400 bg-blue-50'
          : 'border-slate-200 bg-slate-50 hover:border-blue-300'
      }`}
      style={{ minHeight: 200 }}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Passport-themed header bar */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{
          background: isFront
            ? 'linear-gradient(135deg,#0f2d6b 0%,#1a3a8f 100%)'
            : 'linear-gradient(135deg,#111e42 0%,#1a2a5c 100%)',
        }}
      >
        <span style={{ color: 'rgba(212,175,55,0.9)', fontSize: 9, fontWeight: 700, letterSpacing: '0.28em' }}>
          {isFront ? 'FRONT' : 'BACK'}
        </span>
        {hasFile && (
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shadow-sm">
              <Check style={{ width: 9, height: 9, color: 'white' }} />
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center hover:bg-red-500 transition-colors"
            >
              <X style={{ width: 9, height: 9, color: 'rgba(255,255,255,0.8)' }} />
            </button>
          </div>
        )}
      </div>

      {/* Upload / preview area */}
      <div
        className="flex flex-col items-center justify-center p-4 cursor-pointer"
        style={{ minHeight: 148 }}
        onClick={onUploadClick}
      >
        {preview ? (
          <div className="w-full h-32 rounded-lg overflow-hidden border border-green-200">
            <img src={preview} alt={`Passport ${side}`} className="w-full h-full object-cover" />
          </div>
        ) : hasFile ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-xl bg-green-100 border border-green-200 flex items-center justify-center">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-xs font-semibold text-green-700 max-w-[120px] truncate">{file.name}</p>
            <p className="text-[10px] text-green-500">PDF uploaded</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`w-12 h-12 rounded-xl border-2 border-dashed flex items-center justify-center transition-all ${
              dragging ? 'border-blue-400 bg-blue-100' : 'border-slate-300 bg-white'
            }`}>
              <Camera className={`w-6 h-6 ${dragging ? 'text-blue-500' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">
                {isFront ? 'Bio-data page' : 'Back / MRZ page'}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">Click or drag & drop</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className="px-3 pb-3">
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all border"
          style={{
            background: hasFile ? 'rgba(255,255,255,0.8)' : undefined,
            borderColor: hasFile ? '#86efac' : '#e2e8f0',
            color: hasFile ? '#15803d' : '#64748b',
          }}
        >
          <Upload className="w-3 h-3" />
          {hasFile ? 'Replace' : 'Upload'}
        </button>
      </div>
    </div>
  );
}

export default function PassportUploadCard({ requirementName, frontFile, backFile, onFrontChange, onBackChange }: Props) {
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState<'front' | 'back' | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef  = useRef<HTMLInputElement>(null);

  const readFile = (file: File, set: (url: string | null) => void) => {
    if (file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = (e) => set(e.target?.result as string);
      r.readAsDataURL(file);
    } else {
      set(null);
    }
  };

  const handleFront = useCallback((file: File) => {
    onFrontChange(file);
    readFile(file, setFrontPreview);
  }, [onFrontChange]);

  const handleBack = useCallback((file: File) => {
    onBackChange(file);
    readFile(file, setBackPreview);
  }, [onBackChange]);

  const clearFront = () => { onFrontChange(null); setFrontPreview(null); };
  const clearBack  = () => { onBackChange(null); setBackPreview(null); };

  const isComplete = !!frontFile && !!backFile;

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${isComplete ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isComplete ? 'bg-green-100' : 'bg-slate-100'}`}>
          {isComplete ? <Check className="w-4 h-4 text-green-600" /> : <FileText className="w-4 h-4 text-slate-400" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {requirementName}
            <span className="text-red-500 ml-1">*</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload a clear scan of both sides of your passport.
          </p>
        </div>
      </div>

      {/* Two side-by-side cards */}
      <div className="flex gap-3">
        <PassportSideCard
          side="front"
          file={frontFile}
          preview={frontPreview}
          dragging={dragging === 'front'}
          onDragOver={(e) => { e.preventDefault(); setDragging('front'); }}
          onDragLeave={() => setDragging(null)}
          onDrop={(e) => { e.preventDefault(); setDragging(null); const f = e.dataTransfer.files[0]; if (f) handleFront(f); }}
          onUploadClick={() => frontRef.current?.click()}
          onClear={clearFront}
        />
        <PassportSideCard
          side="back"
          file={backFile}
          preview={backPreview}
          dragging={dragging === 'back'}
          onDragOver={(e) => { e.preventDefault(); setDragging('back'); }}
          onDragLeave={() => setDragging(null)}
          onDrop={(e) => { e.preventDefault(); setDragging(null); const f = e.dataTransfer.files[0]; if (f) handleBack(f); }}
          onUploadClick={() => backRef.current?.click()}
          onClear={clearBack}
        />
      </div>

      {/* Progress indicator */}
      {(frontFile || backFile) && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-green-500 transition-all duration-500"
              style={{ width: frontFile && backFile ? '100%' : '50%' }}
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {frontFile && backFile ? '2/2 pages' : '1/2 pages'}
          </span>
        </div>
      )}

      {/* Hidden inputs */}
      <input
        ref={frontRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFront(f); e.target.value = ''; }}
      />
      <input
        ref={backRef} type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleBack(f); e.target.value = ''; }}
      />
    </div>
  );
}
