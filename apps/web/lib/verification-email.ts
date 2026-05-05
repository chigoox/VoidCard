import "server-only";

import { sendEmail } from "@/lib/email";

type VerificationEmailKind =
  | "submitted"
  | "needs_more_info"
  | "approved"
  | "rejected"
  | "revoked";

type VerificationEmailInput = {
  to: string;
  username?: string | null;
  kind: VerificationEmailKind;
  reviewerNote?: string | null;
  reason?: string | null;
  refunded?: boolean;
};

function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcard.ed5enterprise.com").replace(/\/+$/, "");
}

function verifyUrl(username?: string | null) {
  const base = siteUrl();
  if (!username) return `${base}/account/verify`;
  return `${base}/account/verify?u=${encodeURIComponent(username)}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[char] ?? char));
}

function renderDetail(label: string, value?: string | null) {
  if (!value) return "";
  return `
    <div style="margin-top:16px;border:1px solid #2a2a2a;border-radius:12px;padding:14px;background:#101010;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#a8a39a;">${escapeHtml(label)}</p>
      <p style="margin:0;line-height:1.6;color:#f7f3ea;">${escapeHtml(value)}</p>
    </div>`;
}

function template(input: VerificationEmailInput) {
  const url = verifyUrl(input.username);

  switch (input.kind) {
    case "submitted": {
      return {
        subject: "We got your verification proof",
        intro: "Your Verified Badge submission is in the review queue.",
        body: "We will email you again when a reviewer approves it, asks for more proof, or rejects the request.",
        cta: "Review submission",
        extra: "",
        text: [
          "Your VoidCard verification proof was submitted successfully.",
          "We will email you when the review is complete.",
          `Review your submission: ${url}`,
        ].join("\n"),
      };
    }

    case "needs_more_info": {
      return {
        subject: "More proof needed for VoidCard",
        intro: "A reviewer needs one more update before approving your badge.",
        body: "Open your verification page, review the note below, and resubmit the updated proof.",
        cta: "Update proof",
        extra: renderDetail("Reviewer note", input.reviewerNote),
        text: [
          "A reviewer needs more information for your VoidCard verification.",
          input.reviewerNote ? `Reviewer note: ${input.reviewerNote}` : null,
          `Update your proof: ${url}`,
        ].filter(Boolean).join("\n"),
      };
    }

    case "approved": {
      return {
        subject: "Your badge is now live",
        intro: "Your VoidCard account is now verified.",
        body: "The gold check can now appear on your public profile, and verified-only product flows are unlocked.",
        cta: "Open account",
        extra: input.reviewerNote ? renderDetail("Reviewer note", input.reviewerNote) : "",
        text: [
          "Your VoidCard verification was approved.",
          input.reviewerNote ? `Reviewer note: ${input.reviewerNote}` : null,
          `Open your account: ${url}`,
        ].filter(Boolean).join("\n"),
      };
    }

    case "rejected": {
      const refundCopy = input.refunded
        ? "Your $5 verification payment was refunded automatically. Banks usually reflect that within 5 to 10 business days."
        : "No additional payment is required right now.";
      return {
        subject: "Your verification was declined",
        intro: "Your current verification request was not approved.",
        body: `${refundCopy} You can resubmit after the cooldown window if you still want the badge.`,
        cta: "View decision",
        extra: `${renderDetail("Reason", input.reason)}${renderDetail("Reviewer note", input.reviewerNote)}`,
        text: [
          "Your VoidCard verification was declined.",
          input.reason ? `Reason: ${input.reason}` : null,
          input.reviewerNote ? `Reviewer note: ${input.reviewerNote}` : null,
          refundCopy,
          `View the decision: ${url}`,
        ].filter(Boolean).join("\n"),
      };
    }

    case "revoked": {
      return {
        subject: "Your badge was revoked",
        intro: "Your Verified Badge has been removed from the account.",
        body: "Contact support if you believe this was applied in error before opening a new verification request.",
        cta: "Review account",
        extra: `${renderDetail("Reason", input.reason)}${renderDetail("Reviewer note", input.reviewerNote)}`,
        text: [
          "Your VoidCard verification badge was revoked.",
          input.reason ? `Reason: ${input.reason}` : null,
          input.reviewerNote ? `Reviewer note: ${input.reviewerNote}` : null,
          `Review your account: ${url}`,
        ].filter(Boolean).join("\n"),
      };
    }
  }
}

export async function sendVerificationLifecycleEmail(input: VerificationEmailInput) {
  const rendered = template(input);
  const url = verifyUrl(input.username);
  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#f7f3ea;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#141414;border:1px solid #2a2a2a;border-radius:16px;padding:32px;">
    <p style="margin:0 0 12px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:#a8a39a;">Verified Badge</p>
    <h1 style="margin:0 0 14px;font-size:24px;line-height:1.2;color:#d4af37;">${escapeHtml(rendered.intro)}</h1>
    <p style="margin:0 0 18px;line-height:1.7;color:#f7f3ea;">${escapeHtml(rendered.body)}</p>
    <p style="margin:0 0 18px;">
      <a href="${urlAttr(url)}" style="display:inline-block;background:#d4af37;color:#0a0a0a;padding:12px 18px;border-radius:9999px;text-decoration:none;font-weight:700;">
        ${escapeHtml(rendered.cta)}
      </a>
    </p>
    ${rendered.extra}
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0" />
    <p style="margin:0;font-size:12px;color:#a8a39a;">Private verification uploads are deleted automatically 24 hours after a final decision.</p>
  </div>
</body></html>`;

  return sendEmail({
    to: input.to,
    subject: rendered.subject,
    html,
    text: rendered.text,
    tags: [
      { name: "flow", value: "verification" },
      { name: "status", value: input.kind },
    ],
  });
}

function urlAttr(value: string) {
  return value.replace(/"/g, "%22");
}