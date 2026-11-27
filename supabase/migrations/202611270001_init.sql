-- NCC Cadet Registration & QR Verification schema

create extension if not exists pgcrypto;

create table if not exists public.cadets (
  id uuid primary key default gen_random_uuid(),
  enrollment_number text not null unique,
  name text not null,
  rank text not null,
  unit text not null,
  division text not null check (division in ('SD', 'SW')),
  blood_group text not null,
  mobile text not null,
  photo_path text,
  father_guardian_name text not null,
  date_of_birth date not null,
  emergency_contact text not null,
  residential_address text not null,
  valid_from date not null,
  valid_till date not null,
  purpose_of_issue text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.qr_tokens (
  id uuid primary key default gen_random_uuid(),
  cadet_id uuid not null references public.cadets(id) on delete cascade,
  token_hash text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create index if not exists idx_qr_tokens_cadet_id on public.qr_tokens(cadet_id);
create index if not exists idx_qr_tokens_active_hash on public.qr_tokens(token_hash, is_active);
create index if not exists idx_cadets_enrollment_number on public.cadets(enrollment_number);

alter table public.cadets enable row level security;
alter table public.qr_tokens enable row level security;

-- No anon/authenticated policies: direct client access denied. Edge Functions use service role.
revoke all on table public.cadets from anon, authenticated;
revoke all on table public.qr_tokens from anon, authenticated;

-- Storage bucket for cadet photos
insert into storage.buckets (id, name, public)
values ('cadet-photos', 'cadet-photos', true)
on conflict (id) do nothing;

-- Public read for photos (identity card display after verification). Writes only via service role.
do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'Public read cadet photos'
  ) then
    create policy "Public read cadet photos"
      on storage.objects for select
      using (bucket_id = 'cadet-photos');
  end if;
end $$;
