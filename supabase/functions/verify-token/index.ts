import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed', code: 'INVALID' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ ok: false, error: 'Server configuration error', code: 'INVALID' }, 500);

  let body: { token?: string };
  try { body = await req.json(); } catch { return json({ ok: false, error: 'Invalid JSON body', code: 'INVALID' }, 400); }
  const token = (body.token || '').trim();
  if (!token || token.length < 20) return json({ ok: false, error: 'Invalid token', code: 'INVALID' }, 400);

  const tokenHash = await hashToken(token);
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: tokenRow, error: tokenErr } = await admin
    .from('qr_tokens')
    .select('id, cadet_id, is_active, expires_at')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (tokenErr) return json({ ok: false, error: 'Database error', code: 'INVALID' }, 500);
  if (!tokenRow) return json({ ok: false, error: 'Unknown token', code: 'UNKNOWN' }, 404);
  if (!tokenRow.is_active) return json({ ok: false, error: 'Token revoked', code: 'REVOKED' }, 403);
  if (tokenRow.expires_at && new Date(tokenRow.expires_at).getTime() < Date.now()) {
    return json({ ok: false, error: 'Token expired', code: 'EXPIRED' }, 403);
  }

  const { data: cadet, error: cadetErr } = await admin
    .from('cadets')
    .select('*')
    .eq('id', tokenRow.cadet_id)
    .maybeSingle();

  if (cadetErr || !cadet) return json({ ok: false, error: 'Cadet not found', code: 'UNKNOWN' }, 404);

  let photoUrl: string | null = null;
  if (cadet.photo_path) {
    const { data } = admin.storage.from('cadet-photos').getPublicUrl(cadet.photo_path);
    photoUrl = data.publicUrl;
  }

  return json({ ok: true, cadet, photo_url: photoUrl });
});
