import React, { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { getCardUsername, logTap } from '../data/platformService'

export default function CardRedirectPage() {
  const { cardId } = useParams()
  const [username, setUsername] = useState(null)

  useEffect(() => {
    getCardUsername(cardId).then(async (u) => {
      if (u) await logTap(cardId, u)
      setUsername(u || false)
    })
  }, [cardId])

  if (username === null) return <p className="rounded-xl bg-white/10 p-4">Resolving card...</p>
  if (username) return <Navigate to={`/u/${username}`} replace />

  return (
    <div className="rounded-2xl border border-rose-300/30 bg-rose-400/10 p-6">
      <h1 className="text-2xl font-bold text-rose-200">Card not linked yet</h1>
      <p className="mt-2 text-slate-200">ID: <code>{cardId}</code></p>
      <Link to="/settings" className="mt-4 inline-block rounded-lg bg-cyan-300 px-4 py-2 font-semibold text-slate-900">Connect card</Link>
    </div>
  )
}
