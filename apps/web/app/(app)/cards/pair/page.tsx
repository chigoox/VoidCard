import { requireUser } from "@/lib/auth";
import { pairCardAction } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ERR_MAP: Record<string, string> = {
  missing: "Enter a card serial or ID.",
  not_found: "We couldn't find that card.",
  already_paired: "This card is already paired to another account.",
  deactivated: "This card has been deactivated.",
  plan_limit: "Your plan's paired-card limit has been reached. Upgrade to add more.",
  internal: "Something went wrong. Try again.",
};

export default async function PairCardPage({
  searchParams,
}: {
  searchParams: Promise<{ cardId?: string; err?: string }>;
}) {
  await requireUser();
  const sp = await searchParams;
  const error = sp.err ? ERR_MAP[sp.err] ?? "Pairing failed." : null;

  return (
    <div className="mx-auto max-w-md space-y-6 py-6">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">Pair your card</h1>
        <p className="mt-2 text-sm text-ivory-dim">
          Tap your VoidCard on your phone to auto-fill the ID, or enter the serial printed on the back.
        </p>
      </header>

      {error && (
        <div
          role="alert"
          data-testid="pair-error"
          className="rounded-md border border-red-500/60 bg-red-950/40 p-3 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      <form action={pairCardAction} className="space-y-4">
        {sp.cardId && <input type="hidden" name="cardId" value={sp.cardId} />}
        <div>
          <label className="mb-1 block text-xs uppercase tracking-widest text-ivory-dim" htmlFor="serial">
            Serial or card ID
          </label>
          <input
            id="serial"
            name="serial"
            data-testid="pair-serial"
            defaultValue={sp.cardId ?? ""}
            className="w-full rounded-md border border-onyx-700 bg-onyx-950 px-3 py-2 font-mono text-ivory focus:border-gold focus:outline-none"
            autoComplete="off"
            required={!sp.cardId}
          />
        </div>
        <button
          type="submit"
          data-testid="pair-submit"
          className="w-full rounded-md bg-gold px-4 py-2 font-medium text-onyx-950 hover:bg-gold-bright"
        >
          Pair card
        </button>
      </form>

      <p className="text-center text-xs text-ivory-dim">
        <Link href="/cards" className="underline hover:text-gold">Back to cards</Link>
      </p>
    </div>
  );
}
