-- 0034 vcard_verification_anti_abuse — retain document hashes and automatic review flags

alter table public.vcard_verifications
  add column if not exists risk_flags jsonb not null default '[]'::jsonb;

alter table public.vcard_verifications
  add column if not exists risk_score integer not null default 0;

alter table public.vcard_verifications
  add column if not exists document_hashes jsonb not null default '[]'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vcard_verifications_risk_score_check'
      and conrelid = 'public.vcard_verifications'::regclass
  ) then
    alter table public.vcard_verifications
      add constraint vcard_verifications_risk_score_check
      check (risk_score >= 0);
  end if;
end
$$;

create table if not exists public.vcard_verification_document_hashes (
  id             uuid primary key default gen_random_uuid(),
  verification_id uuid not null references public.vcard_verifications(id) on delete cascade,
  user_id        uuid not null references auth.users(id) on delete cascade,
  media_id       uuid references public.vcard_media(id) on delete set null,
  document_kind  text not null,
  sha256         text not null,
  purged_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists vcard_verification_hashes_verification_sha_uq
  on public.vcard_verification_document_hashes (verification_id, document_kind, sha256);

create index if not exists vcard_verification_hashes_sha_idx
  on public.vcard_verification_document_hashes (sha256);

create index if not exists vcard_verification_hashes_user_idx
  on public.vcard_verification_document_hashes (user_id, created_at desc);

drop trigger if exists vcard_verification_hashes_updated on public.vcard_verification_document_hashes;
create trigger vcard_verification_hashes_updated
  before update on public.vcard_verification_document_hashes
  for each row execute function public.set_updated_at();

alter table public.vcard_verification_document_hashes enable row level security;

drop policy if exists vcard_verification_hashes_owner_read on public.vcard_verification_document_hashes;
create policy vcard_verification_hashes_owner_read on public.vcard_verification_document_hashes
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists vcard_verification_hashes_admin_all on public.vcard_verification_document_hashes;
create policy vcard_verification_hashes_admin_all on public.vcard_verification_document_hashes
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

comment on column public.vcard_verifications.risk_flags is
  'Automatic anti-abuse heuristics for a verification submission.';

comment on column public.vcard_verifications.risk_score is
  'Integer anti-abuse score generated during submission; higher means more review friction.';

comment on column public.vcard_verifications.document_hashes is
  'Stable SHA-256 records for uploaded verification files that remain after private uploads are purged.';
