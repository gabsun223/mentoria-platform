import useWorkspace from '../lib/useWorkspace'
import { hours } from '../components/WorkspaceUI'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import useSyllabus from '../lib/useSyllabus'
import { Card, PageTitle, Empty } from '../components/WorkspaceUI'
export default function Syllabus(){
 const {profile}=useAuth(),mentor=profile?.role==='mentor'
 const {topics,error,loading,reload}=useSyllabus(); const {records,goals}=useWorkspace()
 const [form,setForm]=useState(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 const subjects=[...new Set(topics.map(t=>t.subject))]
 async function save(e){e.preventDefault();setBusy(true);setNotice('');const payload={subject:form.subject.trim(),topic:form.topic.trim()};if(!payload.subject||!payload.topic){setNotice('Preencha a matéria e o assunto.');setBusy(false);return}const r=form.id?await supabase.from('syllabus_topics').update(payload).eq('id',form.id):await supabase.from('syllabus_topics').insert(payload);if(r.error)setNotice(r.error.message);else{setForm(null);await reload()}setBusy(false)}
 return <><PageTitle title="Edital" subtitle="Matérias e assuntos que orientam as metas e os registros de estudo.">{<button className="btn primary" onClick={()=>setForm({subject:'',topic:''})}>Adicionar assunto</button>}</PageTitle>
 {(error||notice)&&<p className="notice error" role="alert">{error||notice}</p>}
 {form&&<Card title={form.id?'Editar assunto':'Novo assunto'}><form onSubmit={save}><fieldset className="editor-fields" disabled={busy}><label>Matéria<input className="field" required list="syllabus-subjects" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label><datalist id="syllabus-subjects">{subjects.map(s=><option key={s}>{s}</option>)}</datalist><label>Assunto<input className="field" required value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})}/></label><div className="editor-footer"><button className="btn" type="button" onClick={()=>setForm(null)}>Cancelar</button><button className="btn primary">Salvar assunto</button></div></fieldset></form></Card>}
 {loading?<Empty>Carregando edital…</Empty>:subjects.map(s=>{const items=topics.filter(t=>t.subject===s),ids=new Set(items.map(t=>t.id)),logs=records.filter(r=>ids.has(r.syllabus_topic_id)),assigned=goals.filter(g=>ids.has(g.syllabus_topic_id)),total=logs.reduce((n,r)=>n+r.questions_total,0),correct=logs.reduce((n,r)=>n+r.questions_correct,0);return <details key={s} className="surface section-gap syllabus-group"><summary><div><h2>{s}</h2><small>{items.length} assuntos · {assigned.filter(g=>g.completed).length}/{assigned.length} metas concluídas</small></div><span className="syllabus-metrics">{hours(logs.reduce((n,r)=>n+r.seconds,0))} estudadas · {total?Math.round(correct/total*100)+'% de acertos':'Sem questões'}</span></summary>{items.map(t=>{const studied=records.filter(r=>r.syllabus_topic_id===t.id),last=studied.filter(r=>r.study_date).map(r=>r.study_date).sort().at(-1);return <div className="data-row" key={t.id}><div><strong>{t.topic}</strong><small>{hours(studied.reduce((n,r)=>n+r.seconds,0))}{last?' · Último estudo: '+last.split('-').reverse().join('/'):' · Ainda não estudado'}</small></div>{mentor&&<><button className="btn" onClick={()=>setForm(t)}>Editar</button><Link className="text-action" to={'/mentor/metas?assunto='+t.id}>Criar meta →</Link></>}</div>})}</details>})}{!loading&&!topics.length&&<Empty>{mentor?'Cadastre as matérias e os assuntos para criar suas metas.':'Cadastre um assunto aqui ou no registro de estudo.'}</Empty>}</>
}
