import { addDays, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Link } from 'react-router-dom'
import { activityKey, pillarOf } from '../lib/pillars'
import { dateKey, hours, Status, goalStatus, Priority } from './WorkspaceUI'

export default function WeeklyGoalCalendar({ start, goals, onEdit, onAdd, studentName, selected, onSelect, disabled=false, onDay, dayOnly }) {
  return <div className={'weekly-scroll '+(dayOnly?'single-day':'')} tabIndex={0} aria-label={dayOnly?'Metas do dia':'Calendário semanal, deslize para ver todos os dias'}><div className="weekly-calendar">
    {(dayOnly?[new Date(dayOnly+'T12:00:00')]:Array.from({length:7},(_,i)=>addDays(start,i))).map(day=>{
      const key=dateKey(day), rows=goals.filter(g=>g.due_date===key)
      return <section className={'calendar-day '+(key===dateKey()?'is-today':'')} key={key}>
        <header>{onDay && !dayOnly ? <button className="day-open" disabled={disabled} onClick={()=>onDay(key)} aria-label={'Abrir dia '+format(day,'dd/MM/yyyy')}><strong>{format(day,'EEEE',{locale:ptBR})}</strong><span>{format(day,'dd/MM')}</span></button> : <><strong>{format(day,'EEEE',{locale:ptBR})}</strong><span>{format(day,'dd/MM')}</span></>}<small>{rows.length} metas</small></header>
        {rows.map(g=><article key={g.id} className={'calendar-goal '+({'Concluída':'done','Atrasada':'late','Em andamento':'progress'}[goalStatus(g)] || '')}>
          {onSelect && <label className="check-label"><input type="checkbox" disabled={disabled} aria-label={'Selecionar '+g.title} checked={selected.includes(g.id)} onChange={e=>onSelect(g.id,e.target.checked)}/>Selecionar</label>}
          {studentName && <small>{studentName(g.student_id)}</small>}
          <span className="subject-tag">{g.category || 'Sem matéria'}</span>
          {onEdit?<button disabled={disabled} className="calendar-title" onClick={()=>onEdit(g)}>{g.title}</button>:<Link className="calendar-title" to={'/metas/'+g.id}>{g.title}</Link>}
          <small>{pillarOf(activityKey(g)).label}</small><Status goal={g}/>
          <Priority value={g.priority}/>
          {g.questions_target > 0 && <p className="goal-metric">{g.questions_total || 0} de {g.questions_target} questões</p>}
          {g.attachments?.length > 0 && <small>📎 {g.attachments.length} anexo(s)</small>}
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
