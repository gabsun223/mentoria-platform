import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linkBase =
  'flex items-center gap-3 px-4 py-2.5 rounded-md text-sm transition-colors'
const linkInactive = 'text-ink-muted hover:bg-paper-dark hover:text-ink'
const linkActive = 'bg-ink text-paper font-medium'

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const isMentor = profile?.role === 'mentor'

  return (
    <aside className="w-64 shrink-0 border-r border-paper-dark bg-paper flex flex-col h-screen sticky top-0">
      <div className="px-5 py-6 border-b border-paper-dark">
        <p className="font-serif text-lg font-semibold text-ink leading-tight">
          Mentoria
          <br />
          Procuradorias
        </p>
        <p className="font-mono text-[11px] text-ink-muted mt-1 tracking-wide">
          CADERNO DE ESTUDOS
        </p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
        >
          Início
        </NavLink>
        <NavLink
          to="/semana"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
        >
          Minha Semana
        </NavLink>
        <NavLink
          to="/provas"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
        >
          Histórico de Provas
        </NavLink>
        <NavLink
          to="/perfil"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
        >
          Perfil
        </NavLink>

        {isMentor && (
          <>
            <div className="pt-4 mt-4 border-t border-paper-dark">
              <p className="px-4 pb-2 font-mono text-[10px] text-ink-muted tracking-wide">
                ÁREA DO MENTOR
              </p>
              <NavLink
                to="/mentor"
                className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
              >
                Painel do Mentor
              </NavLink>
            </div>
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-paper-dark">
        <p className="text-sm text-ink truncate">{profile?.full_name}</p>
        <p className="font-mono text-[11px] text-ink-muted">
          {isMentor ? 'mentor' : 'aluno(a)'}
        </p>
        <button
          onClick={signOut}
          className="mt-3 text-xs text-ink-muted hover:text-selo-vermelho transition-colors"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
