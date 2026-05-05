import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CardsPage() {
  const user = await requireUser();
  const sb = await createClient();

  const { data: cards } = await sb
    .from("vcard_cards")
    .select("id, serial, sku, status, paired_at, last_tap_at, total_taps, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-gold-grad">Your cards</h1>
        <Link
          href="/cards/pair"
          className="rounded-md border border-gold/60 bg-onyx-900 px-3 py-1.5 text-sm text-gold hover:bg-gold hover:text-onyx-950"
          data-testid="cards-pair-link"
        >
          Pair a card
        </Link>
      </header>

      {(!cards || cards.length === 0) && (
        <div className="rounded-lg border border-onyx-700 bg-onyx-900 p-6 text-center text-ivory-dim">
          <p>No cards paired yet.</p>
          <p className="mt-2 text-sm">
            Tap your VoidCard on your phone, or{" "}
            <Link href="/cards/pair" className="text-gold underline">pair manually</Link>.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {cards?.map((c) => (
          <li
            key={c.id}
            data-testid="card-row"
            className="rounded-lg border border-onyx-700 bg-onyx-900 p-4"
          >
            <div className="flex items-baseline justify-between gap-3">
              <div>
                <div className="font-mono text-sm text-ivory">{c.serial}</div>
                <div className="text-xs uppercase tracking-widest text-ivory-dim">
                  {c.sku} · {c.status}
                </div>
              </div>
              <div className="text-right text-xs text-ivory-dim">
                <div>{Number(c.total_taps).toLocaleString()} taps</div>
                {c.last_tap_at && (
                  <div>last {new Date(c.last_tap_at).toLocaleString()}</div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
