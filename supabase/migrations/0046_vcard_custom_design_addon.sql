-- 0046 vcard custom design add-on: default editable add-on price for
-- attaching a saved card-designer file to eligible card purchases.

insert into public.vcard_settings (key, value)
values ('shop.custom_design_addon_cents', '1000'::jsonb)
on conflict (key) do nothing;