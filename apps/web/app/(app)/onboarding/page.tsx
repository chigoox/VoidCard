import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { loadPrimaryProfile } from "@/lib/profiles";
import { ONBOARDING_TOTAL_STEPS, getOnboardingStep, writeOnboardingCookie } from "@/lib/onboarding";
import OnboardingClient from "./OnboardingClient";

function normalizeInternalPath(value: string | null | undefined) {
  if (!value || typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const params = searchParams ? await searchParams : {};
  const nextHref = normalizeInternalPath(typeof params.next === "string" ? params.next : null) ?? "/dashboard";

  const [profile, step] = await Promise.all([
    loadPrimaryProfile(user.id),
    getOnboardingStep(user.id),
  ]);

  if (step >= ONBOARDING_TOTAL_STEPS) {
    await writeOnboardingCookie(ONBOARDING_TOTAL_STEPS);
    redirect(nextHref);
  }

  return (
    <OnboardingClient
      initialStep={step}
      initialUsername={profile?.username ?? user.username}
      initialDisplayName={profile?.displayName ?? user.displayName}
      initialAvatarUrl={profile?.avatarUrl ?? null}
      nextHref={nextHref}
    />
  );
}
