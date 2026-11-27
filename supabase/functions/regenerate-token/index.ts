import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import QRCode from 'https://esm.sh/qrcode@1.5.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
function bad(msg: string, status = 400) { return json({ ok: false, error: msg }, status); }

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}
async function hashPassword(password: string, saltHex?: string): Promise<string> {
  const salt = saltHex ? new Uint8Array(saltHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))) : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  const hash = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const saltOut = Array.from(salt).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `pbkdf2$100000$${saltOut}$${hash}`;
}
function timingSafeEqual(a: string, b: string) { if (a.length !== b.length) return false; let o = 0; for (let i=0;i<a.length;i++) o |= a.charCodeAt(i)^b.charCodeAt(i); return o===0; }
async function verifyPassword(input: string, stored: string) {
  if (stored.startsWith('pbkdf2$')) { const [, , salt] = stored.split('$'); return timingSafeEqual(await hashPassword(input, salt), stored); }
  return timingSafeEqual(input, stored);
}
function randomToken() { return Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b)=>b.toString(16).padStart(2,'0')).join(''); }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return bad('Method not allowed', 405);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const regSecret = Deno.env.get('REGISTRATION_PASSWORD_HASH') || Deno.env.get('REGISTRATION_PASSWORD') || '';
  const appUrl = (Deno.env.get('APP_URL') || req.headers.get('origin') || '').replace(/\/$/, '');
  if (!supabaseUrl || !serviceKey || !regSecret) return bad('Server configuration error', 500);

  let body: { enrollment_number?: string; registration_password?: string };
  try { body = await req.json(); } catch { return bad('Invalid JSON body'); }
  const enrollment = (body.enrollment_number || '').trim();
  const password = body.registration_password || '';
  if (!enrollment || !password) return bad('Missing enrollment_number or registration_password');
  if (!(await verifyPassword(password, regSecret))) return bad('Unauthorized', 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const { data: cadet, error } = await admin.from('cadets').select('*').eq('enrollment_number', enrollment).maybeSingle();
  if (error || !cadet) return bad('Cadet not found', 404);

  await admin.from('qr_tokens').update({ is_active: false }).eq('cadet_id', cadet.id).eq('is_active', true);
  const token = randomToken();
  const tokenHash = await hashToken(token);
  const expiresAt = cadet.valid_till ? new Date(`${cadet.valid_till}T23:59:59Z`).toISOString() : null;
  const { error: insErr } = await admin.from('qr_tokens').insert({ cadet_id: cadet.id, token_hash: tokenHash, is_active: true, expires_at: expiresAt });
  if (insErr) return bad('Failed to regenerate token', 500);

  const verificationUrl = `${appUrl}/verify?t=${encodeURIComponent(token)}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { width: 512, margin: 1, errorCorrectionLevel: 'M' });
  return json({ ok: true, cadet, verification_url: verificationUrl, qr_data_url: qrDataUrl });
});
