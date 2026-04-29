import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUserId, getOnboardingStatus } from '../data/platformService'

const featureCards = [
  'Tap or scan to share instantly (NFC + QR).',
  'Beautiful branded profiles for individuals and teams.',
  'Built-in lead capture, analytics, and follow-up workflows.',
  'No app required for your contact — opens instantly in browser.',
]

const proofPoints = [
  { label: 'Setup time', value: '< 2 minutes' },
  { label: 'Profile updates', value: 'Real-time' },
  { label: 'Team readiness', value: 'Enterprise-friendly' },
]

const featuredProducts = [
  {
    id: 'metal-black',
    name: 'Signature Metal Card',
    price: '$79',
    badge: 'Best Seller',
    copy: 'Premium metal finish, laser engraving, and deep-link NFC chip.',
  },
  {
    id: 'matte-core',
    name: 'Core Matte Card',
    price: '$39',
    badge: 'Most Popular',
    copy: 'Sleek matte PVC card with full profile + QR backup.',
  },
  {
    id: 'teams-kit',
    name: 'Teams Launch Kit',
    price: '$299',
    badge: 'For Teams',
    copy: 'Multi-card bundle with centralized branding and analytics.',
  },
]

export default function HomePage() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    getOnboardingStatus(getCurrentUserId()).then(setStatus)
  }, [])

  return (
    <div className="space-y-10 pb-4">
      <section className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/20 via-blue-600/10 to-violet-600/20 p-8 md:p-12">
        <p className="mb-3 inline-block rounded-full bg-cyan-300/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">NFC Business Cards — Built to Win First Impressions</p>
        <h1 className="text-4xl font-black leading-tight md:text-6xl">Look sharper. Share faster. Convert more connections.</h1>
        <p className="mt-5 max-w-3xl text-slate-300">VoidCard helps professionals and teams replace outdated paper cards with elegant NFC experiences that actually drive follow-ups. One tap opens your branded profile, socials, links, booking, and lead capture in seconds.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/store" className="rounded-full bg-cyan-300 px-6 py-3 font-bold text-slate-950">Shop Cards</Link>
          <Link to="/settings" className="rounded-full border border-white/20 px-6 py-3 font-bold">Connect My Card</Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {proofPoints.map((point) => (
            <article key={point.label} className="rounded-2xl border border-white/10 bg-slate-900/40 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-400">{point.label}</p>
              <p className="mt-1 text-xl font-bold text-cyan-200">{point.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-bold">Featured Card Lineup</h2>
        <p className="mt-1 text-sm text-slate-300">Product image areas are intentionally placeholders for your final photography/renders.</p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {featuredProducts.map((product) => (
            <article key={product.id} className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
              <div className="aspect-[4/3] rounded-xl border border-dashed border-cyan-300/40 bg-slate-950/70 p-3">
                <div className="flex h-full items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/15 to-violet-500/15 text-center text-xs uppercase tracking-widest text-cyan-200">
                  Product Image Placeholder
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <h3 className="font-semibold">{product.name}</h3>
                <span className="rounded-full bg-cyan-300/20 px-2 py-1 text-xs font-semibold text-cyan-200">{product.badge}</span>
              </div>
              <p className="mt-2 text-sm text-slate-300">{product.copy}</p>
              <p className="mt-3 text-lg font-bold text-cyan-300">{product.price}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-bold">Your Launch Checklist</h2>
        <ul className="mt-3 space-y-2 text-slate-300">
          <li>{status?.hasProfile ? '✅' : '⬜'} Create your profile</li>
          <li>{status?.hasConnectedCard ? '✅' : '⬜'} Connect your NFC card</li>
          <li>{status?.cardId ? '✅' : '⬜'} Test tap route: {status?.cardId ? `/c/${status.cardId}` : 'not set'}</li>
          <li>{status?.role ? '✅' : '⬜'} Role loaded: {status?.role || 'unknown'}</li>
        </ul>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {featureCards.map((feature) => (
          <article key={feature} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-slate-200">
            {feature}
          </article>
        ))}
      </section>
    </div>
  )
}
