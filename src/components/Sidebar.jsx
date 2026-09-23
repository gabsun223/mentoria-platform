import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
export default function Sidebar() {
 const { profile, signOut } = useAuth()
 const mentor = profile?.role === 'mentor'
 const links = mentor ? [['/mentor', 'Alunos e metas'], ['/perfil', 'Meu perfil']] : [['/', 'Metas de hoje'], ['/semana', 'Minha semana'], ['/provas', 'Histórico de provas'], ['/perfil', 'Meu perfil']]
 return <aside className="w-48 md:w-64 shrink-0 border-r border-paper-dark bg-paper flex flex-col min-h-screen">
 <div className="p-5 border-b border-paper-dark"><h1 className="font-serif text-xl">Mentoria Procuradorias</h1><p className="text-xs mt-2">{mentor ? 'ÁREA DO MENTOR' : 'ÁREA DO ALUNO'}</p></div>
 <nav className="flex-1 p-3 space-y-2">{links.map(([to,label])=><NavLink key={to} end to={to} className={({isActive})=>'block rounded px-4 py-3 text-sm '+(isActive?'bg-ink text-paper':'hover:bg-paper-dark')}>{label}</NavLink>)}</nav>
 <div className="p-4 border-t border-paper-dark"><p>{profile?.full_name || (mentor ? 'Mentor' : 'Aluno')}</p><button className="mt-3 underline" onClick={signOut}>Sair</button></div></aside>
}
