import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "AI Policy",
  description:
    "How VoidCard handles AI crawlers, training data, and user opt-outs.",
  path: "/ai-policy",
});

export default function AiPolicyPage() {
  return (
    <main className="home-theme min-h-screen bg-onyx-grad">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-sm uppercase tracking-[0.2em] text-gold">Trust</p>
        <h1 className="mt-3 font-display text-5xl">AI Policy</h1>
        <p className="mt-6 text-lg text-ivory-dim">
          VoidCard distinguishes between AI <em>search</em> crawlers (which surface
          your profile in answers and link back) and AI <em>training</em> crawlers
          (which ingest content into a model). We default to{" "}
          <strong className="text-ivory">allow search, disallow training</strong>.
          Each user can change this for their own profile.
        </p>

        <h2 className="mt-12 font-display text-2xl text-gold-grad">
          Default rules
        </h2>
        <ul className="mt-4 space-y-2 text-ivory-dim">
          <li>
            <strong className="text-ivory">Search bots</strong> (ChatGPT Search,
            Perplexity, Claude-Web, DuckAssist, Apple Spotlight): allowed on
            public pages.
          </li>
          <li>
            <strong className="text-ivory">Training bots</strong> (GPTBot,
            ClaudeBot, anthropic-ai, Google-Extended, Applebot-Extended, CCBot,
            Bytespider): disallowed.
          </li>
          <li>
            All bots are blocked from <code>/admin</code>, <code>/api</code>,{" "}
            <code>/auth</code>, the dashboard, and short-link redirects.
          </li>
        </ul>

        <h2 className="mt-12 font-display text-2xl text-gold-grad">
          Per-user opt-out
        </h2>
        <p className="mt-4 text-ivory-dim">
          In your account &rarr; Privacy, set your AI indexing preference:
        </p>
        <ul className="mt-2 space-y-1 text-ivory-dim">
          <li>
            <code>allow_search_only</code> — default. Search yes, training no.
          </li>
          <li>
            <code>allow_all</code> — search and training both allowed.
          </li>
          <li>
            <code>disallow_all</code> — adds <code>noai, noimageai</code>{" "}
            headers and meta tags; profile is excluded from
            search-bot crawls.
          </li>
        </ul>

        <h2 className="mt-12 font-display text-2xl text-gold-grad">
          Machine-readable
        </h2>
        <p className="mt-4 text-ivory-dim">
          See{" "}
          <a className="text-gold underline" href="/robots.txt">
            /robots.txt
          </a>
          ,{" "}
          <a className="text-gold underline" href="/llms.txt">
            /llms.txt
          </a>
          , and{" "}
          <a className="text-gold underline" href="/ai.txt">
            /ai.txt
          </a>
          .
        </p>
      </div>
    </main>
  );
}
