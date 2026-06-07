'use client';
import { useRef, useState, useCallback } from 'react';
import { Camera, Check, X, RotateCcw, Upload, FileText } from 'lucide-react';

interface Props {
  requirementName: string;
  frontFile: File | null;
  backFile: File | null;
  onFrontChange: (file: File | null) => void;
  onBackChange: (file: File | null) => void;
}

export default function PassportUploadCard({ requirementName, frontFile, backFile, onFrontChange, onBackChange }: Props) {
  const [flipped, setFlipped]         = useState(false);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [backPreview, setBackPreview]   = useState<string | null>(null);
  const [dragging, setDragging]         = useState<'front' | 'back' | null>(null);
  const frontRef = useRef<HTMLInputElement>(null);
  const backRef  = useRef<HTMLInputElement>(null);

  const readFile = (file: File, set: (url: string | null) => void) => {
    if (file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = (e) => set(e.target?.result as string);
      r.readAsDataURL(file);
    } else {
      set(null); // PDF — no preview
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

  const clearAll = () => {
    onFrontChange(null); onBackChange(null);
    setFrontPreview(null); setBackPreview(null);
  };

  const onDrop = (side: 'front' | 'back') => (e: React.DragEvent) => {
    e.preventDefault(); setDragging(null);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    side === 'front' ? handleFront(file) : handleBack(file);
  };

  const isComplete = !!frontFile && !!backFile;

  // ── Shared passport face style ─────────────────────────────────��──────────
  const faceBase: React.CSSProperties = {
    position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
    borderRadius: 10, overflow: 'hidden',
    boxShadow: '0 24px 64px rgba(0,0,0,0.5), 0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)',
  };

  return (
    <div className={`rounded-xl border-2 p-4 transition-all ${isComplete ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-white'}`}>

      {/* ── Header ── */}
      <div className="flex items-start gap-3 mb-5">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${isComplete ? 'bg-green-100' : 'bg-slate-100'}`}>
          {isComplete ? <Check className="w-4 h-4 text-green-600" /> : <FileText className="w-4 h-4 text-slate-400" />}
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {requirementName}
            <span className="text-red-500 ml-1">*</span>
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Upload a clear scan or photo of your passport — front bio-data page and back machine-readable page.
          </p>
        </div>
      </div>

      {/* ── 3D Passport Model ── */}
      <div className="flex flex-col items-center select-none">

        {/* perspective wrapper */}
        <div style={{ perspective: '1200px', perspectiveOrigin: '50% 40%' }}>
          <div
            style={{
              width: 340, height: 220,
              position: 'relative',
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(-180deg)' : 'rotateY(0deg)',
              transition: 'transform 0.65s cubic-bezier(0.4, 0.0, 0.2, 1)',
              cursor: 'pointer',
            }}
            onClick={() => setFlipped((f) => !f)}
          >

            {/* ════════════ FRONT FACE ════════════ */}
            <div style={{ ...faceBase, background: 'linear-gradient(158deg, #0f2d6b 0%, #1a3a8f 45%, #0c1f50 100%)' }}>

              {/* Diagonal security watermark texture */}
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.06,
                backgroundImage: 'repeating-linear-gradient(55deg, transparent 0px, transparent 6px, rgba(255,255,255,0.8) 6px, rgba(255,255,255,0.8) 7px)',
                pointerEvents: 'none',
              }} />

              {/* Outer gold frame */}
              <div style={{
                position: 'absolute', inset: 7,
                border: '1.5px solid rgba(212,175,55,0.45)',
                borderRadius: 5, pointerEvents: 'none',
              }} />

              {/* Inner gold frame */}
              <div style={{
                position: 'absolute', inset: 11,
                border: '0.5px solid rgba(212,175,55,0.2)',
                borderRadius: 3, pointerEvents: 'none',
              }} />

              {/* Holographic shimmer strip (bottom-right) */}
              <div style={{
                position: 'absolute', bottom: 20, right: 12,
                width: 28, height: 36,
                background: 'linear-gradient(135deg, rgba(255,100,100,0.4), rgba(100,200,255,0.4), rgba(100,255,100,0.4), rgba(255,200,100,0.4))',
                borderRadius: 3, opacity: 0.7,
              }} />

              {/* Emblem circle */}
              <div style={{
                position: 'absolute', top: 18, left: '50%',
                transform: 'translateX(-50%)',
                width: 50, height: 50,
                borderRadius: '50%',
                border: '1.5px solid rgba(212,175,55,0.65)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'radial-gradient(circle, rgba(212,175,55,0.12) 0%, transparent 70%)',
              }}>
                <div style={{
                  fontSize: 22, color: 'rgba(212,175,55,0.85)',
                  textShadow: '0 0 8px rgba(212,175,55,0.4)',
                }}>✦</div>
              </div>

              {/* PASSPORT label */}
              <div style={{
                position: 'absolute', top: 78, left: 0, right: 0,
                textAlign: 'center',
                color: 'rgba(212,175,55,0.9)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.38em',
                textShadow: '0 0 12px rgba(212,175,55,0.3)',
              }}>PASSPORT</div>

              <div style={{
                position: 'absolute', top: 96, left: 0, right: 0,
                textAlign: 'center',
                color: 'rgba(255,255,255,0.35)',
                fontSize: 7.5, letterSpacing: '0.2em',
              }}>BIOMETRIC · INTERNATIONAL</div>

              {/* Photo upload zone — front */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 24, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 90, height: 108,
                  borderRadius: 6,
                  overflow: 'hidden',
                  border: frontPreview ? '2px solid rgba(212,175,55,0.7)' : `1.5px dashed rgba(212,175,55,${dragging === 'front' ? 0.8 : 0.4})`,
                  background: dragging === 'front' ? 'rgba(212,175,55,0.15)' : 'rgba(0,0,0,0.25)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
                onClick={(e) => { e.stopPropagation(); frontRef.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); setDragging('front'); }}
                onDragLeave={() => setDragging(null)}
                onDrop={onDrop('front')}
              >
                {frontPreview ? (
                  <img src={frontPreview} alt="Passport front" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <Camera style={{ width: 20, height: 20, color: 'rgba(212,175,55,0.75)' }} />
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.45)', textAlign: 'center', lineHeight: 1.4 }}>
                      TAP TO<br />UPLOAD
                    </span>
                  </>
                )}
              </div>

              {/* MRZ zone */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 18, background: 'rgba(0,0,0,0.35)',
                display: 'flex', flexDirection: 'column', gap: 2,
                padding: '3px 12px',
              }}>
                {[0.25, 0.18].map((op, i) => (
                  <div key={i} style={{ height: 4, borderRadius: 1, background: `rgba(255,255,255,${op})` }} />
                ))}
              </div>

              {/* FRONT chip */}
              <div style={{
                position: 'absolute', top: 9, left: 13,
                fontSize: 7, color: 'rgba(255,255,255,0.35)',
                letterSpacing: '0.22em', fontWeight: 700,
              }}>FRONT</div>

              {/* Uploaded check */}
              {frontFile && (
                <div style={{
                  position: 'absolute', top: 9, right: 13,
                  width: 17, height: 17, borderRadius: '50%',
                  background: '#22c55e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(34,197,94,0.6)',
                }}>
                  <Check style={{ width: 10, height: 10, color: 'white' }} />
                </div>
              )}
            </div>

            {/* ════════════ BACK FACE ════════════ */}
            <div style={{ ...faceBase, transform: 'rotateY(180deg)', background: 'linear-gradient(158deg, #111e42 0%, #1a2a5c 45%, #0c1630 100%)' }}>

              {/* Texture */}
              <div style={{
                position: 'absolute', inset: 0, opacity: 0.055,
                backgroundImage: 'repeating-linear-gradient(55deg, transparent 0px, transparent 6px, rgba(255,255,255,0.8) 6px, rgba(255,255,255,0.8) 7px)',
                pointerEvents: 'none',
              }} />

              {/* Gold frame */}
              <div style={{ position: 'absolute', inset: 7, border: '1.5px solid rgba(212,175,55,0.4)', borderRadius: 5, pointerEvents: 'none' }} />

              {/* Magnetic stripe */}
              <div style={{
                position: 'absolute', top: 32, left: 0, right: 0,
                height: 30,
                background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.85) 50%, rgba(0,0,0,0.7) 100%)',
              }} />

              {/* Signature strip */}
              <div style={{
                position: 'absolute', top: 68, left: 16, right: 16,
                height: 22,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 2,
                border: '0.5px solid rgba(255,255,255,0.12)',
              }} />

              {/* BACK scan upload zone */}
              <div
                style={{
                  position: 'absolute',
                  top: 100, left: '50%',
                  transform: 'translateX(-50%)',
                  width: 220, height: 80,
                  borderRadius: 6, overflow: 'hidden',
                  border: backPreview ? '2px solid rgba(212,175,55,0.7)' : `1.5px dashed rgba(212,175,55,${dragging === 'back' ? 0.8 : 0.35})`,
                  background: dragging === 'back' ? 'rgba(212,175,55,0.12)' : 'rgba(0,0,0,0.22)',
                  cursor: 'pointer',
                  transition: 'border-color 0.2s, background 0.2s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}
                onClick={(e) => { e.stopPropagation(); backRef.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); setDragging('back'); }}
                onDragLeave={() => setDragging(null)}
                onDrop={onDrop('back')}
              >
                {backPreview ? (
                  <img src={backPreview} alt="Passport back" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <>
                    <Camera style={{ width: 18, height: 18, color: 'rgba(212,175,55,0.7)' }} />
                    <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)' }}>TAP TO UPLOAD BACK PAGE</span>
                  </>
                )}
              </div>

              {/* MRZ zone */}
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                height: 18, background: 'rgba(0,0,0,0.35)',
                display: 'flex', flexDirection: 'column', gap: 2, padding: '3px 12px',
              }}>
                {[0.22, 0.16].map((op, i) => (
                  <div key={i} style={{ height: 4, borderRadius: 1, background: `rgba(255,255,255,${op})` }} />
                ))}
              </div>

              {/* BACK chip */}
              <div style={{
                position: 'absolute', top: 9, left: 13,
                fontSize: 7, color: 'rgba(255,255,255,0.32)',
                letterSpacing: '0.22em', fontWeight: 700,
              }}>BACK</div>

              {/* Uploaded check */}
              {backFile && (
                <div style={{
                  position: 'absolute', top: 9, right: 13,
                  width: 17, height: 17, borderRadius: '50%',
                  background: '#22c55e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 8px rgba(34,197,94,0.6)',
                }}>
                  <Check style={{ width: 10, height: 10, color: 'white' }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Flip button ── */}
        <button
          onClick={() => setFlipped((f) => !f)}
          className="mt-3 flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {flipped ? 'Show front side' : 'Flip to back side'}
        </button>

        {/* ── Status pills ── */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {/* Front */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            frontFile ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            {frontFile ? <Check className="w-3 h-3" /> : <Camera className="w-3 h-3 opacity-60" />}
            <span>{frontFile ? `Front — ${frontFile.name.length > 20 ? frontFile.name.slice(0, 17) + '…' : frontFile.name}` : 'Front page (required)'}</span>
          </div>

          {/* Back */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
            backFile ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-500'
          }`}>
            {backFile ? <Check className="w-3 h-3" /> : <Camera className="w-3 h-3 opacity-60" />}
            <span>{backFile ? `Back — ${backFile.name.length > 20 ? backFile.name.slice(0, 17) + '…' : backFile.name}` : 'Back page (required)'}</span>
          </div>
        </div>

        {/* ── Replace / clear row ── */}
        <div className="flex items-center gap-4 mt-2">
          <button
            onClick={() => frontRef.current?.click()}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Upload className="w-3 h-3" /> {frontFile ? 'Replace front' : 'Upload front'}
          </button>
          <button
            onClick={() => backRef.current?.click()}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Upload className="w-3 h-3" /> {backFile ? 'Replace back' : 'Upload back'}
          </button>
          {(frontFile || backFile) && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 transition-colors"
            >
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      </div>

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
