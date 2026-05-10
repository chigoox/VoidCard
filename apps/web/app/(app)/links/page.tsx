import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function shortUrl(code: string) {
  const domain = process.env.NEXT_PUBLIC_SHORT_DOMAIN;
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcard.ed5enterprise.com";
  return domain ? `https://${domain}/${code}` : `${site}/s/${code}`;
}

export default async function LinksPage() {
  const u = await requireUser();
  const sb = await createClient();
  const { data: links } = await sb
    .from("vcard_shortlinks")
    .select("id, code, target, hits, created_at")
    .eq("user_id", u.id)
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-gold-grad">Short Links</h1>
        <Link href="/links/new" className="btn-gold">+ New short link</Link>
      </header>
      <ul className="space-y-2" data-testid="links-list">
        {(links ?? []).map((l) => {
          const url = shortUrl(l.code);
          return (
            <li key={l.id} className="card flex items-center justify-between gap-3 p-4 text-sm">
              <div className="min-w-0">
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block truncate font-mono text-gold underline-offset-2 hover:underline"
                >
                  {url.replace("https://", "")}
                </a>
                <p className="truncate text-xs text-ivory-dim">{l.target}</p>
              </div>
              <span className="shrink-0 text-xs text-ivory-mute">{l.hits} taps</span>
            </li>
          );
        })}
        {(links ?? []).length === 0 && <p className="text-sm text-ivory-dim">No short links yet.</p>}
      </ul>
    </div>
  );
}
