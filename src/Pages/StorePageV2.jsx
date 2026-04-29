import React, { useEffect, useMemo, useState } from 'react'
import { getCart, getCurrentUserId, saveCart } from '../data/platformService'

const plans = [
  { id: 'starter', name: 'Starter Card', price: 29, desc: '1 NFC card + profile.' },
  { id: 'pro', name: 'Pro Card', price: 59, desc: 'Premium card + analytics.' },
  { id: 'team', name: 'Team Pack', price: 399, desc: '10 cards + team dashboard.' },
]

export default function StorePageV2() {
  const [items, setItems] = useState([])
  const userId = getCurrentUserId()

  useEffect(() => {
    getCart(userId).then(setItems)
  }, [userId])

  const total = useMemo(() => items.reduce((sum, item) => sum + item.price, 0), [items])

  const addToCart = async (plan) => {
    const next = [...items, plan]
    setItems(next)
    await saveCart(userId, next)
  }

  return (
    <div>
      <h1 className="text-4xl font-black">Store</h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <div key={plan.id} className="rounded-2xl border border-white/10 glass p-6">
            <h2 className="text-xl font-bold">{plan.name}</h2>
            <p className="mt-2 text-3xl font-black text-cyan-300">${plan.price}</p>
            <p className="mt-3 text-sm text-slate-300">{plan.desc}</p>
            <button onClick={() => addToCart(plan)} className="mt-6 w-full rounded-xl bg-cyan-300 px-4 py-2 font-semibold text-slate-900">Add to cart</button>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-2xl border border-white/10 glass p-5">
        <h3 className="text-xl font-bold">Cart ({items.length})</h3>
        <p className="mt-2 text-slate-300">Total: ${total}</p>
      </div>
    </div>
  )
}
