import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '../data/platformService'

export default function LoginLitePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    try { await signIn(email, password); navigate('/settings') } catch (err) { setError(err.message || 'Login failed') }
  }

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
      <h1 className="text-3xl font-black">Welcome back</h1>
      <p className="mt-2 text-slate-300">Sign in to manage your cards and profile experience.</p>
      <form onSubmit={submit} className="mt-6 space-y-4">
        <input type="email" className="w-full rounded-xl border border-white/10 bg-slate-900/80 p-3" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input type="password" className="w-full rounded-xl border border-white/10 bg-slate-900/80 p-3" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="w-full rounded-xl bg-cyan-300 py-3 font-bold text-slate-900">Sign In</button>
      </form>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  )
}
