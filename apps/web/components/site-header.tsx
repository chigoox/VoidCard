import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = !!user;

  return (
    <header className="sticky top-0 z-30 border-b border-paper-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="font-display text-xl font-semibold tracking-tight text-ink">
          VoidCard
        </Link>
        <nav className="hidden items-center gap-7 text-sm md:flex">
          <Link href="/why-voidcard" className="text-ink-500 hover:text-ink">Why</Link>
          <Link href="/pricing" className="text-ink-500 hover:text-ink">Pricing</Link>
          <Link href="/shop" className="text-ink-500 hover:text-ink">Shop</Link>
          <Link href="/customers" className="text-ink-500 hover:text-ink">Customers</Link>
          {isLoggedIn ? (
            <Link href="/dashboard" className="btn-primary">Dashboard</Link>
          ) : (
            <>
              <Link href="/login" className="text-ink-500 hover:text-ink">Sign in</Link>
              <Link href="/shop" className="btn-primary">Get your card</Link>
            </>
          )}
        </nav>
        {isLoggedIn ? (
          <Link href="/dashboard" className="btn-primary md:hidden">Dashboard</Link>
        ) : (
          <Link href="/shop" className="btn-primary md:hidden">Get yours</Link>
        )}
      </div>
    </header>
  );
}
