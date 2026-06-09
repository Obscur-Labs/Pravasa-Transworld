'use client';
import { useRef, useState } from 'react';
import {
  ShieldCheck, Upload, CheckCircle2,
  ArrowRight, Loader2, Fingerprint, CreditCard,
} from 'lucide-react';
import { uploadVaultDocument } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';

interface KYCStatus { aadharFront: boolean; aadharBack: boolean; pan: boolean; }
interface Props { initialStatus: KYCStatus; onComplete: () => void; }

/* ── Simple Aadhaar card face ── */
function AadhaarSideCard({
  side,
  image,
  done,
  onPick,
}: {
  side: 'Front' | 'Back';
  image: string | null;
  done: boolean;
  onPick: () => void;
}) {
  const isFront = side === 'Front';

  return (
    <div className="flex-1 rounded-2xl overflow-hidden border-2 transition-all"
      style={{ borderColor: done || image ? '#86efac' : '#e2e8f0' }}>
      {/* Header stripe — India flag colors */}
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{
          background: isFront
            ? 'linear-gradient(135deg,#FF9933 0%,#FF9933 30%,#ffffff 45%,#ffffff 55%,#138808 70%,#138808 100%)'
            : 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 60%,#0ea5e9 100%)',
        }}
      >
        <span className="text-[9px] font-bold tracking-widest"
          style={{ color: isFront ? '#000000cc' : 'rgba(255,255,255,0.9)' }}>
          AADHAAR
        </span>
        <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded"
          style={{
            background: isFront ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.2)',
            color: isFront ? '#000000cc' : 'rgba(255,255,255,0.9)',
          }}>
          {side.toUpperCase()}
        </span>
      </div>

      {/* Upload / preview area */}
      <div
        className="flex flex-col items-center justify-center p-4 cursor-pointer min-h-[130px] bg-white group hover:bg-slate-50 transition-colors"
        onClick={!done ? onPick : undefined}
      >
        {image ? (
          <div className="w-full h-24 rounded-lg overflow-hidden border border-green-200">
            <img src={image} alt={`Aadhaar ${side}`} className="w-full h-full object-cover" />
          </div>
        ) : done ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-xs font-semibold text-green-700">Already uploaded</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-12 h-12 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center group-hover:border-blue-300 group-hover:bg-blue-50 transition-all">
              <Upload className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-600">{side} side</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Click to upload</p>
            </div>
          </div>
        )}
      </div>

      {/* Bottom status */}
      <div className="px-3 pb-3">
        {done || image ? (
          <div className="flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-50 border border-green-200 text-xs font-semibold text-green-700">
            <CheckCircle2 className="w-3 h-3" /> Ready
          </div>
        ) : (
          <button
            onClick={onPick}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all"
          >
            <Upload className="w-3 h-3" /> Upload
          </button>
        )}
      </div>
    </div>
  );
}

