import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { verifyToken } from '../lib/api';

export default function VerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('t')?.trim() || '';
  const [error, setError] = useState(token ? '' : 'Invalid verification URL: missing token.');
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await verifyToken(token);
        if (cancelled) return;
        if (res.ok && res.cadet) {
          navigate(`/identity/${res.cadet.id}`, { state: { cadet: res.cadet, photoUrl: res.photo_url || null, verified: true }, replace: true });
          return;
        }
        const code = res.code;
        if (code === 'EXPIRED') setError('This QR token has expired.');
        else if (code === 'REVOKED') setError('This QR token has been revoked.');
        else if (code === 'UNKNOWN' || code === 'INVALID') setError('Invalid or unknown QR token.');
        else setError(res.error || 'Verification failed.');
      } catch {
        if (!cancelled) setError('Network error while verifying token. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [token, navigate]);

  return (
    <div className="panel status-card">
      {loading ? (
        <>
          <div className="spinner" />
          <h1 className="page-title">Verifying QR Token</h1>
          <p className="muted">Contacting server for secure verification...</p>
        </>
      ) : (
        <>
          <h1 className="page-title">Verification Failed</h1>
          <div className="alert alert-error" style={{ display: 'inline-block' }}>{error}</div>
        </>
      )}
    </div>
  );
}
