import { requireUser } from "@/lib/auth";
import Link from "next/link";
import { PairCardClient } from "./PairCardClient";

export const dynamic = "force-dynamic";

const ERR_MAP: Record<string, string> = {
  missing: "Enter a card serial or ID.",
  not_found: "We couldn't find that card.",
  already_paired: "This card is already paired to another account.",
  not_ready: "This card hasn't been provisioned yet. Contact support.",
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
        <h1 className="font-display text-2xl text-gold-grad">
          {sp.cardId ? "Claim your VoidCard" : "Pair your card"}
        </h1>
        <p className="mt-2 text-sm text-ivory-dim">
          {sp.cardId
            ? "Your card was detected. Confirm below to link it to your account."
            : "Hold your VoidCard to the back of your phone to scan it, or enter the serial printed on the back."}
        </p>
      </header>

      <PairCardClient
        prefillCardId={sp.cardId}
        serverError={error}
      />

      <p className="text-center text-xs text-ivory-dim">
        <Link href="/cards" className="underline hover:text-gold">Back to cards</Link>
      </p>
    </div>
  );
}
