-- 0045 vcard_lead_forms: persist whether a public form section requires
-- Cloudflare Turnstile verification before accepting submissions.

alter table public.vcard_lead_forms
  add column if not exists require_captcha boolean not null default false;