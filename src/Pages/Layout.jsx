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
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#070b14]/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/" className="text-xl font-black text-teal-300">VoidCard</Link>
          <div className="flex items-center gap-2 overflow-x-auto">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} className={`rounded-full px-3 py-1.5 text-sm ${location.pathname === item.to ? 'bg-teal-300 text-slate-900' : 'text-slate-200 hover:bg-white/10'}`}>{item.label}</Link>
            ))}
            <Link to="/login" className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white">Sign in</Link>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
