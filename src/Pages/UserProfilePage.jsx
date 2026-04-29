import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProfile } from '../data/platformService'

export default function UserProfilePage() {
  const { username } = useParams()
  const [profile, setProfile] = useState(null)

  useEffect(() => { getProfile(username).then((p) => setProfile(p || false)) }, [username])

  if (profile === null) return <p className="rounded-xl bg-white/10 p-4">Loading profile...</p>
  if (profile === false) return <p className="rounded-xl bg-rose-500/20 p-4">Profile not found.</p>

  return (
    <div className="mx-auto max-w-3xl" style={{ color: profile.theme?.text }}>
      <section className="rounded-3xl border border-white/10 p-8" style={{ background: profile.theme?.card }}>
        <h1 className="text-4xl font-black">{profile.name}</h1>
        <p className="mt-1 text-slate-300">{profile.title}</p>
        <p className="mt-5 text-slate-200">{profile.bio}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(profile.links || []).map((item) => (
            <a key={`${item.label}-${item.url}`} href={item.url} className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-semibold hover:bg-white/10">{item.label}</a>
          ))}
        </div>
      </section>
    </div>
  )
}
