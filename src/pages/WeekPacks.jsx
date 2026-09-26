import { useState } from 'react'
import { Link } from 'react-router-dom'
import useGoalCatalog from '../lib/useGoalCatalog'
import { supabase } from '../supabaseClient'
import { Card, PageTitle, Empty } from '../components/WorkspaceUI'
const days=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
export default function WeekPacks(){
  const {templates,packs,error,loading,reload}=useGoalCatalog()
  const [form,setForm]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[search,setSearch]=useState('')
  async function save(e){e.preventDefault();setBusy(true);setNotice('');try{
    if(!form.items.length)throw Error('Adicione ao menos uma meta ao pacote.')
    const payload={name:form.name.trim(),items:form.items}
    const r=form.id?await supabase.from('goal_week_packs').update(payload).eq('id',form.id).select().single():await supabase.from('goal_week_packs').insert(payload).select().single()
    if(r.error)throw r.error;setForm(null);await reload();setNotice('Pacote semanal salvo.')
  }catch(e){setNotice(e.message)}finally{setBusy(false)}}
  return <><PageTitle title="Pacotes semanais" subtitle="Distribua metas do catálogo pelos dias. Depois importe o pacote para a semana de cada aluno."><button className="btn primary" disabled={loading || !!error || busy} onClick={()=>setForm({name:'',items:[]})}>＋ Novo pacote</button><Link className="btn" to="/mentor/catalogo">Catálogo por matéria</Link></PageTitle>
    {(error || notice) && <p className="notice" role="status">{error || notice}</p>}
    {form && <Card title="Organizar pacote"><form onSubmit={save}><fieldset disabled={busy} className="editor-fields"><label>Nome do pacote<input required className="field" placeholder="Ex.: Semana 1 — Fundamentos" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Buscar metas do catálogo<input className="field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Matéria, assunto ou título"/></label>
      <div className="weekly-scroll" tabIndex={0} aria-label="Dias do pacote"><div className="weekly-calendar">{days.map((day,i)=><section className="calendar-day" key={day}><header><strong>{day}</strong><small>{form.items.filter(it=>it.weekday===i).length} metas</small></header>
        {form.items.map((it,j)=>{const t=templates.find(t=>t.id===it.template_id);return it.weekday===i && <article className="calendar-goal" key={j}><span className="subject-tag">{t?.category}</span><strong>{t?.title || 'Meta indisponível'}</strong><p>{t?.topic}</p><button type="button" className="text-action" onClick={()=>setForm({...form,items:form.items.filter((_,k)=>j!==k)})}>Remover do pacote</button></article>})}
        <select className="field" aria-label={'Adicionar meta em '+day} value="" onChange={e=>{if(e.target.value)setForm({...form,items:[...form.items,{template_id:e.target.value,weekday:i}]})}}><option value="">＋ Escolher meta</option>{templates.filter(t=>(t.category+' '+t.title+' '+t.topic).toLowerCase().includes(search.toLowerCase())).map(t=><option key={t.id} value={t.id}>{t.category} · {t.title}</option>)}</select>
      </section>)}</div></div><div className="editor-footer"><button type="button" className="btn" onClick={()=>setForm(null)}>Cancelar</button><button className="btn primary">Salvar pacote</button></div>
    </fieldset></form></Card>}
    {loading?<Empty>Carregando pacotes…</Empty>:<div className="catalog-grid">{packs.map(p=><Card key={p.id} title={p.name} subtitle={`${p.items.length} metas · ${new Set(p.items.map(i=>templates.find(t=>t.id===i.template_id)?.category).filter(Boolean)).size} matérias`}><div className="toolbar"><button className="btn" disabled={busy} onClick={()=>setForm({...p,items:p.items.map(i=>({...i}))})}>Editar distribuição</button><Link className="btn primary" to={'/mentor/metas?pacote='+p.id}>Importar para aluno</Link></div></Card>)}</div>}
    {!loading && !error && !packs.length && <Empty>Crie um pacote e escolha as metas do catálogo para cada dia.</Empty>}
  </>
}
