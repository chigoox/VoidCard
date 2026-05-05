import Link from "next/link";

/**
 * TrustStrip — appears above the footer on /, /pricing, /shop.
 *
 * Each item links to its proof. Equal visual weight, no asterisks, no caveats.
 */
export function TrustStrip() {
  const items: { label: string; href: string }[] = [
    { label: "Stripe-secured checkout", href: "/terms#6-refunds" },
    { label: "30-day refund on cards", href: "/terms#6-refunds" },
    { label: "We never sell your data", href: "/privacy" },
    { label: "Delete your account in one click", href: "/privacy#your-rights" },
    { label: "Status & uptime", href: "https://status.ed5enterprise.com" },
  ];

  return (
    <section
      aria-label="Our promises"
      className="border-y border-paper-200 bg-paper-50"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6 py-5 text-xs text-ink-500">
        {items.map((item) => {
          const isExternal = item.href.startsWith("http");
          return isExternal ? (
            <a
              key={item.label}
              href={item.href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 hover:text-ink"
            >
              <span aria-hidden className="text-ink-400">·</span>
              {item.label}
            </a>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className="inline-flex items-center gap-2 hover:text-ink"
            >
              <span aria-hidden className="text-ink-400">·</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
