import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import QRCode from 'https://esm.sh/qrcode@1.5.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Payload = {
  enrollment_number?: string;
  name?: string;
  rank?: string;
  unit?: string;
  division?: string;
  blood_group?: string;
  mobile?: string;
  father_guardian_name?: string;
  date_of_birth?: string;
  emergency_contact?: string;
  residential_address?: string;
  valid_from?: string;
  valid_till?: string;
  purpose_of_issue?: string;
  registration_password?: string;
  photo?: string;
  photo_name?: string;
};

const rateMap = new Map<string, { count: number; resetAt: number }>();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function bad(msg: string, status = 400) {
  return json({ ok: false, error: msg }, status);
}

function isNonEmpty(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v));
}

function isMobile(v: string) {
  return /^\d{10}$/.test(v);
}

function checkRateLimit(ip: string) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const max = 20;
  const entry = rateMap.get(ip);
  if (!entry || entry.resetAt < now) {
    rateMap.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count += 1;
  return true;
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex
    ? new Uint8Array(saltHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  const hash = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const saltOut = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2$100000$${saltOut}$${hash}`;
}

async function verifyPassword(input: string, stored: string): Promise<boolean> {
  if (!stored) return false;
  if (stored.startsWith('pbkdf2$')) {
    const [, , salt] = stored.split('$');
    const computed = await hashPassword(input, salt);
    return timingSafeEqual(computed, stored);
  }
  // Backward-compatible fallback: plain secret in env (not recommended, but functional)
  return timingSafeEqual(input, stored);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function parseDataUrl(dataUrl: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!m) return null;
  const mime = m[1];
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime, bytes };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return bad('Method not allowed', 405);

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (!checkRateLimit(ip)) return bad('Too many registration attempts. Try again later.', 429);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const regSecret = Deno.env.get('REGISTRATION_PASSWORD_HASH') || Deno.env.get('REGISTRATION_PASSWORD') || '';
  const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/$/, '');
  if (!supabaseUrl || !serviceKey) return bad('Server configuration error', 500);
  if (!regSecret) return bad('Registration secret not configured', 500);

  let payload: Payload;
  try { payload = await req.json(); } catch { return bad('Invalid JSON body'); }

  const required: (keyof Payload)[] = [
    'enrollment_number','name','rank','unit','division','blood_group','mobile','father_guardian_name',
    'date_of_birth','emergency_contact','residential_address','valid_from','valid_till','purpose_of_issue',
    'registration_password','photo','photo_name'
  ];
  for (const k of required) if (!isNonEmpty(payload[k])) return bad(`Missing field: ${k}`);

  const enrollment = payload.enrollment_number!.trim();
  const division = payload.division!.trim().toUpperCase();
  if (!['SD', 'SW'].includes(division)) return bad('Division must be SD or SW');
  if (!isMobile(payload.mobile!.trim())) return bad('Mobile number must be 10 digits');
  if (!isMobile(payload.emergency_contact!.trim())) return bad('Emergency contact must be 10 digits');
  for (const k of ['date_of_birth', 'valid_from', 'valid_till'] as const) {
    if (!isDate(payload[k]!.trim())) return bad(`Invalid date: ${k}`);
  }
  if (new Date(payload.valid_till!) < new Date(payload.valid_from!)) return bad('valid_till must be after valid_from');

  const passwordOk = await verifyPassword(payload.registration_password!, regSecret);
  if (!passwordOk) return bad('Unauthorized: invalid registration password', 401);

  const parsedPhoto = parseDataUrl(payload.photo!);
  if (!parsedPhoto) return bad('Invalid photograph data');
  if (parsedPhoto.bytes.byteLength > 5 * 1024 * 1024) return bad('Photograph too large (max 5MB)');

  const admin = createClient(supabaseUrl, serviceKey);

  const { data: existing, error: existErr } = await admin
    .from('cadets').select('id').eq('enrollment_number', enrollment).maybeSingle();
  if (existErr) return bad('Database error checking enrollment', 500);
  if (existing) return bad('Enrollment number already exists', 409);

  const ext = parsedPhoto.mime === 'image/png' ? 'png' : parsedPhoto.mime === 'image/webp' ? 'webp' : 'jpg';
  const photoPath = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadErr } = await admin.storage.from('cadet-photos').upload(photoPath, parsedPhoto.bytes, {
    contentType: parsedPhoto.mime, upsert: false,
  });
  if (uploadErr) return bad(`Photo upload failed: ${uploadErr.message}`, 500);

  const cadetRow = {
    enrollment_number: enrollment,
    name: payload.name!.trim(),
    rank: payload.rank!.trim(),
    unit: payload.unit!.trim(),
    division,
    blood_group: payload.blood_group!.trim(),
    mobile: payload.mobile!.trim(),
    photo_path: photoPath,
    father_guardian_name: payload.father_guardian_name!.trim(),
    date_of_birth: payload.date_of_birth!.trim(),
    emergency_contact: payload.emergency_contact!.trim(),
    residential_address: payload.residential_address!.trim(),
    valid_from: payload.valid_from!.trim(),
    valid_till: payload.valid_till!.trim(),
    purpose_of_issue: payload.purpose_of_issue!.trim(),
  };

  const { data: cadet, error: cadetErr } = await admin.from('cadets').insert(cadetRow).select('*').single();
  if (cadetErr || !cadet) {
    await admin.storage.from('cadet-photos').remove([photoPath]);
    return bad(`Failed to create cadet: ${cadetErr?.message || 'unknown'}`, 500);
  }

  const token = randomToken();
  const tokenHash = await hashToken(token);
  const expiresAt = payload.valid_till ? new Date(`${payload.valid_till}T23:59:59Z`).toISOString() : null;

  const { error: tokenErr } = await admin.from('qr_tokens').insert({
    cadet_id: cadet.id,
    token_hash: tokenHash,
    is_active: true,
    expires_at: expiresAt,
  });
  if (tokenErr) {
    await admin.from('cadets').delete().eq('id', cadet.id);
    await admin.storage.from('cadet-photos').remove([photoPath]);
    return bad(`Failed to create QR token: ${tokenErr.message}`, 500);
  }

  const base = appUrl || req.headers.get('origin') || '';
  const verificationUrl = `${base}/verify?t=${encodeURIComponent(token)}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 512, margin: 1, errorCorrectionLevel: 'M' });

  return json({ ok: true, cadet, verification_url: verificationUrl, qr_data_url: qrDataUrl });
});
