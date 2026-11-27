import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';

function extractToken(decodedText: string): string | null {
  try {
    const url = new URL(decodedText);
    const t = url.searchParams.get('t');
    if (t && t.trim()) return t.trim();
  } catch {
    // not a URL; allow raw token as fallback
  }
  if (/^[A-Za-z0-9_-]{20,}$/.test(decodedText.trim())) return decodedText.trim();
  return null;
}

export default function ScanPage() {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const handledRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    let mounted = true;

    scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      async (decodedText) => {
        if (handledRef.current) return;
        const token = extractToken(decodedText);
        if (!token) {
          setError('Invalid QR code. Expected a verification URL containing a token.');
          return;
        }
        handledRef.current = true;
        try { await scanner.stop(); } catch { /* ignore */ }
        try { scanner.clear(); } catch { /* ignore */ }
        navigate(`/verify?t=${encodeURIComponent(token)}`);
      },
      () => { /* scan miss */ },
    ).then(() => {
      if (mounted) setStarting(false);
    }).catch((err) => {
      if (!mounted) return;
      const msg = String(err || '');
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('notallowed')) {
        setError('Camera permission denied. Please allow camera access and reload.');
      } else {
        setError('Unable to start camera scanner. Check camera permissions or device support.');
      }
      setStarting(false);
    });

    return () => {
      mounted = false;
      const s = scannerRef.current;
      if (s) {
        s.stop().catch(() => {}).finally(() => { try { s.clear(); } catch {} });
      }
    };
  }, [navigate]);

  return (
    <div className="panel scan-wrap">
      <h1 className="page-title">Scan Cadet QR</h1>
      <p className="page-sub">Point your camera at a cadet verification QR code. Verification happens on the server.</p>
      {starting && !error && <div className="alert alert-info">Requesting camera access...</div>}
      <div id="qr-reader" />
      {error && <div className="alert alert-error">{error}</div>}
      <p className="muted" style={{ marginTop: 12 }}>If scanning fails, ensure the QR contains a valid <code>/verify?t=...</code> URL.</p>
    </div>
  );
}
