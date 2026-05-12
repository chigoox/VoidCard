export const runtime = "edge";

export function GET() {
  return new Response(
    [
      "Contact: mailto:security@vcard.ed5enterprise.com",
      "Policy: https://vcard.ed5enterprise.com/legal/security",
      "Preferred-Languages: en",
      "Canonical: https://vcard.ed5enterprise.com/.well-known/security.txt",
      "Expires: 2027-05-11T00:00:00Z",
      "",
    ].join("\n"),
    {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "public, max-age=86400",
      },
    },
  );
}import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Vulnerability disclosure metadata (RFC 9116).
 * Exposed at /.well-known/security.txt.
 */
export function GET() {
  const oneYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const body = [
    "Contact: mailto:security@ed5enterprise.com",
    `Expires: ${oneYear}`,
    "Preferred-Languages: en",
    "Canonical: https://vcard.ed5enterprise.com/.well-known/security.txt",
    "Policy: https://vcard.ed5enterprise.com/legal/security",
    "Acknowledgments: https://vcard.ed5enterprise.com/legal/security#hall-of-fame",
    "",
  ].join("\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
