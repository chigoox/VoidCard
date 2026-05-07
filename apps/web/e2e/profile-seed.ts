import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

type AdminClient = SupabaseClient;

export type PrimaryProfileSource = "vcard_profile_ext" | "profiles";

export type PrimaryProfileSeed = {
  userId: string;
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
  bio?: string | null;
  published?: boolean;
  plan?: "free" | "pro" | "team" | "enterprise";
  verified?: boolean;
  weeklyDigestEnabled?: boolean;
  sections?: unknown;
};

export async function detectPrimaryProfileSource(admin: AdminClient): Promise<PrimaryProfileSource | null> {
  const [extCheck, sharedCheck] = await Promise.all([
    admin.from("vcard_profile_ext").select("user_id").limit(1),
    admin.from("profiles").select("id").limit(1),
  ]);

  if (!extCheck.error) return "vcard_profile_ext";
  if (!sharedCheck.error) return "profiles";
  return null;
}

export async function seedPrimaryProfile(admin: AdminClient, input: PrimaryProfileSeed): Promise<PrimaryProfileSource> {
  const source = await detectPrimaryProfileSource(admin);
  if (!source) {
    throw new Error("No supported primary profile source is available in the configured Supabase project.");
  }

  if (source === "profiles") {
    const { error } = await admin.from("profiles").upsert(
      {
        id: input.userId,
        email: input.email ?? `${input.username ?? input.userId}@voidcard-test.dev`,
        username: input.published === false ? null : (input.username ?? null),
        display_name: input.displayName ?? null,
        role: "user",
      },
      { onConflict: "id" },
    );
    if (error) throw error;

    if ((input.plan ?? "free") !== "free") {
      const subscriptionId = `sub_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
      const customerId = `cus_${randomUUID().replaceAll("-", "").slice(0, 24)}`;
      const { error: subscriptionError } = await admin.from("vcard_subscriptions").upsert(
        {
          user_id: input.userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: input.plan,
          interval: "month",
          status: "active",
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          seats: input.plan === "team" ? 10 : 1,
        },
        { onConflict: "user_id" },
      );
      if (subscriptionError) throw subscriptionError;
    }

    if (input.verified) {
      const { error: verificationError } = await admin.from("vcard_verifications").insert({
        user_id: input.userId,
        method: "earned",
        status: "approved",
        decided_at: new Date().toISOString(),
      });
      if (verificationError) throw verificationError;
    }

    return source;
  }

  const { error } = await admin.from("vcard_profile_ext").upsert(
    {
      user_id: input.userId,
      username: input.username ?? null,
      display_name: input.displayName ?? null,
      bio: input.bio ?? null,
      published: input.published ?? true,
      plan: input.plan ?? "free",
      verified: input.verified ?? false,
      weekly_digest_enabled: input.weeklyDigestEnabled,
      sections: input.sections,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;

  return source;
}