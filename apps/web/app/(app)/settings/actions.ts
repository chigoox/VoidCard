"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { hashProfilePassword } from "@/lib/profile-password";
import { getManagedProfile, updateManagedProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { setCustomCss } from "../edit/actions";
import { getThemePreset } from "@/lib/themes/presets";

const Settings = z.object({
  profileId: z.string().optional(),
  displayName: z.string().max(64),
  bio: z.string().max(280),
  avatarUrl: z.string().max(1024),
  customCss: z.string().max(30000),
  themeId: z.string().max(64).optional(),
});

export async function saveSettings(input: unknown): Promise<{ ok: true } | { ok: false; error: string }> {
  const u = await requireUser();
  const parsed = Settings.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const profile = await getManagedProfile(u.id, parsed.data.profileId ?? null);
  if (!profile) return { ok: false, error: "profile_not_found" };

  const sb = await createClient();
  const { error } = await updateManagedProfile(u.id, profile.id, {
      display_name: parsed.data.displayName || null,
      bio: parsed.data.bio || null,
      avatar_url: parsed.data.avatarUrl || null,
      theme: { id: getThemePreset(parsed.data.themeId).id },
    });
  if (error) return { ok: false, error: error.message };

  // Custom CSS goes through its dedicated server action (size + sanitization).
  if (parsed.data.customCss !== undefined) {
    await setCustomCss(parsed.data.customCss, profile.id);
  }

  revalidatePath("/settings");
  if (profile.publicPath) revalidatePath(profile.publicPath);
  return { ok: true };
}

const ProfilePasswordSettings = z.object({
  profileId: z.string().optional(),
  password: z.string().max(128).optional(),
  clear: z.boolean().optional(),
});

export async function saveProfilePassword(
  input: unknown,
): Promise<{ ok: true; enabled: boolean } | { ok: false; error: string }> {
  const u = await requireUser();
  const parsed = ProfilePasswordSettings.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const profile = await getManagedProfile(u.id, parsed.data.profileId ?? null);
  if (!profile) return { ok: false, error: "profile_not_found" };

  const shouldClear = parsed.data.clear === true;
  const password = parsed.data.password?.trim() ?? "";
  const entitlements = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });

  if (!shouldClear && !entitlements.passwordProtected) {
    return { ok: false, error: "Password protection is available on Pro and Team." };
  }
  if (!shouldClear && password.length < 8) {
    return { ok: false, error: "Use at least 8 characters." };
  }

  const passwordHash = shouldClear ? null : await hashProfilePassword(password);
  const { error } = await updateManagedProfile(u.id, profile.id, { password_hash: passwordHash });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/settings");
  if (profile.publicPath) revalidatePath(profile.publicPath);
  return { ok: true, enabled: !shouldClear };
}
