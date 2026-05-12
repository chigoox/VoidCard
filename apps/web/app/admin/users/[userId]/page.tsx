import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadPrimaryProfile } from "@/lib/profiles";

export const dynamic = "force-dynamic";

type SharedProfileRow = {
  username: string | null;
  display_name: string | null;
  role: "user" | "admin" | "superadmin" | null;
  created_at: string | null;
  email: string | null;
};

type ProfileExtRow = {
  origin_site: string | null;
  created_at: string | null;
};

type CardRow = {
  id: string;
  serial: string;
  sku: string;
  status: string;
  total_taps: number;
  last_tap_at: string | null;
  created_at: string;
};

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  await requireAdmin();
  const { userId } = await params;
  const sb = createAdminClient();

  const [profile, sharedProfileResult, extProfileResult, cardsResult, cardCountResult, tapsCountResult] = await Promise.all([
    loadPrimaryProfile(userId),
    sb.from("profiles").select("username, display_name, role, created_at, email").eq("id", userId).maybeSingle(),
    sb.from("vcard_profile_ext").select("origin_site, created_at").eq("user_id", userId).maybeSingle(),
    sb
      .from("vcard_cards")
      .select("id, serial, sku, status, total_taps, last_tap_at, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8),
    sb.from("vcard_cards").select("id", { count: "exact", head: true }).eq("user_id", userId),
    sb.from("vcard_taps").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);

  if (!profile && !sharedProfileResult.data) notFound();

  const sharedProfile = (sharedProfileResult.data as SharedProfileRow | null) ?? null;
  const extProfile = (extProfileResult.data as ProfileExtRow | null) ?? null;
  const cards = (cardsResult.data as CardRow[] | null) ?? [];
  const username = profile?.username ?? sharedProfile?.username ?? null;
  const displayName = profile?.displayName ?? sharedProfile?.display_name ?? null;
  const role = sharedProfile?.role ?? "user";
  const createdAt = sharedProfile?.created_at ?? extProfile?.created_at ?? profile?.updatedAt ?? null;
  const originSite = extProfile?.origin_site ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Admin user</p>
          <h1 className="mt-2 font-display text-3xl text-gold-grad">
            {displayName || (username ? `@${username}` : userId.slice(0, 8))}
          </h1>
          <p className="mt-2 text-sm text-ivory-mute">{userId}</p>
        </div>
        <Link href="/admin/users" className="text-sm text-ivory-mute hover:text-ivory">← All users</Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {username ? (
          <Link href={`/u/${username}`} target="_blank" className="btn-ghost px-3 py-2 text-xs">
            Open live page
          </Link>
        ) : null}
        <Link href={`/admin/cards?user=${userId}`} className="btn-ghost px-3 py-2 text-xs">
          View cards
        </Link>
        <Link href={`/admin/users?q=${username ?? userId}`} className="btn-ghost px-3 py-2 text-xs">
          Back to filtered users
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Plan" value={profile?.plan ?? "free"} />
        <StatCard label="Role" value={role} />
        <StatCard label="Cards" value={String(cardCountResult.count ?? 0)} />
        <StatCard label="Total taps" value={String(tapsCountResult.count ?? 0)} />
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <section className="card p-5">
          <h2 className="font-display text-xl text-ivory">Profile</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <DetailRow label="Username" value={username ? `@${username}` : "—"} />
            <DetailRow label="Display name" value={displayName ?? "—"} />
            <DetailRow label="Published" value={profile?.published ? "live" : "draft"} />
            <DetailRow label="Verified" value={profile?.verified ? "yes" : "no"} />
            <DetailRow label="Origin" value={originSite ?? "shared/unknown"} />
            <DetailRow label="Joined" value={createdAt ? new Date(createdAt).toLocaleString() : "—"} />
            <DetailRow label="Public path" value={profile?.publicPath ?? "—"} />
            <DetailRow label="Email" value={sharedProfile?.email ?? "—"} />
          </dl>
        </section>

        <section className="card p-5">
          <h2 className="font-display text-xl text-ivory">Recent cards</h2>
          {cards.length === 0 ? (
            <p className="mt-4 text-sm text-ivory-mute">No cards paired to this user.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {cards.map((card) => (
                <li key={card.id} className="rounded-card border border-onyx-800 bg-onyx-950/40 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs text-ivory">{card.serial}</p>
                      <p className="mt-1 text-xs uppercase tracking-widest text-ivory-mute">{card.sku} · {card.status}</p>
                    </div>
                    <div className="text-right text-xs text-ivory-dim">
                      <p>{Number(card.total_taps).toLocaleString()} taps</p>
                      <p>{card.last_tap_at ? new Date(card.last_tap_at).toLocaleDateString() : "No taps yet"}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs uppercase tracking-widest text-ivory-mute">{label}</p>
      <p className="mt-2 font-display text-2xl text-ivory">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-widest text-ivory-mute">{label}</dt>
      <dd className="mt-1 break-all text-ivory">{value}</dd>
    </div>
  );
}