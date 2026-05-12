import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { unpairCardAction } from "./pair/actions";

export const dynamic = "force-dynamic";

type CardTapRow = {
  card_id: string | null;
  occurred_at: string | null;
};

type CardTapStats = {
  total_taps: number;
  last_tap_at: string | null;
};

export default async function CardsPage() {
  const user = await requireUser();
  const sb = await createClient();

  const { data: cards } = await sb
    .from("vcard_cards")
    .select("id, serial, sku, status, paired_at, last_tap_at, total_taps, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const cardIds = (cards ?? []).map((card) => card.id);
  const { data: tapRows } = cardIds.length > 0
    ? await sb
        .from("vcard_taps")
        .select("card_id, occurred_at")
        .in("card_id", cardIds)
    : { data: [] as CardTapRow[] };

  const tapStats = buildCardTapStats((tapRows ?? []) as CardTapRow[]);
  const visibleCards = (cards ?? []).map((card) => {
    const stats = tapStats.get(card.id);
    return {
      ...card,
      total_taps: stats?.total_taps ?? Number(card.total_taps ?? 0),
      last_tap_at: stats?.last_tap_at ?? card.last_tap_at,
    };
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl text-gold-grad">Your cards</h1>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/cards/design"
            className="rounded-md border border-gold/60 bg-onyx-900 px-3 py-1.5 text-sm text-gold hover:bg-gold hover:text-onyx-950"
            data-testid="cards-design-link"
          >
            Design custom card
          </Link>
          <Link
            href="/cards/pair"
            className="rounded-md border border-gold/60 bg-onyx-900 px-3 py-1.5 text-sm text-gold hover:bg-gold hover:text-onyx-950"
            data-testid="cards-pair-link"
          >
            Pair a card
          </Link>
        </div>
      </header>

      {visibleCards.length === 0 && (
        <div className="rounded-lg border border-onyx-700 bg-onyx-900 p-6 text-center text-ivory-dim">
          <p>No cards paired yet.</p>
          <p className="mt-2 text-sm">
            Tap your VoidCard on your phone, or{" "}
            <Link href="/cards/pair" className="text-gold underline">pair manually</Link>.
          </p>
        </div>
      )}

      <ul className="space-y-3">
        {visibleCards.map((c) => (
          <li
            key={c.id}
            data-testid="card-row"
            className="rounded-lg border border-onyx-700 bg-onyx-900 p-4"
          >
            <div className="flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-mono text-sm text-ivory">{c.serial}</div>
                <div className="text-xs uppercase tracking-widest text-ivory-dim">
                  {c.sku} · {c.status}
                </div>
                {c.paired_at && (
                  <div className="mt-1 text-[11px] text-ivory-mute">
                    Paired {new Date(c.paired_at).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 text-xs text-ivory-dim">
                <div className="text-right">
                  <div>{Number(c.total_taps).toLocaleString()} taps</div>
                  {c.last_tap_at && (
                    <div>last {new Date(c.last_tap_at).toLocaleDateString()}</div>
                  )}
                </div>
                <form action={unpairCardAction}>
                  <input type="hidden" name="cardId" value={c.id} />
                  <button
                    type="submit"
                    className="text-[11px] text-red-400/70 hover:text-red-400 underline underline-offset-2"
                    data-testid="card-unpair"
                  >
                    Remove
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function buildCardTapStats(rows: CardTapRow[]) {
  return rows.reduce<Map<string, CardTapStats>>((stats, row) => {
    if (!row.card_id) return stats;

    const current = stats.get(row.card_id) ?? { total_taps: 0, last_tap_at: null };
    const nextLastTapAt = current.last_tap_at && row.occurred_at
      ? (current.last_tap_at > row.occurred_at ? current.last_tap_at : row.occurred_at)
      : (current.last_tap_at ?? row.occurred_at ?? null);

    stats.set(row.card_id, {
      total_taps: current.total_taps + 1,
      last_tap_at: nextLastTapAt,
    });
    return stats;
  }, new Map<string, CardTapStats>());
}
