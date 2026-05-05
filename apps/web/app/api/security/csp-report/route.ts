import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimits } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * Receives Content-Security-Policy violation reports.
 *
 * Accepts both legacy `application/csp-report` and the modern Reporting API
 * `application/reports+json` array shape. Persists a redacted row to
 * vcard_csp_reports for triage. Rate-limited per IP to prevent flooding.
 */
type LegacyReport = {
  "csp-report"?: {
    "document-uri"?: string;
    "violated-directive"?: string;
    "effective-directive"?: string;
    "blocked-uri"?: string;
    "source-file"?: string;
    "line-number"?: number;
    "status-code"?: number;
  };
};

type ReportingApiEntry = {
  type: string;
  body: {
    documentURL?: string;
    effectiveDirective?: string;
    blockedURL?: string;
    sourceFile?: string;
    lineNumber?: number;
    statusCode?: number;
    disposition?: string;
  };
};

const SALT = process.env.AUDIT_IP_SALT ?? "vcard-audit-default-salt";
function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${ip}:${SALT}`).digest("hex").slice(0, 32);
}

function ensureLimiter() {
  // Lazy add limiter so we don't require a redeploy to tune.
  return rateLimits.contactForm; // reuse a tight limiter; dedicated key below.
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const rl = await ensureLimiter().limit(`csp:${ip}`);
  if (!rl.success) return new NextResponse(null, { status: 429 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new NextResponse(null, { status: 204 });
  }

  const rows: Array<{
    document_uri: string | null;
    violated_directive: string | null;
    effective_directive: string | null;
    blocked_uri: string | null;
    source_file: string | null;
    line_number: number | null;
    status_code: number | null;
    user_agent: string | null;
    ip_hash: string | null;
    raw: unknown;
  }> = [];

  if (Array.isArray(raw)) {
    for (const r of raw as ReportingApiEntry[]) {
      if (r?.type !== "csp-violation") continue;
      const b = r.body ?? {};
      rows.push({
        document_uri: b.documentURL ?? null,
        violated_directive: b.effectiveDirective ?? null,
        effective_directive: b.effectiveDirective ?? null,
        blocked_uri: b.blockedURL ?? null,
        source_file: b.sourceFile ?? null,
        line_number: b.lineNumber ?? null,
        status_code: b.statusCode ?? null,
        user_agent: ua,
        ip_hash: hashIp(ip),
        raw: r,
      });
    }
  } else {
    const r = (raw as LegacyReport)["csp-report"];
    if (r) {
      rows.push({
        document_uri: r["document-uri"] ?? null,
        violated_directive: r["violated-directive"] ?? null,
        effective_directive: r["effective-directive"] ?? null,
        blocked_uri: r["blocked-uri"] ?? null,
        source_file: r["source-file"] ?? null,
        line_number: r["line-number"] ?? null,
        status_code: r["status-code"] ?? null,
        user_agent: ua,
        ip_hash: hashIp(ip),
        raw,
      });
    }
  }

  if (rows.length === 0) return new NextResponse(null, { status: 204 });

  try {
    const sb = createAdminClient();
    const { error } = await sb.from("vcard_csp_reports").insert(rows);
    if (error) console.error("[csp-report] insert failed", error.message);
  } catch (e) {
    console.error("[csp-report] unexpected", e);
  }

  return new NextResponse(null, { status: 204 });
}
