import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { coerceVerificationDocuments, coerceVerificationRiskFlags } from "@/lib/verification";
import { reviewVerification } from "./actions";

export const dynamic = "force-dynamic";

type VerificationRow = {
  id: string;
  user_id: string;
  method: string;
  status: string;
  documents: unknown;
  paid: boolean;
  risk_flags: unknown;
  risk_score: number;
  reviewer_note: string | null;
  reason: string | null;
  submitted_at: string;
  decided_at: string | null;
};

type ProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
};

function documentLabel(kind: string) {
  switch (kind) {
    case "government_id":
      return "Government ID";
    case "selfie":
      return "Selfie";
    case "business_registration":
      return "Business registration";
    case "domain_ownership":
      return "Domain ownership proof";
    case "trademark_registration":
      return "Trademark registration";
    case "trademark_proof":
      return "Trademark proof";
    case "submission_note":
      return "Reviewer note";
    default:
      return kind.replaceAll("_", " ");
  }
}

function riskFlagLabel(flag: string) {
  switch (flag) {
    case "cross_account_document_match":
      return "Cross-account document match";
    case "repeat_document_submission":
      return "Repeat document submission";
    case "duplicate_files_in_submission":
      return "Duplicate files in one submission";
    case "high_submission_velocity":
      return "High submission velocity";
    case "recent_rejection_retry":
      return "Recent rejection retry";
    default:
      return flag.replaceAll("_", " ");
  }
}

