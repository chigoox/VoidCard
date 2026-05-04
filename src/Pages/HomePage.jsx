import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { getCurrentUserId, getOnboardingStatus } from '../data/platformService'

const featureCards = [
  'Share your details with a tap, scan, or link in seconds.',
  'Personal pages that feel human, warm, and easy to trust.',
  'Built-in lead capture and analytics to keep conversations moving.',
  'No app install required — your contact opens everything in browser.',
]

const proofPoints = [
  { label: 'Average setup', value: 'Under 2 minutes' },
  { label: 'Profile updates', value: 'Instantly live' },
  { label: 'Team onboarding', value: 'Simple + scalable' },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' } },
}

export default function HomePage() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    getOnboardingStatus(getCurrentUserId()).then(setStatus)
  }, [])

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-6">
      <motion.section variants={item} className="rounded-3xl border border-rose-100/30 bg-gradient-to-br from-orange-100/15 via-rose-100/10 to-sky-100/15 p-8 md:p-12">
        <p className="mb-3 inline-block rounded-full bg-white/50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-rose-100">Make better first impressions</p>
        <h1 className="text-4xl font-black leading-tight md:text-6xl">A friendlier digital card that helps you start more real conversations.</h1>
        <p className="mt-5 max-w-3xl text-slate-200">VoidCard helps you replace outdated paper cards with a simple tap experience people actually enjoy using. Share your profile, socials, booking links, and next steps in one clean flow.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link to="/store" className="rounded-full bg-amber-200 px-6 py-3 font-bold text-slate-900">Shop Cards</Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link to="/settings" className="rounded-full border border-white/35 bg-white/10 px-6 py-3 font-bold">Connect My Card</Link>
          </motion.div>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {proofPoints.map((point) => (
            <motion.article key={point.label} variants={item} whileHover={{ y: -4 }} className="rounded-2xl border border-white/25 bg-slate-900/35 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-300">{point.label}</p>
              <p className="mt-1 text-xl font-bold text-amber-100">{point.value}</p>
            </motion.article>
          ))}
        </div>
      </motion.section>

      <motion.section variants={item} className="rounded-2xl border border-white/20 bg-white/10 p-5">
        <h2 className="text-xl font-bold">Your Launch Checklist</h2>
        <ul className="mt-3 space-y-2 text-slate-200">
          <li>{status?.hasProfile ? '✅' : '⬜'} Create your profile</li>
          <li>{status?.hasConnectedCard ? '✅' : '⬜'} Connect your NFC card</li>
          <li>{status?.cardId ? '✅' : '⬜'} Test tap route: {status?.cardId ? `/c/${status.cardId}` : 'not set'}</li>
          <li>{status?.role ? '✅' : '⬜'} Role loaded: {status?.role || 'unknown'}</li>
        </ul>
      </motion.section>

      <motion.section variants={container} className="grid gap-4 md:grid-cols-2">
        {featureCards.map((feature) => (
          <motion.article key={feature} variants={item} whileHover={{ scale: 1.02 }} className="rounded-2xl border border-white/20 bg-white/10 p-5 text-slate-100">
            {feature}
          </motion.article>
        ))}
      </motion.section>
    </motion.div>
  )
}
