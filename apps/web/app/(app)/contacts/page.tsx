import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDbEncryptionKey } from "@/lib/db-encryption";
import { entitlementsFor } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, string> = {
  new: "New",
  read: "Read",
  archived: "Archived",
  spam: "Spam",
};

type SecureSubmission = {
  id: string;
  email: string | null;
  phone: string | null;
  payload: Record<string, unknown> | null;
  source: string | null;
  status: string;
  created_at: string;
};

export default async function ContactsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireUser();
  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  const sp = await searchParams;
  const status = sp.status && STATUS_LABELS[sp.status] ? sp.status : "new";

  const sb = await createClient();
  const { data, error } = await sb.rpc("vcard_list_form_submissions_secure", {
    p_status: status,
    p_limit: 100,
    p_encryption_key: getDbEncryptionKey(),
  });

  if (error) {
    throw new Error("Could not load contact submissions.");
  }

  const subs = (data ?? []) as SecureSubmission[];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl text-gold-grad">Contacts</h1>
          {!ent.csvExport && (
            <p className="mt-1 text-sm text-ivory-dim">
              CSV export is available on Pro and Team.
            </p>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          {ent.csvExport && (
            <Link
              href={`/api/contacts/export?status=${status}`}
              className="btn-ghost inline-flex items-center justify-center"
              data-testid="contacts-export-link"
            >
              Export CSV
            </Link>
          )}
          <nav className="flex flex-wrap gap-2 text-xs uppercase tracking-widest">
            {Object.entries(STATUS_LABELS).map(([k, label]) => (
              <a
                key={k}
                href={`/contacts?status=${k}`}
                className={
                  "rounded-md border px-3 py-1.5 " +
                  (k === status
                    ? "border-gold bg-gold text-onyx-950"
                    : "border-onyx-700 text-ivory-dim hover:text-gold")
                }
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {(!subs || subs.length === 0) && (
        <div className="rounded-lg border border-onyx-700 bg-onyx-900 p-6 text-center text-ivory-dim">
          No {STATUS_LABELS[status]?.toLowerCase()} submissions.
        </div>
      )}

      <ul className="space-y-3">
        {subs?.map((s) => {
          const payload = (s.payload ?? {}) as Record<string, unknown>;
          return (
            <li
              key={s.id}
              data-testid="contact-row"
              className="rounded-lg border border-onyx-700 bg-onyx-900 p-4"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <div className="truncate text-ivory">
                    {(payload.name as string) || s.email || s.phone || "Unknown"}
                  </div>
                  <div className="text-xs text-ivory-dim">
                    {s.email && <span>{s.email}</span>}
                    {s.email && s.phone && <span> · </span>}
                    {s.phone && <span>{s.phone}</span>}
                  </div>
                </div>
                <div className="shrink-0 text-xs text-ivory-dim sm:text-right">
                  <div>{new Date(s.created_at).toLocaleString()}</div>
                  {s.source ? <div>via {String(s.source)}</div> : null}
                </div>
              </div>
              {payload.message ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-ivory-dim">
                  {String(payload.message)}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
