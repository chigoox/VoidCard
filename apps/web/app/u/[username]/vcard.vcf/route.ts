import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { entitlementsFor } from "@/lib/entitlements";
import { findPublicProfileByUsername } from "@/lib/profiles";
import {
  profileUnlockCookieName,
  verifyProfileUnlockCookieValue,
} from "@/lib/profile-password";

export const runtime = "edge";

type SectionLike = {
  type: string;
  props?: Record<string, unknown>;
};

function escape(s: string): string {
  return s.replace(/([,;\\])/g, "\\$1").replace(/\r?\n/g, "\\n");
}

function pickContact(sections: SectionLike[] | null | undefined): {
  phone?: string;
  email?: string;
  url?: string;
  org?: string;
  title?: string;
  address?: string;
} {
  const out: Record<string, string> = {};
  if (!Array.isArray(sections)) return out;
  for (const section of sections) {
    const props = (section.props ?? {}) as Record<string, unknown>;
    if (section.type === "quick_actions" && Array.isArray(props.items)) {
      for (const item of props.items as Array<Record<string, unknown>>) {
        const kind = String(item.kind ?? item.type ?? "").toLowerCase();
        const value = String(item.value ?? item.target ?? "");
        if (!value) continue;
        if (kind === "call" || kind === "phone") out.phone ??= value;
        if (kind === "email") out.email ??= value;
        if (kind === "map" || kind === "address") out.address ??= value;
      }
    }
    if (section.type === "header") {
      if (typeof props.title === "string") out.title ??= props.title;
      if (typeof props.company === "string") out.org ??= props.company;
    }
  }
  return out;
}

export async function GET(_: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await findPublicProfileByUsername(username);

  if (!profile) {
    return new NextResponse("Profile not found", { status: 404 });
  }

  const handle = profile.username ?? username.toLowerCase();
  const entitlements = entitlementsFor(profile.plan ?? "free", {
    extraStorageBytes: Number(profile.bonusStorageBytes ?? 0),
  });
  const passwordHash = typeof profile.passwordHash === "string" ? profile.passwordHash : null;
  if (entitlements.passwordProtected && passwordHash) {
    const cookieStore = await cookies();
    const isUnlocked = await verifyProfileUnlockCookieValue(
      handle,
      passwordHash,
      cookieStore.get(profileUnlockCookieName(handle))?.value,
    );
    if (!isUnlocked) {
      return new NextResponse("Password required", { status: 401 });
    }
  }

  const contact = pickContact(profile.sections as SectionLike[] | null);
  const fullName = profile.displayName ?? handle;
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcard.ed5enterprise.com"}/u/${handle}`;

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${escape(fullName)}`,
    `N:${escape(fullName)};;;;`,
  ];
  if (contact.org) lines.push(`ORG:${escape(contact.org)}`);
  if (contact.title) lines.push(`TITLE:${escape(contact.title)}`);
  if (contact.email) lines.push(`EMAIL;TYPE=INTERNET:${escape(contact.email)}`);
  if (contact.phone) lines.push(`TEL;TYPE=CELL:${escape(contact.phone)}`);
  if (contact.address) lines.push(`ADR;TYPE=WORK:;;${escape(contact.address)};;;;`);
  if (profile.bio) lines.push(`NOTE:${escape(profile.bio)}`);
  if (profile.avatarUrl) lines.push(`PHOTO;VALUE=URI:${profile.avatarUrl}`);
  lines.push(`URL:${url}`);
  lines.push(`X-VOIDCARD-USERNAME:${handle}`);
  lines.push("END:VCARD");

  return new NextResponse(lines.join("\r\n") + "\r\n", {
    status: 200,
    headers: {
      "content-type": "text/vcard; charset=utf-8",
      "content-disposition": `attachment; filename="${handle}.vcf"`,
      "cache-control": "public, max-age=300, s-maxage=600",
    },
  });
}
