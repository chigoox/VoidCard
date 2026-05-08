import { SignJWT } from "jose";

/**
 * Mints a short-lived (5 min) HS256 JWT that Boox can verify and exchange
 * for a Firebase custom token. The shared secret BOOX_SSO_SECRET must match
 * on both sides. We never expose Boox's Firebase service account to VoidCard.
 *
 * Claims:
 *   sub   – Supabase user.id (used as Firebase UID in Boox)
 *   email – verified email from Supabase
 *   name  – display name (best-effort)
 *   aud   – "boox"
 *   iss   – "vcard"
 *   exp   – now + 300s
 */
export async function mintBooxSsoToken(input: {
  userId: string;
  email: string;
  name?: string | null;
}): Promise<string> {
  const secret = process.env.BOOX_SSO_SECRET;
  if (!secret) throw new Error("BOOX_SSO_SECRET is not configured");
  const key = new TextEncoder().encode(secret);
  return await new SignJWT({ email: input.email, name: input.name ?? undefined })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("vcard")
    .setAudience("boox")
    .setSubject(input.userId)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(key);
}

export function getBooxBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_BOOX_URL || "https://boox.ed5enterprise.com").replace(/\/$/, "");
}
