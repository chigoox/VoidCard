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
    <div className="min-h-screen bg-[#05070f] text-slate-100">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#05070f]/80 backdrop-blur-lg">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full bg-cyan-300" />
            <span className="text-lg font-black tracking-wide">VoidCard</span>
          </Link>
          <div className="flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${location.pathname === item.to ? 'bg-cyan-300 text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}
              >
                {item.label}
              </Link>
            ))}
            <Link to="/login" className="rounded-full border border-cyan-300/60 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-300/10">Sign in</Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8">
        <Outlet />
      </main>
    </div>
  )
}
