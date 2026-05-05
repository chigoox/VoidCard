-- 0019 vcard_seed: default products + reserved usernames

create table if not exists public.vcard_reserved_usernames (
  username citext primary key
);
insert into public.vcard_reserved_usernames (username) values
  ('admin'),('api'),('app'),('auth'),('billing'),('blog'),('changelog'),('contact'),
  ('dashboard'),('docs'),('embed'),('go'),('help'),('home'),('login'),('logout'),
  ('mail'),('me'),('new'),('pricing'),('privacy'),('root'),('settings'),('shop'),
  ('signup'),('status'),('store'),('support'),('terms'),('test'),('try'),('u'),
  ('user'),('users'),('verified'),('void'),('voidcard'),('www')
on conflict do nothing;

insert into public.vcard_products (sku, name, description, price_cents, metadata) values
  ('card-pvc',         'VoidCard PVC',           'Onyx-and-gold PVC NFC card.',                    1900, '{"finish":"matte","gates_verified":false}'),
  ('card-metal',       'VoidCard Metal',         'Solid metal NFC card with gold etching.',        2900, '{"finish":"brushed","grants_verified":true}'),
  ('card-custom',      'VoidCard Custom Art',    'Custom artwork on metal — Verified required.',   4900, '{"requires_verified":true,"grants_verified":true}'),
  ('keychain',         'VoidCard Keychain',      'NFC keychain in onyx leather.',                  1500, '{}'),
  ('stickers-5',       'VoidCard Stickers (5)',  'Pack of 5 NFC stickers.',                         900, '{}'),
  ('bundle-starter',   'Starter Bundle',         '1 metal card + keychain + 5 stickers.',          3500, '{"grants_verified":true}'),
  ('team-5pack',       'Team 5-Pack',            '5 metal cards engraved with team brand.',        7900, '{"grants_verified":true,"team_seats_bonus":5}'),
  ('card-replacement', 'Replacement Card',       'Replace a lost or damaged card.',                 900, '{}'),
  ('verified-badge',   'Verified Badge',         'One-time identity check & gold check on profile.',500, '{"verified_only":true}')
on conflict (sku) do nothing;
