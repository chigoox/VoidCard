import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createDesignAction, deleteDesignAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CardDesignsPage() {
  const user = await requireUser();
  const sb = await createClient();
  const { data: designs } = await sb
    .from("vcard_card_designs")
    .select("id, name, preview_url, status, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-2xl text-gold-grad">Card designer</h1>
          <p className="mt-1 text-sm text-ivory-dim">
            Design custom-art NFC cards. Mobile-first, save as you go.
          </p>
        </div>
        <form action={createDesignAction}>
          <button
            type="submit"
            data-testid="design-new"
            className="rounded-md border border-gold/60 bg-gold px-3 py-2 text-sm font-medium text-onyx-950 hover:bg-gold/90"
          >
            New design
          </button>
        </form>
      </header>

      {(!designs || designs.length === 0) && (
        <div className="rounded-lg border border-onyx-700 bg-onyx-900 p-6 text-center text-ivory-dim">
          <p>No designs yet.</p>
          <p className="mt-2 text-sm">
            Tap <span className="text-gold">New design</span> to start from a blank Onyx Gold canvas.
          </p>
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {designs?.map((d) => (
          <li
            key={d.id}
            data-testid="design-row"
            className="overflow-hidden rounded-lg border border-onyx-700 bg-onyx-900"
          >
            <Link
              href={`/cards/design/${d.id}`}
              className="block aspect-[1.586/1] w-full bg-onyx-950"
              aria-label={`Open ${d.name}`}
            >
              {d.preview_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={d.preview_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-widest text-ivory-mute">
                  Blank
                </div>
              )}
            </Link>
            <div className="flex items-center justify-between gap-2 p-3">
              <div className="min-w-0">
                <Link
                  href={`/cards/design/${d.id}`}
                  className="block truncate text-sm font-medium text-ivory hover:text-gold"
                >
                  {d.name}
                </Link>
                <div className="text-[11px] uppercase tracking-widest text-ivory-mute">
                  {d.status} · {new Date(d.updated_at).toLocaleDateString()}
                </div>
              </div>
              <form action={deleteDesignAction}>
                <input type="hidden" name="id" value={d.id} />
                <button
                  type="submit"
                  className="text-[11px] text-red-400/70 underline underline-offset-2 hover:text-red-400"
                  data-testid="design-delete"
                >
                  Delete
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
