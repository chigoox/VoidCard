begin;
select plan(13);

do $$
declare
  owner_id uuid := '10000000-0000-0000-0000-000000000001';
  stranger_id uuid := '10000000-0000-0000-0000-000000000002';
  admin_id uuid := '10000000-0000-0000-0000-000000000003';
  form_id uuid;
begin
  insert into auth.users (
    id, instance_id, aud, role, email, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at
  ) values
    (
      owner_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'owner+rls@voidcard.test', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now()
    ),
    (
      stranger_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'stranger+rls@voidcard.test', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now()
    ),
    (
      admin_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
      'admin+rls@voidcard.test', now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      now(), now()
    )
  on conflict (id) do nothing;

  insert into public.profiles (id, role)
  values
    (owner_id, 'user'),
    (stranger_id, 'user'),
    (admin_id, 'admin')
  on conflict (id) do update set role = excluded.role;

  insert into public.vcard_profile_ext (user_id, username, display_name, published, plan)
  values (owner_id, 'rls-owner', 'RLS Owner', true, 'pro')
  on conflict (user_id) do update
    set username = excluded.username,
        display_name = excluded.display_name,
        published = excluded.published,
        deleted_at = null,
        plan = excluded.plan;

  insert into public.vcard_custom_domains (user_id, hostname, status)
  values (owner_id, 'rls-owner.example.com', 'active')
  on conflict (hostname) do update
    set user_id = excluded.user_id,
        status = excluded.status;

  perform public.vcard_insert_contact_secure(
    owner_id,
    'exchange',
    'Lead Owner',
    'lead-owner@example.com',
    '+15551234567',
    'VoidCard',
    'Met at launch',
    '{"ip_hash":"fixture","ua":"pgTAP"}'::jsonb,
    'rls-test-key'
  );

  insert into public.vcard_lead_forms (owner_id, profile_id, name, fields, enabled)
  values (
    owner_id,
    owner_id,
    'Fixture Form',
    '[{"name":"name","label":"Name","type":"text","required":true}]'::jsonb,
    true
  )
  on conflict do nothing;

  select lf.id
  into form_id
  from public.vcard_lead_forms lf
  where lf.owner_id = owner_id
  order by lf.created_at asc
  limit 1;

  perform public.vcard_insert_form_submission_secure(
    form_id,
    owner_id,
    '{"name":"Lead Owner","message":"Interested in team pricing"}'::jsonb,
    'lead-form@example.com',
    '+15557654321',
    'fixture-hash',
    'pgTAP',
    'profile',
    'new',
    'rls-test-key'
  );
end;
$$;

set local role anon;
select is(
  (select count(*)::int from public.vcard_active_domains where hostname = 'rls-owner.example.com'),
  1,
  'anon can read active custom domains via public view'
);

select isnt(
  pg_get_viewdef('public.vcard_active_domains'::regclass, true) like '%deleted_at is null%',
  false,
  'active domain view filters deleted profiles'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

select is(
  (select count(*)::int from public.vcard_contacts),
  1,
  'owner can read own encrypted contacts through base table RLS'
);

select is(
  (select email from public.vcard_list_form_submissions_secure('new', 10, 'rls-test-key') limit 1),
  'lead-form@example.com',
  'owner can decrypt own submission email through secure RPC'
);

select throws_ok(
  $$
    insert into public.vcard_contacts (owner_id, source, email)
    values ('10000000-0000-0000-0000-000000000001', 'manual', 'should-not-work@example.com')
  $$,
  '.*row-level security.*|.*permission denied.*',
  'direct authenticated inserts into vcard_contacts are blocked'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

select is(
  (select count(*)::int from public.vcard_contacts),
  0,
  'non-owner cannot read another user''s contacts'
);

select is(
  (select count(*)::int from public.vcard_list_form_submissions_secure('new', 10, 'rls-test-key')),
  0,
  'non-owner secure RPC returns no submission rows'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000003', true);

select is(
  (select count(*)::int from public.vcard_contacts),
  1,
  'admin can read contact rows through admin override'
);

select is(
  (select email from public.vcard_list_form_submissions_secure('new', 10, 'rls-test-key') limit 1),
  'lead-form@example.com',
  'admin can decrypt submission email through secure RPC'
);

reset role;
select ok(
  (select email is null from public.vcard_form_submissions order by created_at desc limit 1),
  'submission plaintext email is cleared at rest'
);

select ok(
  (select email_enc is not null from public.vcard_form_submissions order by created_at desc limit 1),
  'submission ciphertext is stored'
);

select ok(
  (select raw is null from public.vcard_contacts order by captured_at desc limit 1),
  'contact plaintext metadata is cleared at rest'
);

select ok(
  (select raw_enc is not null from public.vcard_contacts order by captured_at desc limit 1),
  'contact ciphertext metadata is stored'
);

select * from finish();
rollback;
