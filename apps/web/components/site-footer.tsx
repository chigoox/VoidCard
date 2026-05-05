import Link from "next/link";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-paper-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 text-sm text-ink-500 md:grid-cols-4">
        <div>
          <p className="font-display text-lg font-semibold text-ink">VoidCard</p>
          <p className="mt-3 max-w-xs">
            NFC business cards plus a link-in-bio profile that converts. One tap, one link, one shop.
          </p>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-ink">Product</h4>
          <ul className="space-y-2">
            <li><Link href="/why-voidcard" className="hover:text-ink">Why VoidCard</Link></li>
            <li><Link href="/pricing" className="hover:text-ink">Pricing</Link></li>
            <li><Link href="/shop" className="hover:text-ink">Shop</Link></li>
            <li><Link href="/try" className="hover:text-ink">Try it</Link></li>
            <li><Link href="/u/voidluxury" className="hover:text-ink">Examples</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-ink">Resources</h4>
          <ul className="space-y-2">
            <li><Link href="/docs/api" className="hover:text-ink">API</Link></li>
            <li><Link href="/changelog" className="hover:text-ink">Changelog</Link></li>
            <li><Link href="/roadmap" className="hover:text-ink">Roadmap</Link></li>
            <li><Link href="/customers" className="hover:text-ink">Customers</Link></li>
            <li><Link href="/press" className="hover:text-ink">Press</Link></li>
            <li><Link href="/terms" className="hover:text-ink">Terms</Link></li>
            <li><Link href="/privacy" className="hover:text-ink">Privacy</Link></li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 font-semibold text-ink">Company</h4>
          <ul className="space-y-2">
            <li>
              <a href="https://ed5global.vercel.app/" target="_blank" rel="noreferrer" className="hover:text-ink">
                ED5 Global
              </a>
            </li>
            <li>
              <a href="https://ed5global.vercel.app/careers" target="_blank" rel="noreferrer" className="hover:text-ink">
                Careers
              </a>
            </li>
            <li><Link href="/contact" className="hover:text-ink">Contact</Link></li>
          </ul>
        </div>
      </div>

      <div className="border-t border-paper-200">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-ink-500">
          <p>© {year} VoidCard · ED5 Enterprise. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="https://discord.gg/s3Nk2qb8tJ" target="_blank" rel="noreferrer" className="hover:text-ink">Discord</a>
            <a href="https://github.com/chigoox" target="_blank" rel="noreferrer" className="hover:text-ink">GitHub</a>
            <a href="https://twitter.com/ed5mmostudio" target="_blank" rel="noreferrer" className="hover:text-ink">Twitter</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
