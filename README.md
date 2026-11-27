# NCC Cadet Registration & QR-Based Identity Verification

React + Vite + TypeScript frontend with Supabase PostgreSQL, Storage, and Edge Functions.

## Modules
- `/register`: authorized registration form, server-side password verification, QR generation/download.
- `/scan`: mobile-first camera QR scanning.
- `/verify`: token extraction and server-side verification.
- `/identity/:id`: verified-only display using the existing NCC identity card design.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Create Supabase project** and configure env:
   ```bash
   cp .env.example .env
   ```
   Fill `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APP_URL`.

3. **Apply database migration**
   Run `supabase/migrations/202611270001_init.sql` in Supabase SQL editor (or via Supabase CLI).

4. **Set Edge Function secrets** (Supabase Dashboard/CLI):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `REGISTRATION_PASSWORD_HASH` (recommended, PBKDF2 format from helper below) or `REGISTRATION_PASSWORD`
   - `APP_URL` (e.g. https://yourdomain.com)

5. **Deploy Edge Functions**
   ```bash
   supabase functions deploy register-cadet
   supabase functions deploy verify-token
   supabase functions deploy regenerate-token
   ```

6. **Run frontend**
   ```bash
   npm run dev
   ```

## Security Notes
- Registration password is never stored in frontend; verified in Edge Functions against server secret.
- Service role key is used only in Edge Functions.
- QR plaintext tokens are not stored; only SHA-256 `token_hash` is stored in `qr_tokens`.
- Tokens are cryptographically random (32 bytes).
- RLS enabled on `cadets` and `qr_tokens` with no anon/authenticated policies; direct client access is denied.
- Registration checks duplicate enrollment, validates input, rate-limits by IP, and cleans up photo/cadet on token-insert failure.

## Regenerate QR
`regenerate-token` Edge Function (authorized): POST `{ "enrollment_number": "...", "registration_password": "..." }`. It deactivates previous active tokens and returns a new QR.

## Identity Card
The existing `NCC ID CARD FINAL 1.HTML` design is preserved in `src/pages/IdentityPage.tsx` with dynamic field binding and safe React rendering.
