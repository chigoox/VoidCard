-- 0024 vcard_seed_voidluxury: a deterministic demo profile for /u/voidluxury
-- The example profile is rendered without an auth.users row by relaxing the FK
-- check via `verified` admin client RLS bypass; we still need a user_id, so we
-- generate a fixed UUID that won't collide with real users.

-- NOTE: This seed creates an auth.users row only if it doesn't already exist.
-- It uses Supabase's `auth.users` table with `aud='authenticated'`.

do $$
declare
  demo_id uuid := '00000000-0000-0000-0000-00000000d3m0';
begin
  -- Insert into auth.users only when missing. Supabase managed columns get
  -- defaults; we set the ones we control.
  if not exists (select 1 from auth.users where id = demo_id) then
    insert into auth.users (
      id, instance_id, aud, role, email, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      demo_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'demo+voidluxury@vcard.ed5enterprise.com', now(),
      '{"provider":"seed","providers":["seed"]}'::jsonb,
      '{"display_name":"Void Luxury"}'::jsonb,
      now(), now()
    );
  end if;

  -- Profile shared row (id + role).
  insert into public.profiles (id, role)
  values (demo_id, 'user')
  on conflict (id) do nothing;
end $$;

-- VoidCard profile_ext for the demo handle.
insert into public.vcard_profile_ext (
  user_id, username, display_name, bio, avatar_url, theme, sections, published, verified, plan
) values (
  '00000000-0000-0000-0000-00000000d3m0',
  'voidluxury',
  'Void Luxury',
  'Onyx & gold. Drops at 7pm ET. Tap once, every link is yours.',
  'https://api.dicebear.com/7.x/initials/svg?seed=VL&backgroundColor=0a0a0b&fontFamily=serif',
  '{"id":"onyx-gold"}'::jsonb,
  jsonb_build_array(
    jsonb_build_object(
      'id', '11111111-1111-1111-1111-111111111111',
      'type', 'header',
      'visible', true,
      'props', jsonb_build_object('name','Void Luxury','tagline','Onyx & gold drops','showVerified', true)
    ),
    jsonb_build_object(
      'id', '22222222-2222-2222-2222-222222222222',
      'type', 'link',
      'visible', true,
      'props', jsonb_build_object('label','Latest drop','url','https://voidluxury.example.com/drop','style','pill')
    ),
    jsonb_build_object(
      'id', '33333333-3333-3333-3333-333333333333',
      'type', 'link',
      'visible', true,
      'props', jsonb_build_object('label','Lookbook','url','https://voidluxury.example.com/lookbook','style','pill')
    ),
    jsonb_build_object(
      'id', '44444444-4444-4444-4444-444444444444',
      'type', 'social',
      'visible', true,
      'props', jsonb_build_object('items', jsonb_build_array(
        jsonb_build_object('platform','instagram','handle','voidluxury'),
        jsonb_build_object('platform','tiktok','handle','voidluxury')
      ))
    ),
    jsonb_build_object(
      'id', '55555555-5555-5555-5555-555555555555',
      'type', 'spacer',
      'visible', true,
      'props', jsonb_build_object('height', 16)
    )
  ),
  true, true, 'pro'
)
on conflict (user_id) do update set
  username = excluded.username,
  display_name = excluded.display_name,
  bio = excluded.bio,
  avatar_url = excluded.avatar_url,
  theme = excluded.theme,
  sections = excluded.sections,
  published = excluded.published,
  verified = excluded.verified,
  plan = excluded.plan;
