import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signIn({ email, password })
    setLoading(false)
    if (error) {
      setError('E-mail ou senha incorretos.')
      return
    }
    navigate('/')
  }

  return (
    <div className="auth-page min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm"><Link className="auth-home mb-8" to="/">← Conheça a mentoria</Link>
        <div className="text-center mb-8">
          <p className="font-serif text-2xl font-semibold text-ink">Minha Mentoria</p>
          <p className="font-mono text-[11px] text-ink-muted mt-1 tracking-wide">
            ACESSO AO CADERNO DE ESTUDOS
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/70 border border-paper-dark rounded-md p-6 space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-ink-muted">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-paper-dark bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-0"
              placeholder="voce@email.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-paper-dark bg-white px-3 py-2 text-sm focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-selo-vermelho">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper text-sm font-medium py-2.5 rounded hover:bg-ink-light transition-colors disabled:opacity-60"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-4">
          Ainda não tem conta?{' '}
          <Link to="/cadastro" className="text-ink-light font-medium hover:underline">
            Criar cadastro
          </Link>
        </p>
      </div>
    </div>
  )
}
