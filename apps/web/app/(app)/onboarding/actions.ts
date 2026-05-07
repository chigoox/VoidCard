"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  PRIMARY_PROFILE_ID,
  getManagedProfile,
  updateManagedProfile,
  validateProfileUsername,
} from "@/lib/profiles";
import { Sections, type Sections as SectionsRecord } from "@/lib/sections/types";
import {
  ONBOARDING_TOTAL_STEPS,
  setOnboardingStep,
  writeOnboardingCookie,
} from "@/lib/onboarding";
import { buildVibeSections, vibeThemeId } from "@/lib/onboarding-vibes";

const Step = z.number().int().min(0).max(ONBOARDING_TOTAL_STEPS);

export async function checkUsernameAvailability(value: string) {
  await requireUser();
  const result = await validateProfileUsername(value);
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const, username: result.username };
}

const ClaimUsername = z.object({
  username: z.string().trim().min(3).max(32),
  displayName: z.string().trim().max(80).optional(),
});

export async function claimUsername(input: z.infer<typeof ClaimUsername>) {
  const u = await requireUser();
  const parsed = ClaimUsername.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid_input" };

  const availability = await validateProfileUsername(parsed.data.username);
  if (!availability.ok) {
    // Allow user to keep their already-claimed username from the auto-resolve.
    if (availability.error === "username_taken" && u.username === parsed.data.username.toLowerCase()) {
      // no-op
    } else {
      return { ok: false as const, error: availability.error };
    }
  }

  const patch: Record<string, unknown> = { username: availability.ok ? availability.username : parsed.data.username.toLowerCase() };
  if (parsed.data.displayName) patch.display_name = parsed.data.displayName;

  const { error } = await updateManagedProfile(u.id, PRIMARY_PROFILE_ID, patch);
  if (error) return { ok: false as const, error: "update_failed" };

  await setOnboardingStep(u.id, 1);
  return { ok: true as const, username: patch.username as string };
}

const SaveAvatar = z.object({ avatarUrl: z.string().url().nullable() });

export async function saveAvatar(input: z.infer<typeof SaveAvatar>) {
  const u = await requireUser();
  const parsed = SaveAvatar.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid_input" };

  const { error } = await updateManagedProfile(u.id, PRIMARY_PROFILE_ID, {
    avatar_url: parsed.data.avatarUrl,
  });
  if (error) return { ok: false as const, error: "update_failed" };

  await setOnboardingStep(u.id, 2);
  return { ok: true as const };
}

const ApplyVibe = z.object({ vibeId: z.string().min(1).max(40) });

export async function applyVibe(input: z.infer<typeof ApplyVibe>) {
  const u = await requireUser();
  const parsed = ApplyVibe.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid_input" };

  const profile = await getManagedProfile(u.id, PRIMARY_PROFILE_ID);
  if (!profile) return { ok: false as const, error: "profile_not_found" };

  const sections = buildVibeSections(parsed.data.vibeId, {
    displayName: profile.displayName ?? u.displayName ?? u.username ?? "VoidCard",
    username: profile.username ?? u.username ?? "voidcard",
  });

  // Sections must validate against the discriminated union before persisting.
  const validated: SectionsRecord = Sections.parse(sections);

  const themeId = vibeThemeId(parsed.data.vibeId);
  const patch: Record<string, unknown> = { sections_draft: validated };
  if (themeId) patch.theme = { id: themeId };

  const { error } = await updateManagedProfile(u.id, PRIMARY_PROFILE_ID, patch);
  if (error) return { ok: false as const, error: "update_failed" };

  await setOnboardingStep(u.id, 3);
  return { ok: true as const };
}

const InitialLink = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().url(),
});
const AddInitialLinks = z.object({ links: z.array(InitialLink).max(3) });

export async function addInitialLinks(input: z.infer<typeof AddInitialLinks>) {
  const u = await requireUser();
  const parsed = AddInitialLinks.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid_input" };

  const profile = await getManagedProfile(u.id, PRIMARY_PROFILE_ID);
  if (!profile) return { ok: false as const, error: "profile_not_found" };

  const existing: SectionsRecord = Array.isArray(profile.sectionsDraft)
    ? Sections.parse(profile.sectionsDraft)
    : [];

  const linkSections: SectionsRecord = parsed.data.links.map((link) => ({
    id: crypto.randomUUID(),
    type: "link" as const,
    visible: true,
    props: { label: link.label, url: link.url, style: "pill" as const },
  }));

  const next: SectionsRecord = Sections.parse([...existing, ...linkSections]);

  const { error } = await updateManagedProfile(u.id, PRIMARY_PROFILE_ID, {
    sections_draft: next,
  });
  if (error) return { ok: false as const, error: "update_failed" };

  await setOnboardingStep(u.id, 4);
  return { ok: true as const, added: linkSections.length };
}

const FinishOnboarding = z.object({
  publish: z.boolean().default(false),
});

export async function finishOnboarding(input: z.infer<typeof FinishOnboarding>) {
  const u = await requireUser();
  const parsed = FinishOnboarding.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "invalid_input" };

  if (parsed.data.publish) {
    const profile = await getManagedProfile(u.id, PRIMARY_PROFILE_ID);
    if (profile) {
      const draft: SectionsRecord = Array.isArray(profile.sectionsDraft)
        ? Sections.parse(profile.sectionsDraft)
        : [];
      await updateManagedProfile(u.id, PRIMARY_PROFILE_ID, {
        sections: draft,
        published: true,
      });
      if (profile.publicPath) revalidatePath(profile.publicPath);
    }
  }

  const { ok, error } = await setOnboardingStep(u.id, ONBOARDING_TOTAL_STEPS);
  if (!ok) return { ok: false as const, error: "update_failed", reason: error };
  return { ok: true as const };
}

/** Persist the current step without writing any other data. Used for "Skip". */
export async function setStep(input: { step: number }) {
  const u = await requireUser();
  const parsed = Step.safeParse(input.step);
  if (!parsed.success) return { ok: false as const, error: "invalid_input" };
  const { ok } = await setOnboardingStep(u.id, parsed.data);
  return ok ? ({ ok: true as const }) : ({ ok: false as const, error: "update_failed" });
}

/** Quick exit: write the cookie hint without touching the DB step. */
export async function dismissOnboarding() {
  await requireUser();
  await writeOnboardingCookie(ONBOARDING_TOTAL_STEPS);
  return { ok: true as const };
}
