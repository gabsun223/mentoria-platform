import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const linkBase =
  'flex shrink-0 items-center gap-3 whitespace-nowrap px-3 md:px-4 py-2.5 rounded-md text-sm transition-colors'
const linkInactive = 'text-ink-muted hover:bg-paper-dark hover:text-ink'
const linkActive = 'bg-ink text-paper font-medium'

export default function Sidebar() {
  const { profile, signOut } = useAuth()
  const isMentor = profile?.role === 'mentor'

  return (
    <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-paper-dark bg-paper flex flex-col md:h-screen sticky top-0 z-20">
      <div className="hidden md:block px-5 py-6 border-b border-paper-dark">
        <p className="font-serif text-lg font-semibold text-ink leading-tight">
          Mentoria
          <br />
          Procuradorias
        </p>
        <p className="font-mono text-[11px] text-ink-muted mt-1 tracking-wide">
          CADERNO DE ESTUDOS
        </p>
      </div>

      <div className="md:hidden flex items-center justify-between gap-3 px-4 py-3 border-b border-paper-dark">
        <p className="font-serif font-semibold text-ink">Mentoria Procuradorias</p>
        <button
          onClick={signOut}
          className="text-xs text-ink-muted hover:text-selo-vermelho transition-colors"
        >
          Sair
        </button>
      </div>

      <nav className="flex md:block flex-1 gap-1 overflow-x-auto px-3 py-2 md:py-4 md:space-y-1">
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
        {!isMentor && (
          <NavLink
            to="/planos"
            className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
          >
            Planos de Estudo
          </NavLink>
        )}
        <NavLink
          to="/perfil"
          className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}
        >
          Perfil
        </NavLink>

        {isMentor && (
          <>
            <div className="shrink-0 md:pt-4 md:mt-4 md:border-t border-paper-dark">
              <p className="hidden md:block px-4 pb-2 font-mono text-[10px] text-ink-muted tracking-wide">
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

      <div className="hidden md:block px-4 py-4 border-t border-paper-dark">
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
