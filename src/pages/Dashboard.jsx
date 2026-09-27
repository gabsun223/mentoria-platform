import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addDays, format } from 'date-fns'
import useWorkspace from '../lib/useWorkspace'
import { PageTitle, Stat, Card, Empty, Status, Icon, weekDates, dateKey, hours } from '../components/WorkspaceUI'
import { SubjectPerformance } from '../components/StudyCharts'
import { goalOrder, datedLabel, accuracyTotals, subjectStats } from '../lib/studyStats'
export default function Dashboard(){
 const {goals,exams,records,profile,loading,error,reload}=useWorkspace()
 const [focus,setFocus]=useState(''),[offset,setOffset]=useState(0),week=weekDates(0)
 const day=dateKey(addDays(new Date(),offset)),today=goals.filter(g=>g.due_date===dateKey()),shown=goals.filter(g=>g.due_date===day).sort(goalOrder),weekly=goals.filter(g=>g.due_date>=week.from&&g.due_date<=week.to),pending=goals.filter(g=>!g.completed).sort(goalOrder)
 const stats=accuracyTotals(goals,exams),currentFocus=pending.some(g=>g.id===focus)?focus:pending[0]?.id
 const dailyTime=records.filter(r=>r.study_date===dateKey()).reduce((n,r)=>n+r.seconds,0)
 return <><PageTitle title={'Olá, '+(profile.full_name?.split(' ')[0]||'estudante')+'!'} subtitle="Vamos avançar mais um pouco hoje?"/>
 {error&&<p className="notice error" role="alert">{error}<button onClick={reload}>Tentar novamente</button></p>}{loading&&<p>Carregando estudos…</p>}
 <div className="stat-grid"><Stat title="Tempo estudado hoje" value={hours(dailyTime)} caption="Estudos registrados hoje" icon="clock"/><Stat title="Metas de hoje" value={today.filter(g=>g.completed).length+' de '+today.length} caption="Atividades concluídas" icon="target"/><Stat title="Questões respondidas" value={stats.total} caption="Metas e provas registradas" icon="file"/><Stat title="Taxa de acertos" value={stats.percent==null?'—':stats.percent+'%'} caption="Resultado geral: metas e provas" icon="chart"/></div>
 <div className="dashboard-grid student"><div className="stack"><Card title={'Metas de '+datedLabel(day)} action={<div className="toolbar-actions"><button className="btn" aria-label="Dia anterior" onClick={()=>setOffset(offset-1)}>‹</button><button className="btn" aria-label="Próximo dia" onClick={()=>setOffset(offset+1)}>›</button>{offset!==0&&<button className="text-action" onClick={()=>setOffset(0)}>Hoje</button>}</div>}>
 {shown.map(g=><Link className="student-goal" to={'/metas/'+g.id} key={g.id}><span className={'goal-check '+(g.completed?'checked':'')}>{g.completed?'✓':''}</span><div><strong>{g.title}</strong><div className="goal-meta"><span className="subject-tag">{g.category}</span><small>{hours(g.time_seconds)}</small></div></div><Status goal={g}/></Link>)}{!shown.length&&<Empty>Nenhuma meta programada neste dia.</Empty>}<Link className="text-action" to="/semana">Ver semana →</Link></Card>
 <Card title="Progresso por disciplina" subtitle="Horas estudadas e acertos nas questões das metas" action={<Link className="text-action" to="/provas">Ver desempenho →</Link>}><SubjectPerformance data={subjectStats(records)}/></Card></div>
 <div className="stack"><Card title="Hora de focar" subtitle="Atrasadas primeiro, depois hoje e os próximos dias."><div className="focus-clock">{hours(goals.find(g=>g.id===currentFocus)?.time_seconds)}</div><select aria-label="Meta para estudar" className="field" value={currentFocus||''} disabled={!pending.length} onChange={e=>setFocus(e.target.value)}>{!pending.length&&<option>Sem metas pendentes</option>}{pending.map(g=><option key={g.id} value={g.id}>{g.due_date<dateKey()?'Atrasada · ':''}{datedLabel(g.due_date)} · {g.title}</option>)}</select>{currentFocus&&<Link className="btn primary full" to={'/metas/'+currentFocus}><Icon name="play"/>Abrir estudo</Link>}</Card>
 <Card title="Sua semana de estudos"><strong className="large-number">{hours(records.filter(r=>r.study_date>=week.from&&r.study_date<=week.to).reduce((n,r)=>n+r.seconds,0))}</strong><p className="muted small">Tempo registrado nesta semana.</p><div className="week-summary"><span>{weekly.length} metas planejadas</span><span>{weekly.filter(g=>g.completed).length} concluídas</span></div></Card></div></div></>
}
