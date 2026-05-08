import { notFound } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { DesignerClient } from "./DesignerClient";
import type { DesignDoc } from "./types";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function safeReturnTo(value: unknown) {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.length > 300) return null;
  return value;
}

export default async function DesignPage({
  params,
  searchParams,
}: Props & { searchParams?: Promise<{ return_to?: string }> }) {
  const { id } = await params;
  const returnTo = safeReturnTo((await searchParams)?.return_to);
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const user = await requireUser();
  const profileUrl = new URL(
    user.username ? `/u/${user.username}` : "/dashboard",
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcard.ed5enterprise.com",
  ).toString();
  const sb = await createClient();
  const { data: design } = await sb
    .from("vcard_card_designs")
    .select("id, name, doc, preview_url")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const ents = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  const { data: fontRows } = ents.customFontUpload
    ? await sb
        .from("vcard_user_fonts")
        .select("family, url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: null };

  if (!design) notFound();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/cards/design${returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : ""}`}
          className="text-xs uppercase tracking-widest text-ivory-mute hover:text-gold"
        >
          ← All designs
        </Link>
      </div>
      <DesignerClient
        id={design.id}
        initialName={design.name}
        initialDoc={design.doc as DesignDoc}
        profileUrl={profileUrl}
        customFonts={(fontRows as Array<{ family: string; url: string }> | null) ?? []}
      />
    </div>
  );
}
