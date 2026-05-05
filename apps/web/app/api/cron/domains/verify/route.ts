import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import {
  attachProjectDomain,
  getDomainConfig,
  hasVercelProjectDomainConfig,
  listProjectDomains,
} from "@/lib/vercel-domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Domain = {
  id: string;
  user_id: string;
  hostname: string;
  apex: boolean;
  status: string;
  txt_token: string;
  ssl_status: string;
  vercel_domain_id: string | null;
};

async function resolveTxt(hostname: string): Promise<string[]> {
  // DNS-over-HTTPS lookup via Cloudflare (works in serverless without dns module).
  const url = `https://cloudflare-dns.com/dns-query?name=_voidcard-verify.${encodeURIComponent(hostname)}&type=TXT`;
  const res = await fetch(url, { headers: { accept: "application/dns-json" }, cache: "no-store" });
  if (!res.ok) return [];
  const json = (await res.json()) as { Answer?: { data: string }[] };
  return (json.Answer ?? []).map((a) => a.data.replace(/^"|"$/g, ""));
}

export async function GET(req: Request) {
  // Auth: require either Vercel cron header or shared secret.
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const fromVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!fromVercelCron && (!cronSecret || auth !== `Bearer ${cronSecret}`)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sb = createAdminClient();
  const { data } = await sb
    .from("vcard_custom_domains")
    .select("id, user_id, hostname, apex, status, txt_token, ssl_status, vercel_domain_id")
    .in("status", ["pending", "verifying", "active"])
    .limit(50);

  const rows = (data as Domain[] | null) ?? [];
  const results: Array<{ id: string; status: string; ssl_status: string }> = [];
  const usesVercelProjectDomains = hasVercelProjectDomainConfig();

  let projectDomains: Set<string> | null = null;
  if (usesVercelProjectDomains) {
    try {
      projectDomains = await listProjectDomains();
    } catch (error) {
      return NextResponse.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : "Unable to load Vercel project domains.",
        },
        { status: 500 }
      );
    }
  }

  for (const d of rows) {
    let nextStatus = d.status;
    let nextSsl = d.ssl_status;
    let nextVercelDomainId = d.vercel_domain_id;

    try {
      // 1) Verify TXT.
      const records = await resolveTxt(d.hostname);
      const txtOk = records.some((r) => r === d.txt_token);

      if (!txtOk) {
        nextStatus = d.status === "active" ? "failed" : "verifying";
        nextSsl = "pending";
      } else {
        nextStatus = "active";

        if (projectDomains) {
          if (!projectDomains.has(d.hostname)) {
            const attachedDomain = await attachProjectDomain(d.hostname);
            if (attachedDomain) {
              projectDomains.add(d.hostname);
              nextVercelDomainId = attachedDomain;
            }
          } else {
            nextVercelDomainId = d.vercel_domain_id ?? d.hostname;
          }

          const cfg = await getDomainConfig(d.hostname);
          nextSsl = cfg && !cfg.misconfigured ? "active" : "pending";
        } else {
          // Preserve the previous local fallback when project-domain credentials are not configured.
          nextSsl = "active";
        }
      }

      await sb
        .from("vcard_custom_domains")
        .update({
          status: nextStatus,
          ssl_status: nextSsl,
          vercel_domain_id: nextVercelDomainId,
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", d.id);

      if (nextStatus !== d.status) {
        await audit({
          action: "domain.status.change",
          actorId: null,
          targetKind: "vcard_custom_domains",
          targetId: d.id,
          diff: { from: d.status, to: nextStatus, hostname: d.hostname },
        });
      }
    } catch (err) {
      await sb
        .from("vcard_custom_domains")
        .update({ last_checked_at: new Date().toISOString() })
        .eq("id", d.id);
      results.push({ id: d.id, status: `error:${(err as Error).message}`, ssl_status: nextSsl });
      continue;
    }

    results.push({ id: d.id, status: nextStatus, ssl_status: nextSsl });
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}
