-- 0050 vcard_product_image_galleries: support multiple product images.

alter table public.vcard_products
  add column if not exists image_urls text[] not null default '{}'::text[];

update public.vcard_products
set image_urls = array[image_url]
where image_url is not null
  and coalesce(array_length(image_urls, 1), 0) = 0;

alter table public.vcard_seller_products
  add column if not exists image_urls text[] not null default '{}'::text[];

update public.vcard_seller_products
set image_urls = array[image_url]
where image_url is not null
  and coalesce(array_length(image_urls, 1), 0) = 0;
