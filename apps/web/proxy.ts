import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "./lib/supabase/admin";
import { getCookieDomain } from "./lib/supabase/cookie-domain";
import { buildCsp, cspHeaderName, generateNonce, REPORT_TO_HEADER } from "./lib/csp";

const PUBLIC_ROUTES = [
  /^\/$/,
  /^\/login$/,
  /^\/signup$/,
  /^\/auth(\/.*)?$/,
  /^\/domain-not-found$/,
  /^\/try$/,
  /^\/pricing$/,
  /^\/shop(\/.*)?$/,
  /^\/billing(\/.*)?$/,
  /^\/discover$/,
  /^\/exchange(\/.*)?$/,
  /^\/contact$/,
  /^\/customers$/,
  /^\/press$/,
  /^\/roadmap$/,
  /^\/why-voidcard$/,
  /^\/terms$/,
  /^\/privacy$/,
  /^\/changelog$/,
  /^\/docs(\/.*)?$/,
  /^\/legal(\/.*)?$/,
  /^\/trust$/,
  /^\/c\/.+/,
  /^\/s\/.+/,
  /^\/u\/.+/,
  // Public API surfaces use their own auth, captcha, or shared-secret checks.
  /^\/api\/(analytics|cron|discover|lead-forms|stripe|short|public|v1|test|auth|security|wallet|consent)(\/.*)?$/,
  /^\/embed\.js$/,
  /^\/og\/.*/,
  /^\/_next\/.*/,
  /^\/\.well-known\/.*/,
  /^\/(favicon\.(?:ico|svg)|robots\.txt|sitemap.*\.xml|manifest\.webmanifest|sw\.js|og-default\.(?:png|svg)|llms\.txt|ai\.txt)$/,
  /^\/ai-policy$/,
  /^\/offline$/,
];

const CANONICAL_SITE_ROUTES = [
  /^\/login$/,
  /^\/signup$/,
  /^\/auth(\/.*)?$/,
  /^\/onboarding$/,
  /^\/admin(\/.*)?$/,
  /^\/(dashboard|edit|links|insights|account|cards|contacts|profiles|settings|share|team|variants|orders|fonts)(\/.*)?$/,
];

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((re) => re.test(pathname));
}

function isCanonicalSiteRoute(pathname: string) {
  return CANONICAL_SITE_ROUTES.some((re) => re.test(pathname));
}

function applySecurityHeaders(res: NextResponse, nonce: string) {
  const csp = buildCsp(nonce);
  res.headers.set(cspHeaderName(), csp);
  res.headers.set("Report-To", REPORT_TO_HEADER);
  res.headers.set("x-nonce", nonce);
}

function siteHost() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcard.ed5enterprise.com").hostname.toLowerCase();
  } catch {
    return "vcard.ed5enterprise.com";
  }
}

function siteOrigin() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcard.ed5enterprise.com").origin;
  } catch {
    return "https://vcard.ed5enterprise.com";
  }
}

function normalizeRequestHost(rawHost: string | null) {
  return (rawHost ?? "").split(":", 1)[0].trim().toLowerCase();
}

function isMissingTableError(error: { message?: string | null; code?: string | null } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST205" || message.includes("schema cache") || message.includes("could not find the table");
}

function isCustomDomainCandidate(host: string) {
  if (!host) return false;
  if (host === siteHost()) return false;
  if (host === "localhost" || host === "127.0.0.1") return false;
  if (host.endsWith(".vercel.app")) return false;
  return true;
}

function isCustomDomainBypassPath(pathname: string) {
  return (
    pathname === "/domain-not-found" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/.well-known/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.webmanifest" ||
    pathname === "/robots.txt" ||
    pathname === "/sw.js" ||
    pathname === "/ai.txt" ||
    pathname === "/llms.txt" ||
    pathname.startsWith("/sitemap")
  );
}

async function lookupCustomDomainUsername(hostname: string) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;

  try {
    const admin = createAdminClient();
    const { data: domain } = await admin
      .from("vcard_custom_domains")
      .select("user_id")
      .eq("hostname", hostname)
      .eq("status", "active")
      .maybeSingle();

    if (!domain?.user_id) return null;

    const { data: profile, error: profileError } = await admin
      .from("vcard_profile_ext")
      .select("username, published")
      .eq("user_id", domain.user_id)
      .maybeSingle();

    if (isMissingTableError(profileError)) {
      const { data: sharedProfile } = await admin.from("profiles").select("username").eq("id", domain.user_id).maybeSingle();
      return typeof sharedProfile?.username === "string" ? sharedProfile.username : null;
    }

    if (profileError) return null;

    return profile?.published === true && typeof profile.username === "string" ? profile.username : null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  // Per-request CSP nonce — exposed to RSC via x-nonce request header so
  // server components can read it from `headers()` and pass to <Script nonce>.
  const nonce = generateNonce();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  const pathname = req.nextUrl.pathname;
  const host = normalizeRequestHost(req.headers.get("host"));

  if (isCustomDomainCandidate(host) && isCanonicalSiteRoute(pathname)) {
    const canonicalUrl = new URL(`${pathname}${req.nextUrl.search}`, siteOrigin());
    const redirect = NextResponse.redirect(canonicalUrl);
    applySecurityHeaders(redirect, nonce);
    return redirect;
  }

  if (isCustomDomainCandidate(host) && !isCustomDomainBypassPath(pathname)) {
    const username = await lookupCustomDomainUsername(host);
    const url = req.nextUrl.clone();
    url.pathname = username ? `/u/${username}` : "/domain-not-found";
    const rewrite = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
    applySecurityHeaders(rewrite, nonce);
    return rewrite;
  }

  const res = NextResponse.next({ request: { headers: requestHeaders } });
  applySecurityHeaders(res, nonce);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (toSet: { name: string; value: string; options?: import("@supabase/ssr").CookieOptions }[]) => {
          for (const { name, value, options } of toSet) {
            res.cookies.set(name, value, {
              ...options,
              domain: getCookieDomain(options?.domain),
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
            });
          }
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !isPublic(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};