import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { createTeam, inviteMember, removeMember, updateBrandKit } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Team = {
  id: string;
  name: string;
  slug: string;
  owner_id: string;
  brand_kit: { name?: string; primary?: string; logo_url?: string } | null;
};
type Member = { team_id: string; user_id: string; role: string; created_at: string };
type Invite = { id: string; team_id: string; email: string; role: string; expires_at: string; accepted_at: string | null };

export default async function TeamPage() {
  const u = await requireUser();
  const ents = entitlementsFor(u.plan);
  const sb = await createClient();

  const { data: teamsData } = await sb
    .from("vcard_teams")
    .select("id, name, slug, owner_id, brand_kit")
    .or(`owner_id.eq.${u.id}`)
    .limit(5);
  const teams = (teamsData as Team[] | null) ?? [];

  const team = teams[0] ?? null;

  if (!team) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Team</h1>
          <p className="mt-1 text-sm text-ivory-mute">Collaborate with up to {ents.seatsMax} teammates.</p>
        </div>

        {u.plan !== "team" && u.plan !== "enterprise" ? (
          <div className="card p-6">
            <h2 className="font-display text-lg text-gold-grad">Upgrade to Team</h2>
            <p className="mt-2 text-sm text-ivory-mute">Team plans include 10 seats, brand kit, and 250 GB pooled storage.</p>
            <Link href="/pricing" className="btn-primary mt-4 inline-block">View pricing</Link>
          </div>
        ) : (
          <form action={createTeam} className="card flex flex-wrap items-end gap-3 p-6">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs uppercase tracking-widest text-ivory-mute">Team name</label>
              <input name="name" required maxLength={120} className="input w-full" />
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-xs uppercase tracking-widest text-ivory-mute">Slug</label>
              <input name="slug" required maxLength={40} pattern="[a-z0-9-]+" className="input w-full" />
            </div>
            <button type="submit" className="btn-primary">Create team</button>
          </form>
        )}
      </div>
    );
  }

  const { data: membersData } = await sb
    .from("vcard_team_members")
    .select("team_id, user_id, role, created_at")
    .eq("team_id", team.id);
  const members = (membersData as Member[] | null) ?? [];

  const { data: invitesData } = await sb
    .from("vcard_team_invites")
    .select("id, team_id, email, role, expires_at, accepted_at")
    .eq("team_id", team.id)
    .is("accepted_at", null);
  const invites = (invitesData as Invite[] | null) ?? [];

  const isOwner = team.owner_id === u.id;
  const seatsUsed = members.length + invites.length;
  const seatsLeft = Math.max(0, ents.seatsMax - seatsUsed);

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">{team.name}</h1>
          <p className="mt-1 text-sm text-ivory-mute">
            {seatsUsed} / {ents.seatsMax} seats used · @{team.slug}
          </p>
        </div>
      </div>

      <section className="card p-6">
        <h2 className="font-display text-lg text-gold-grad">Members</h2>
        <ul className="mt-4 divide-y divide-onyx-700/60">
          {members.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <div className="font-mono text-xs text-ivory-mute">{m.user_id.slice(0, 12)}…</div>
                <span className="rounded-pill border border-onyx-700/60 px-2 py-0.5 text-xs">{m.role}</span>
              </div>
              {isOwner && m.user_id !== team.owner_id && (
                <form action={removeMember}>
                  <input type="hidden" name="team_id" value={team.id} />
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <button className="text-xs text-red-400 hover:underline" type="submit">remove</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-lg text-gold-grad">Invites</h2>
        {invites.length === 0 ? (
          <p className="mt-3 text-sm text-ivory-mute">No pending invites.</p>
        ) : (
          <ul className="mt-4 divide-y divide-onyx-700/60">
            {invites.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="text-ivory">{i.email}</div>
                  <div className="text-xs text-ivory-mute">
                    {i.role} · expires {new Date(i.expires_at).toLocaleDateString()}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {isOwner && seatsLeft > 0 && (
          <form action={inviteMember} className="mt-6 flex flex-wrap items-end gap-3">
            <input type="hidden" name="team_id" value={team.id} />
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs uppercase tracking-widest text-ivory-mute">Email</label>
              <input name="email" type="email" required maxLength={200} className="input w-full" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-ivory-mute">Role</label>
              <select name="role" defaultValue="member" className="input">
                <option value="member">member</option>
                <option value="admin">admin</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">Invite</button>
          </form>
        )}
      </section>

      {ents.brandKit && isOwner && (
        <section className="card p-6">
          <h2 className="font-display text-lg text-gold-grad">Brand kit</h2>
          <p className="mt-1 text-xs text-ivory-mute">Applied to all team profiles.</p>
          <form action={updateBrandKit} className="mt-4 grid gap-4 md:grid-cols-3">
            <input type="hidden" name="team_id" value={team.id} />
            <div>
              <label className="block text-xs uppercase tracking-widest text-ivory-mute">Brand name</label>
              <input name="name" defaultValue={team.brand_kit?.name ?? ""} maxLength={120} className="input w-full" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-ivory-mute">Primary color</label>
              <input name="primary" defaultValue={team.brand_kit?.primary ?? "#D4AF37"} pattern="#[0-9a-fA-F]{6}" className="input w-full" />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-ivory-mute">Logo URL</label>
              <input name="logo_url" defaultValue={team.brand_kit?.logo_url ?? ""} maxLength={500} className="input w-full" />
            </div>
            <div className="md:col-span-3">
              <button type="submit" className="btn-primary">Save brand kit</button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}
