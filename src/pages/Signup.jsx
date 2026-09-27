import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingConfirmation, setPendingConfirmation] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { data, error } = await signUp({ email, password, fullName })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    // Sem sessão de volta = o projeto exige confirmação de e-mail antes do login.
    if (!data?.session) {
      setPendingConfirmation(true)
      return
    }
    navigate('/')
  }

  if (pendingConfirmation) {
    return (
      <div className="auth-page min-h-screen flex items-center justify-center bg-paper px-4">
        <div className="w-full max-w-sm text-center">
          <p className="font-serif text-2xl font-semibold text-ink mb-2">Quase lá</p>
          <p className="text-sm text-ink-muted">
            Enviamos um link de confirmação para <strong>{email}</strong>. Clique nele e
            depois volte aqui para entrar.
          </p>
          <Link to="/login" className="text-ink-light font-medium hover:underline text-sm mt-4 inline-block">
            Ir para o login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page min-h-screen flex items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm"><Link className="auth-home mb-8" to="/">← Conheça a mentoria</Link>
        <div className="text-center mb-8">
          <p className="font-serif text-2xl font-semibold text-ink">Minha Mentoria</p>
          <p className="font-mono text-[11px] text-ink-muted mt-1 tracking-wide">
            NOVO CADASTRO DE ALUNO(A)
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white/70 border border-paper-dark rounded-md p-6 space-y-4"
        >
          <div>
            <label className="text-xs font-medium text-ink-muted">Nome completo</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded border border-paper-dark bg-white px-3 py-2 text-sm"
              placeholder="Seu nome"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded border border-paper-dark bg-white px-3 py-2 text-sm"
              placeholder="voce@email.com"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-ink-muted">Senha</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded border border-paper-dark bg-white px-3 py-2 text-sm"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {error && <p className="text-xs text-selo-vermelho">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-ink text-paper text-sm font-medium py-2.5 rounded hover:bg-ink-light transition-colors disabled:opacity-60"
          >
            {loading ? 'Criando conta...' : 'Criar conta'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-muted mt-4">
          Já tem conta?{' '}
          <Link to="/login" className="text-ink-light font-medium hover:underline">
            Entrar
          </Link>
        </p>
        <p className="text-center text-[11px] text-ink-muted mt-6 font-mono">
          Depois do cadastro, avise seu mentor pra vincular seu perfil.
        </p>
      </div>
    </div>
  )
}
