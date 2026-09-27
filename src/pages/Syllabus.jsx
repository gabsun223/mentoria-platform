import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import useSyllabus from '../lib/useSyllabus'
import useWorkspace from '../lib/useWorkspace'
import { PageTitle, Empty, hours } from '../components/WorkspaceUI'

function SubjectDialog({subject,topics,userId,mentor,onClose,onChanged}) {
 const ref=useRef(null)
 const [editing,setEditing]=useState(null),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirm,setConfirm]=useState(false)
 const owned=topics.filter(t=>t.mentor_id===userId)
 useEffect(()=>{const previous=document.activeElement;ref.current.showModal();return()=>previous?.focus()},[])
 async function save(e){e.preventDefault();setBusy(true);setError('');try{
  const value=name.trim();if(!value)throw Error('Preencha o assunto.')
  if(topics.some(t=>t.id!==editing&&t.topic.toLocaleLowerCase()===value.toLocaleLowerCase()))throw Error('Esse assunto já está cadastrado nesta matéria.')
  const query=editing==='new'?supabase.from('syllabus_topics').upsert({subject,topic:value,mentor_id:userId,archived:false},{onConflict:'mentor_id,subject,topic'}):supabase.from('syllabus_topics').update({topic:value}).eq('id',editing).eq('mentor_id',userId)
  const r=await query.select('id');if(r.error)throw r.error;if(!r.data?.length)throw Error('Não foi possível salvar. Você só pode editar os assuntos do seu edital.')
  setEditing(null);setName('');await onChanged()
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 async function remove(){setBusy(true);setError('');try{
  const r=await supabase.from('syllabus_topics').update({archived:true}).in('id',owned.map(t=>t.id)).eq('mentor_id',userId).select('id')
  if(r.error)throw r.error;if(r.data?.length!==owned.length)throw Error('A matéria não pôde ser removida por completo.')
  await onChanged();onClose()
 }catch(e){setError(e.message)}finally{setBusy(false)}}
 return <dialog ref={ref} className="week-goal-picker subject-dialog" aria-labelledby="subject-dialog-title" onCancel={e=>{e.preventDefault();if(!busy)onClose()}}>
 <div className="card-heading"><div><h2 id="subject-dialog-title">{subject}</h2><p>{topics.length} assuntos</p></div><button className="btn" aria-label="Fechar matéria" disabled={busy} onClick={onClose}>×</button></div>
 {error&&<p className="notice error" role="alert">{error}</p>}
 <div className="subject-topic-list">{topics.map(t=><div className="data-row" key={t.id}>{editing===t.id?<form className="subject-edit-form" onSubmit={save}><label>Assunto<input autoFocus className="field" required value={name} disabled={busy} onChange={e=>setName(e.target.value)}/></label><div className="toolbar-actions"><button type="button" className="btn" disabled={busy} onClick={()=>setEditing(null)}>Cancelar</button><button className="btn primary" disabled={busy}>Salvar</button></div></form>:<><strong>{t.topic}</strong><div className="toolbar-actions">{t.mentor_id===userId&&<button className="btn" disabled={busy} onClick={()=>{setEditing(t.id);setName(t.topic);setConfirm(false);setError('')}}>Editar</button>}{mentor&&<Link className="text-action" to={'/mentor/metas?assunto='+t.id} onClick={onClose}>Criar meta →</Link>}</div></>}</div>)}</div>
 {editing==='new'?<form className="subject-edit-form section-gap" onSubmit={save}><label>Novo assunto<input autoFocus required className="field" disabled={busy} value={name} onChange={e=>setName(e.target.value)}/></label><div className="toolbar-actions"><button type="button" className="btn" disabled={busy} onClick={()=>setEditing(null)}>Cancelar</button><button className="btn primary" disabled={busy}>Salvar assunto</button></div></form>:<button className="btn section-gap" disabled={busy} onClick={()=>{setEditing('new');setName('');setConfirm(false)}}>Adicionar assunto</button>}
 {owned.length===topics.length&&owned.length>0&&<div className="subject-delete section-gap">{confirm?<><p>Excluir esta matéria e seus {owned.length} assuntos do edital? As metas e o histórico de estudos serão preservados.</p><div className="toolbar-actions"><button className="btn" disabled={busy} onClick={()=>setConfirm(false)}>Cancelar</button><button className="btn danger" disabled={busy} onClick={remove}>{busy?'Excluindo…':'Confirmar exclusão'}</button></div></>:<button className="btn danger" disabled={busy} onClick={()=>{setConfirm(true);setEditing(null)}}>Excluir matéria</button>}</div>}
 {owned.length!==topics.length&&<p className="muted small section-gap">Os assuntos do professor podem ser editados por ele. Você pode adicionar assuntos próprios.</p>}
 </dialog>
}
export default function Syllabus(){
 const {profile,user}=useAuth(),mentor=profile?.role==='mentor'
 const {topics,error,loading,reload}=useSyllabus(),{records,goals}=useWorkspace()
 const [subject,setSubject]=useState(null),[creating,setCreating]=useState(false),[form,setForm]=useState({subject:'',topic:''}),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
 const subjects=[...new Set(topics.map(t=>t.subject))]
 async function create(e){e.preventDefault();setBusy(true);setNotice('');const payload={subject:form.subject.trim(),topic:form.topic.trim()};if(!payload.subject||!payload.topic){setBusy(false);return}const r=await supabase.from('syllabus_topics').upsert({...payload,mentor_id:user.id,archived:false},{onConflict:'mentor_id,subject,topic'}).select('id');if(r.error)setNotice(r.error.message);else{await reload();setCreating(false);setSubject(payload.subject);setForm({subject:'',topic:''})}setBusy(false)}
 return <><PageTitle title="Edital" subtitle="Clique em uma matéria para consultar e editar seus assuntos."><button className="btn primary" onClick={()=>setCreating(!creating)}>Adicionar matéria / assunto</button></PageTitle>
 {(error||notice)&&<p className="notice error" role="alert">{error||notice}</p>}
 {creating&&<form className="surface editor-fields" onSubmit={create}><label>Matéria<input required className="field" list="syllabus-subjects" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label><datalist id="syllabus-subjects">{subjects.map(s=><option key={s}>{s}</option>)}</datalist><label>Assunto<input required className="field" value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})}/></label><div className="editor-footer"><button type="button" className="btn" disabled={busy} onClick={()=>setCreating(false)}>Cancelar</button><button className="btn primary" disabled={busy}>Salvar assunto</button></div></form>}
 {loading&&!topics.length?<Empty>Carregando edital…</Empty>:subjects.map(s=>{const items=topics.filter(t=>t.subject===s),ids=new Set(items.map(t=>t.id)),logs=records.filter(r=>ids.has(r.syllabus_topic_id)),assigned=goals.filter(g=>ids.has(g.syllabus_topic_id)),total=logs.reduce((n,r)=>n+r.questions_total,0),correct=logs.reduce((n,r)=>n+r.questions_correct,0);return <button key={s} className="surface section-gap subject-card" onClick={()=>setSubject(s)} aria-label={'Abrir matéria '+s}><span><strong>{s}</strong><small>{items.length} assuntos · {assigned.filter(g=>g.completed).length}/{assigned.length} metas concluídas</small></span><span className="syllabus-metrics">{hours(logs.reduce((n,r)=>n+r.seconds,0))} estudadas · {total?Math.round(correct/total*100)+'% de acertos':'Sem questões'}</span><span aria-hidden="true">↗</span></button>})}
 {!loading&&!topics.length&&<Empty>Cadastre as matérias e os assuntos do seu edital.</Empty>}
 {subject!==null&&<SubjectDialog key={subject} subject={subject} topics={topics.filter(t=>t.subject===subject)} userId={user.id} mentor={mentor} onClose={()=>setSubject(null)} onChanged={reload}/>}
 </>
}

