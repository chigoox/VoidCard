import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeContact } from "./actions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Profile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export default async function ExchangePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const sb = createAdminClient();

  const { data: row } = await sb
    .from("vcard_exchange_tokens")
    .select("id, user_id, token, expires_at, consumed_at")
    .eq("token", token)
    .maybeSingle();

  if (!row) notFound();

  const expired = new Date(row.expires_at).getTime() < Date.now();
  const consumed = row.consumed_at !== null;

  const { data: profile } = await sb
    .from("vcard_profile_ext")
    .select("user_id, username, display_name, avatar_url")
    .eq("user_id", row.user_id)
    .maybeSingle();

  const owner = profile as Profile | null;

  if (expired || consumed) {
    return (
      <main className="mx-auto max-w-md px-6 py-16">
        <div className="card p-8 text-center">
          <h1 className="font-display text-2xl text-gold-grad">Link unavailable</h1>
          <p className="mt-3 text-sm text-ivory-mute">
            {expired ? "This exchange link has expired." : "This exchange link has already been used."}
          </p>
          {owner?.username && (
            <Link href={`/u/${owner.username}`} className="btn-ghost mt-6 inline-block">
              View @{owner.username}
            </Link>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <div className="card p-8">
        <div className="flex items-center gap-3">
          {owner?.avatar_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={owner.avatar_url} alt="" className="h-12 w-12 rounded-full border border-onyx-700/60 object-cover" />
          )}
          <div>
            <h1 className="font-display text-xl text-gold-grad">Exchange contact</h1>
            <p className="text-sm text-ivory-mute">
              with {owner?.display_name ?? "this user"}
              {owner?.username && <> · @{owner.username}</>}
            </p>
          </div>
        </div>

        <form action={exchangeContact} className="mt-6 space-y-4">
          <input type="hidden" name="token" value={token} />
          <div>
            <label className="block text-xs uppercase tracking-widest text-ivory-mute">Name</label>
            <input name="name" required maxLength={120} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-ivory-mute">Email</label>
            <input name="email" type="email" required maxLength={200} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-ivory-mute">Phone (optional)</label>
            <input name="phone" maxLength={40} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-ivory-mute">Company (optional)</label>
            <input name="company" maxLength={120} className="input w-full" />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-ivory-mute">Note (optional)</label>
            <textarea name="note" rows={3} maxLength={500} className="input w-full" />
          </div>
          <button type="submit" className="btn-primary w-full">Send my contact</button>
          <p className="text-[11px] text-ivory-mute">
            Your details will be shared one-time with this user. By submitting you agree to our{" "}
            <Link href="/privacy" className="text-gold hover:underline">privacy policy</Link>.
          </p>
        </form>
      </div>
    </main>
  );
}
