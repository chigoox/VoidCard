import React, { useEffect, useState } from 'react'
import { connectCard, defaultProfile, getCurrentUserId, getCurrentUsername, getProfile, getRole, saveProfile, signOut } from '../data/platformService'

const blankLink = { label: '', url: '' }

export default function SettingsPage() {
  const [form, setForm] = useState(defaultProfile)
  const [cardId, setCardId] = useState('')
  const [role, setRole] = useState('user')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const userId = getCurrentUserId()
  const username = getCurrentUsername()

  useEffect(() => {
    getProfile(username || 'demo').then((loaded) => setForm({ ...loaded, links: loaded.links?.length ? loaded.links : [blankLink] }))
    getRole(userId).then(setRole)
  }, [userId, username])

  const canManageCards = role === 'admin' || role === 'manager'
  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }))
  const updateLink = (idx, field, value) => {
    const links = [...(form.links || [])]
    links[idx] = { ...links[idx], [field]: value }
    setForm((f) => ({ ...f, links }))
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
        <h2 className="text-xl font-bold">Account</h2>
        <p className="mt-2 text-slate-300">{username || 'unknown'} · {role}</p>
        <button className="mt-4 rounded-lg border px-3 py-2" onClick={() => { signOut(); window.location.href = '/login' }}>Sign out</button>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-5 lg:col-span-2">
        <h2 className="text-xl font-bold">Profile Builder</h2>
        <div className="mt-4 grid gap-3">
          <input className="rounded-xl bg-slate-900 p-3" value={form.username || ''} onChange={(e) => update('username', e.target.value)} placeholder="Username" />
          <input className="rounded-xl bg-slate-900 p-3" value={form.name || ''} onChange={(e) => update('name', e.target.value)} placeholder="Full name" />
          <input className="rounded-xl bg-slate-900 p-3" value={form.title || ''} onChange={(e) => update('title', e.target.value)} placeholder="Title" />
          <textarea className="rounded-xl bg-slate-900 p-3" value={form.bio || ''} onChange={(e) => update('bio', e.target.value)} placeholder="Bio" />
          {(form.links || []).map((link, idx) => (
            <div key={idx} className="grid gap-2 md:grid-cols-2">
              <input className="rounded-xl bg-slate-900 p-3" value={link.label || ''} onChange={(e) => updateLink(idx, 'label', e.target.value)} placeholder="Link label" />
              <input className="rounded-xl bg-slate-900 p-3" value={link.url || ''} onChange={(e) => updateLink(idx, 'url', e.target.value)} placeholder="https://..." />
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={() => setForm((f) => ({ ...f, links: [...(f.links || []), blankLink] }))} className="rounded-lg border px-3 py-2">+ Add Link</button>
            <button onClick={async () => { setError(''); const clean = (form.links || []).filter((x) => x.label && x.url); try { await saveProfile({ ...form, links: clean }, userId); setOk('Profile saved'); } catch (e) { setError(e.message) } }} className="rounded-lg bg-cyan-300 px-4 py-2 font-bold text-slate-950">Save</button>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 p-5 lg:col-span-3">
        <h2 className="text-xl font-bold">NFC Card Connection</h2>
        <p className="text-sm text-slate-300">Connect physical card ID to profile username.</p>
        <div className="mt-3 flex flex-col gap-2 md:flex-row">
          <input className="w-full rounded-xl bg-slate-900 p-3" value={cardId} onChange={(e) => setCardId(e.target.value)} placeholder="Card ID" />
          <button disabled={!canManageCards} onClick={async () => { setError(''); try { await connectCard(cardId, form.username, userId); setOk(`Connected /c/${cardId}`) } catch (e) { setError(e.message) } }} className="rounded-xl bg-cyan-300 px-4 py-3 font-bold text-slate-950 disabled:opacity-40">Connect</button>
        </div>
      </section>

      {ok && <p className="text-emerald-300">{ok}</p>}
      {error && <p className="text-rose-300">{error}</p>}
    </div>
  )
}
