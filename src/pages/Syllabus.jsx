import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import useSyllabus from '../lib/useSyllabus'
import { Card, PageTitle, Empty } from '../components/WorkspaceUI'
export default function Syllabus(){
 const {profile}=useAuth(),mentor=profile?.role==='mentor'
 const {topics,error,loading,reload}=useSyllabus()
 const [form,setForm]=useState(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
 const subjects=[...new Set(topics.map(t=>t.subject))]
 async function save(e){e.preventDefault();setBusy(true);setNotice('');const payload={subject:form.subject.trim(),topic:form.topic.trim()};if(!payload.subject||!payload.topic){setNotice('Preencha a matéria e o assunto.');setBusy(false);return}const r=form.id?await supabase.from('syllabus_topics').update(payload).eq('id',form.id):await supabase.from('syllabus_topics').insert(payload);if(r.error)setNotice(r.error.message);else{setForm(null);await reload()}setBusy(false)}
 return <><PageTitle title="Edital" subtitle="Matérias e assuntos que orientam as metas e os registros de estudo.">{mentor&&<button className="btn primary" onClick={()=>setForm({subject:'',topic:''})}>Adicionar assunto</button>}</PageTitle>
 {(error||notice)&&<p className="notice error" role="alert">{error||notice}</p>}
 {form&&<Card title={form.id?'Editar assunto':'Novo assunto'}><form onSubmit={save}><fieldset className="editor-fields" disabled={busy}><label>Matéria<input className="field" required list="syllabus-subjects" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label><datalist id="syllabus-subjects">{subjects.map(s=><option key={s}>{s}</option>)}</datalist><label>Assunto<input className="field" required value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})}/></label><div className="editor-footer"><button className="btn" type="button" onClick={()=>setForm(null)}>Cancelar</button><button className="btn primary">Salvar assunto</button></div></fieldset></form></Card>}
 {loading?<Empty>Carregando edital…</Empty>:subjects.map(s=><Card key={s} className="section-gap" title={s} subtitle={topics.filter(t=>t.subject===s).length+' assuntos'}>{topics.filter(t=>t.subject===s).map(t=><div className="data-row" key={t.id}><strong>{t.topic}</strong>{mentor&&<><button className="btn" onClick={()=>setForm(t)}>Editar</button><Link className="text-action" to={'/mentor/metas?assunto='+t.id}>Criar meta →</Link></>}</div>)}</Card>)}
 {!loading&&!topics.length&&<Empty>{mentor?'Cadastre as matérias e os assuntos para criar suas metas.':'Seu professor ainda não cadastrou o edital.'}</Empty>}</>
}
