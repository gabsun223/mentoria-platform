import { Link } from 'react-router-dom'
import useWorkspace from '../lib/useWorkspace'
import { PageTitle, Card, Empty, Status, hours } from '../components/WorkspaceUI'
export default function Resources({type}) {
 const {goals,error,loading}=useWorkspace()
 if(type==='meetings')return <><PageTitle title="Encontros" subtitle="Um espaço para as conversas que fazem seu estudo avançar."/><Card title="Agenda da mentoria"><Empty>O agendamento ainda não está disponível.<br/>Por enquanto, combine seus encontros diretamente com o professor.</Empty></Card></>
 const material=type==='materials'
 const blocks=goals.flatMap(g=>[
  ...(/^https?:\/\//i.test(g.material_url || '')?[{id:'material-'+g.id,title:g.topic || g.title,material_url:g.material_url,goal:g}]:[]),
  ...(g.goal_blocks || []).filter(b=>/^https?:\/\//i.test(b.material_url || '') && b.material_url!==g.material_url).map(b=>({...b,goal:g}))
 ])
 return <><PageTitle title={material?'Materiais':'Sessões de estudo'} subtitle={material?'Tudo que seu mentor compartilhou, organizado por meta.':'Abra uma meta para iniciar o cronômetro e registrar seu estudo.'}/>{error && <p role="alert" className="notice error">{error}</p>}<Card title={material?'Biblioteca de apoio':'Suas metas e tempos acumulados'}>{loading?<Empty>Carregando...</Empty>:material?blocks.map(b=><div className="data-row" key={b.id}><div><strong>{b.title}</strong><small>{b.goal.title}</small></div><a className="btn" href={b.material_url} target="_blank" rel="noopener noreferrer">Abrir material ↗</a></div>):goals.map(g=><div className="data-row" key={g.id}><div><strong>{g.title}</strong><small>{hours(g.time_seconds)} registrados nesta meta</small></div><Status goal={g}/><Link className="btn" to={'/metas/'+g.id}>Abrir estudo →</Link></div>)}{!loading && !(material?blocks:goals).length && <Empty>{material?'Nenhum material compartilhado ainda.':'Você ainda não tem metas atribuídas.'}</Empty>}</Card></>
}
