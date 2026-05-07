import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getDiscoverPayload, type DiscoverProfile } from "@/lib/discover";
import { buildMetadata } from "@/lib/seo";

export const runtime = "edge";
export const revalidate = 60;

export const metadata: Metadata = buildMetadata({
  title: "Discover VoidCard profiles",
  description: "Search published VoidCard profiles, explore featured creators, and browse by live profile capabilities.",
  path: "/discover",
});

export default async function DiscoverPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; cursor?: string }>;
}) {
  const params = await searchParams;
  const payload = await getDiscoverPayload({
    query: params.q,
    category: params.category,
    cursor: params.cursor,
    limit: 12,
  });

  return (
    <main className="home-theme min-h-screen bg-onyx-grad">
      <div className="mx-auto max-w-6xl px-5 pb-20 pt-10">
        <header className="card grid gap-6 overflow-hidden border-paper-200 bg-[radial-gradient(circle_at_top_left,rgba(10,10,10,0.05),transparent_36%),linear-gradient(180deg,#ffffff,#fafafb)] p-6 md:grid-cols-[1.4fr,0.8fr] md:p-8">
          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.3em] text-gold/80">Public discovery</p>
            <h1 className="font-display text-4xl text-gold-grad md:text-5xl">Find live profiles worth tapping.</h1>
            <p className="max-w-2xl text-sm leading-6 text-ivory-dim md:text-base">
              Search public VoidCard profiles, scan featured creators, and filter by the sections people actually use on their cards.
            </p>
            <form className="flex flex-col gap-3 md:flex-row">
              <input
                name="q"
                defaultValue={payload.query}
                placeholder="Search by handle, name, or bio"
                className="input h-12 flex-1"
              />
              {payload.category ? <input type="hidden" name="category" value={payload.category} /> : null}
              <button className="btn-gold h-12 px-6" type="submit">Search</button>
            </form>
          </div>

          <section className="rounded-card border border-onyx-700/60 bg-onyx-950/50 p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-ivory-mute">Live filters</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <CategoryChip active={!payload.category} href={discoverHref(payload.query, "", null)}>
                All profiles
              </CategoryChip>
              {payload.categories.map((category) => (
                <CategoryChip
                  key={category.slug}
                  active={payload.category === category.slug}
                  href={discoverHref(payload.query, category.slug, null)}
                >
                  {category.label} · {category.count}
                </CategoryChip>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-ivory-mute">
              Categories are derived from live public sections, so this list shifts as profiles publish new booking, music, gallery, or lead-gen blocks.
            </p>
          </section>
        </header>

        {payload.featured.length > 0 ? (
          <section className="mt-8">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-gold/70">Featured now</p>
                <h2 className="mt-2 font-display text-2xl text-ivory">Profiles with the strongest public signal.</h2>
              </div>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {payload.featured.map((profile) => (
                <DiscoverCard key={profile.userId} profile={profile} compact />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-8">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-gold/70">Results</p>
              <h2 className="mt-2 font-display text-2xl text-ivory">
                {payload.results.length > 0 ? "Published profiles" : "No public profiles matched this search."}
              </h2>
            </div>
            {(payload.query || payload.category) && (
              <Link href="/discover" className="btn-ghost">Clear filters</Link>
            )}
          </div>

          {payload.results.length === 0 ? (
            <div className="card mt-4 p-8 text-center text-sm text-ivory-mute">
              Try a different handle, broaden the search terms, or remove the category filter.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {payload.results.map((profile) => (
                <DiscoverCard key={profile.userId} profile={profile} />
              ))}
            </div>
          )}

          {payload.nextCursor ? (
            <div className="mt-6 flex justify-center">
              <Link href={discoverHref(payload.query, payload.category, payload.nextCursor)} className="btn-ghost">
                Load more
              </Link>
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function DiscoverCard({ profile, compact = false }: { profile: DiscoverProfile; compact?: boolean }) {
  const initials = profile.displayName.replace(/^@/, "").trim().charAt(0).toUpperCase() || "V";

  return (
    <article className="card flex h-full flex-col p-5" data-testid={`discover-card-${profile.username}`}>
      <div className="flex items-start gap-4">
        {profile.avatarUrl ? (
          <Image
            src={profile.avatarUrl}
            alt={profile.displayName}
            width={64}
            height={64}
            className="h-16 w-16 rounded-pill border border-onyx-700/60 object-cover"
          />
        ) : (
          <div className="grid h-16 w-16 place-items-center rounded-pill border border-gold/25 bg-gold/10 text-xl font-semibold text-gold">
            {initials}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-display text-xl text-ivory">{profile.displayName}</h3>
            {profile.verified ? (
              <span className="rounded-pill border border-gold/40 bg-gold/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.25em] text-gold">
                Verified
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-ivory-mute">@{profile.username}</p>
        </div>
      </div>

      <p className={`mt-4 text-sm leading-6 text-ivory-dim ${compact ? "line-clamp-3" : "line-clamp-4"}`}>
        {profile.bio?.trim() || "Published on VoidCard with a live profile ready to share."}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {profile.categories.length > 0 ? (
          profile.categories.map((category) => (
            <span key={category.slug} className="rounded-pill border border-onyx-700/60 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-ivory-mute">
              {category.label}
            </span>
          ))
        ) : (
          <span className="rounded-pill border border-onyx-700/60 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-ivory-mute">
            Public profile
          </span>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 pt-2">
        <span className="text-xs uppercase tracking-[0.2em] text-ivory-mute">
          {profile.updatedAt ? `Updated ${new Date(profile.updatedAt).toLocaleDateString()}` : "Live now"}
        </span>
        <Link href={profile.profileUrl} className="btn-ghost">Open profile</Link>
      </div>
    </article>
  );
}

function CategoryChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={active
        ? "rounded-pill border border-gold/50 bg-gold/10 px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-gold"
        : "rounded-pill border border-onyx-700/60 px-3 py-1.5 text-xs uppercase tracking-[0.22em] text-ivory-mute transition hover:border-gold/40 hover:text-gold"}
    >
      {children}
    </Link>
  );
}

function discoverHref(query: string, category: string, cursor: string | null) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (category) params.set("category", category);
  if (cursor) params.set("cursor", cursor);
  const qs = params.toString();
  return qs ? `/discover?${qs}` : "/discover";
}