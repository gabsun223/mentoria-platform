import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'
import useSyllabus from '../lib/useSyllabus'
import { PILLAR_ORDER, pillarOf, activityKey } from '../lib/pillars'
import { goalOrder } from '../lib/studyStats'
import { dateKey } from './WorkspaceUI'
import DurationField from './DurationField'
export default function StudyRecorder({seconds,requestId,onClose,onSaved,draft,onDraft}){
 const {topics,error:syllabusError}=useSyllabus(),[goals,setGoals]=useState([]),[busy,setBusy]=useState(false),[error,setError]=useState('')
 const [form,setForm]=useState(draft||{goal_id:'',subject:'',topic:'',activity_type:'teoria',seconds,study_date:dateKey(),total:0,correct:0,notes:'',material:'',complete:false})
 const dialog=useRef(null)
 const set=next=>{setForm(next);onDraft(next)}
 useEffect(()=>{supabase.from('goals').select('*').eq('completed',false).then(r=>{if(r.error)setError(r.error.message);else setGoals((r.data||[]).sort(goalOrder))})},[])
 useEffect(()=>{dialog.current.showModal();const previous=document.activeElement;return()=>previous?.focus()},[])
 const subjects=[...new Set(topics.map(t=>t.subject))],options=topics.filter(t=>t.subject.toLocaleLowerCase()===form.subject.trim().toLocaleLowerCase())
 const known=options.some(t=>t.topic.toLocaleLowerCase()===form.topic.trim().toLocaleLowerCase())
 async function save(e){e.preventDefault();setBusy(true);setError('');try{const {error}=await supabase.rpc('record_study_session',{p_request:requestId,p_goal:form.goal_id||null,p_date:form.study_date,p_seconds:form.seconds,p_subject:form.subject.trim(),p_topic:form.topic.trim(),p_activity:form.activity_type,p_total:Number(form.total),p_correct:Number(form.correct),p_complete:!!form.complete,p_notes:form.notes,p_material:form.material});if(error)throw error;onSaved();window.dispatchEvent(new Event('study-saved'))}catch(e){setError(e.message)}finally{setBusy(false)}}
 return <dialog className="week-goal-picker study-recorder" ref={dialog} onCancel={e=>{e.preventDefault();if(!busy)onClose()}}><div className="card-heading"><h2>Registrar estudo</h2><button className="btn" aria-label="Fechar registro" disabled={busy} onClick={onClose}>×</button></div><form onSubmit={save}><fieldset className="editor-fields" disabled={busy}>
 <label>Vincular a uma meta (opcional)<select className="field" value={form.goal_id} onChange={e=>{const g=goals.find(g=>g.id===e.target.value);set({...form,goal_id:g?.id||'',subject:g?.category||form.subject,topic:g?.topic||g?.title||form.topic,activity_type:g?activityKey(g):form.activity_type,complete:false})}}><option value="">Estudo avulso</option>{goals.map(g=><option value={g.id} key={g.id}>{g.due_date.split('-').reverse().join('/')} · {g.category} — {g.topic||g.title}</option>)}</select></label>
 <div className="toolbar">{[['Hoje',0],['Ontem',1]].map(([label,offset])=><button key={label} type="button" className="btn" onClick={()=>{const d=new Date();d.setDate(d.getDate()-offset);set({...form,study_date:dateKey(d)})}}>{label}</button>)}<label>Data do estudo<input required className="field" type="date" max={dateKey()} value={form.study_date} onChange={e=>set({...form,study_date:e.target.value})}/></label></div>
 <div className="field-grid"><label>Categoria<select className="field" disabled={!!form.goal_id} value={form.activity_type} onChange={e=>set({...form,activity_type:e.target.value})}>{PILLAR_ORDER.map(k=><option key={k} value={k}>{pillarOf(k).label}</option>)}</select></label><DurationField seconds={form.seconds} onChange={seconds=>set({...form,seconds})}/></div>
 <label>Matéria<input className="field" required readOnly={!!form.goal_id} list="record-subjects" placeholder="Selecione ou crie uma matéria" value={form.subject} onChange={e=>set({...form,subject:e.target.value,topic:''})}/></label><datalist id="record-subjects">{subjects.map(s=><option key={s}>{s}</option>)}</datalist>
 <label>Assunto<input className="field" required readOnly={!!form.goal_id} list="record-topics" placeholder="Selecione ou crie um assunto" value={form.topic} onChange={e=>set({...form,topic:e.target.value})}/></label><datalist id="record-topics">{options.map(t=><option key={t.id}>{t.topic}</option>)}</datalist>
 {!form.goal_id&&form.subject.trim()&&form.topic.trim()&&!known&&<p className="notice">Novo assunto: será cadastrado no seu edital ao salvar.</p>}
 <div className="field-grid"><label>Questões respondidas<input className="field" type="number" min="0" required value={form.total} onChange={e=>set({...form,total:e.target.value})}/></label><label>Acertos<input className="field" type="number" min="0" max={form.total} required value={form.correct} onChange={e=>set({...form,correct:e.target.value})}/></label></div>
 <label>Material estudado<input className="field" value={form.material} onChange={e=>set({...form,material:e.target.value})}/></label><label>Comentários<textarea className="field" value={form.notes} onChange={e=>set({...form,notes:e.target.value})}/></label>
 {form.goal_id&&<label className="check-label"><input type="checkbox" checked={form.complete} onChange={e=>set({...form,complete:e.target.checked})}/>Concluir esta meta</label>}<p className="muted small">Este tempo será somado ao histórico{form.goal_id?' e à meta selecionada':''}.</p>
 {(error||syllabusError)&&<p role="alert" className="notice error">{error||syllabusError}</p>}<div className="editor-footer"><button type="button" className="btn" onClick={onClose}>Voltar ao relógio</button><button className="btn primary">{busy?'Salvando…':'Salvar estudo'}</button></div>
 </fieldset></form></dialog>
}
