import { addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { activityKey, pillarOf } from '../lib/pillars'
import { dateKey, hours, Status } from './WorkspaceUI'

export default function WeeklyGoalCalendar({ start, goals, onEdit, onAdd, studentName, selected, onSelect, disabled=false }) {
  return <div className="weekly-scroll" tabIndex={0} aria-label="Calendário semanal, deslize para ver todos os dias"><div className="weekly-calendar">
    {Array.from({length:7},(_,i)=>addDays(start,i)).map(day=>{
      const key=dateKey(day), rows=goals.filter(g=>g.due_date===key)
      return <section className={'calendar-day '+(key===dateKey()?'is-today':'')} key={key}>
        <header><strong>{format(day,'EEEE',{locale:ptBR})}</strong><span>{format(day,'dd/MM')}</span><small>{rows.length} metas</small></header>
        {rows.map(g=><article key={g.id} className={'calendar-goal '+(g.completed?'done':g.due_date<dateKey()?'late':'')}>
          {onSelect && <label className="check-label"><input type="checkbox" disabled={disabled} aria-label={'Selecionar '+g.title} checked={selected.includes(g.id)} onChange={e=>onSelect(g.id,e.target.checked)}/>Selecionar</label>}
          {studentName && <small>{studentName(g.student_id)}</small>}
          <span className="subject-tag">{g.category || 'Sem matéria'}</span>
          {onEdit?<button disabled={disabled} className="calendar-title" onClick={()=>onEdit(g)}>{g.title}</button>:<Link className="calendar-title" to={'/metas/'+g.id}>{g.title}</Link>}
          <small>{pillarOf(activityKey(g)).label}</small><Status goal={g}/>
          {(g.completed || g.time_seconds>0) && <p className="goal-metric">Tempo total: {hours(g.time_seconds || 0)}</p>}
          {g.questions_total>0 && <p className="goal-metric">{Math.round(g.questions_correct/g.questions_total*100)}% de acertos <small>({g.questions_correct}/{g.questions_total})</small></p>}
          {onEdit && <Link className="text-action" to={'/metas/'+g.id}>Ver estudo →</Link>}
        </article>)}
        {!rows.length && <p className="calendar-empty">Sem metas</p>}
        {onAdd && <button disabled={disabled} className="calendar-add" onClick={()=>onAdd(key)}>＋ Adicionar meta</button>}
      </section>
    })}
  </div></div>
}
