import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { validateSession } from '../data/platformService'

export default function ProtectedRoute({ children }) {
  const [state, setState] = useState('loading')

  useEffect(() => {
    validateSession().then((user) => setState(user ? 'ok' : 'nope'))
  }, [])

  if (state === 'loading') return <p className="p-4">Checking session...</p>
  if (state === 'nope') return <Navigate to="/login" replace />
  return children
}
