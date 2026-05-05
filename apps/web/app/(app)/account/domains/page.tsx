import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { addCustomDomainAction, removeCustomDomainAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Custom domains · VoidCard" };

type DomainRow = {
  id: string;
  hostname: string;
  apex: boolean;
  status: string;
  ssl_status: string;
  txt_token: string;
  last_checked_at: string | null;
  created_at: string;
};

const ALERTS: Record<string, { tone: "success" | "error"; body: string }> = {
  domain_added: { tone: "success", body: "Domain saved. Add the DNS records below and the verifier will pick it up automatically." },
  domain_removed: { tone: "success", body: "Domain removed." },
  upgrade_required: { tone: "error", body: "Custom domains are a Pro feature." },
  invalid_hostname: { tone: "error", body: "Enter a valid hostname like cards.acme.com or acme.com." },
  hostname_taken: { tone: "error", body: "That hostname is already connected or pending elsewhere." },
  verified_badge_required: { tone: "error", body: "Apex domains require a Verified Badge before you can add them." },
  save_failed: { tone: "error", body: "The domain could not be saved. Try again." },
  invalid_domain: { tone: "error", body: "That domain could not be found." },
  delete_failed: { tone: "error", body: "The domain could not be removed. Try again." },
};

function rootHost() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcard.ed5enterprise.com").hostname.toLowerCase();
}

function verificationHost(hostname: string) {
  return `_voidcard-verify.${hostname}`;
}

function statusLabel(status: string, sslStatus: string) {
  if (status === "active" && sslStatus === "active") return "Live";
  if (status === "active") return "DNS verified";
  if (status === "failed") return "Needs attention";
  if (status === "verifying") return "Verifying";
  if (status === "disabled") return "Disabled";
  return "Pending DNS";
}

function statusClass(status: string, sslStatus: string) {
  if (status === "active" && sslStatus === "active") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "failed") return "border-danger/30 bg-danger/10 text-danger";
  return "border-gold/30 bg-gold/10 text-gold";
}

function formatTimestamp(value: string | null) {
  if (!value) return "Not checked yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not checked yet";
  return date.toLocaleString();
}

