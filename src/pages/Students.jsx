import { useState } from 'react'
import { Link } from 'react-router-dom'
import useWorkspace from '../lib/useWorkspace'
import { supabase } from '../supabaseClient'
import { PageTitle, Card, Empty, Avatar } from '../components/WorkspaceUI'
export default function Students() {
 const {students,goals,user,loading,error,reload}=useWorkspace();const [search,setSearch]=useState(''),[busy,setBusy]=useState(''),[notice,setNotice]=useState('')
 async function claim(id){setBusy(id);const r=await supabase.from('profiles').update({mentor_id:user.id}).eq('id',id).is('mentor_id',null).select().single();if(r.error)setNotice(r.error.message);else {setNotice('Aluno vinculado com sucesso.');await reload()}setBusy('')}
 return <><PageTitle title="Alunos" subtitle="Acompanhe cada trajetória e organize os próximos passos."/><div className="toolbar"><input className="field" placeholder="Buscar aluno" aria-label="Buscar aluno" value={search} onChange={e=>setSearch(e.target.value)}/></div>{(error || notice) && <p role="status" className="notice">{error || notice}</p>}{loading && <p>Carregando alunos...</p>}{[true,false].map(linked=>{const list=students.filter(s=>(s.mentor_id===user.id)===linked && (s.full_name || '').toLowerCase().includes(search.toLowerCase()));return <Card key={String(linked)} className="section-gap" title={linked?'Meus alunos':'Disponíveis para vincular'} subtitle={list.length+' aluno(s)'}>{list.map(s=><div className="data-row" key={s.id}><Avatar name={s.full_name}/><strong>{s.full_name || 'Aluno sem nome'}</strong>{linked?<><span>{goals.filter(g=>g.student_id===s.id).length} metas atribuídas</span><Link className="btn" to={'/mentor/metas?aluno='+s.id+'&periodo=todos'}>Ver metas →</Link></>:<button className="btn primary" disabled={!!busy} onClick={()=>claim(s.id)}>{busy===s.id?'Vinculando...':'Vincular aluno'}</button>}</div>)}{!list.length && !loading && <Empty>{linked?'Nenhum aluno encontrado.':'Nenhum aluno aguardando vínculo.'}</Empty>}</Card>})}</>
}
