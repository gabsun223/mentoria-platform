import { Link } from 'react-router-dom'
import { addDays } from 'date-fns'
import { ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip } from 'recharts'
import useWorkspace from '../lib/useWorkspace'
import { PageTitle, Stat, Card, Empty, Avatar, weekDates, dateKey, hours } from '../components/WorkspaceUI'
export default function MentorOverview(){
 const {students,goals,error,loading,user}=useWorkspace(),week=weekDates(0),from=dateKey(addDays(week.start,-7)),mine=students.filter(s=>s.mentor_id===user.id)
 const rows=mine.map(s=>{const list=goals.filter(g=>g.student_id===s.id&&g.due_date>=from&&g.due_date<=week.to),late=list.filter(g=>!g.completed&&g.due_date<dateKey()).length;return {...s,late,total:list.length,done:list.filter(g=>g.completed).length,seconds:list.reduce((n,g)=>n+(g.time_seconds||0),0),status:late?'Pendente':list.length?'Em dia':'Sem metas'}}).sort((a,b)=>b.late-a.late||(a.full_name||'').localeCompare(b.full_name||''))
 const chart=['Em dia','Pendente','Sem metas'].map(name=>({name,value:rows.filter(s=>s.status===name).length})),current=goals.filter(g=>g.due_date>=week.from&&g.due_date<=week.to)
 return <><PageTitle title="Visão geral" subtitle="Situação dos alunos nesta semana e na semana passada."/>{error&&<p className="notice error">{error}</p>}{loading&&<p>Carregando alunos…</p>}
 <div className="stat-grid"><Stat title="Alunos vinculados" value={mine.length} icon="users"/><Stat title="Em dia" value={chart[0].value} icon="check"/><Stat title="Precisam de atenção" value={chart[1].value} icon="alert" caption="Com alguma meta atrasada no período"/><Stat title="Metas desta semana" value={current.filter(g=>g.completed).length+' de '+current.length} icon="target"/></div>
 <Card title="Situação dos alunos e pontos de atenção" subtitle="Uma meta atrasada nesta semana ou na passada deixa o aluno pendente. Metas anteriores não entram neste indicador." action={<Link className="text-action" to="/mentor/alunos">Ver alunos →</Link>}>
 {mine.length?<><div className="study-chart"><ResponsiveContainer width="100%" height={230}><PieChart><Pie data={chart} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>{['#16754e','#ce6655','#a3acb9'].map(c=><Cell key={c} fill={c}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div><div className="student-status-list">{rows.map(s=><div className="data-row" key={s.id}><Avatar name={s.full_name}/><div><strong>{s.full_name||'Aluno'}</strong><small>{s.done}/{s.total} metas concluídas · {hours(s.seconds)}</small>{s.late>0&&<small className="late-text">{s.late} meta(s) atrasada(s)</small>}</div><span className={'status '+(s.late?'late':s.total?'done':'')}>{s.status}</span><Link className="text-action" to={'/mentor/metas?aluno='+s.id}>Ver metas →</Link></div>)}</div></>:<Empty>Nenhum aluno vinculado. Use “Ver alunos” para começar.</Empty>}
 </Card></>
}
