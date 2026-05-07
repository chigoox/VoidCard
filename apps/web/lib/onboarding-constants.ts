// Pure constants safe for both client and server bundles. The server-only
// helpers live in `@/lib/onboarding`, which depends on `next/headers` and
// the admin Supabase client.

export const ONBOARDING_TOTAL_STEPS = 5;
export const ONBOARDING_COOKIE = "vcard_onb";
