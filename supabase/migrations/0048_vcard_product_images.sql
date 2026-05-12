-- 0048 vcard_product_images: add image_url to products table
alter table public.vcard_products add column if not exists image_url text;
