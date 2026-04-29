import React from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/store', label: 'Store' },
  { to: '/settings', label: 'Settings' },
  { to: '/u/demo', label: 'Sample Card' },
  { to: '/analytics', label: 'Analytics' },
  { to: '/login', label: 'Login' },
]

const Layout = () => {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur">
        <nav className="mx-auto flex w-full max-w-6xl items-center justify-between p-4">
          <Link to="/" className="text-xl font-black tracking-tight text-cyan-300">VoidCard</Link>
          <div className="flex items-center gap-2">
            {navItems.map((item) => {
              const active = location.pathname === item.to
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${active ? 'bg-cyan-400 text-slate-950' : 'text-slate-300 hover:bg-white/10'}`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl p-4 md:p-8">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
