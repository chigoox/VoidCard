import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { WEBHOOK_EVENTS } from "@/lib/webhook-queue";
import {
  createWebhookAction,
  deleteWebhookAction,
  sendTestWebhookAction,
  toggleWebhookAction,
} from "./actions";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const u = await requireUser();
  const ent = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });

  if (!ent.apiAccess) {
    return (
      <div className="card p-6">
        <h1 className="font-display text-2xl text-gold-grad">API & Webhooks</h1>
        <p className="mt-2 text-sm text-ivory-dim">
          The public API and signed webhooks are a Pro feature.
        </p>
        <Link href="/pricing" className="btn-gold mt-4 inline-flex">Upgrade to Pro</Link>
      </div>
    );
  }

  const sb = await createClient();
  const [{ data: keys }, { data: hooks }] = await Promise.all([
    sb
      .from("vcard_api_keys")
      .select("id, prefix, name, last_used_at, created_at, revoked_at")
      .eq("user_id", u.id)
      .order("created_at", { ascending: false }),
    sb
      .from("vcard_webhooks")
      .select("id, url, secret, events, active, failure_count, last_error, last_delivery_at, last_response_code, created_at")
      .eq("user_id", u.id)
      .order("created_at", { ascending: false }),
  ]);

  const hookIds = (hooks ?? []).map((hook) => hook.id);
  const { data: deliveries } = hookIds.length
    ? await sb
        .from("vcard_webhook_deliveries")
        .select("id, webhook_id, event, status_code, error, attempt, delivered_at")
        .in("webhook_id", hookIds)
        .order("delivered_at", { ascending: false })
        .limit(12)
    : { data: [] as Array<{ id: string; webhook_id: string; event: string; status_code: number | null; error: string | null; attempt: number; delivered_at: string }> };

  const hookById = new Map((hooks ?? []).map((hook) => [hook.id, hook]));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">API & Webhooks</h1>
        <p className="mt-1 text-sm text-ivory-dim">Programmatic access to your profile and tap data.</p>
      </header>

      <section className="card p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-ivory-mute">API keys</p>
          <form action="/api/v1/keys" method="POST">
            <button className="btn-ghost" type="submit">+ New key</button>
          </form>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {(keys ?? []).map((k) => (
            <li key={k.id} className="flex items-center justify-between rounded-card border border-onyx-700 px-3 py-2">
              <span className="font-mono text-gold">{k.prefix}…</span>
              <span className="text-ivory-mute">{k.name ?? "—"}</span>
              <span className="text-xs text-ivory-dim">
                {k.revoked_at
                  ? "revoked"
                  : k.last_used_at
                    ? `used ${new Date(k.last_used_at).toLocaleDateString()}`
                    : "unused"}
              </span>
            </li>
          ))}
          {(keys ?? []).length === 0 && <p className="text-ivory-dim">No keys yet.</p>}
        </ul>
        <p className="mt-3 text-xs text-ivory-mute">
          Read the <Link href="/docs/api" className="text-gold">API reference</Link>.
        </p>
      </section>

      <section className="card p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Webhooks</p>
            <p className="mt-2 text-sm text-ivory-dim">
              Signed deliveries for <span className="text-ivory">tap.created</span>, <span className="text-ivory">contact.captured</span>, and <span className="text-ivory">order.paid</span>.
            </p>
            {!u.verified && (
              <p className="mt-2 text-xs text-ivory-mute">
                HTTPS endpoints are required until you complete <Link href="/account/verify" className="text-gold">Verified Badge</Link>.
              </p>
            )}
          </div>
          <form action={createWebhookAction} className="grid w-full max-w-xl gap-3 rounded-card border border-onyx-700 p-4" data-testid="webhook-create-form">
            <label className="space-y-1 text-sm text-ivory-dim">
              <span className="text-xs uppercase tracking-widest text-ivory-mute">Destination URL</span>
              <input
                name="url"
                type="url"
                required
                placeholder={u.verified ? "https://example.com/webhooks/voidcard or http://localhost:3000/hook" : "https://example.com/webhooks/voidcard"}
                className="w-full rounded-md border border-onyx-700 bg-onyx-950 px-3 py-2 text-ivory outline-none focus:border-gold"
                data-testid="webhook-url-input"
              />
            </label>
            <div>
              <p className="text-xs uppercase tracking-widest text-ivory-mute">Events</p>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-ivory-dim">
                {WEBHOOK_EVENTS.map((event) => (
                  <label key={event} className="inline-flex items-center gap-2 rounded-pill border border-onyx-700 px-3 py-2">
                    <input type="checkbox" name="events" value={event} defaultChecked />
                    <span>{event}</span>
                  </label>
                ))}
              </div>
            </div>
            <button className="btn-gold w-full sm:w-auto" type="submit" data-testid="webhook-create-submit">Add webhook</button>
          </form>
        </div>
        <ul className="mt-3 space-y-2 text-sm">
          {(hooks ?? []).map((h) => (
            <li key={h.id} className="rounded-card border border-onyx-700 px-4 py-4" data-testid={`webhook-row-${h.id}`}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="truncate font-mono text-gold">{h.url}</p>
                  <p className="text-xs text-ivory-mute">{(h.events ?? []).join(", ")}</p>
                  <p className="text-xs text-ivory-dim">Secret: <span className="font-mono text-ivory">{h.secret}</span></p>
                  <p className="text-xs text-ivory-dim">
                    {h.active ? "Active" : "Disabled"}
                    {h.last_delivery_at ? ` · last delivery ${new Date(h.last_delivery_at).toLocaleString()}` : ""}
                    {typeof h.last_response_code === "number" ? ` · ${h.last_response_code}` : ""}
                  </p>
                  {h.last_error && <p className="text-xs text-amber-300">Last error: {h.last_error}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={sendTestWebhookAction}>
                    <input type="hidden" name="id" value={h.id} />
                    <button className="btn-ghost" type="submit" data-testid={`webhook-send-test-${h.id}`}>Send test</button>
                  </form>
                  <form action={toggleWebhookAction}>
                    <input type="hidden" name="id" value={h.id} />
                    <input type="hidden" name="active" value={h.active ? "false" : "true"} />
                    <button className="btn-ghost" type="submit" data-testid={`webhook-toggle-${h.id}`}>{h.active ? "Disable" : "Enable"}</button>
                  </form>
                  <form action={deleteWebhookAction}>
                    <input type="hidden" name="id" value={h.id} />
                    <button className="btn-ghost" type="submit" data-testid={`webhook-delete-${h.id}`}>Delete</button>
                  </form>
                </div>
              </div>
            </li>
          ))}
          {(hooks ?? []).length === 0 && <p className="text-ivory-dim">No webhooks configured.</p>}
        </ul>
      </section>

      <section className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">Recent deliveries</p>
        <ul className="mt-3 space-y-2 text-sm">
          {(deliveries ?? []).map((delivery) => {
            const hook = hookById.get(delivery.webhook_id);
            return (
              <li key={delivery.id} className="rounded-card border border-onyx-700 px-3 py-3" data-testid="webhook-delivery-row">
                <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-mono text-gold">{hook?.url ?? delivery.webhook_id}</p>
                    <p className="text-xs text-ivory-mute">{delivery.event} · attempt {delivery.attempt}</p>
                  </div>
                  <div className="text-right text-xs text-ivory-dim">
                    <div>
                      {typeof delivery.status_code === "number"
                        ? `HTTP ${delivery.status_code}`
                        : delivery.error
                          ? "failed"
                          : "queued"}
                    </div>
                    <div>{new Date(delivery.delivered_at).toLocaleString()}</div>
                  </div>
                </div>
                {delivery.error && <p className="mt-2 text-xs text-amber-300">{delivery.error}</p>}
              </li>
            );
          })}
          {(deliveries ?? []).length === 0 && <p className="text-ivory-dim">No deliveries yet.</p>}
        </ul>
      </section>
    </div>
  );
}
