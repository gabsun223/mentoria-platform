import { useState } from 'react'
import useWorkspace from '../lib/useWorkspace'
import WeeklyGoalCalendar from '../components/WeeklyGoalCalendar'
import { PageTitle, WeekPicker, weekDates, Empty } from '../components/WorkspaceUI'
import { PILLAR_ORDER, pillarOf } from '../lib/pillars'
export default function WeekView(){
  const {goals,loading,error}=useWorkspace()
  const [offset,setOffset]=useState(0),[pillar,setPillar]=useState('')
  const week=weekDates(offset)
  return <><PageTitle title="Minhas metas" subtitle="Seu calendário de estudos. Abra uma meta para estudar e registrar seus resultados."><WeekPicker offset={offset} onChange={setOffset}/></PageTitle>
    <div className="toolbar"><select className="field" aria-label="Tipo de atividade" value={pillar} onChange={e=>setPillar(e.target.value)}><option value="">Todas as atividades</option>{PILLAR_ORDER.map(p=><option value={p} key={p}>{pillarOf(p).label}</option>)}</select><p className="muted small">Neutro: pendente · Verde: concluída · Vermelho: atrasada</p></div>
    {error && <p className="notice error" role="alert">{error}</p>}
    {loading?<Empty>Carregando cronograma…</Empty>:<WeeklyGoalCalendar start={week.start} goals={goals.filter(g=>!pillar || g.pillar===pillar)}/>}
  </>
}
