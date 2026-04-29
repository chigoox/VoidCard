import React, { useEffect, useMemo, useState } from 'react'
import { getCart, saveCart } from '../data/platformService'

const plans = [
  { id: 'starter', name: 'Starter', price: 29, desc: '1 card + profile' },
  { id: 'pro', name: 'Pro', price: 59, desc: 'Premium card + analytics' },
  { id: 'team', name: 'Team', price: 399, desc: '10 cards + role controls' },
]

export default function StorePageV2() {
  const [items, setItems] = useState([])
  useEffect(() => { getCart().then(setItems).catch(() => setItems([])) }, [])
  const total = useMemo(() => items.reduce((s, i) => s + i.price, 0), [items])

  const add = async (plan) => { const next = [...items, plan]; setItems(next); await saveCart(undefined, next) }

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black">Store</h1>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((p) => <article key={p.id} className="rounded-2xl border border-white/10 bg-white/5 p-5"><h2 className="text-2xl font-bold">{p.name}</h2><p className="text-cyan-300 text-3xl font-black mt-2">${p.price}</p><p className="text-slate-300 mt-2">{p.desc}</p><button onClick={() => add(p)} className="mt-4 w-full rounded-xl bg-cyan-300 py-2 font-bold text-slate-900">Add to cart</button></article>)}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5"><h3 className="font-bold">Cart ({items.length})</h3><p className="text-slate-300">Total: ${total}</p></div>
    </div>
  )
}
