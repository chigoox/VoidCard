import Link from "next/link";

export const metadata = {
  title: "Domain not connected · VoidCard",
  robots: { index: false, follow: false },
};

export default function DomainNotFoundPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-onyx-grad px-6">
      <div className="card w-full max-w-2xl p-8">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">Custom domain</p>
        <h1 className="mt-3 font-display text-3xl text-gold-grad">This hostname is not live yet.</h1>
        <p className="mt-3 text-sm text-ivory-dim">
          The domain either has not been connected to a VoidCard profile yet, or its DNS verification has not completed.
        </p>
        <div className="mt-6 space-y-2 text-sm text-ivory-dim">
          <p>Check that the CNAME or ALIAS points at VoidCard.</p>
          <p>Check that the TXT record under <span className="font-mono text-gold">_voidcard-verify.&lt;hostname&gt;</span> matches the token in Account → Custom domains.</p>
          <p>DNS changes can take a few minutes to propagate.</p>
        </div>
        <div className="mt-6 flex gap-2">
          <Link href="/account/domains" className="btn-gold">Manage domains</Link>
          <Link href="/pricing" className="btn-ghost">See plans</Link>
        </div>
      </div>
    </main>
  );
}