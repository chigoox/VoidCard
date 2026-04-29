import React from 'react'
import { Link } from 'react-router-dom'

const features = [
  { title: '1-Tap Sharing', desc: 'Instant contact, links, and lead form via NFC or QR.' },
  { title: 'Live Profile Builder', desc: 'Edit your public page in seconds with rich sections.' },
  { title: 'Team + Role Controls', desc: 'Manager/admin controls for card issuance and governance.' },
  { title: 'Analytics Pipeline', desc: 'Track taps, profile views, and conversion actions.' },
]

export default function HomePage() {
  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-400/20 via-blue-500/10 to-violet-500/20 p-8 md:grid-cols-2 md:p-12">
        <div>
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Digital business cards, rebuilt</p>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">A beautiful card platform for modern teams.</h1>
          <p className="mt-4 max-w-xl text-slate-300">Share your profile in one tap, capture real leads, and manage your card fleet with production-grade controls.</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/settings" className="rounded-xl bg-cyan-300 px-5 py-3 font-bold text-slate-950">Open Dashboard</Link>
            <Link to="/store" className="rounded-xl border border-white/20 px-5 py-3 font-bold">Shop Cards</Link>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
          <h3 className="text-lg font-bold">Launch Flow</h3>
          <ol className="mt-3 space-y-2 text-slate-300">
            <li>1. Sign in</li>
            <li>2. Customize profile</li>
            <li>3. Connect NFC card</li>
            <li>4. Test /c/:cardId redirect</li>
          </ol>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {features.map((f) => (
          <article key={f.title} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-lg font-bold">{f.title}</h3>
            <p className="mt-2 text-sm text-slate-300">{f.desc}</p>
          </article>
        ))}
      </section>
    </div>
  )
}
