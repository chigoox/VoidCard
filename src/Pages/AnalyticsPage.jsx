import React, { useEffect, useState } from 'react'
import { getTapEvents } from '../data/platformService'

export default function AnalyticsPage() {
  const [events, setEvents] = useState([])
  useEffect(() => { getTapEvents(100).then(setEvents).catch(() => setEvents([])) }, [])

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black">Tap Analytics</h1>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <p className="mb-3 text-slate-300">Recent taps ({events.length})</p>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead><tr className="text-slate-300"><th className="pb-2">Card ID</th><th className="pb-2">Username</th><th className="pb-2">Timestamp</th></tr></thead>
            <tbody>{events.map((e, i) => <tr key={i} className="border-t border-white/10"><td className="py-2">{e.card_id}</td><td>{e.username}</td><td>{e.tapped_at}</td></tr>)}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
