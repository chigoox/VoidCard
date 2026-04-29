import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUserId, getOnboardingStatus } from '../data/platformService'

const featureCards = [
  'Tap or scan to share instantly (NFC + QR).',
  'Fully customizable personal and team profiles.',
  'Lead capture, analytics, and follow-up reminders.',
  'No app needed for recipients — works in browser.',
]

export default function HomePage() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    getOnboardingStatus(getCurrentUserId()).then(setStatus)
  }, [])

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-500/20 via-blue-600/10 to-violet-600/20 p-8 md:p-12">
        <p className="mb-3 inline-block rounded-full bg-cyan-300/20 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-cyan-200">Digital Business Cards — Reimagined</p>
        <h1 className="text-4xl font-black leading-tight md:text-6xl">A modern NFC card platform built to beat the old way of networking.</h1>
        <p className="mt-5 max-w-2xl text-slate-300">Create a beautiful profile, connect your NFC card in minutes, and collect more leads with less friction. Built for creators, sales teams, and growing businesses.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/store" className="rounded-full bg-cyan-300 px-6 py-3 font-bold text-slate-950">Shop Cards</Link>
          <Link to="/settings" className="rounded-full border border-white/20 px-6 py-3 font-bold">Connect My NFC Card</Link>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-bold">Onboarding Checklist</h2>
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
