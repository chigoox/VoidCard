import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProfile } from '../data/platformService'

export default function UserProfilePage() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)
  useEffect(() => { getProfile(username).then((p) => setProfile(p || false)).catch(() => setProfile(false)) }, [username])

  if (profile === null) return <p>Loading...</p>
  if (!profile) return <p>User not found.</p>

  return (
    <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-8" style={{ background: profile.theme?.card, color: profile.theme?.text }}>
      <h1 className="text-4xl font-black">{profile.name}</h1>
      <p className="mt-2 text-slate-300">{profile.title}</p>
      <p className="mt-5 text-lg">{profile.bio}</p>
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {(profile.links || []).map((l) => <a key={l.url} href={l.url} className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 hover:bg-white/10">{l.label}</a>)}
      </div>
    </div>
  )
}
