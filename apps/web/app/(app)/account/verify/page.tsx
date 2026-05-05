import Link from "next/link";
import { CheckoutButton } from "@/components/checkout-button";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  VERIFICATION_RETRY_DAYS,
  coerceVerificationDocuments,
  isActiveVerificationStatus,
  type VerificationMethod,
} from "@/lib/verification";
import { submitVerification } from "./actions";
import { VerificationForm } from "./verification-form";

type VerificationRow = {
  id: string;
  method: string;
  status: string;
  documents: unknown;
  paid: boolean;
  reviewer_note: string | null;
  reason: string | null;
  submitted_at: string;
  decided_at: string | null;
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

export default async function VerifyPage() {
  const u = await requireUser();
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_verifications")
    .select("id, method, status, documents, paid, reviewer_note, reason, submitted_at, decided_at")
    .eq("user_id", u.id)
    .order("submitted_at", { ascending: false })
    .limit(10);

  const verifications = (data as VerificationRow[] | null) ?? [];
  const activeVerification = verifications.find((row) => isActiveVerificationStatus(row.status));
  const latestVerification = verifications[0] ?? null;
  const activeDocuments = coerceVerificationDocuments(activeVerification?.documents);
  const cooldownUntil = latestVerification?.status === "rejected" && latestVerification.decided_at
    ? new Date(new Date(latestVerification.decided_at).getTime() + VERIFICATION_RETRY_DAYS * 24 * 60 * 60 * 1000)
    : null;
  const retryBlocked = !!cooldownUntil && cooldownUntil.getTime() > Date.now();
  const revoked = latestVerification?.status === "revoked";
  const verifiedLive = u.verified || activeVerification?.status === "approved";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Verified Badge</p>
        <h1 className="mt-2 font-display text-3xl text-gold-grad">Make your profile official.</h1>
        <p className="mt-3 text-sm text-ivory-dim">
          A one-time identity check for your account. Verified unlocks the gold check,
          custom-art card ordering, apex custom domains, and non-HTTPS webhooks.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.2em] text-ivory-mute">
          Private uploads are deleted automatically 24 hours after a final decision.
        </p>
      </header>

      <section className="card space-y-4 p-6">
        {verifiedLive ? (
          <>
            <p className="text-gold">You are verified. ✓</p>
            <p className="text-sm text-ivory-dim">
              Your public profile can now show the gold check and access any verified-only flows.
            </p>
          </>
        ) : activeVerification ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-pill border border-gold/40 bg-gold/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-gold">
                {activeVerification.status === "needs_more_info" ? "Needs more info" : "Pending review"}
              </span>
              <span className="text-xs text-ivory-mute">
                {activeVerification.paid ? "Payment received" : "Manual review flow"}
              </span>
            </div>
            <p className="text-sm text-ivory-dim">
              {activeDocuments.length > 0
                ? "Your proof is attached. Update anything below and resubmit if support asked for changes."
                : "Finish uploading the required proof below to send this request to the review queue."}
            </p>
            {activeVerification.reviewer_note && (
              <div className="rounded-card border border-gold/20 bg-gold/5 p-4 text-sm text-ivory-dim">
                <p className="text-xs uppercase tracking-[0.2em] text-gold">Reviewer note</p>
                <p className="mt-2">{activeVerification.reviewer_note}</p>
              </div>
            )}
            {activeDocuments.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-ivory-mute">Attached proof</p>
                <ul className="mt-3 grid gap-2 text-sm text-ivory-dim md:grid-cols-2">
                  {activeDocuments.map((doc, index) => (
                    <li key={`${doc.kind}-${index}`} className="rounded-card border border-onyx-700/60 bg-onyx-950/40 px-3 py-2">
                      {documentLabel(doc.kind)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <ul className="space-y-2 text-sm text-ivory-dim">
              <li>• Individual: government ID front plus a selfie holding today&apos;s code</li>
              <li>• Business: registration doc plus domain ownership proof</li>
              <li>• Brand owner: trademark registration number and optional supporting proof</li>
            </ul>
            {latestVerification?.status === "rejected" && latestVerification.reason && (
              <div className="rounded-card border border-rose-400/20 bg-rose-400/5 p-4 text-sm text-ivory-dim">
                <p className="text-xs uppercase tracking-[0.2em] text-rose-300">Last decision</p>
                <p className="mt-2">{latestVerification.reason}</p>
              </div>
            )}
            {revoked ? (
              <p className="text-sm text-rose-300">
                This badge was revoked. Contact support before opening another verification request.
              </p>
            ) : retryBlocked ? (
              <p className="text-sm text-amber-200">
                Re-submission opens on {cooldownUntil?.toLocaleDateString()}.
              </p>
            ) : (
              <CheckoutButton kind="shop" sku="verified-badge" label="Buy Verified Badge" className="btn-gold inline-flex" />
            )}
          </>
        )}
      </section>

      {!verifiedLive && activeVerification && (
        <VerificationForm
          submitAction={submitVerification}
          verificationId={activeVerification.id}
          defaultMethod={
            (activeVerification.method === "individual" ||
              activeVerification.method === "business" ||
              activeVerification.method === "brand"
              ? activeVerification.method
              : "individual") as VerificationMethod
          }
          defaultDocuments={activeDocuments}
          status={activeVerification.status === "needs_more_info" ? "needs_more_info" : "pending"}
        />
      )}

      <section className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">Free with metal card</p>
        <p className="mt-2 text-sm text-ivory-dim">
          Buying a metal/custom card or qualifying bundle includes Verified at no extra cost.
        </p>
        <Link href="/shop" className="btn-ghost mt-3 inline-flex">Visit shop</Link>
      </section>
    </div>
  );
}
