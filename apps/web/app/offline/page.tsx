import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Offline · VoidCard",
  description: "You appear to be offline.",
  path: "/offline",
  noindex: true,
});

export default function OfflinePage() {
  return (
    <main className="home-theme min-h-screen bg-onyx-grad">
      <div className="mx-auto flex max-w-md flex-col items-center px-6 pt-32 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-gold">VoidCard</p>
        <h1 className="mt-3 font-display text-4xl">You&rsquo;re offline.</h1>
        <p className="mt-4 text-ivory-dim">
          Recently viewed profiles will load from cache. Reconnect to refresh,
          publish, or check out.
        </p>
        <a
          href="/"
          className="btn-gold mt-8"
        >
          Try home
        </a>
      </div>
    </main>
  );
}
