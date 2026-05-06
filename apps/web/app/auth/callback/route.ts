import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensurePrimaryProfileRecord, loadPrimaryProfile, validateProfileUsername } from "@/lib/profiles";

function readMetadataString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeInternalPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function usernameSeedFromUser(user: { email?: string | null; user_metadata?: Record<string, unknown> }, requested: string | null) {
  const emailLocalPart = user.email?.split("@")[0] ?? null;
  return (
    requested ??
    readMetadataString(user.user_metadata?.pending_username) ??
    readMetadataString(user.user_metadata?.preferred_username) ??
    readMetadataString(user.user_metadata?.user_name) ??
    readMetadataString(user.user_metadata?.full_name) ??
    emailLocalPart ??
    "profile"
  );
}

function slugifyUsernameSeed(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");
  return normalized.slice(0, 24) || "profile";
}

function randomSuffix() {
  const bytes = crypto.getRandomValues(new Uint8Array(2));
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function resolveProfileUsername(
  user: { email?: string | null; user_metadata?: Record<string, unknown> },
  requestedUsername: string | null,
) {
  const preferred = requestedUsername?.trim().toLowerCase() || readMetadataString(user.user_metadata?.pending_username)?.toLowerCase() || null;
  if (preferred) {
    const preferredCheck = await validateProfileUsername(preferred);
    if (preferredCheck.ok) return preferredCheck.username;
  }

  const seed = slugifyUsernameSeed(usernameSeedFromUser(user, preferred));
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const suffix = randomSuffix();
    const base = seed.slice(0, Math.max(3, 31 - suffix.length));
    const candidate = `${base}-${suffix}`;
    const availability = await validateProfileUsername(candidate);
    if (availability.ok) return availability.username;
  }

  return `profile-${randomSuffix()}`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const username = url.searchParams.get("username");
  const nextPath = normalizeInternalPath(url.searchParams.get("next"));
  const providerError = url.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(providerError)}`, req.url));
  }

  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url));
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?error=session", req.url));

  const existing = await loadPrimaryProfile(user.id);
  const resolvedUsername = existing?.username ?? (await resolveProfileUsername(user, username));
  const { error, onboardingStep } = await ensurePrimaryProfileRecord({
    userId: user.id,
    email: user.email ?? null,
    username: resolvedUsername,
    displayName: readMetadataString(user.user_metadata?.full_name),
    avatarUrl: readMetadataString(user.user_metadata?.avatar_url),
  });

  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, req.url));
  }

  const step = onboardingStep ?? 5;
  if (step < 5) return NextResponse.redirect(new URL("/onboarding", req.url));
  return NextResponse.redirect(new URL(nextPath ?? "/dashboard", req.url));
}
