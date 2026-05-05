import { NextResponse } from "next/server";
import { audit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { coerceVerificationDocuments, type VerificationDocument } from "@/lib/verification";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VerificationRow = {
  id: string;
  user_id: string;
  status: string;
  decided_at: string | null;
  documents: unknown;
};

function authorize(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const fromVercelCron = req.headers.get("x-vercel-cron") === "1";
  return fromVercelCron || (!!cronSecret && auth === `Bearer ${cronSecret}`);
}

function scrubPrivateDocuments(documents: VerificationDocument[]) {
  return documents.map((doc) => {
    if (doc.bucket !== "vcard-private" || !doc.storagePath) return doc;

    return {
      kind: doc.kind,
      name: doc.name,
      value: doc.value,
    };
  });
}

export async function GET(req: Request) {
  if (!authorize(req)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_verifications")
    .select("id, user_id, status, decided_at, documents")
    .in("status", ["approved", "rejected", "revoked"])
    .not("decided_at", "is", null)
    .lte("decided_at", cutoff)
    .order("decided_at", { ascending: true })
    .limit(50);

  const rows = (data as VerificationRow[] | null) ?? [];
  const results: Array<{ id: string; removedPaths: number; removedMedia: number; status: string }> = [];

  for (const row of rows) {
    const documents = coerceVerificationDocuments(row.documents);
    const privateDocuments = documents.filter(
      (doc) => doc.bucket === "vcard-private" && !!doc.storagePath
    );

    if (privateDocuments.length === 0) {
      results.push({ id: row.id, removedPaths: 0, removedMedia: 0, status: "already_clean" });
      continue;
    }

    const paths = Array.from(
      new Set(privateDocuments.flatMap((doc) => (doc.storagePath ? [doc.storagePath] : [])))
    );
    const mediaIds = Array.from(
      new Set(privateDocuments.flatMap((doc) => (doc.mediaId ? [doc.mediaId] : [])))
    );

    try {
      const { error: storageError } = await admin.storage.from("vcard-private").remove(paths);
      if (storageError) throw new Error(storageError.message);

      if (mediaIds.length > 0) {
        const { error: hashUpdateError } = await admin
          .from("vcard_verification_document_hashes")
          .update({ purged_at: new Date().toISOString() })
          .eq("verification_id", row.id)
          .in("media_id", mediaIds);
        if (hashUpdateError) throw new Error(hashUpdateError.message);

        const { error: mediaError } = await admin
          .from("vcard_media")
          .delete()
          .eq("user_id", row.user_id)
          .in("id", mediaIds);
        if (mediaError) throw new Error(mediaError.message);
      }

      const { error: updateError } = await admin
        .from("vcard_verifications")
        .update({ documents: scrubPrivateDocuments(documents) })
        .eq("id", row.id);
      if (updateError) throw new Error(updateError.message);

      await audit({
        action: "verification.documents.purged",
        actorId: null,
        targetKind: "vcard_verifications",
        targetId: row.id,
        diff: {
          removedPaths: paths.length,
          removedMedia: mediaIds.length,
          status: row.status,
        },
      });

      results.push({
        id: row.id,
        removedPaths: paths.length,
        removedMedia: mediaIds.length,
        status: "purged",
      });
    } catch (error) {
      results.push({
        id: row.id,
        removedPaths: 0,
        removedMedia: 0,
        status: `error:${error instanceof Error ? error.message : "unknown"}`,
      });
    }
  }

  return NextResponse.json({ ok: true, processed: results.length, results });
}