import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addDays, format } from 'date-fns'
import useWorkspace from '../lib/useWorkspace'
import { PageTitle, Card, Stat, Empty, dateKey, hours } from '../components/WorkspaceUI'
import { WeeklyHours, DailySubjects, SubjectPerformance } from '../components/StudyCharts'
import { accuracyTotals, subjectStats, weekStats, datedLabel } from '../lib/studyStats'
import ExamHistory from './ExamHistory'
export default function Performance(){
 const {goals,exams,records,completions,error,loading}=useWorkspace(),[offset,setOffset]=useState(0)
 const day=dateKey(addDays(new Date(),offset)),stats=accuracyTotals([...goals,...records.filter(r=>!r.goal_id)],exams),undated=records.filter(r=>!r.study_date).reduce((n,r)=>n+r.seconds,0)
 return <><PageTitle title="Desempenho" subtitle="Tempo, matérias, questões e histórico de estudos."/>{error&&<p className="notice error">{error}</p>}{loading&&<p>Carregando desempenho…</p>}
 <div className="stat-grid"><Stat title="Tempo total" value={hours(records.reduce((n,r)=>n+(r.seconds||0),0))} icon="clock"/><Stat title="Questões respondidas" value={stats.total} icon="file"/><Stat title="Taxa de acertos" value={stats.percent==null?'—':stats.percent+'%'} caption="Metas, estudos avulsos e provas" icon="chart"/><Stat title="Metas concluídas" value={goals.filter(g=>g.completed).length} icon="check"/></div>
 {undated>0&&<p className="muted small">{hours(undated)} de registros antigos sem data conhecida entram no total, mas não nos gráficos por dia ou semana.</p>}
 <div className="analytics-grid"><Card title="Horas estudadas por semana" subtitle="Últimas oito semanas · pela data do estudo"><WeeklyHours data={weekStats(records)}/></Card><Card title={'Matérias estudadas — '+datedLabel(day)} action={<div className="toolbar-actions"><button className="btn" aria-label="Dia anterior" onClick={()=>setOffset(offset-1)}>‹</button><button className="btn" aria-label="Próximo dia" onClick={()=>setOffset(offset+1)}>›</button></div>}><DailySubjects data={subjectStats(records.filter(r=>r.study_date===day))}/></Card></div>
 <Card className="section-gap" title="Horas e acertos por matéria"><SubjectPerformance data={subjectStats(records)}/></Card>
 <Card className="section-gap" title="Últimas metas cumpridas" subtitle="Da conclusão mais recente para a mais antiga"><div className="completion-list">{completions.map(c=><Link className="data-row" key={c.id} to={'/metas/'+c.goal_id}><div><strong>{c.topic}</strong><small>{c.subject} · Estudo: {format(new Date(c.study_date+'T12:00:00'),'dd/MM/yyyy')}</small><small>Concluída em {new Date(c.completed_at).toLocaleString('pt-BR')}</small></div><span>{hours(c.seconds)}</span></Link>)}{!completions.length&&<Empty>As próximas conclusões aparecerão aqui, com a data do estudo.</Empty>}</div></Card>
 <Card className="section-gap" title="Histórico por assunto"><div className="completion-list">{records.filter(r=>r.study_date&&(r.seconds>0||r.questions_total>0)).sort((a,b)=>b.study_date.localeCompare(a.study_date)||b.created_at.localeCompare(a.created_at)).map(r=><div className="data-row" key={r.id}><div><strong>{r.subject} · {r.topic}</strong><small>{format(new Date(r.study_date+'T12:00:00'),'dd/MM/yyyy')} · {r.activity_type}</small></div><span>{hours(r.seconds)}{r.questions_total>0?' · '+r.questions_correct+'/'+r.questions_total+' acertos':''}</span></div>)}</div></Card>
 <details className="surface section-gap"><summary>Provas e simulados</summary><ExamHistory/></details></>
}
