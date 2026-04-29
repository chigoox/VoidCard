import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/store', label: 'Store' },
  { to: '/settings', label: 'Dashboard' },
  { to: '/analytics', label: 'Analytics' },
]

export default function Layout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.2),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(34,197,94,0.12),transparent_30%)]" />
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <Link to="/" className="text-xl font-black tracking-tight">VoidCard<span className="text-cyan-300">.pro</span></Link>
          <div className="flex gap-2">
            {navItems.map((item) => {
              const active = location.pathname === item.to
              return (
                <Link key={item.to} to={item.to} className={`rounded-full px-4 py-2 text-sm font-semibold transition ${active ? 'bg-cyan-300 text-slate-900' : 'bg-white/5 hover:bg-white/10'}`}>
                  {item.label}
                </Link>
              )
            })}
            <Link to="/login" className="rounded-full bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-900">Login</Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:py-12"><Outlet /></main>
    </div>
  )
}
