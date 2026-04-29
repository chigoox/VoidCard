import React, { useEffect, useState } from 'react'
import { connectCard, defaultProfile, getCurrentUserId, getCurrentUsername, getProfile, getRole, saveProfile, signOut } from '../data/platformService'

const blankLink = { label: '', url: '' }

export default function SettingsPage() {
  const [form, setForm] = useState(defaultProfile)
  const [cardId, setCardId] = useState('')
  const [message, setMessage] = useState('Loading...')
  const [role, setRole] = useState('user')
  const [userId] = useState(getCurrentUserId())
  const username = getCurrentUsername()
  const [error, setError] = useState('')

  useEffect(() => {
    setError('')
    getProfile(username || 'demo').then((loaded) => {
      setForm({ ...loaded, links: loaded.links?.length ? loaded.links : [blankLink] })
      setMessage('')
    })
    getRole(userId).then(setRole)
  }, [userId])

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))

  const updateLink = (idx, field, value) => {
    const links = [...(form.links || [])]
    links[idx] = { ...links[idx], [field]: value }
    setForm((f) => ({ ...f, links }))
  }

  const addLink = () => setForm((f) => ({ ...f, links: [...(f.links || []), blankLink] }))

  const onSaveProfile = async () => {
    setError('')
    const cleanLinks = (form.links || []).filter((item) => item.label && item.url)
    await saveProfile({ ...form, links: cleanLinks }, userId)
    setMessage('Profile saved (shared profile table).')
  }

  const onConnectCard = async () => {
    setError('')
    if (!cardId || !form.username) return
    try {
      await connectCard(cardId, form.username, userId)
      setMessage(`Card connected in vcard table. URL: /c/${cardId}`)
    } catch (err) {
      setError(err.message || 'Unable to connect card')
    }
  }

  const canManageCards = role === 'admin' || role === 'manager'

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-black">Settings</h1>
      <div className="flex flex-wrap gap-2 items-center"><p className="text-slate-300">User: {username || 'unknown'} ({userId})</p><button className="rounded border px-3 py-2" onClick={() => { signOut(); window.location.href='/login'; }}>Sign out</button></div>
      <p className="text-slate-300">Role: <span className="font-bold">{role}</span></p>

      <div className="grid gap-3 rounded-2xl border border-white/10 glass p-5">
        <input className="rounded bg-slate-900/90 p-2" value={form.username || ''} onChange={(e) => update('username', e.target.value)} placeholder="username" />
        <input className="rounded bg-slate-900/90 p-2" value={form.name || ''} onChange={(e) => update('name', e.target.value)} placeholder="full name" />
        <input className="rounded bg-slate-900/90 p-2" value={form.title || ''} onChange={(e) => update('title', e.target.value)} placeholder="title" />
        <textarea className="rounded bg-slate-900/90 p-2" value={form.bio || ''} onChange={(e) => update('bio', e.target.value)} placeholder="bio" />

        <h3 className="font-semibold mt-2">Profile Links</h3>
        {(form.links || []).map((link, idx) => (
          <div key={`link-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input className="rounded bg-slate-900/90 p-2" value={link.label || ''} onChange={(e) => updateLink(idx, 'label', e.target.value)} placeholder="Button label" />
            <input className="rounded bg-slate-900/90 p-2" value={link.url || ''} onChange={(e) => updateLink(idx, 'url', e.target.value)} placeholder="https://..." />
          </div>
        ))}
        <button onClick={addLink} className="rounded border border-cyan-300 px-4 py-2 text-cyan-200">+ Add Link</button>

        <button onClick={onSaveProfile} className="rounded bg-cyan-300 px-4 py-2 font-semibold text-slate-900">Save profile</button>
      </div>

      <div className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-6">
        <h2 className="text-xl font-bold text-cyan-200">Connect NFC Card</h2>
        <p className="text-sm text-slate-300">Only admin/manager roles can connect cards.</p>
        <input className="mt-3 w-full rounded bg-slate-900/90 p-2" value={cardId} onChange={(e) => setCardId(e.target.value)} placeholder="Card ID (UID or serial)" />
        <button disabled={!canManageCards} onClick={onConnectCard} className="mt-3 rounded bg-cyan-300 px-4 py-2 font-semibold text-slate-900 disabled:cursor-not-allowed disabled:opacity-40">Connect card to this profile</button>
      </div>
      {message && <p className="text-green-300">{message}</p>}
      {error && <p className="text-rose-300">{error}</p>}
    </div>
  )
}
