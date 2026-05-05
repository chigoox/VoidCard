-- 0028 vcard_storage — three Supabase Storage buckets + RLS policies.
-- Aligns with BUILD_PLAN.md §21 (Storage & Image Pipeline).
-- Idempotent: safe to re-run.

-- =============================================================================
-- Buckets
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'vcard-public', 'vcard-public', true,
    52428800, -- 50 MB hard cap (per-plan caps enforced server-side via /api/media/sign)
    array[
      'image/jpeg','image/png','image/webp','image/avif','image/gif',
      'video/mp4','video/webm'
    ]
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'vcard-private', 'vcard-private', false,
    104857600, -- 100 MB
    array[
      'application/pdf',
      'application/zip',
      'application/json',
      'text/csv',
      'image/jpeg','image/png','image/webp'
    ]
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'vcard-fonts', 'vcard-fonts', true,
    5242880, -- 5 MB
    array['font/woff2','application/font-woff2']
  )
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- =============================================================================
-- Storage RLS policies
-- Path convention: {bucket}/u/{user_id}/{kind}/{filename}
-- The owner is identified by the second path segment ('u/<user_id>/...').
-- =============================================================================

-- vcard-public: public read; owner-only write/delete.
drop policy if exists vcard_public_read on storage.objects;
create policy vcard_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vcard-public');

drop policy if exists vcard_public_owner_insert on storage.objects;
create policy vcard_public_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vcard-public'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists vcard_public_owner_update on storage.objects;
create policy vcard_public_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vcard-public'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'vcard-public'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists vcard_public_owner_delete on storage.objects;
create policy vcard_public_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vcard-public'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- vcard-private: owner-only read/write/delete; admin can read.
drop policy if exists vcard_private_owner_read on storage.objects;
create policy vcard_private_owner_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'vcard-private'
    and (
      ((storage.foldername(name))[1] = 'u' and (storage.foldername(name))[2] = auth.uid()::text)
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    )
  );

drop policy if exists vcard_private_owner_insert on storage.objects;
create policy vcard_private_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vcard-private'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists vcard_private_owner_update on storage.objects;
create policy vcard_private_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'vcard-private'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
  )
  with check (
    bucket_id = 'vcard-private'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists vcard_private_owner_delete on storage.objects;
create policy vcard_private_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vcard-private'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

-- vcard-fonts: public read (CDN); Pro user-owned write (woff2 only); admin global write.
drop policy if exists vcard_fonts_read on storage.objects;
create policy vcard_fonts_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'vcard-fonts');

drop policy if exists vcard_fonts_owner_insert on storage.objects;
create policy vcard_fonts_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'vcard-fonts'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
  );

drop policy if exists vcard_fonts_owner_delete on storage.objects;
create policy vcard_fonts_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'vcard-fonts'
    and (storage.foldername(name))[1] = 'u'
    and (storage.foldername(name))[2] = auth.uid()::text
  );
