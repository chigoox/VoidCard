import "server-only";

type WeeklyDigestEmailInput = {
  displayName: string;
  username: string | null;
  taps: number;
  contacts: number;
  orders: number;
  windowLabel: string;
  insightsUrl: string;
};

function pluralize(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function buildWeeklyDigestEmail(input: WeeklyDigestEmailInput) {
  const subject = "Your week on VoidCard";
  const intro = input.username
    ? `${input.displayName} (@${input.username})`
    : input.displayName;
  const stats = [
    pluralize(input.taps, "tap"),
    pluralize(input.contacts, "contact"),
    pluralize(input.orders, "order"),
  ];
  const html = `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#f7f3ea;padding:24px;">
  <div style="max-width:560px;margin:0 auto;background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:32px;">
    <p style="margin:0 0 10px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#d4af37;">Weekly digest</p>
    <h1 style="margin:0 0 12px;font-size:24px;color:#f7f3ea;">${escapeHtml(intro)}</h1>
    <p style="margin:0 0 20px;line-height:1.6;color:#d6d0c4;">Here’s your VoidCard activity for ${escapeHtml(input.windowLabel)}.</p>
    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:0 0 24px;">
      ${statCard(input.taps, "Taps")}
      ${statCard(input.contacts, "Contacts")}
      ${statCard(input.orders, "Orders")}
    </div>
    <p style="margin:0 0 18px;line-height:1.6;color:#d6d0c4;">This week: ${escapeHtml(stats.join(" · "))}.</p>
    <p style="margin:0 0 20px;"><a href="${input.insightsUrl}" style="display:inline-block;background:#d4af37;color:#0a0a0a;padding:12px 18px;border-radius:9999px;text-decoration:none;font-weight:700;">Open insights</a></p>
    <p style="margin:0;font-size:12px;color:#a8a39a;">VoidCard · vcard.ed5enterprise.com</p>
  </div>
</body></html>`;
  const text = [
    `${intro}`,
    `Your VoidCard activity for ${input.windowLabel}:`,
    `- ${pluralize(input.taps, "tap")}`,
    `- ${pluralize(input.contacts, "contact")}`,
    `- ${pluralize(input.orders, "order")}`,
    `Open insights: ${input.insightsUrl}`,
  ].join("\n");

  return { subject, html, text };
}

function statCard(value: number, label: string) {
  return `<div style="border:1px solid #2a2a2a;border-radius:12px;padding:16px;background:#101010;text-align:center;">
    <div style="font-size:28px;font-weight:700;color:#f7f3ea;">${value}</div>
    <div style="margin-top:4px;font-size:12px;letter-spacing:0.16em;text-transform:uppercase;color:#a8a39a;">${escapeHtml(label)}</div>
  </div>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char] ?? char);
}