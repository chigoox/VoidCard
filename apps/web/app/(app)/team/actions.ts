"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

function gateTeam(plan: string) {
  if (plan !== "team" && plan !== "enterprise") {
    throw new Error("Team plan required.");
  }
}

const CreateSchema = z.object({
  name: z.string().min(1).max(120),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/),
});

export async function createTeam(formData: FormData) {
  const u = await requireUser();
  gateTeam(u.plan);
  const parsed = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  const sb = createAdminClient();
  const { data: team, error } = await sb
    .from("vcard_teams")
    .insert({ name: parsed.data.name, slug: parsed.data.slug, owner_id: u.id })
    .select("id")
    .single();
  if (error || !team) throw new Error(error?.message ?? "Could not create team.");

  await sb.from("vcard_team_members").insert({ team_id: team.id, user_id: u.id, role: "owner" });
  await audit({ action: "team.create", actorId: u.id, targetKind: "vcard_teams", targetId: team.id });
  revalidatePath("/team");
}

const InviteSchema = z.object({
  team_id: z.string().uuid(),
  email: z.string().email().max(200),
  role: z.enum(["member", "admin"]),
});

function randomToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function inviteMember(formData: FormData) {
  const u = await requireUser();
  gateTeam(u.plan);
  const parsed = InviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  const sb = createAdminClient();

  // Verify caller owns the team.
  const { data: team } = await sb.from("vcard_teams").select("owner_id").eq("id", parsed.data.team_id).maybeSingle();
  if (!team || team.owner_id !== u.id) throw new Error("Not authorized.");

  // Seat enforcement.
  const ents = entitlementsFor(u.plan);
  const { count: memberCount } = await sb
    .from("vcard_team_members")
    .select("user_id", { count: "exact", head: true })
    .eq("team_id", parsed.data.team_id);
  const { count: inviteCount } = await sb
    .from("vcard_team_invites")
    .select("id", { count: "exact", head: true })
    .eq("team_id", parsed.data.team_id)
    .is("accepted_at", null);
  if ((memberCount ?? 0) + (inviteCount ?? 0) >= ents.seatsMax) {
    throw new Error("Seat limit reached.");
  }

  const { error } = await sb.from("vcard_team_invites").insert({
    team_id: parsed.data.team_id,
    email: parsed.data.email,
    role: parsed.data.role,
    token: randomToken(),
  });
  if (error) throw new Error(error.message);

  await audit({
    action: "team.invite",
    actorId: u.id,
    targetKind: "vcard_team_invites",
    targetId: parsed.data.team_id,
    diff: { email: parsed.data.email, role: parsed.data.role },
  });
  revalidatePath("/team");
}

const RemoveSchema = z.object({
  team_id: z.string().uuid(),
  user_id: z.string().uuid(),
});

export async function removeMember(formData: FormData) {
  const u = await requireUser();
  const parsed = RemoveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("invalid input");

  const sb = createAdminClient();
  const { data: team } = await sb.from("vcard_teams").select("owner_id").eq("id", parsed.data.team_id).maybeSingle();
  if (!team || team.owner_id !== u.id) throw new Error("Not authorized.");
  if (parsed.data.user_id === team.owner_id) throw new Error("Cannot remove team owner.");

  const { error } = await sb
    .from("vcard_team_members")
    .delete()
    .eq("team_id", parsed.data.team_id)
    .eq("user_id", parsed.data.user_id);
  if (error) throw new Error(error.message);

  await audit({
    action: "team.member.remove",
    actorId: u.id,
    targetKind: "vcard_team_members",
    targetId: parsed.data.team_id,
    diff: { user_id: parsed.data.user_id },
  });
  revalidatePath("/team");
}

const BrandSchema = z.object({
  team_id: z.string().uuid(),
  name: z.string().max(120).optional(),
  primary: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  logo_url: z.string().url().max(500).optional().or(z.literal("")),
});

export async function updateBrandKit(formData: FormData) {
  const u = await requireUser();
  const ents = entitlementsFor(u.plan);
  if (!ents.brandKit) throw new Error("Brand kit not available on your plan.");
  const parsed = BrandSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  const sb = createAdminClient();
  const { data: team } = await sb.from("vcard_teams").select("owner_id").eq("id", parsed.data.team_id).maybeSingle();
  if (!team || team.owner_id !== u.id) throw new Error("Not authorized.");

  const brand_kit = {
    name: parsed.data.name || undefined,
    primary: parsed.data.primary || undefined,
    logo_url: parsed.data.logo_url || undefined,
  };

  const { error } = await sb.from("vcard_teams").update({ brand_kit }).eq("id", parsed.data.team_id);
  if (error) throw new Error(error.message);

  await audit({ action: "team.brand_kit.update", actorId: u.id, targetKind: "vcard_teams", targetId: parsed.data.team_id });
  revalidatePath("/team");
}
