import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCurrentUserId, getOnboardingStatus } from '../data/platformService'

export default function HomePage() {
  const [status, setStatus] = useState(null)
  useEffect(() => { getOnboardingStatus(getCurrentUserId()).then(setStatus) }, [])

  return (
    <div className="space-y-6 fade-up">
      <section className="glass rounded-3xl p-6 md:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-300">Compete. Convert. Close.</p>
        <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">The digital business card platform your team actually wants to use.</h1>
        <p className="mt-4 max-w-2xl text-slate-300">Beautiful mobile-first profiles, one-tap NFC sharing, role-based card controls, and analytics that prove ROI.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/settings" className="rounded-xl bg-teal-300 px-5 py-3 font-bold text-slate-900">Open Dashboard</Link>
          <Link to="/store" className="rounded-xl border border-white/20 px-5 py-3 font-bold">Shop Cards</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="glass rounded-2xl p-5">
          <h2 className="text-xl font-bold">Onboarding Progress</h2>
          <ul className="mt-3 space-y-2 text-slate-200">
            <li>{status?.hasProfile ? '✅' : '⬜'} Profile created</li>
            <li>{status?.hasConnectedCard ? '✅' : '⬜'} NFC card connected</li>
            <li>{status?.cardId ? '✅' : '⬜'} Tap route ready</li>
            <li>{status?.role ? '✅' : '⬜'} Role loaded</li>
          </ul>
        </article>
        <article className="glass rounded-2xl p-5">
          <h2 className="text-xl font-bold">Why teams switch</h2>
          <ul className="mt-3 space-y-2 text-slate-300">
            <li>• Instant contact exchange</li>
            <li>• Fully editable branded profile</li>
            <li>• Role-based card governance</li>
            <li>• Tap analytics and attribution</li>
          </ul>
        </article>
      </section>
    </div>
  )
}
