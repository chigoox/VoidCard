import Link from "next/link";
import { requireUser } from "@/lib/auth";

function normalizeInternalPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const nextPath =
    typeof resolvedSearchParams.next === "string"
      ? normalizeInternalPath(resolvedSearchParams.next)
      : null;

  const checklist = [
    {
      title: "Claim your username",
      body: "Keep your public profile memorable before you start sharing it.",
      href: "/settings",
      cta: "Open settings",
    },
    {
      title: "Build your first profile",
      body: "Open the editor, choose your vibe, and publish your first card layout.",
      href: "/edit",
      cta: "Start editing",
    },
    {
      title: "Add the links people need",
      body: "Drop in your priority links so your public page is useful on first visit.",
      href: "/links",
      cta: "Manage links",
    },
    {
      title: "Pair your NFC card",
      body: "Connect a card now or come back after you have one in hand.",
      href: "/cards/pair",
      cta: "Pair a card",
    },
  ];

  return (
    <div className="space-y-6" data-testid="onboarding-page">
      <section className="card p-6 sm:p-8">
        <p className="text-xs uppercase tracking-[0.24em] text-gold">Onboarding</p>
        <h1 className="mt-2 font-display text-3xl text-gold-grad">Welcome to VoidCard, {user.displayName ?? `@${user.username ?? "you"}`}</h1>
        <p className="mt-3 max-w-2xl text-sm text-ivory-dim sm:text-base">
          Your account is ready. Use this quick launchpad to finish the first setup tasks and get your public page live.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/edit" className="btn-gold">Open editor</Link>
          <Link href={nextPath ?? "/dashboard"} className="btn-ghost">Skip to dashboard</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {checklist.map((item, index) => (
          <article key={item.title} className="card flex h-full flex-col gap-4 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ivory-mute">Step {index + 1}</p>
              <h2 className="mt-2 font-display text-2xl text-ivory">{item.title}</h2>
              <p className="mt-2 text-sm text-ivory-dim">{item.body}</p>
            </div>
            <div className="mt-auto">
              <Link href={item.href} className="btn-ghost inline-flex">{item.cta}</Link>
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}