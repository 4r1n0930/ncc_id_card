import { useState, type FormEvent } from 'react';
import { registerCadet } from '../lib/api';
import { supabaseConfigured } from '../lib/supabase';
import type { RegistrationPayload } from '../types/cadet';

const initial = {
  enrollment_number: '',
  name: '',
  rank: '',
  unit: '2 MP ARMOURED SQUADRON NCC INDORE',
  division: 'SD',
  blood_group: '',
  mobile: '',
  father_guardian_name: '',
  date_of_birth: '',
  emergency_contact: '',
  residential_address: '',
  valid_from: '',
  valid_till: '',
  purpose_of_issue: 'FOR IMA ATTACHMENT CAMP DEHRADUN',
  registration_password: '',
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read photograph'));
    reader.readAsDataURL(file);
  });
}

export default function RegisterPage() {
  const [form, setForm] = useState(initial);
  const [photo, setPhoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{ qr: string; url: string; name: string } | null>(null);

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const validate = (): string | null => {
    for (const [k, v] of Object.entries(form)) {
      if (!String(v).trim()) return `Missing field: ${k.replace(/_/g, ' ')}`;
    }
    if (!photo) return 'Photograph is required';
    if (!/^\d{10}$/.test(form.mobile)) return 'Mobile number must be 10 digits';
    if (!/^\d{10}$/.test(form.emergency_contact)) return 'Emergency contact must be 10 digits';
    return null;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    const v = validate();
    if (v) { setError(v); return; }
    if (!supabaseConfigured) { setError('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'); return; }
    setLoading(true);
    try {
      const photoData = await fileToDataUrl(photo!);
      const payload: RegistrationPayload = {
        ...form,
        enrollment_number: form.enrollment_number.trim(),
        name: form.name.trim(),
        photo: photoData,
        photo_name: photo!.name,
      };
      const res = await registerCadet(payload);
      setResult({ qr: res.qr_data_url!, url: res.verification_url!, name: res.cadet!.name });
      setForm(initial);
      setPhoto(null);
      (e.target as HTMLFormElement).reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const downloadQr = () => {
    if (!result) return;
    const a = document.createElement('a');
    a.href = result.qr;
    a.download = `${result.name.replace(/\s+/g, '_')}_QR.png`;
    a.click();
  };

  return (
    <div className="panel">
      <h1 className="page-title">Cadet Registration</h1>
      <p className="page-sub">Register a cadet and generate a unique verification QR code. Authorized password is verified server-side.</p>
      <form onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field"><label>Enrollment / Regimental Number *</label><input name="enrollment_number" value={form.enrollment_number} onChange={onChange} required /></div>
          <div className="field"><label>Full Name *</label><input name="name" value={form.name} onChange={onChange} required /></div>
          <div className="field"><label>Rank *</label><input name="rank" value={form.rank} onChange={onChange} required /></div>
          <div className="field"><label>Unit *</label><input name="unit" value={form.unit} onChange={onChange} required /></div>
          <div className="field"><label>Division *</label>
            <select name="division" value={form.division} onChange={onChange}><option value="SD">SD</option><option value="SW">SW</option></select>
          </div>
          <div className="field"><label>Blood Group *</label><input name="blood_group" value={form.blood_group} onChange={onChange} required /></div>
          <div className="field"><label>Mobile Number *</label><input name="mobile" value={form.mobile} onChange={onChange} inputMode="numeric" required /></div>
          <div className="field"><label>Emergency Contact *</label><input name="emergency_contact" value={form.emergency_contact} onChange={onChange} inputMode="numeric" required /></div>
          <div className="field"><label>Father's / Guardian's Name *</label><input name="father_guardian_name" value={form.father_guardian_name} onChange={onChange} required /></div>
          <div className="field"><label>Date of Birth *</label><input type="date" name="date_of_birth" value={form.date_of_birth} onChange={onChange} required /></div>
          <div className="field"><label>Valid From *</label><input type="date" name="valid_from" value={form.valid_from} onChange={onChange} required /></div>
          <div className="field"><label>Valid Till *</label><input type="date" name="valid_till" value={form.valid_till} onChange={onChange} required /></div>
          <div className="field full"><label>Purpose of Issue *</label><input name="purpose_of_issue" value={form.purpose_of_issue} onChange={onChange} required /></div>
          <div className="field full"><label>Residential Address *</label><textarea name="residential_address" value={form.residential_address} onChange={onChange} required /></div>
          <div className="field"><label>Photograph *</label><input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} required /></div>
          <div className="field"><label>Authorized Registration Password *</label><input type="password" name="registration_password" value={form.registration_password} onChange={onChange} required autoComplete="off" /></div>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <div className="actions">
          <button className="btn btn-primary" disabled={loading} type="submit">{loading ? 'Registering...' : 'Register Cadet & Generate QR'}</button>
        </div>
      </form>
      {result && (
        <div className="qr-result">
          <div className="alert alert-success">Cadet registered successfully. QR token hash stored; plaintext token is embedded only in this QR.</div>
          <img src={result.qr} alt="Cadet verification QR code" />
          <div className="muted" style={{ wordBreak: 'break-all' }}>{result.url}</div>
          <div className="actions">
            <button className="btn btn-primary" onClick={downloadQr} type="button">Download QR</button>
          </div>
        </div>
      )}
    </div>
  );
}
