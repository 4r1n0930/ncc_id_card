import { getFunctionUrl, supabase } from './supabase';
import type { RegistrationPayload, RegistrationResponse, VerifyResponse } from '../types/cadet';

async function parseResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || `Request failed (${res.status})`);
  }
}

export async function registerCadet(payload: RegistrationPayload): Promise<RegistrationResponse> {
  const res = await fetch(getFunctionUrl('register-cadet'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY as string}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await parseResponse<RegistrationResponse>(res);
  if (!res.ok || !data.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  return data;
}

export async function verifyToken(token: string): Promise<VerifyResponse> {
  const res = await fetch(getFunctionUrl('verify-token'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY as string}`,
    },
    body: JSON.stringify({ token }),
  });
  const data = await parseResponse<VerifyResponse>(res);
  if (!res.ok) {
    return { ok: false, error: data.error || 'Verification failed', code: data.code };
  }
  return data;
}

export function getPublicPhotoUrl(photoPath: string | null | undefined): string | null {
  if (!photoPath) return null;
  const { data } = supabase.storage.from('cadet-photos').getPublicUrl(photoPath);
  return data.publicUrl;
}
