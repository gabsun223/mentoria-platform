import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Icon } from './WorkspaceUI'
export default function Sidebar() {
 const {profile,signOut}=useAuth();const mentor=profile?.role==='mentor'
 const links=mentor?[['/mentor','Visão geral','home'],['/mentor/alunos','Alunos','users'],['/mentor/metas','Metas semanais','target'],['/encontros','Encontros','calendar'],['/mentor/relatorios','Relatórios','chart']]:[['/','Visão geral','home'],['/semana','Minhas metas','target'],['/estudos','Sessões de estudo','play'],['/provas','Desempenho','chart'],['/materiais','Materiais','file'],['/encontros','Encontros','calendar']]
 return <aside className="app-sidebar"><div className="brand"><Icon name="leaf" size={29}/><strong>Minha Mentoria</strong></div><span className="sidebar-caption">PAINEL DO {mentor?'PROFESSOR':'ALUNO'}</span><nav>{links.map(([to,label,icon])=><NavLink end to={to} key={to} className={({isActive})=>'nav-item '+(isActive?'active':'')}><Icon name={icon}/><span>{label}</span></NavLink>)}</nav><div className="sidebar-bottom"><NavLink className="nav-item" to="/perfil"><Icon name="settings"/>Configurações</NavLink><button className="nav-item" onClick={signOut}>Sair da conta</button></div></aside>
}
