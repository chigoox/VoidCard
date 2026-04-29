import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getOnboardingStatus } from '../data/platformService'

export default function HomePage() {
  const [status, setStatus] = useState(null)
  useEffect(() => { getOnboardingStatus().then(setStatus).catch(() => setStatus(null)) }, [])

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/20 via-slate-900 to-emerald-400/10 p-8 md:p-12">
        <p className="mb-3 inline-flex rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-cyan-200">Digital Business Card Platform</p>
        <h1 className="max-w-3xl text-4xl font-black leading-tight md:text-6xl">Tap once. Share everything.</h1>
        <p className="mt-4 max-w-2xl text-slate-300">Build a premium, customizable NFC profile experience with role controls, analytics, and real-time routing from your physical card.</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link to="/settings" className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-900">Launch Dashboard</Link>
          <Link to="/u/demo" className="rounded-xl border border-white/20 px-5 py-3 font-bold">View Live Profile</Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        {[['Custom Profiles','Themes, links, and live edits'],['NFC + QR Routing','/c/:cardId resolves instantly'],['Role Controls','Admin/manager card linking'],['Tap Analytics','Track engagement in dashboard']].map(([t,d]) => (
          <article key={t} className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-bold">{t}</h3><p className="mt-2 text-sm text-slate-300">{d}</p></article>
        ))}
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-xl font-bold">Onboarding Progress</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-900/60 p-4">{status?.hasProfile ? '✅' : '⬜'} Profile configured</div>
          <div className="rounded-xl bg-slate-900/60 p-4">{status?.hasConnectedCard ? '✅' : '⬜'} Card connected</div>
          <div className="rounded-xl bg-slate-900/60 p-4">{status?.role ? '✅' : '⬜'} Role loaded: {status?.role || 'unknown'}</div>
          <div className="rounded-xl bg-slate-900/60 p-4">{status?.cardId ? '✅' : '⬜'} Tap URL: {status?.cardId ? `/c/${status.cardId}` : 'not set'}</div>
        </div>
      </section>
    </div>
  )
}