/* ── PAN card (simple flat card, no flip) ── */
function PanCard({ image, done, onPick }: { image: string | null; done: boolean; onPick: () => void; }) {
  return (
    <div className="rounded-2xl overflow-hidden border-2 transition-all"
      style={{ borderColor: done || image ? '#86efac' : '#e2e8f0' }}>
      {/* Header */}
      <div className="px-4 py-2.5 flex items-center justify-between"
        style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e3a8a 45%,#1d4ed8 100%)' }}>
        <span className="text-[10px] font-bold tracking-widest text-white/80">INCOME TAX DEPT — PAN</span>
        {(done || image) && (
          <span className="flex items-center gap-1 bg-green-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-2.5 h-2.5" /> Ready
          </span>
        )}
      </div>

      {/* Upload / preview */}
      <div
        className="flex flex-col items-center justify-center p-5 cursor-pointer min-h-[160px] bg-white group hover:bg-slate-50 transition-colors"
        onClick={!done ? onPick : undefined}
      >
        {image ? (
          <div className="w-full h-32 rounded-lg overflow-hidden border border-green-200">
            <img src={image} alt="PAN Card" className="w-full h-full object-cover" />
          </div>
        ) : done ? (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-green-600" />
            </div>
            <p className="text-sm font-semibold text-green-700">PAN Card Uploaded</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center group-hover:border-blue-300 group-hover:bg-blue-50 transition-all">
              <CreditCard className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600">PAN Card Front</p>
              <p className="text-xs text-slate-400 mt-0.5">Click to upload · JPG or PNG</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main KYC Modal ── */
export default function KYCModal({ initialStatus, onComplete }: Props) {
  const [step, setStep] = useState<'aadhaar' | 'pan'>(
    (!initialStatus.aadharFront || !initialStatus.aadharBack) ? 'aadhaar' : 'pan'
  );
  const [uploading, setUploading] = useState(false);

  const [afFile, setAfFile] = useState<File | null>(null);
  const [afPreview, setAfPreview] = useState<string | null>(null);
  const [afDone, setAfDone] = useState(initialStatus.aadharFront);

  const [abFile, setAbFile] = useState<File | null>(null);
  const [abPreview, setAbPreview] = useState<string | null>(null);
  const [abDone, setAbDone] = useState(initialStatus.aadharBack);

  const [panFile, setPanFile] = useState<File | null>(null);
  const [panPreview, setPanPreview] = useState<string | null>(null);
  const [panDone, setPanDone] = useState(initialStatus.pan);

  const afRef  = useRef<HTMLInputElement>(null);
  const abRef  = useRef<HTMLInputElement>(null);
  const panRef = useRef<HTMLInputElement>(null);

  const pickFront = () => afRef.current?.click();
  const pickBack  = () => abRef.current?.click();
  const pickPan   = () => panRef.current?.click();

  const handleFile = (side: 'front' | 'back' | 'pan', file: File) => {
    const url = URL.createObjectURL(file);
    if (side === 'front') { setAfFile(file); setAfPreview(url); }
    if (side === 'back')  { setAbFile(file); setAbPreview(url); }
    if (side === 'pan')   { setPanFile(file); setPanPreview(url); }
  };

  const uploadAadhaar = async () => {
    const tasks: { file: File; label: string }[] = [];
    if (!afDone && afFile) tasks.push({ file: afFile, label: 'Aadhaar Front' });
    if (!abDone && abFile) tasks.push({ file: abFile, label: 'Aadhaar Back' });
    if (!tasks.length) { setStep('pan'); return; }

    setUploading(true);
    try {
      for (const t of tasks) {
        const fd = new FormData();
        fd.append('file', t.file);
        fd.append('type', 'aadhar');
        fd.append('label', t.label);
        await uploadVaultDocument(fd);
      }
      if (!afDone && afFile) setAfDone(true);
      if (!abDone && abFile) setAbDone(true);
      toast({ title: 'Aadhaar saved!', variant: 'success' });
      setStep('pan');
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.response?.data?.message, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const uploadPan = async () => {
    if (panDone) { onComplete(); return; }
    if (!panFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', panFile);
      fd.append('type', 'pan');
      fd.append('label', 'PAN Card');
      await uploadVaultDocument(fd);
      setPanDone(true);
      toast({ title: 'KYC Complete!', description: 'Your identity is verified.', variant: 'success' });
      onComplete();
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.response?.data?.message, variant: 'destructive' });
    } finally { setUploading(false); }
  };

  const aadhaarDone = afDone && abDone;
  const canAadhaar  = (afDone || !!afFile) && (abDone || !!abFile);
  const canPan      = panDone || !!panFile;
  const totalDone   = [afDone || !!afFile, abDone || !!abFile, panDone || !!panFile].filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(2,6,23,0.85)', backdropFilter: 'blur(12px)' }}>

      {/* hidden inputs */}
      <input ref={afRef}  type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFile('front', e.target.files[0])} />
      <input ref={abRef}  type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFile('back',  e.target.files[0])} />
      <input ref={panRef} type="file" className="hidden" accept="image/*" onChange={e => e.target.files?.[0] && handleFile('pan',   e.target.files[0])} />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="relative overflow-hidden px-6 pt-7 pb-6"
          style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 40%,#1d4ed8 80%,#0369a1 100%)' }}>
          <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full opacity-20 animate-pulse"
            style={{ background: 'radial-gradient(circle,#818cf8,transparent)' }} />
          <div className="absolute -bottom-4 -left-4 w-24 h-24 rounded-full opacity-15 animate-pulse"
            style={{ background: 'radial-gradient(circle,#38bdf8,transparent)', animationDelay: '1s' }} />

          <div className="relative z-10 flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.25)' }}>
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Verify Your Identity</h2>
              <p className="text-blue-200 text-xs mt-0.5">Required to start any visa application</p>
            </div>
          </div>

          {/* Progress pills */}
          <div className="relative z-10 flex items-center gap-2">
            {[
              { id: 'aadhaar', label: 'Aadhaar Card', icon: Fingerprint, done: aadhaarDone },
              { id: 'pan',     label: 'PAN Card',     icon: CreditCard,  done: panDone },
            ].map((s) => (
              <div key={s.id}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  step === s.id
                    ? 'bg-white text-indigo-700 shadow-lg'
                    : s.done
                    ? 'text-white/80 border border-white/20'
                    : 'text-white/50 border border-white/10'
                }`}>
                {s.done
                  ? <CheckCircle2 className="w-3 h-3 text-green-400" />
                  : <s.icon className="w-3 h-3" />}
                {s.label}
              </div>
            ))}
            <div className="ml-auto text-white/60 text-xs font-mono">{totalDone}/3</div>
          </div>

          {/* Progress bar */}
          <div className="relative z-10 mt-3 h-1 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${(totalDone / 3) * 100}%` }} />
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">

          {/* ── AADHAAR STEP ── */}
          {step === 'aadhaar' && (
            <div>
              <p className="text-center text-sm text-slate-500 mb-5">
                Upload <span className="font-semibold text-slate-700">both sides</span> of your Aadhaar card
              </p>

              {/* Two simple cards side by side */}
              <div className="flex gap-3 mb-5">
                <AadhaarSideCard
                  side="Front"
                  image={afPreview}
                  done={afDone}
                  onPick={pickFront}
                />
                <AadhaarSideCard
                  side="Back"
                  image={abPreview}
                  done={abDone}
                  onPick={pickBack}
                />
              </div>

              <button
                onClick={uploadAadhaar}
                disabled={!canAadhaar || uploading}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={canAadhaar && !uploading
                  ? { background: 'linear-gradient(135deg,#4f46e5,#2563eb)', color: 'white', boxShadow: '0 4px 15px rgba(79,70,229,0.4)' }
                  : { background: '#f1f5f9', color: '#94a3b8' }}
              >
                {uploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</>
                  : <>{aadhaarDone ? 'Continue' : 'Save & Continue'} <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          )}

          {/* ── PAN STEP ── */}
          {step === 'pan' && (
            <div>
              <p className="text-center text-sm text-slate-500 mb-5">
                Upload the <span className="font-semibold text-slate-700">front side</span> of your PAN card
              </p>

              <div className="mb-5">
                <PanCard image={panPreview} done={panDone} onPick={pickPan} />
              </div>

              {!panDone && !panFile && (
                <div className="flex justify-center mb-4">
                  <button
                    onClick={pickPan}
                    className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium border bg-slate-50 text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-600 transition-all"
                  >
                    <Upload className="w-3 h-3" />
                    Choose PAN image
                  </button>
                </div>
              )}

              {panFile && (
                <div className="flex justify-center mb-4">
                  <span className="flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium bg-green-50 text-green-700 border border-green-200">
                    <CheckCircle2 className="w-3 h-3" /> PAN selected
                  </span>
                </div>
              )}

              <button
                onClick={uploadPan}
                disabled={!canPan || uploading}
                className="w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={canPan && !uploading
                  ? { background: 'linear-gradient(135deg,#4f46e5,#2563eb)', color: 'white', boxShadow: '0 4px 15px rgba(79,70,229,0.4)' }
                  : { background: '#f1f5f9', color: '#94a3b8' }}
              >
                {uploading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</>
                  : <><ShieldCheck className="w-4 h-4" />{panDone ? 'Continue to Dashboard' : 'Complete KYC'}</>}
              </button>

              <button
                onClick={() => setStep('aadhaar')}
                className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                ← Back to Aadhaar
              </button>
            </div>
          )}

        </div>

        {/* Footer note */}
        <div className="px-6 pb-5">
          <p className="text-center text-[11px] text-slate-400 leading-relaxed">
            Your documents are encrypted and stored securely.
            They are only used to pre-fill visa applications.
          </p>
        </div>
      </div>
    </div>
  );
}
