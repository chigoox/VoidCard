import { requireUser } from "@/lib/auth";
import { getManagedProfile } from "@/lib/profiles";
import { SITE_URL } from "@/lib/seo";
import { BrandedQR } from "@/components/BrandedQR";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  const u = await requireUser();
  const profile = await getManagedProfile(u.id, null);
  const hasUsername = !!u.username;
  const publicPath = profile?.published && profile.publicPath ? profile.publicPath : null;
  const url = publicPath ? new URL(publicPath, SITE_URL).toString() : null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">Share</h1>
        <p className="mt-1 text-sm text-ivory-dim">One link, one tap, one QR code. Pick your channel.</p>
      </header>

      <section className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">Public URL</p>
        <p className="mt-2 truncate font-mono text-gold">{url ?? "Publish your profile to generate a public URL."}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {url ? (
            <a href={url} target="_blank" rel="noreferrer" className="btn-ghost">Open</a>
          ) : (
            <span className="btn-ghost cursor-not-allowed opacity-60">Open</span>
          )}
          <Link href="/edit" className="btn-ghost">Edit</Link>
          {url ? (
            <a className="btn-gold" href={`mailto:?subject=My%20card&body=${encodeURIComponent(url)}`}>Email this</a>
          ) : (
            <span className="btn-gold cursor-not-allowed opacity-60">Email this</span>
          )}
        </div>
      </section>

      <section className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">QR code</p>
        <div className="mt-4 grid place-items-center rounded-card bg-onyx-900 p-6">
          {url ? (
            <BrandedQR value={url} size={288} variant="onyx" className="rounded-card shadow-[0_8px_32px_-12px_rgba(212,168,83,0.35)]" />
          ) : (
            <p className="max-w-xs text-center text-sm text-ivory-dim">
              Publish your profile first, then come back to generate a QR code that won&apos;t send visitors to a 404 page.
            </p>
          )}
        </div>
        <p className="mt-3 text-xs text-ivory-mute">Print at 600 DPI for cards. Scan range ~30cm with phone camera.</p>
      </section>

      <section className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">Add to wallet</p>
        <p className="mt-2 text-sm text-ivory-dim">Generate an Apple Wallet pass or Google Wallet pass — Free on every plan.</p>
        <div className="mt-3 flex gap-2">
          {hasUsername ? (
            <>
              <a className="btn-ghost" href={`/api/wallet/apple/${u.username}`} data-testid="wallet-apple-link">Apple Wallet</a>
              <a className="btn-ghost" href={`/api/wallet/google/${u.username}`} data-testid="wallet-google-link">Google Wallet</a>
            </>
          ) : (
            <Link href="/settings" className="btn-ghost">Set your username first</Link>
          )}
        </div>
        <p className="mt-3 text-xs text-ivory-mute">If wallet credentials are not configured yet, the route returns a clear setup error instead of a broken download.</p>
      </section>
    </div>
  );
}
