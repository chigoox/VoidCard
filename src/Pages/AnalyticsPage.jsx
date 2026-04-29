import React, { useEffect, useState } from 'react'
import { getTapEvents } from '../data/platformService'

export default function AnalyticsPage() {
  const [events, setEvents] = useState([])
  useEffect(() => { getTapEvents(100).then(setEvents).catch(() => setEvents([])) }, [])
  return (
    <div>
      <h1 className="text-4xl font-black">Tap Analytics</h1>
      <p className="text-slate-300 mt-2">Recent card tap events.</p>
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4 overflow-auto">
        <table className="w-full text-left text-sm">
          <thead><tr><th>Card</th><th>User</th><th>Timestamp</th></tr></thead>
          <tbody>
            {events.map((e, i) => <tr key={`${e.card_id}-${i}`}><td>{e.card_id}</td><td>{e.username}</td><td>{e.tapped_at}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
