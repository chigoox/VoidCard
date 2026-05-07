import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function AccountIndex() {
  const u = await requireUser();
  const items = [
    { href: "/settings", label: "Profile & theme", desc: "Display name, bio, avatar, custom CSS." },
    { href: "/account/billing", label: "Billing", desc: "Plan, invoices, orders." },
    { href: "/account/payments", label: "Payments & selling", desc: "Connect Stripe and accept payments on your profile." },
    { href: "/account/products", label: "Products", desc: "Manage items you sell from Store sections." },
    { href: "/account/orders", label: "Sales & orders", desc: "Orders customers placed from your Store sections." },
    { href: "/account/credits", label: "AI credits", desc: "Generate images with AI right inside the editor." },
    { href: "/variants", label: "A/B variants", desc: "Weighted profile experiments for Pro and Team." },
    { href: "/fonts", label: "Custom fonts", desc: "Upload WOFF2 fonts for your public profile." },
    { href: "/account/domains", label: "Custom domains", desc: "Connect your own hostname to your public profile." },
    { href: "/account/security", label: "Security", desc: "Authenticator app, required for admins." },
    { href: "/account/verify", label: "Verified Badge", desc: u.verified ? "You're verified ✓" : "Get the gold check." },
    { href: "/account/notifications", label: "Notifications", desc: "Activity, weekly digests." },
    { href: "/account/api", label: "API & webhooks", desc: "Pro: API keys, signed webhooks." },
    { href: "/account/privacy", label: "Privacy & data", desc: "Export your data or request deletion." },
  ];
  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">You · @{u.username ?? "you"}</h1>
      </header>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.href}>
            <Link href={i.href} className="card flex items-center justify-between p-4 hover:border-gold/40">
              <div>
                <p className="font-display text-base">{i.label}</p>
                <p className="text-xs text-ivory-mute">{i.desc}</p>
              </div>
              <span className="text-gold">→</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
