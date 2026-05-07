import "server-only";

/**
 * Cloudflare Turnstile server-side verification.
 *
 * Wire to: signup, post-failure login, contact form, exchange, password reset.
 * Token comes from <Turnstile /> client widget; secret is server-only.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export type TurnstileResult = {
  success: boolean;
  errorCodes?: string[];
  hostname?: string;
  action?: string;
};

export async function verifyTurnstile(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<TurnstileResult> {
  // If Turnstile is not configured at all, don't block contact capture.
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim();
  if (!secret) {
    if (!siteKey) {
      return { success: true };
    }
    if (process.env.NODE_ENV === "production") {
      return { success: false, errorCodes: ["missing-secret"] };
    }
    return { success: true };
  }
  if (!token) return { success: false, errorCodes: ["missing-input-response"] };

  const body = new URLSearchParams({ secret, response: token });
  if (remoteIp) body.set("remoteip", remoteIp);

  try {
    const res = await fetch(VERIFY_URL, { method: "POST", body, cache: "no-store" });
    if (!res.ok) return { success: false, errorCodes: [`http-${res.status}`] };
    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
      hostname?: string;
      action?: string;
    };
    return {
      success: !!data.success,
      errorCodes: data["error-codes"],
      hostname: data.hostname,
      action: data.action,
    };
  } catch (e) {
    return { success: false, errorCodes: ["network-error", String(e)] };
  }
}
