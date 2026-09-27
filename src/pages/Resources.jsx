import { PageTitle, Card, Empty } from '../components/WorkspaceUI'
import useWorkspace from '../lib/useWorkspace'
import GoalAttachments from '../components/GoalAttachments'
export default function Resources({type}){
 const {goals,error,loading}=useWorkspace()
 if(type==='meetings')return <><PageTitle title="Encontros" subtitle="Conversas que fazem seu estudo avançar."/><Card title="Agenda da mentoria"><Empty>Por enquanto, combine seus encontros diretamente com o professor.</Empty></Card></>
 const groups=new Map()
 for(const g of goals)for(const file of g.attachments||[]){const subject=g.category||'Sem matéria';if(!groups.has(subject))groups.set(subject,new Map());groups.get(subject).set(file.path,file)}
 return <><PageTitle title="Materiais" subtitle="Arquivos enviados pelo professor, organizados por matéria."/>{error&&<p className="notice error">{error}</p>}{loading?<Empty>Carregando materiais…</Empty>:[...groups].sort(([a],[b])=>a.localeCompare(b)).map(([subject,files])=><Card key={subject} className="section-gap" title={subject} subtitle={files.size+' arquivo(s)'}><GoalAttachments files={[...files.values()]}/></Card>)}{!loading&&!groups.size&&<Empty>Nenhum material enviado para suas metas.</Empty>}</>
}
