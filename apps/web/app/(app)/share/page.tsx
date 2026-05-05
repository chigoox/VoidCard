import { requireUser } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function SharePage() {
  const u = await requireUser();
  const hasUsername = !!u.username;
  const url = `https://vcard.ed5enterprise.com/u/${u.username ?? "you"}`;
  const qr = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&bgcolor=0a0a0b&color=d4af37&data=${encodeURIComponent(url)}`;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">Share</h1>
        <p className="mt-1 text-sm text-ivory-dim">One link, one tap, one QR code. Pick your channel.</p>
      </header>

      <section className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">Public URL</p>
        <p className="mt-2 truncate font-mono text-gold">{url}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={url} target="_blank" rel="noreferrer" className="btn-ghost">Open</a>
          <Link href="/edit" className="btn-ghost">Edit</Link>
          <a className="btn-gold" href={`mailto:?subject=My%20card&body=${encodeURIComponent(url)}`}>Email this</a>
        </div>
      </section>

      <section className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">QR code</p>
        <div className="mt-4 grid place-items-center rounded-card bg-onyx-900 p-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="QR code" className="h-64 w-64 rounded-card" />
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
