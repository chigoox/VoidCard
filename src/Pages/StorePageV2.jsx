import React, { useEffect, useMemo, useState } from 'react'
import { getCart, getCurrentUsername, saveCart } from '../data/platformService'

const plans = [
  { id: 'starter', name: 'Starter', price: 29, desc: '1 NFC card · profile page' },
  { id: 'pro', name: 'Pro', price: 59, desc: 'Premium card · analytics' },
  { id: 'team', name: 'Team', price: 399, desc: '10 cards · team controls' },
]

export default function StorePageV2() {
  const [items, setItems] = useState([])
  const username = getCurrentUsername() || 'demo'
  useEffect(() => { getCart(username).then(setItems) }, [username])
  const total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items])

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black">Store</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => (
          <article key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <h3 className="text-xl font-bold">{p.name}</h3>
            <p className="mt-2 text-3xl font-black text-cyan-300">${p.price}</p>
            <p className="mt-2 text-sm text-slate-300">{p.desc}</p>
            <button onClick={async () => { const next = [...items, p]; setItems(next); await saveCart(username, next) }} className="mt-4 w-full rounded-xl bg-cyan-300 px-3 py-2 font-bold text-slate-950">Add</button>
          </article>
        ))}
      </div>
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-bold">Cart ({items.length})</h2>
        <p className="mt-2 text-slate-300">Total: ${total}</p>
      </section>
    </div>
  )
}
