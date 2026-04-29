import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { signIn } from '../data/platformService'

export default function LoginLitePage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
      navigate('/settings')
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto mt-8 max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 md:p-8">
      <h1 className="text-3xl font-black">Welcome back</h1>
      <p className="mt-2 text-slate-300">Use your Supabase account to manage cards, profiles, and analytics.</p>
      <form onSubmit={submit} className="mt-6 space-y-3">
        <input type="email" className="w-full rounded-xl bg-slate-900 p-3" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" className="w-full rounded-xl bg-slate-900 p-3" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
        <button disabled={loading} className="w-full rounded-xl bg-cyan-300 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{loading ? 'Signing in...' : 'Sign in'}</button>
      </form>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
    </div>
  )
}
