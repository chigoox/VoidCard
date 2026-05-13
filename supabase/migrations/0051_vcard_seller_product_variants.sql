-- 0051 vcard_seller_product_variants: add seller product variant options.

alter table public.vcard_seller_products
  add column if not exists variants jsonb not null default '[]'::jsonb;
