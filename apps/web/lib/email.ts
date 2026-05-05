import "server-only";

/**
 * Minimal Resend client (no SDK). All transactional email goes through this.
 * Set RESEND_API_KEY + EMAIL_FROM (e.g. "VoidCard <noreply@vcard.ed5enterprise.com>").
 */

export type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
};

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "VoidCard <noreply@vcard.ed5enterprise.com>";
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return { ok: false, error: "no_api_key" };
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(input.to) ? input.to : [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        reply_to: input.replyTo,
        tags: input.tags,
      }),
    });
    if (!r.ok) {
      const body = await r.text();
      return { ok: false, error: `resend_${r.status}: ${body.slice(0, 200)}` };
    }
    const j = (await r.json()) as { id?: string };
    return { ok: true, id: j.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "unknown" };
  }
}

const CARRIER_TRACKING_URLS: Record<string, (n: string) => string> = {
  ups: (n) => `https://www.ups.com/track?tracknum=${encodeURIComponent(n)}`,
  usps: (n) => `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(n)}`,
  fedex: (n) => `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(n)}`,
  dhl: (n) => `https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id=${encodeURIComponent(n)}`,
};

export function trackingUrl(carrier: string | null | undefined, tracking: string | null | undefined) {
  if (!carrier || !tracking) return null;
  const fn = CARRIER_TRACKING_URLS[carrier.toLowerCase()];
  return fn ? fn(tracking) : null;
}

export function shippedEmailHtml(opts: {
  orderId: string;
  customerName?: string | null;
  carrier?: string | null;
  tracking?: string | null;
}): { subject: string; html: string; text: string } {
  const url = trackingUrl(opts.carrier, opts.tracking);
  const carrierLabel = opts.carrier ? opts.carrier.toUpperCase() : "Carrier";
  const subject = `Your VoidCard order has shipped`;
  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#f7f3ea;padding:24px;">
  <div style="max-width:520px;margin:0 auto;background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:32px;">
    <h1 style="margin:0 0 12px;font-size:22px;color:#d4af37;">Your order is on the way</h1>
    <p style="margin:0 0 16px;line-height:1.6;">${opts.customerName ? `Hi ${escape(opts.customerName)}, your` : "Your"} VoidCard order <code style="color:#d4af37">${escape(opts.orderId.slice(0, 8))}</code> just shipped.</p>
    ${opts.tracking ? `<p style="margin:0 0 16px;line-height:1.6;"><strong>${escape(carrierLabel)}</strong> tracking: <code>${escape(opts.tracking)}</code></p>` : ""}
    ${url ? `<p style="margin:0 0 16px;"><a href="${url}" style="display:inline-block;background:#d4af37;color:#0a0a0a;padding:10px 18px;border-radius:9999px;text-decoration:none;font-weight:600">Track package</a></p>` : ""}
    <hr style="border:none;border-top:1px solid #2a2a2a;margin:24px 0" />
    <p style="margin:0;font-size:12px;color:#a8a39a">VoidCard · vcard.ed5enterprise.com</p>
  </div>
</body></html>`;
  const text = [
    `Your VoidCard order ${opts.orderId.slice(0, 8)} has shipped.`,
    opts.tracking ? `${carrierLabel} tracking: ${opts.tracking}` : null,
    url ? `Track: ${url}` : null,
  ].filter(Boolean).join("\n");
  return { subject, html, text };
}

function escape(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
