import { useEffect, useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import { PILLAR_ORDER, pillarOf } from '../lib/pillars'
const blank = () => ({ title: '', category: '', pillar: 'leitura', due_date: new Date().toLocaleDateString('en-CA') })
const inputClass = 'w-full border border-paper-dark rounded bg-white p-2 text-sm'
export default function MentorPanel() {
 const { user } = useAuth()
 const [students,setStudents]=useState([]), [selected,setSelected]=useState(null), [goals,setGoals]=useState([])
 const [form,setForm]=useState(null), [blocks,setBlocks]=useState([]), [error,setError]=useState(''), [message,setMessage]=useState('')
 const [busy,setBusy]=useState(false), [loading,setLoading]=useState(true), [search,setSearch]=useState('')
 const request=useRef(0)
 const fail=e=>setError(e.message || 'Não foi possível concluir. Tente novamente.')
 async function loadStudents() {
  setLoading(true)
  const {data,error}=await supabase.from('profiles').select('*').eq('role','student').or('mentor_id.eq.'+user.id+',mentor_id.is.null').order('full_name')
  if(error) fail(error); else setStudents(data || [])
  setLoading(false)
 }
 useEffect(()=>{loadStudents()},[user.id])
 async function selectStudent(student) {
  const version=++request.current
  setSelected(student);setForm(null);setGoals([]);setError('');setMessage('');setBusy(true)
  const {data,error}=await supabase.from('goals').select('*, goal_blocks(*)').eq('student_id',student.id).order('due_date',{ascending:false})
  if(version!==request.current)return
  if(error)fail(error);else setGoals(data || [])
  setBusy(false)
 }
 async function claim(student) {
  setBusy(true);setError('')
  const {data,error}=await supabase.from('profiles').update({mentor_id:user.id}).eq('id',student.id).is('mentor_id',null).select().single()
  if(error)fail(error);else {await loadStudents();await selectStudent(data)}
  setBusy(false)
 }
 function edit(goal) {
  setForm({...goal});setBlocks([...goal.goal_blocks].sort((a,b)=>a.position-b.position));setMessage('');setError('')
 }
 async function save(e) {
  e.preventDefault();setBusy(true);setError('');setMessage('')
  try {
   const payload={title:form.title.trim(),category:(form.category || "").trim(),pillar:form.pillar,due_date:form.due_date}
   if(!payload.title)throw new Error('Preencha o título da meta.')
   let id=form.id
   if(id) {
    const {error}=await supabase.from('goals').update(payload).eq('id',id).eq('student_id',selected.id).select().single();if(error)throw error
   } else {
    const {data,error}=await supabase.from('goals').insert({...payload,student_id:selected.id}).select().single();if(error)throw error
    id=data.id;setForm(f=>({...f,id}))
   }
   for(let i=0;i<blocks.length;i++) {
    const block=blocks[i]
    const payload={title:block.title.trim(),topic:(block.topic || '').trim(),material_url:(block.material_url || '').trim(),position:i}
    const result=block.id ? await supabase.from('goal_blocks').update(payload).eq('id',block.id).eq('goal_id',id).select().single() : await supabase.from('goal_blocks').insert({...payload,goal_id:id}).select().single()
    if(result.error)throw result.error
    block.id=result.data.id
   }
   await selectStudent(selected);setMessage('Meta salva com sucesso.')
  } catch(e) {setError('Não foi possível salvar tudo. Confira os campos e tente novamente. ' + e.message)} finally {setBusy(false)}
 }
 const mine=students.filter(s=>s.mentor_id===user.id && (s.full_name || '').toLowerCase().includes(search.toLowerCase()))
 const available=students.filter(s=>!s.mentor_id && (s.full_name || '').toLowerCase().includes(search.toLowerCase()))
 return <div className="max-w-6xl space-y-5">
 <h1 className="font-serif text-3xl">Alunos e metas</h1><p>Selecione um aluno para acompanhar e editar suas metas ou atribuir novas atividades.</p>
 {error && <p role="alert" className="bg-selo-vermelho-bg p-3 rounded">{error}</p>}{message && <p role="status" className="bg-selo-verde-bg p-3 rounded">{message}</p>}
 <div className="grid lg:grid-cols-[240px_1fr] gap-6"><section className="space-y-4">
 <input aria-label="Buscar aluno" placeholder="Buscar aluno" className={inputClass} value={search} onChange={e=>setSearch(e.target.value)}/>
 <h2 className="font-semibold">Meus alunos ({mine.length})</h2>
 {loading ? <p>Carregando alunos...</p> : mine.map(s=><button disabled={busy} key={s.id} onClick={()=>selectStudent(s)} className={'block w-full text-left p-3 border rounded '+(selected?.id===s.id?'bg-ink text-paper':'bg-white')}>{s.full_name || 'Aluno sem nome'}</button>)}
 {!loading && !mine.length && <p>Nenhum aluno vinculado.</p>}
 <h2 className="font-semibold">Disponíveis para vincular ({available.length})</h2>
 {available.map(s=><div className="p-3 border rounded" key={s.id}><p>{s.full_name || 'Aluno sem nome'}</p><button disabled={busy} className="underline mt-2" onClick={()=>claim(s)}>Vincular aluno</button></div>)}
 {!loading && !available.length && <p>Nenhum aluno aguardando vínculo.</p>}
 </section><section className="space-y-4 min-w-0">
 {!selected ? <p className="border border-dashed p-8 rounded">Escolha um aluno na lista ao lado.</p> : <>
 <div className="flex justify-between gap-3 items-center"><h2 className="text-2xl font-serif">{selected.full_name}</h2><button disabled={busy} onClick={()=>{setForm(blank());setBlocks([]);setMessage('')}} className="bg-ink text-paper rounded px-4 py-2">Nova meta</button></div>
 <p>{goals.length} metas · {goals.filter(g=>g.completed).length} concluídas · {Math.round(goals.reduce((n,g)=>n+(g.time_seconds || 0),0)/60)} minutos estudados</p>
 {form && <form onSubmit={save} className="bg-white border rounded p-4 space-y-3"><fieldset disabled={busy} className="space-y-3">
 <h3 className="font-semibold">{form.id?'Editar meta':'Atribuir meta'} — {selected.full_name}</h3>
 {['title','category','due_date'].map((key,i)=><label key={key} className="block">{['Título','Matéria','Data'][i]}<input className={inputClass} required={key!=='category'} type={key==='due_date'?'date':'text'} value={form[key] || ''} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}
 <label className="block">Tipo de atividade<select className={inputClass} value={form.pillar} onChange={e=>setForm({...form,pillar:e.target.value})}>{PILLAR_ORDER.map(p=><option key={p} value={p}>{pillarOf(p).label}</option>)}</select></label>
 <h4>Blocos de estudo</h4>
 {blocks.map((b,i)=><div key={i} className="border rounded p-3 space-y-2">{['title','topic','material_url'].map((key,j)=><label className="block text-sm" key={key}>{['Nome do bloco','Assunto','Link do material'][j]}<input required={key==='title'} type={key==='material_url'?'url':'text'} className={inputClass} value={b[key] || ''} onChange={e=>setBlocks(blocks.map((row,k)=>k===i?{...row,[key]:e.target.value}:row))}/></label>)}{!b.id && <button type="button" onClick={()=>setBlocks(blocks.filter((_,k)=>k!==i))}>Remover bloco não salvo</button>}</div>)}
 <button type="button" className="underline" onClick={()=>setBlocks([...blocks,{title:'',topic:'',material_url:''}])}>Adicionar bloco</button>
 <div className="flex gap-4"><button className="bg-ink text-paper px-4 py-2 rounded" type="submit">{busy?'Salvando...':'Salvar meta'}</button><button type="button" onClick={()=>setForm(null)}>Cancelar</button></div>
 </fieldset></form>}
 <h3 className="font-semibold">Metas do aluno</h3>{busy && <p role="status">Carregando ou salvando...</p>}
 {goals.map(g=><article key={g.id} className="bg-white border rounded p-4 space-y-2"><h4 className="font-semibold">{g.title}</h4><p className="text-sm">{g.due_date.split('-').reverse().join('/')} · {g.category} · {g.completed?'Concluída':'Pendente'} · {g.goal_blocks.filter(b=>b.completed).length}/{g.goal_blocks.length} blocos</p><div className="flex gap-4"><button disabled={busy} className="underline" onClick={()=>edit(g)}>Editar meta</button><Link className="underline" to={'/metas/'+g.id}>Ver detalhes</Link></div></article>)}
 {!busy && !goals.length && <p>Este aluno ainda não possui metas. Use “Nova meta” para começar.</p>}
 </>}
 </section></div></div>
}
