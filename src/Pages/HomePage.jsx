import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUserId, getOnboardingStatus } from '../data/platformService'

const promoBullets = [
  'One tap share on iPhone + Android',
  'No app required for the recipient',
  'Built-in QR fallback on every card',
  'Update your details anytime — instantly',
]

const productCollections = [
  {
    title: 'Shop Basics',
    subtitle: 'Simple, premium cards for everyday networking.',
    items: [
      { name: 'Void Thin', price: '$39', tag: 'Most Popular', description: 'Ultra-slim NFC card with polished matte finish.' },
      { name: 'Void Metal', price: '$79', tag: 'New', description: 'Laser-engraved stainless steel for premium first impressions.' },
      { name: 'Void Band', price: '$49', tag: 'Wearable', description: 'Hands-free networking with dual scan zones.' },
    ],
  },
  {
    title: 'Shop Custom',
    subtitle: 'Designed for creators, founders, and brand teams.',
    items: [
      { name: 'Custom Metal', price: '$109', tag: 'Premium', description: 'Personalized metal card with your branding and finish.' },
      { name: 'Custom Matte', price: '$69', tag: 'Best Value', description: 'Full-color branded card for events and outbound sales.' },
      { name: 'Design Mockup', price: 'Free', tag: 'Included', description: 'Request a free visual mockup before placing bulk orders.' },
    ],
  },
  {
    title: 'Shop Packs',
    subtitle: 'Bulk pricing for teams and events.',
    items: [
      { name: 'Starter Duo', price: '$99', tag: 'Save 15%', description: 'Two-card bundle perfect for partners or cofounders.' },
      { name: 'Team Five', price: '$299', tag: 'Save 22%', description: '5-card bundle with centralized setup and role access.' },
      { name: 'Growth Ten', price: '$549', tag: 'Save 30%', description: '10-card package for teams that network at scale.' },
    ],
  },
]

const howItWorks = [
  {
    step: '01',
    title: 'Create your profile',
    text: 'Build a high-converting profile with your contact details, socials, links, booking page, and payment options.',
  },
  {
    step: '02',
    title: 'Activate your card',
    text: 'Connect your NFC card in minutes. We handle your tap destination and backup QR automatically.',
  },
  {
    step: '03',
    title: 'Tap, share, and follow up',
    text: 'Share instantly in-person and capture leads so every conversation has a next step.',
  },
]

export default function HomePage() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    getOnboardingStatus(getCurrentUserId()).then(setStatus)
  }, [])

  return (
    <div className="space-y-12 pb-6">
      <section className="rounded-3xl border border-cyan-300/30 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-violet-600/20 p-8 md:p-12">
        <p className="mb-3 inline-block rounded-full bg-cyan-300/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">VoidCard Platform</p>
        <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">The digital business card experience built to convert real conversations into real customers.</h1>
        <p className="mt-5 max-w-3xl text-slate-300">From solo creators to high-volume sales teams, VoidCard makes networking unforgettable: premium physical cards, stunning digital profiles, and built-in lead capture.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/store" className="rounded-full bg-cyan-300 px-6 py-3 font-bold text-slate-950">Shop Now</Link>
          <Link to="/settings" className="rounded-full border border-white/20 px-6 py-3 font-bold">Set Up My Card</Link>
        </div>
        <ul className="mt-8 grid gap-2 text-sm text-slate-200 md:grid-cols-2">
          {promoBullets.map((bullet) => (
            <li key={bullet} className="rounded-xl border border-white/10 bg-slate-900/40 px-4 py-3">✓ {bullet}</li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        {howItWorks.map((step) => (
          <article key={step.step} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs font-bold tracking-[0.25em] text-cyan-300">STEP {step.step}</p>
            <h3 className="mt-2 text-xl font-bold">{step.title}</h3>
            <p className="mt-3 text-slate-300">{step.text}</p>
          </article>
        ))}
      </section>

      {productCollections.map((collection) => (
        <section key={collection.title} className="rounded-2xl border border-white/10 bg-white/5 p-5 md:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 className="text-2xl font-black">{collection.title}</h2>
              <p className="text-sm text-slate-300">{collection.subtitle}</p>
            </div>
            <Link to="/store" className="text-sm font-semibold text-cyan-300">View all in Store →</Link>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {collection.items.map((item) => (
              <article key={item.name} className="rounded-2xl border border-white/10 bg-slate-900/50 p-4">
                <div className="aspect-[4/3] rounded-xl border border-dashed border-cyan-300/40 bg-slate-950/70 p-3">
                  <div className="flex h-full items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/15 to-violet-500/15 text-center text-xs uppercase tracking-widest text-cyan-200">Product Image Placeholder</div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{item.name}</h3>
                  <span className="rounded-full bg-cyan-300/20 px-2 py-1 text-xs font-semibold text-cyan-200">{item.tag}</span>
                </div>
                <p className="mt-2 text-sm text-slate-300">{item.description}</p>
                <p className="mt-3 text-lg font-black text-cyan-300">{item.price}</p>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-bold">Your Launch Checklist</h2>
        <ul className="mt-3 space-y-2 text-slate-300">
          <li>{status?.hasProfile ? '✅' : '⬜'} Create your profile</li>
          <li>{status?.hasConnectedCard ? '✅' : '⬜'} Connect your NFC card</li>
          <li>{status?.cardId ? '✅' : '⬜'} Test tap route: {status?.cardId ? `/c/${status.cardId}` : 'not set'}</li>
          <li>{status?.role ? '✅' : '⬜'} Role loaded: {status?.role || 'unknown'}</li>
        </ul>
      </section>
    </div>
  )
}
