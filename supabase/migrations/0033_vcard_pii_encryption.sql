-- 0033 vcard_pii_encryption
-- Encrypt captured lead/contact PII with pgcrypto and expose controlled RPCs
-- for the server-rendered app surfaces that need decrypted reads.

alter table public.vcard_contacts
  add column if not exists name_enc bytea;

alter table public.vcard_contacts
  add column if not exists email_enc bytea;

alter table public.vcard_contacts
  add column if not exists phone_enc bytea;

alter table public.vcard_contacts
  add column if not exists company_enc bytea;

alter table public.vcard_contacts
  add column if not exists note_enc bytea;

alter table public.vcard_contacts
  add column if not exists raw_enc bytea;

alter table public.vcard_form_submissions
  alter column payload drop not null;

alter table public.vcard_form_submissions
  alter column payload drop default;

alter table public.vcard_form_submissions
  add column if not exists payload_enc bytea;

alter table public.vcard_form_submissions
  add column if not exists email_enc bytea;

alter table public.vcard_form_submissions
  add column if not exists phone_enc bytea;

create or replace function public.vcard_require_encryption_key(p_key text)
returns text
language plpgsql
as $$
begin
  if coalesce(btrim(p_key), '') = '' then
    raise exception 'VCARD_DB_ENCRYPTION_KEY missing';
  end if;

  return p_key;
end;
$$;

create or replace function public.vcard_encrypt_text(p_value text, p_key text)
returns bytea
language sql
as $$
  select case
    when p_value is null then null
    else pgp_sym_encrypt(
      p_value,
      public.vcard_require_encryption_key(p_key),
      'cipher-algo=aes256,compress-algo=1'
    )
  end
$$;

create or replace function public.vcard_encrypt_jsonb(p_value jsonb, p_key text)
returns bytea
language sql
as $$
  select case
    when p_value is null then null
    else pgp_sym_encrypt(
      p_value::text,
      public.vcard_require_encryption_key(p_key),
      'cipher-algo=aes256,compress-algo=1'
    )
  end
$$;

create or replace function public.vcard_decrypt_text(p_value bytea, p_key text)
returns text
language sql
stable
as $$
  select case
    when p_value is null then null
    else pgp_sym_decrypt(p_value, public.vcard_require_encryption_key(p_key))
  end
$$;

create or replace function public.vcard_decrypt_jsonb(p_value bytea, p_key text)
returns jsonb
language sql
stable
as $$
  select case
    when p_value is null then null
    else pgp_sym_decrypt(p_value, public.vcard_require_encryption_key(p_key))::jsonb
  end
$$;

