import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect } from 'react';
import type { Cadet } from '../types/cadet';

type LocationState = { cadet?: Cadet; photoUrl?: string | null; verified?: boolean } | null;

function formatDate(value: string | null | undefined) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-US');
}

function display(value: string | null | undefined) {
  const v = (value ?? '').toString().trim();
  return v || '—';
}

const cardStyles = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@600;700;800&display=swap');
.idcard-root { font-family: 'Inter', sans-serif; background-color: #0f172a;
  background-image: radial-gradient(at 0% 0%, rgba(30, 58, 138, 0.35) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(220, 38, 38, 0.2) 0px, transparent 50%);
  min-height: calc(100vh - 120px); display:flex; align-items:center; justify-content:center; padding: 12px; border-radius: 16px; }
.idcard-root .font-mono-id { font-family: 'JetBrains Mono', monospace; }
.idcard-root .ncc-tricolor { background: linear-gradient(90deg, #dc2626 0%, #dc2626 33.33%, #1e3a8a 33.33%, #1e3a8a 66.66%, #0284c7 66.66%, #0284c7 100%); }
.idcard-root .security-pattern { background-image: radial-gradient(#cbd5e1 0.85px, transparent 0.85px); background-size: 16px 16px; }
.idcard-root .watermark-text { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 7.5rem; font-weight: 900; letter-spacing: 0.15em; color: rgba(30, 58, 138, 0.035); pointer-events: none; user-select: none; transform: rotate(-12deg); }
@keyframes verifiedNameBlink { 0%, 100% { opacity: 1; transform: scale(1); filter: drop-shadow(0 0 6px rgba(37, 99, 235, 0.7)); } 50% { opacity: 0.3; transform: scale(0.92); filter: drop-shadow(0 0 0px rgba(37, 99, 235, 0)); } }
.idcard-root .animate-verified-tick { animation: verifiedNameBlink 1.4s ease-in-out infinite; }
@media print {
  .no-print { display: none !important; }
  body { background: #fff !important; }
  .page { width: 100% !important; margin: 0 !important; max-width: none !important; }
  .panel { border: 0 !important; box-shadow: none !important; padding: 0 !important; background: transparent !important; }
  .idcard-root { background: #fff !important; padding: 0 !important; min-height: auto !important; display: block !important; }
  .idcard-root article { box-shadow: none !important; max-width: 100% !important; width: 100% !important; }
}
`;

export default function IdentityPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;
  const cadet = state?.cadet ?? null;
  const photoUrl = state?.photoUrl ?? null;
  const verified = Boolean(state?.verified && cadet);
  const error = verified ? '' : 'Direct identity access is not allowed. Please scan and verify a valid QR code.';
  const loading = false;

  useEffect(() => {
    // Keep id dependency explicit for future server-backed verification if needed.
    void id;
  }, [id]);

  if (loading) {
    return <div className="panel status-card"><div className="spinner" /><p className="muted">Loading identity...</p></div>;
  }

  if (error || !cadet) {
    return (
      <div className="panel status-card">
        <h1 className="page-title">Identity Unavailable</h1>
        <div className="alert alert-error" style={{ display: 'inline-block' }}>{error || 'Cadet not found.'}</div>
        <div className="actions" style={{ justifyContent: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/scan')}>Go to Scanner</button>
        </div>
      </div>
    );
  }

  const photoSrc = photoUrl || 'https://placehold.co/144x160/1E3A8A/FFFFFF?text=NCC';
  const purpose = display(cadet.purpose_of_issue);
  const unit = display(cadet.unit);
  const shortUnit = unit.length > 28 ? 'NCC UNIT' : unit.toUpperCase();

  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden', background: 'transparent', border: 0, boxShadow: 'none' }}>
      <style>{cardStyles}</style>
      <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', padding: '16px 20px', background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, marginBottom: 16 }}>
        <div>
          <h1 className="page-title" style={{ marginBottom: 2 }}>Verified Cadet Identity</h1>
          <p className="muted" style={{ margin: 0 }}>Token verified server-side. Card reuses the existing NCC identity design.</p>
        </div>
        <div className="actions" style={{ marginTop: 0 }}>
          <button className="btn btn-secondary" onClick={() => window.print()}>Print</button>
        </div>
      </div>

      <div className="idcard-root">
        {/* Official NCC Cadet Digital Identity Card - existing design preserved */}
        <article className="w-full max-w-4xl bg-white rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.65)] overflow-hidden border border-slate-300/80 relative">
          <div className="ncc-tricolor h-3 w-full"></div>

          <header className="bg-gradient-to-r from-slate-950 via-blue-950 to-slate-900 text-white p-5 sm:px-8 sm:py-6 relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-48 bg-gradient-to-l from-sky-500/10 to-transparent pointer-events-none"></div>
            <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-white/10 relative z-10">
              <span className="text-[11px] font-bold uppercase tracking-widest text-sky-300">Official Digital Identity Card</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm flex flex-col items-center justify-center shrink-0 shadow-inner">
                  <span className="text-[10px] font-black tracking-widest text-amber-400 leading-none">NCC</span>
                  <div className="w-7 h-1.5 rounded-full ncc-tricolor my-1"></div>
                  <span className="text-[8px] font-bold text-sky-200 tracking-wider leading-none">INDIA</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-extrabold tracking-[0.18em] text-sky-300 uppercase">National Cadet Corps</span>
                    <span className="hidden sm:inline-block text-slate-500">•</span>
                    <span className="hidden sm:inline-block text-[11px] font-semibold tracking-wider text-amber-300/90 uppercase">Unity &amp; Discipline</span>
                  </div>
                  <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-wide text-white mt-0.5">{unit}</h1>
                </div>
              </div>
              <div className="self-start sm:self-center shrink-0">
                <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:text-right mb-1">Purpose of Issue </span>
                <div className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 px-4 py-1.5 rounded-xl text-xs sm:text-sm font-black uppercase tracking-wide shadow-md">
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                  <span>{purpose}</span>
                </div>
              </div>
            </div>
          </header>

          <div className="p-5 sm:p-8 space-y-6 relative security-pattern">
            <div className="watermark-text">NCC INDIA</div>

            <div className="relative z-10 bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
              <div className="relative shrink-0">
                <div className="p-1 rounded-2xl bg-gradient-to-br from-red-600 via-blue-900 to-sky-500 shadow-lg">
                  <img
                    src={photoSrc}
                    alt={display(cadet.name)}
                    className="w-32 h-36 sm:w-36 sm:h-40 object-cover rounded-xl bg-slate-100"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = 'https://placehold.co/144x160/1E3A8A/FFFFFF?text=NCC'; }}
                  />
                </div>
              </div>

              <div className="flex-1 text-center sm:text-left w-full">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <span className="bg-blue-950 text-white text-xs font-extrabold px-3 py-1 rounded-lg tracking-wider uppercase shadow-sm">RANK: {display(cadet.rank)}</span>
                  <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-extrabold px-3 py-1 rounded-lg tracking-wider uppercase">BLOOD: <strong className="text-red-800">{display(cadet.blood_group)}</strong></span>
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-extrabold px-3 py-1 rounded-lg">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                    VERIFIED CADET
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-center sm:justify-start gap-2">
                  <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">{display(cadet.name)}</h2>
                  <svg className="w-7 h-7 sm:w-8 sm:h-8 text-blue-600 shrink-0 animate-verified-tick" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                </div>

                <div className="mt-2.5 inline-flex items-center gap-2 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-xl">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">REGTL NO:</span>
                  <span className="font-mono-id text-sm sm:text-base font-extrabold text-blue-950 tracking-wider">{display(cadet.enrollment_number)}</span>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 max-w-md mx-auto sm:mx-0">
                  <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Valid From</p>
                    <p className="text-xs sm:text-sm font-black text-slate-900 mt-0.5">{formatDate(cadet.valid_from)}</p>
                  </div>
                  <div className="bg-red-50/70 border border-red-200/80 rounded-xl px-3 py-2">
                    <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Valid Till</p>
                    <p className="text-xs sm:text-sm font-black text-red-700 mt-0.5">{formatDate(cadet.valid_till)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 bg-white/95 backdrop-blur-sm border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-blue-950 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-900"></span>
                  Additional Details &amp; Emergency Contacts
                </h3>
                <span className="text-[11px] font-semibold text-slate-400 hidden sm:inline">Unit Record Verified</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="sm:col-span-2 bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Father&apos;s / Guardian&apos;s Name</p>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">{display(cadet.father_guardian_name)}</p>
                </div>
                <div className="bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date of Birth</p>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">{formatDate(cadet.date_of_birth)}</p>
                </div>
                <a href={`tel:${display(cadet.mobile)}`} className="group bg-slate-50/80 hover:bg-blue-50/60 border border-slate-200/70 hover:border-blue-300 rounded-xl p-3.5 transition">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span>Contact No.</span>
                    <span className="text-[10px] text-blue-600 font-bold group-hover:underline">Call ↗</span>
                  </p>
                  <p className="font-mono-id text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">{display(cadet.mobile)}</p>
                </a>
                <a href={`tel:${display(cadet.emergency_contact)}`} className="group bg-red-50/70 hover:bg-red-100/70 border border-red-200 rounded-xl p-3.5 transition">
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider flex items-center justify-between">
                    <span>Emergency Contact</span>
                    <span className="text-[10px] text-red-700 font-bold group-hover:underline">SOS ↗</span>
                  </p>
                  <p className="font-mono-id text-sm sm:text-base font-extrabold text-red-700 mt-0.5">{display(cadet.emergency_contact)}</p>
                </a>
                <div className="sm:col-span-2 lg:col-span-3 bg-slate-50/80 border border-slate-200/70 rounded-xl p-3.5">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Residential Address</p>
                  <p className="text-sm sm:text-base font-extrabold text-slate-900 mt-0.5">{display(cadet.residential_address)}</p>
                </div>
              </div>
            </div>
          </div>

          <footer className="bg-slate-900 text-slate-300 px-5 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <p className="leading-relaxed">
              <strong className="text-amber-400 uppercase tracking-wider">Instructions:</strong>{' '}
              <span>This identity card is official property of the National Cadet Corps. If found, please return to the nearest NCC Unit Headquarters or Police Station.</span>
            </p>
            <span className="font-mono-id text-[11px] text-slate-400 shrink-0">{shortUnit}</span>
          </footer>
        </article>
      </div>
    </div>
  );
}
