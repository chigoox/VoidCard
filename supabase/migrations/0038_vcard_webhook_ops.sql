alter table public.vcard_webhooks
  add column if not exists failure_count integer not null default 0,
  add column if not exists last_error text,
  add column if not exists last_delivery_at timestamptz,
  add column if not exists last_response_code integer;

create index if not exists vcard_webhook_deliveries_pending_idx
  on public.vcard_webhook_deliveries (delivered_at)
  where status_code is null and error is null;