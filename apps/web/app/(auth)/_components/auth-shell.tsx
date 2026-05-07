import Link from "next/link";
import type { ReactNode } from "react";

type AuthShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
};

const STATS = [
  { value: "30 sec", label: "Card pairing" },
  { value: "12 themes", label: "Included on Free" },
  { value: "0 caps", label: "On links or views" },
];

const NOTES = [
  {
    title: "Luxury first",
    body: "Onyx Gold ships as the default. Most people never have to redesign a thing.",
  },
  {
    title: "One identity layer",
    body: "Email, Google, wallet pass, and NFC pairing all converge on the same living profile.",
  },
];

export function AuthShell({ eyebrow, title, description, children, footer }: AuthShellProps) {
  return (
    <main className="home-theme relative min-h-screen overflow-hidden bg-onyx-grad">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12rem] top-[-12rem] h-[26rem] w-[26rem] rounded-full bg-ink/5 blur-3xl" />
        <div className="absolute bottom-[-16rem] right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-ink/8 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ink/30 to-transparent" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-6xl gap-10 px-6 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:py-12">
        <section className="flex flex-col justify-between gap-10 py-2 lg:py-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-pill border border-gold/20 bg-onyx-950/70 px-4 py-2 text-sm text-ivory transition hover:border-gold/40 hover:text-gold"
            >
              <span className="inline-flex size-8 items-center justify-center rounded-full border border-gold/30 bg-gold/10 font-display text-sm text-gold">
                V
              </span>
              VoidCard
            </Link>
            <p className="text-xs uppercase tracking-[0.3em] text-ivory-mute">Free forever on essentials</p>
          </div>

          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.38em] text-gold/80">ED5 identity stack</p>
            <h1 className="mt-6 font-display text-5xl leading-[0.94] tracking-tight text-ivory sm:text-6xl">
              Tap once. Stay remembered.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-ivory-dim sm:text-lg">
              Your card, profile, wallet pass, and follow-up funnel should feel like one polished
              system. VoidCard keeps the auth moment as sharp as the profile that follows it.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {STATS.map((item) => (
              <div key={item.label} className="rounded-[1.6rem] border border-gold/15 bg-onyx-950/60 p-4 backdrop-blur">
                <p className="font-display text-2xl text-gold-grad">{item.value}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.24em] text-ivory-mute">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {NOTES.map((item) => (
              <div key={item.title} className="card p-5">
                <p className="font-display text-2xl text-ivory">{item.title}</p>
                <p className="mt-3 text-sm leading-6 text-ivory-dim">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="relative flex items-center justify-center lg:justify-end">
          <div className="absolute inset-x-4 top-6 h-28 rounded-[2rem] border border-gold/20 bg-gold/10 blur-2xl" />
          <div className="card relative w-full max-w-xl border-gold/20 bg-onyx-950/88 p-6 shadow-[0_32px_120px_-52px_rgba(0,0,0,0.95)] sm:p-8">
            <p className="text-xs uppercase tracking-[0.35em] text-gold/80">{eyebrow}</p>
            <h2 className="mt-4 font-display text-4xl tracking-tight text-gold-grad sm:text-[2.8rem]">
              {title}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-ivory-dim">{description}</p>
            <div className="mt-8">{children}</div>
            {footer ? <div className="mt-6 border-t border-onyx-800 pt-5">{footer}</div> : null}
          </div>
        </section>
      </div>
    </main>
  );
}