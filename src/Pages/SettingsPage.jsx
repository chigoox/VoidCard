import React, { useEffect, useState } from 'react'
import { connectCard, defaultProfile, getCurrentUserId, getCurrentUsername, getProfile, getRole, saveProfile, signOut } from '../data/platformService'

const blankLink = { label: '', url: '' }

export default function SettingsPage() {
  const [form, setForm] = useState(defaultProfile)
  const [cardId, setCardId] = useState('')
  const [role, setRole] = useState('user')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const userId = getCurrentUserId()
  const username = getCurrentUsername()

  useEffect(() => {
    getProfile(username || 'demo').then((loaded) => setForm({ ...loaded, links: loaded.links?.length ? loaded.links : [blankLink] }))
    getRole(userId).then(setRole)
  }, [userId, username])

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))
  const updateLink = (idx, field, value) => { const links = [...(form.links || [])]; links[idx] = { ...links[idx], [field]: value }; setForm((f) => ({ ...f, links })) }
  const addLink = () => setForm((f) => ({ ...f, links: [...(f.links || []), blankLink] }))

  const onSave = async () => {
    setError(''); setMessage('')
    try { await saveProfile({ ...form, links: (form.links || []).filter((l) => l.label && l.url) }, userId); setMessage('Profile saved.') } catch (e) { setError(e.message) }
  }

  const onConnectCard = async () => {
    setError(''); setMessage('')
    try { await connectCard(cardId, form.username, userId); setMessage(`Card connected: /c/${cardId}`) } catch (e) { setError(e.message) }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h1 className="text-3xl font-black">Dashboard</h1><p className="text-slate-300">{username || 'unknown'} · {role}</p></div>
          <button onClick={() => { signOut(); window.location.href = '/login' }} className="rounded-lg border border-white/20 px-4 py-2">Sign out</button>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-xl font-bold">Profile Editor</h2>
        <input className="w-full rounded-xl bg-slate-900/80 p-3" value={form.username || ''} onChange={(e) => update('username', e.target.value)} placeholder="Username" />
        <input className="w-full rounded-xl bg-slate-900/80 p-3" value={form.name || ''} onChange={(e) => update('name', e.target.value)} placeholder="Full name" />
        <input className="w-full rounded-xl bg-slate-900/80 p-3" value={form.title || ''} onChange={(e) => update('title', e.target.value)} placeholder="Title" />
        <textarea className="w-full rounded-xl bg-slate-900/80 p-3" value={form.bio || ''} onChange={(e) => update('bio', e.target.value)} placeholder="Bio" />
        <h3 className="font-semibold">Links</h3>
        {(form.links || []).map((link, idx) => <div key={idx} className="grid gap-2 md:grid-cols-2"><input className="rounded-xl bg-slate-900/80 p-3" value={link.label || ''} onChange={(e) => updateLink(idx, 'label', e.target.value)} placeholder="Label" /><input className="rounded-xl bg-slate-900/80 p-3" value={link.url || ''} onChange={(e) => updateLink(idx, 'url', e.target.value)} placeholder="https://" /></div>)}
        <div className="flex gap-2"><button onClick={addLink} className="rounded-xl border border-cyan-300 px-4 py-2">+ Add Link</button><button onClick={onSave} className="rounded-xl bg-cyan-300 px-4 py-2 font-bold text-slate-900">Save Profile</button></div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
        <h2 className="text-xl font-bold">Connect NFC Card</h2>
        <input className="w-full rounded-xl bg-slate-900/80 p-3" value={cardId} onChange={(e) => setCardId(e.target.value)} placeholder="Card ID" />
        <button onClick={onConnectCard} className="rounded-xl bg-emerald-300 px-4 py-2 font-bold text-slate-900">Connect Card</button>
      </section>
      {message && <p className="text-emerald-300">{message}</p>}
      {error && <p className="text-rose-300">{error}</p>}
    </div>
  )
}
