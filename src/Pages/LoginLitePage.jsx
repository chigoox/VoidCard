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
    setError('')
    try {
      await signIn(email, password)
      navigate('/settings')
    } catch (err) {
      setError(err.message || 'Login failed')
    }
  }

  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-white/10 bg-white/5 p-6">
      <h1 className="text-3xl font-black">Sign in</h1>
      <form onSubmit={submit} className="mt-4 space-y-3">
        <input type="email" className="w-full rounded bg-slate-900 p-2" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email" />
        <input type="password" className="w-full rounded bg-slate-900 p-2" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" />
        <button className="w-full rounded bg-cyan-300 px-4 py-2 font-semibold text-slate-900">Continue</button>
      </form>
      {error && <p className="mt-2 text-rose-300">{error}</p>}
    </div>
  )
}
