import { Navigate } from 'react-router'
import { useAuth } from '../../utils/useAuth'

export function ProtectedRoute({ adminOnly = false, children }) {
  const { isAdmin, loading, user } = useAuth()

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-20">Loading...</div>
  }

  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/account" replace />

  return children
}