export default async function AccountDomainsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;
  const entitlements = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });

  const notice = params.ok ? ALERTS[params.ok] : params.error ? ALERTS[params.error] : null;

  if (!entitlements.customDomain) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="font-display text-2xl text-gold-grad">Custom domains</h1>
          <p className="mt-1 text-sm text-ivory-dim">Bring your own hostname and point it at your live profile.</p>
        </header>

        <section className="card p-6">
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Pro feature</p>
          <h2 className="mt-2 font-display text-xl">Upgrade when you want your own domain.</h2>
          <p className="mt-2 text-sm text-ivory-dim">
            Pro unlocks subdomain mapping like <span className="font-mono text-gold">cards.acme.com</span>. Apex domains like
            <span className="ml-1 font-mono text-gold">acme.com</span> also require a Verified Badge.
          </p>
          <div className="mt-4 flex gap-2">
            <Link href="/pricing" className="btn-gold">Upgrade to Pro</Link>
            <Link href="/account/verify" className="btn-ghost">Get verified</Link>
          </div>
        </section>
      </div>
    );
  }

  const sb = await createClient();
  const { data } = await sb
    .from("vcard_custom_domains")
    .select("id, hostname, apex, status, ssl_status, txt_token, last_checked_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const domains = ((data ?? []) as DomainRow[]).sort((left, right) =>
    right.created_at.localeCompare(left.created_at)
  );
  const siteHost = rootHost();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">Custom domains</h1>
        <p className="mt-1 text-sm text-ivory-dim">
          Connect your own hostname to your public profile. DNS is checked in the background and live domains route straight to @{user.username ?? "you"}.
        </p>
      </header>

      {notice ? (
        <div
          data-testid="domain-notice"
          className={`rounded-card border px-4 py-3 text-sm ${
            notice.tone === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-100"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {notice.body}
        </div>
      ) : null}

      <section className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Add a domain</p>
            <h2 className="mt-2 font-display text-xl">Point traffic at your VoidCard profile.</h2>
          </div>
          <p className="max-w-sm text-sm text-ivory-dim">
            Use a subdomain for the fastest setup. Apex domains are supported too, but they require a Verified Badge before we accept them.
          </p>
        </div>

        <form action={addCustomDomainAction} className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]" data-testid="domain-form">
          <label className="block">
            <span className="text-xs uppercase tracking-widest text-ivory-mute">Hostname</span>
            <input
              name="hostname"
              type="text"
              required
              placeholder="cards.acme.com"
              className="mt-1 w-full rounded-pill border border-onyx-600 bg-onyx-900 px-4 py-2.5 outline-none focus:border-gold/60"
              data-testid="domain-hostname"
            />
          </label>

          <div className="flex flex-col justify-end gap-3">
            <label className="flex items-center gap-2 text-sm text-ivory-dim">
              <input name="apex" type="checkbox" className="accent-gold" data-testid="domain-apex" />
              This is an apex/root domain
            </label>
            <button type="submit" className="btn-gold" data-testid="domain-submit">Add domain</button>
          </div>
        </form>

        <div className="mt-4 rounded-card border border-onyx-700 bg-onyx-950/50 p-4 text-sm text-ivory-dim">
          <p>
            Target host: <span className="font-mono text-gold">{siteHost}</span>
          </p>
          <p className="mt-2">
            TXT verification records are always created under <span className="font-mono text-gold">_voidcard-verify.&lt;your-hostname&gt;</span>.
          </p>
          {!user.verified ? (
            <p className="mt-2 text-warning">
              Apex domains are locked until you complete <Link href="/account/verify" className="text-gold underline">Verified Badge</Link>.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Your domains</p>
          <h2 className="mt-2 font-display text-xl">Status and DNS instructions</h2>
        </div>

        {domains.length === 0 ? (
          <div className="card p-6 text-sm text-ivory-dim">No custom domains yet.</div>
        ) : (
          domains.map((domain) => (
            <article key={domain.id} className="card p-6" data-testid={`domain-row-${domain.id}`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-lg">{domain.hostname}</h3>
                    <span className={`rounded-full border px-2 py-0.5 text-xs uppercase tracking-widest ${statusClass(domain.status, domain.ssl_status)}`}>
                      {statusLabel(domain.status, domain.ssl_status)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-ivory-dim">
                    {domain.apex ? "Apex/root domain" : "Subdomain"} · Last check: {formatTimestamp(domain.last_checked_at)}
                  </p>
                  {domain.status === "active" ? (
                    <p className="mt-2 text-sm text-emerald-200">
                      Live URL: <a href={`https://${domain.hostname}`} className="font-mono underline">https://{domain.hostname}</a>
                    </p>
                  ) : null}
                </div>

                <form action={removeCustomDomainAction}>
                  <input type="hidden" name="id" value={domain.id} />
                  <button type="submit" className="btn-ghost" data-testid={`domain-remove-${domain.id}`}>
                    Remove
                  </button>
                </form>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <div className="rounded-card border border-onyx-700 bg-onyx-950/50 p-4 text-sm">
                  <p className="text-xs uppercase tracking-widest text-ivory-mute">Record 1</p>
                  <p className="mt-2 font-mono text-gold" data-testid={`domain-target-name-${domain.id}`}>
                    {domain.hostname}
                  </p>
                  <p className="mt-1 text-ivory-dim">
                    {domain.apex ? "ALIAS / ANAME" : "CNAME"} to <span className="font-mono text-gold">{siteHost}</span>
                  </p>
                </div>

                <div className="rounded-card border border-onyx-700 bg-onyx-950/50 p-4 text-sm">
                  <p className="text-xs uppercase tracking-widest text-ivory-mute">Record 2</p>
                  <p className="mt-2 font-mono text-gold">{verificationHost(domain.hostname)}</p>
                  <p className="mt-1 text-ivory-dim">TXT value: <span className="font-mono text-gold" data-testid={`domain-token-${domain.id}`}>{domain.txt_token}</span></p>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  );
}