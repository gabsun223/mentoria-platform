import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ children, requireRole }) {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-ink-muted font-mono text-sm">
        Carregando processo...
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  if (!profile) return <div className="p-8"><p>Não foi possível carregar seu perfil.</p><button onClick={() => window.location.reload()}>Tentar novamente</button></div>

  if (requireRole && profile?.role !== requireRole) {
    return <Navigate to="/" replace />
  }

  return children
}
