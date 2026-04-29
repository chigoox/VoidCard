import React, { useEffect, useMemo, useState } from 'react'
import { getTapEvents } from '../data/platformService'

export default function AnalyticsPage() {
  const [events, setEvents] = useState([])
  useEffect(() => { getTapEvents(100).then(setEvents).catch(() => setEvents([])) }, [])

  const byUser = useMemo(() => {
    const map = {}
    events.forEach((e) => { map[e.username] = (map[e.username] || 0) + 1 })
    return Object.entries(map)
  }, [events])

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black">Analytics</h1>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-bold">Tap volume</h2>
        <p className="mt-2 text-slate-300">Total events: {events.length}</p>
      </section>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-bold">Top profiles</h2>
        <ul className="mt-3 space-y-1 text-slate-300">{byUser.map(([u, c]) => <li key={u}>{u}: {c}</li>)}</ul>
      </section>
    </div>
  )
}
