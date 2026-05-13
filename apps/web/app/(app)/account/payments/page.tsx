import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  DEFAULT_REVENUE_SHARE_BPS,
  getSellerAccount,
  normalizeRevenueShareBps,
  refreshSellerAccount,
} from "@/lib/stripe-connect";
import { listSellerProducts } from "@/lib/seller-products";
import { ConnectStripeButton, DisconnectStripeButton, ManageStripeButton, RevenueShareControl } from "./client";

export const dynamic = "force-dynamic";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; stripe_error?: string }>;
}) {
  const u = await requireUser();
  const params = await searchParams;
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== "sk_test_dummy");
  // If user just returned from Stripe onboarding, refresh status from Stripe.
  let account = await getSellerAccount(u.id);
  if (params.connected === "1" && account) {
    account = (await refreshSellerAccount(u.id)) ?? account;
  }
  const products = await listSellerProducts(u.id);

  const status = !account
    ? "not_started"
    : account.charges_enabled && account.details_submitted
    ? "ready"
    : account.details_submitted
    ? "pending"
    : "incomplete";

  return (
    <div className="space-y-6" data-testid="payments-page">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-[0.3em] text-ivory-mute">Payments</p>
        <h1 className="font-display text-2xl text-gold-grad">Sell on your VoidCard profile</h1>
        <p className="max-w-prose text-sm text-ivory-dim">
          Connect a Stripe account to accept secure payments directly on your profile.
          Funds go to your Stripe balance. VoidCard platform fees are 0%; you choose whether to share a percentage of each sale. Stripe handles the
          login, KYC, taxes, and payouts — we never see your card or bank info.
        </p>
      </header>

      <section
        className="card space-y-4 p-5"
        aria-label="Stripe connection status"
        data-testid="payments-status-card"
      >
        {!stripeConfigured ? (
          <div className="rounded-card border border-amber-400/40 bg-amber-500/10 p-4 text-sm text-amber-100" data-testid="stripe-config-warning">
            <p className="font-display text-base">Stripe Connect needs one setup step.</p>
            <p className="mt-1 text-xs leading-5">
              Add <span className="font-mono text-amber-50">STRIPE_SECRET_KEY</span> to this app&apos;s environment, restart the dev server or redeploy, then click Connect again.
            </p>
          </div>
        ) : null}
        {params.stripe_error ? (
          <p className="rounded-card border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-100" role="alert" data-testid="stripe-return-error">
            Stripe onboarding could not reopen. Try Connect again; if it repeats, check the Stripe Connect setup and server logs.
          </p>
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-display text-base">Stripe account</p>
            <StatusBadge status={status} />
            {account?.country ? (
              <p className="mt-2 text-xs text-ivory-mute">
                Country: <span className="text-ivory">{account.country.toUpperCase()}</span>
                {account.default_currency
                  ? ` · Default currency: ${account.default_currency.toUpperCase()}`
                  : ""}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {status === "ready" || status === "pending" ? (
              <ManageStripeButton />
            ) : null}
            {status === "ready" ? null : <ConnectStripeButton label={
              status === "incomplete" ? "Finish onboarding" :
              status === "pending" ? "Continue setup" :
              "Connect with Stripe"
            } />}
            {account ? <DisconnectStripeButton /> : null}
          </div>
        </div>

        {status !== "ready" ? (
          <ul className="space-y-1 text-xs text-ivory-mute">
            <li>• Stripe-hosted onboarding — log in with your existing account or create one.</li>
            <li>• Identity verification + payout bank account live on Stripe&apos;s side.</li>
            <li>• Your earnings go directly to you; revenue sharing starts at 10% and is optional.</li>
          </ul>
        ) : null}

        {account ? (
          <RevenueShareControl initialBps={normalizeRevenueShareBps(account.revenue_share_bps)} />
        ) : (
          <RevenueShareControl initialBps={DEFAULT_REVENUE_SHARE_BPS} disabled />
        )}
      </section>

      <section className="card space-y-3 p-5" data-testid="payments-products-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-base">Your products</p>
            <p className="text-xs text-ivory-mute">
              {products.length === 0
                ? "Create a product, then add a Store section to your profile."
                : `${products.length} product${products.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <Link href="/account/products" className="btn-ghost" data-testid="manage-products">
            Manage products →
          </Link>
        </div>
        <div>
          <Link href="/account/orders" className="text-xs text-gold underline-offset-2 hover:underline">
            View sales & orders →
          </Link>
        </div>
      </section>

      <section className="card space-y-2 p-5">
        <p className="font-display text-base">How it works</p>
        <ol className="list-inside list-decimal space-y-1 text-sm text-ivory-dim">
          <li>Click <span className="text-ivory">Connect with Stripe</span> above.</li>
          <li>Sign in to Stripe (or create a new account) and finish onboarding.</li>
          <li>Add products in <Link href="/account/products" className="text-gold underline-offset-2 hover:underline">your catalog</Link>.</li>
          <li>
            On <Link href="/edit" className="text-gold underline-offset-2 hover:underline">your editor</Link>,
            add a <span className="text-ivory">Store</span> section and pick which products to feature.
          </li>
          <li>Visitors of your public profile can buy with one click.</li>
        </ol>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    not_started: { label: "Not connected", className: "border-onyx-700 text-ivory-mute" },
    incomplete: { label: "Action required", className: "border-amber-400/40 text-amber-200" },
    pending: { label: "Pending verification", className: "border-amber-400/40 text-amber-200" },
    ready: { label: "Ready to accept payments", className: "border-emerald-400/40 text-emerald-200" },
  };
  const v = map[status] ?? map.not_started!;
  return (
    <span
      className={`mt-2 inline-flex items-center rounded-pill border px-2 py-0.5 text-[11px] uppercase tracking-[0.24em] ${v.className}`}
      data-testid="payments-status-badge"
      data-status={status}
    >
      {v.label}
    </span>
  );
}