export default async function AdminVerificationsPage() {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_verifications")
    .select("id, user_id, method, status, documents, paid, risk_flags, risk_score, reviewer_note, reason, submitted_at, decided_at")
    .order("submitted_at", { ascending: false })
    .limit(200);

  const rows = (data as VerificationRow[] | null) ?? [];
  const userIds = Array.from(new Set(rows.map((row) => row.user_id)));
  const { data: profiles } = userIds.length
    ? await admin
        .from("vcard_profile_ext")
        .select("user_id, username, display_name")
        .in("user_id", userIds)
    : { data: [] };

  const profileByUserId = new Map(
    ((profiles as ProfileRow[] | null) ?? []).map((profile) => [profile.user_id, profile])
  );

  const reviewRows = await Promise.all(
    rows.map(async (row) => {
      const documents = coerceVerificationDocuments(row.documents);
      const riskFlags = coerceVerificationRiskFlags(row.risk_flags);
      const signedDocuments = await Promise.all(
        documents.map(async (doc) => {
          if (!doc.storagePath || !doc.bucket) return { ...doc, url: null as string | null };
          const { data: signed } = await admin.storage.from(doc.bucket).createSignedUrl(doc.storagePath, 60 * 60);
          return { ...doc, url: signed?.signedUrl ?? null };
        })
      );
      return {
        ...row,
        profile: profileByUserId.get(row.user_id) ?? null,
        documents: signedDocuments,
        riskFlags,
      };
    })
  );

  const openCount = reviewRows.filter((row) => row.status === "pending" || row.status === "needs_more_info").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-gold-grad">Verifications</h1>
        <p className="mt-1 text-sm text-ivory-mute">
          Review identity proofs, request more info, approve badges, and revoke bad actors. {openCount} open.
        </p>
      </div>

      <div className="space-y-4">
        {reviewRows.length === 0 && (
          <div className="card p-6 text-sm text-ivory-mute">No verification requests yet.</div>
        )}

        {reviewRows.map((row) => {
          const profile = row.profile;
          const isOpen = row.status === "pending" || row.status === "needs_more_info";
          const isApproved = row.status === "approved";

          return (
            <section key={row.id} className="card space-y-5 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="rounded-pill border border-gold/40 bg-gold/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gold">
                      {row.status}
                    </span>
                    <span className="rounded-pill border border-onyx-700/60 px-3 py-1 text-xs uppercase tracking-[0.2em] text-ivory-mute">
                      {row.method}
                    </span>
                    {row.paid && (
                      <span className="rounded-pill border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-emerald-300">
                        paid
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-display text-xl text-ivory">
                      {profile?.display_name ?? "Unnamed user"}
                    </p>
                    {profile?.username ? (
                      <Link href={`/u/${profile.username}`} className="text-sm text-gold hover:underline">
                        @{profile.username}
                      </Link>
                    ) : (
                      <p className="text-sm text-ivory-mute">{row.user_id}</p>
                    )}
                  </div>
                </div>

                <div className="text-right text-xs text-ivory-mute">
                  <p>Submitted {new Date(row.submitted_at).toLocaleString()}</p>
                  {row.decided_at && <p className="mt-1">Updated {new Date(row.decided_at).toLocaleString()}</p>}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.3fr_0.9fr]">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-ivory-mute">Submitted proof</p>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {row.documents.length === 0 && (
                        <div className="rounded-card border border-onyx-700/60 bg-onyx-950/40 p-4 text-sm text-ivory-mute">
                          No documents attached yet.
                        </div>
                      )}
                      {row.documents.map((doc, index) => (
                        <div key={`${row.id}-${doc.kind}-${index}`} className="rounded-card border border-onyx-700/60 bg-onyx-950/40 p-4 text-sm text-ivory-dim">
                          <p className="text-xs uppercase tracking-[0.2em] text-ivory-mute">{documentLabel(doc.kind)}</p>
                          {doc.value ? (
                            <p className="mt-2 break-words">{doc.value}</p>
                          ) : doc.url ? (
                            <a href={doc.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-gold hover:underline">
                              Open file
                            </a>
                          ) : (
                            <p className="mt-2">File unavailable.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {(row.reviewer_note || row.reason) && (
                    <div className="rounded-card border border-onyx-700/60 bg-onyx-950/40 p-4 text-sm text-ivory-dim">
                      {row.reviewer_note && (
                        <>
                          <p className="text-xs uppercase tracking-[0.2em] text-ivory-mute">Reviewer note</p>
                          <p className="mt-2">{row.reviewer_note}</p>
                        </>
                      )}
                      {row.reason && (
                        <>
                          <p className="mt-4 text-xs uppercase tracking-[0.2em] text-ivory-mute">Reason</p>
                          <p className="mt-2">{row.reason}</p>
                        </>
                      )}
                    </div>
                  )}

                  {(row.riskFlags.length > 0 || row.risk_score > 0) && (
                    <div className="rounded-card border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-xs uppercase tracking-[0.2em] text-amber-200/80">Risk signals</p>
                        <span className="rounded-pill border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-100">
                          Score {row.risk_score}
                        </span>
                      </div>
                      {row.riskFlags.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {row.riskFlags.map((flag) => (
                            <span
                              key={`${row.id}-${flag}`}
                              className="rounded-pill border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-amber-100"
                            >
                              {riskFlagLabel(flag)}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-3 text-amber-100/80">Automated checks raised no named flags for this submission.</p>
                      )}
                    </div>
                  )}
                </div>

                <form action={reviewVerification} className="rounded-card border border-onyx-700/60 bg-onyx-950/40 p-4">
                  <input type="hidden" name="id" value={row.id} />
                  <div className="space-y-4">
                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.2em] text-ivory-mute">Reviewer note</span>
                      <textarea
                        name="reviewer_note"
                        rows={5}
                        defaultValue={row.reviewer_note ?? ""}
                        className="input mt-3 w-full"
                        placeholder="Internal note shown back to the user when more proof is needed."
                      />
                    </label>

                    <label className="block">
                      <span className="text-xs uppercase tracking-[0.2em] text-ivory-mute">Reason</span>
                      <textarea
                        name="reason"
                        rows={3}
                        defaultValue={row.reason ?? ""}
                        className="input mt-3 w-full"
                        placeholder="Required for reject or revoke."
                      />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      {isOpen && (
                        <>
                          <button type="submit" name="decision" value="needs_more_info" className="btn-ghost">
                            Need more info
                          </button>
                          <button type="submit" name="decision" value="approve" className="btn-gold">
                            Approve
                          </button>
                          <button type="submit" name="decision" value="reject" className="btn-ghost border-rose-400/30 text-rose-200 hover:border-rose-300/50">
                            Reject
                          </button>
                        </>
                      )}
                      {isApproved && (
                        <button type="submit" name="decision" value="revoke" className="btn-ghost border-rose-400/30 text-rose-200 hover:border-rose-300/50">
                          Revoke
                        </button>
                      )}
                      {!isOpen && !isApproved && (
                        <p className="text-sm text-ivory-mute">This request is closed.</p>
                      )}
                    </div>
                  </div>
                </form>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}