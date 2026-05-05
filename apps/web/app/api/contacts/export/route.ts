import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { getDbEncryptionKey } from "@/lib/db-encryption";
import { entitlementsFor } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STATUSES = ["new", "read", "archived", "spam"] as const;

type SubmissionStatus = (typeof STATUSES)[number];

type SecureSubmission = {
  id: string;
  email: string | null;
  phone: string | null;
  payload: Record<string, unknown> | null;
  source: string | null;
  status: string;
  created_at: string;
};

function isSubmissionStatus(value: string | null): value is SubmissionStatus {
  return !!value && STATUSES.includes(value as SubmissionStatus);
}

async function loadSecureSubmissions(status: SubmissionStatus): Promise<SecureSubmission[]> {
  const sb = await createClient();
  const { data, error } = await sb.rpc("vcard_list_form_submissions_secure", {
    p_status: status,
    p_limit: 500,
    p_encryption_key: getDbEncryptionKey(),
  });

  if (error) {
    throw new Error("Could not export contact submissions.");
  }

  return (data ?? []) as SecureSubmission[];
}

function csvCell(value: unknown): string {
  const stringValue =
    value == null
      ? ""
      : typeof value === "string"
        ? value
        : typeof value === "number" || typeof value === "boolean"
          ? String(value)
          : JSON.stringify(value);
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function payloadField(payload: Record<string, unknown> | null, key: string): string {
  const value = payload?.[key];
  return typeof value === "string" ? value : "";
}

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  if (!ent.csvExport) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const requestedStatus = url.searchParams.get("status");
  const statuses = isSubmissionStatus(requestedStatus) ? [requestedStatus] : [...STATUSES];
  const submissions = (await Promise.all(statuses.map((status) => loadSecureSubmissions(status)))).flat();

  const rows = [
    ["id", "status", "created_at", "source", "name", "email", "phone", "message", "payload"],
    ...submissions.map((submission) => [
      submission.id,
      submission.status,
      submission.created_at,
      submission.source ?? "",
      payloadField(submission.payload, "name"),
      submission.email ?? "",
      submission.phone ?? "",
      payloadField(submission.payload, "message"),
      JSON.stringify(submission.payload ?? {}),
    ]),
  ];

  const scope = isSubmissionStatus(requestedStatus) ? requestedStatus : "all";
  const filenameDate = new Date().toISOString().slice(0, 10);
  const csv = rows.map((row) => row.map((value) => csvCell(value)).join(",")).join("\r\n") + "\r\n";

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="contacts-${scope}-${filenameDate}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}