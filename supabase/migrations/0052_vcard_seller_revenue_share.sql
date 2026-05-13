-- 0052 vcard_seller_revenue_share: optional seller-selected revenue share.

alter table public.vcard_seller_accounts
  add column if not exists revenue_share_bps integer not null default 1000;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'vcard_seller_accounts_revenue_share_bps_range'
  ) then
    alter table public.vcard_seller_accounts
      add constraint vcard_seller_accounts_revenue_share_bps_range
      check (revenue_share_bps between 0 and 10000);
  end if;
end $$;

-- Mandatory platform fee settings are retained for compatibility, but no longer used.
update public.vcard_settings
set value = to_jsonb(0)
where key in (
  'seller.platform_fee_bps',
  'seller.platform_fee_bps_pro',
  'seller.platform_fee_bps_team'
);