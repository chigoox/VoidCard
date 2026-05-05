import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ExchangeDonePage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <div className="card p-8 text-center">
        <h1 className="font-display text-2xl text-gold-grad">Contact sent</h1>
        <p className="mt-3 text-sm text-ivory-mute">
          Your details have been securely shared. Watch your inbox — they may follow up shortly.
        </p>
        <Link href="/" className="btn-ghost mt-6 inline-block">Back home</Link>
      </div>
    </main>
  );
}
