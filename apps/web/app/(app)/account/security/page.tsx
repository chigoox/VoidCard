import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import SecurityClient from "./security-client";

export const dynamic = "force-dynamic";

export default async function SecurityPage() {
  await requireUser();
  const sb = await createClient();
  const { data } = await sb.auth.mfa.listFactors();
  const totpFactors = data?.totp ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-gold-grad">Account security</h1>
        <p className="mt-1 text-sm text-ivory-mute">
          Two-factor authentication (TOTP). Required for admin role.
        </p>
      </div>

      <SecurityClient
        factors={totpFactors.map((f) => ({
          id: f.id,
          friendly_name: f.friendly_name ?? null,
          status: f.status,
          created_at: f.created_at,
        }))}
      />
    </div>
  );
}