create or replace function public.vcard_insert_contact_secure(
  p_owner_id uuid,
  p_source text,
  p_name text default null,
  p_email text default null,
  p_phone text default null,
  p_company text default null,
  p_note text default null,
  p_raw jsonb default null,
  p_encryption_key text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_key text := public.vcard_require_encryption_key(p_encryption_key);
begin
  insert into public.vcard_contacts (
    owner_id,
    source,
    name,
    email,
    phone,
    company,
    note,
    raw,
    name_enc,
    email_enc,
    phone_enc,
    company_enc,
    note_enc,
    raw_enc
  ) values (
    p_owner_id,
    p_source,
    null,
    null,
    null,
    null,
    null,
    null,
    public.vcard_encrypt_text(p_name, v_key),
    public.vcard_encrypt_text(p_email, v_key),
    public.vcard_encrypt_text(p_phone, v_key),
    public.vcard_encrypt_text(p_company, v_key),
    public.vcard_encrypt_text(p_note, v_key),
    public.vcard_encrypt_jsonb(p_raw, v_key)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.vcard_insert_form_submission_secure(
  p_form_id uuid,
  p_owner_id uuid,
  p_payload jsonb default '{}'::jsonb,
  p_email text default null,
  p_phone text default null,
  p_ip_hash text default null,
  p_ua text default null,
  p_source text default null,
  p_status text default 'new',
  p_encryption_key text default null
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_key text := public.vcard_require_encryption_key(p_encryption_key);
begin
  insert into public.vcard_form_submissions (
    form_id,
    owner_id,
    payload,
    email,
    phone,
    ip_hash,
    ua,
    source,
    status,
    payload_enc,
    email_enc,
    phone_enc
  ) values (
    p_form_id,
    p_owner_id,
    null,
    null,
    null,
    p_ip_hash,
    p_ua,
    p_source,
    coalesce(p_status, 'new'),
    public.vcard_encrypt_jsonb(coalesce(p_payload, '{}'::jsonb), v_key),
    public.vcard_encrypt_text(p_email, v_key),
    public.vcard_encrypt_text(p_phone, v_key)
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.vcard_list_contacts_secure(
  p_limit integer default 100,
  p_encryption_key text default null
)
returns table (
  id uuid,
  owner_id uuid,
  source text,
  name text,
  email text,
  phone text,
  company text,
  note text,
  raw jsonb,
  captured_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    c.id,
    c.owner_id,
    c.source,
    coalesce(public.vcard_decrypt_text(c.name_enc, p_encryption_key), c.name) as name,
    coalesce(public.vcard_decrypt_text(c.email_enc, p_encryption_key), c.email) as email,
    coalesce(public.vcard_decrypt_text(c.phone_enc, p_encryption_key), c.phone) as phone,
    coalesce(public.vcard_decrypt_text(c.company_enc, p_encryption_key), c.company) as company,
    coalesce(public.vcard_decrypt_text(c.note_enc, p_encryption_key), c.note) as note,
    coalesce(public.vcard_decrypt_jsonb(c.raw_enc, p_encryption_key), c.raw) as raw,
    c.captured_at
  from public.vcard_contacts c
  where c.owner_id = auth.uid()
     or exists (
       select 1
       from public.profiles p
       where p.id = auth.uid()
         and p.role = 'admin'
     )
  order by c.captured_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500)
$$;

create or replace function public.vcard_list_form_submissions_secure(
  p_status text default 'new',
  p_limit integer default 100,
  p_encryption_key text default null
)
returns table (
  id uuid,
  email text,
  phone text,
  payload jsonb,
  source text,
  status text,
  created_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    s.id,
    coalesce(public.vcard_decrypt_text(s.email_enc, p_encryption_key), s.email) as email,
    coalesce(public.vcard_decrypt_text(s.phone_enc, p_encryption_key), s.phone) as phone,
    coalesce(public.vcard_decrypt_jsonb(s.payload_enc, p_encryption_key), s.payload) as payload,
    s.source,
    s.status,
    s.created_at
  from public.vcard_form_submissions s
  where (
      s.owner_id = auth.uid()
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'admin'
      )
    )
    and s.status = coalesce(p_status, 'new')
  order by s.created_at desc
  limit least(greatest(coalesce(p_limit, 100), 1), 500)
$$;

create or replace function public.vcard_backfill_sensitive_pii(
  p_encryption_key text
)
returns table (
  table_name text,
  row_count bigint
)
language plpgsql
set search_path = public
as $$
declare
  v_key text := public.vcard_require_encryption_key(p_encryption_key);
  v_contacts_count bigint := 0;
  v_submissions_count bigint := 0;
begin
  update public.vcard_contacts
  set
    name_enc = coalesce(name_enc, public.vcard_encrypt_text(name, v_key)),
    email_enc = coalesce(email_enc, public.vcard_encrypt_text(email, v_key)),
    phone_enc = coalesce(phone_enc, public.vcard_encrypt_text(phone, v_key)),
    company_enc = coalesce(company_enc, public.vcard_encrypt_text(company, v_key)),
    note_enc = coalesce(note_enc, public.vcard_encrypt_text(note, v_key)),
    raw_enc = coalesce(raw_enc, public.vcard_encrypt_jsonb(raw, v_key)),
    name = null,
    email = null,
    phone = null,
    company = null,
    note = null,
    raw = null
  where name is not null
     or email is not null
     or phone is not null
     or company is not null
     or note is not null
     or raw is not null;
  get diagnostics v_contacts_count = row_count;

  update public.vcard_form_submissions
  set
    payload_enc = coalesce(payload_enc, public.vcard_encrypt_jsonb(payload, v_key)),
    email_enc = coalesce(email_enc, public.vcard_encrypt_text(email, v_key)),
    phone_enc = coalesce(phone_enc, public.vcard_encrypt_text(phone, v_key)),
    payload = null,
    email = null,
    phone = null
  where payload is not null
     or email is not null
     or phone is not null;
  get diagnostics v_submissions_count = row_count;

  return query
    values
      ('vcard_contacts', v_contacts_count),
      ('vcard_form_submissions', v_submissions_count);
end;
$$;

drop policy if exists vcard_contacts_owner_rw on public.vcard_contacts;
drop policy if exists vcard_contacts_owner_read on public.vcard_contacts;
create policy vcard_contacts_owner_read on public.vcard_contacts
  for select to authenticated
  using (
    auth.uid() = owner_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists vcard_form_submissions_owner_read on public.vcard_form_submissions;
create policy vcard_form_submissions_owner_read on public.vcard_form_submissions
  for select to authenticated
  using (
    auth.uid() = owner_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

drop policy if exists vcard_form_submissions_owner_update on public.vcard_form_submissions;
create policy vcard_form_submissions_owner_update on public.vcard_form_submissions
  for update to authenticated
  using (
    auth.uid() = owner_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  )
  with check (
    auth.uid() = owner_id
    or exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
    )
  );

revoke all on function public.vcard_insert_contact_secure(uuid, text, text, text, text, text, text, jsonb, text) from public, anon, authenticated;
grant execute on function public.vcard_insert_contact_secure(uuid, text, text, text, text, text, text, jsonb, text) to service_role;

revoke all on function public.vcard_insert_form_submission_secure(uuid, uuid, jsonb, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.vcard_insert_form_submission_secure(uuid, uuid, jsonb, text, text, text, text, text, text, text) to service_role;

revoke all on function public.vcard_list_contacts_secure(integer, text) from public, anon;
grant execute on function public.vcard_list_contacts_secure(integer, text) to authenticated, service_role;

revoke all on function public.vcard_list_form_submissions_secure(text, integer, text) from public, anon;
grant execute on function public.vcard_list_form_submissions_secure(text, integer, text) to authenticated, service_role;

revoke all on function public.vcard_backfill_sensitive_pii(text) from public, anon, authenticated;
grant execute on function public.vcard_backfill_sensitive_pii(text) to service_role;

do $$
declare
  configured_key text := current_setting('app.settings.encryption_key', true);
begin
  if coalesce(configured_key, '') <> '' then
    perform public.vcard_backfill_sensitive_pii(configured_key);
  end if;
end;
$$;