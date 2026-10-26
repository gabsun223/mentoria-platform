import EditorDialog from '../components/EditorDialog'
import DraftNotice from '../components/DraftNotice'
import useEditorDraft from '../lib/useEditorDraft'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import useGoalCatalog from '../lib/useGoalCatalog'
import { supabase } from '../supabaseClient'
import { Card, PageTitle, Empty } from '../components/WorkspaceUI'
const days=['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo']
export default function WeekPacks(){
  const {templates,packs,error,loading,reload}=useGoalCatalog()
  const {user}=useAuth()
  const {form,draft,setForm,open,close,resume,storageError}=useEditorDraft(user.id+':packs')
  const [busy,setBusy]=useState(false),[notice,setNotice]=useState(''),[search,setSearch]=useState('')
  function move(index, direction) {
    const items=[...form.items], same=items.map((it,i)=>it.weekday===items[index].weekday?i:-1).filter(i=>i>=0)
    const other=same[same.indexOf(index)+direction]
    if(other==null)return
    ;[items[index],items[other]]=[items[other],items[index]]
    setForm({...form,items})
  }
  async function save(e){e.preventDefault();setBusy(true);setNotice('');try{
    if(!form.name.trim())throw Error('Dê um nome ao pacote.')
    if(form.items.some(it=>!templates.some(t=>t.id===it.template_id)))throw Error('Remova ou substitua as metas indisponíveis antes de salvar.')
    if(!form.items.length)throw Error('Adicione ao menos uma meta ao pacote.')
    const payload={name:form.name.trim(),items:form.items}
    const r=form.id?await supabase.from('goal_week_packs').update(payload).eq('id',form.id).select().single():await supabase.from('goal_week_packs').insert(payload).select().single()
    if(r.error)throw r.error;setForm(null);await reload();setNotice('Pacote semanal salvo.')
  }catch(e){setNotice(e.message)}finally{setBusy(false)}}
  return <><PageTitle title="Pacotes semanais" subtitle="Distribua metas do catálogo pelos dias. Depois importe o pacote para a semana de cada aluno."><button className="btn primary" disabled={loading || !!error || busy} onClick={()=>open({name:'',items:[]})}>＋ Novo pacote</button><Link className="btn" to="/mentor/metas">Cronograma dos alunos</Link><Link className="btn" to="/mentor/catalogo">Catálogo por matéria</Link></PageTitle>
    {(error || notice) && <p className="notice" role="status">{error || notice}</p>}
    <DraftNotice draft={!form && draft} onResume={resume}/>
    {form && <EditorDialog title="Organizar pacote" subtitle="Mova as metas entre os dias e ajuste a sequência de estudo." wide onClose={close} busy={busy}>{notice && <p className="notice" role="status">{notice}</p>}{storageError && <p className="notice error">{storageError}</p>}<form onSubmit={save}><fieldset disabled={busy} className="editor-fields"><label>Nome do pacote<input required className="field" placeholder="Ex.: Semana 1 — Fundamentos" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label>Buscar metas do catálogo<input className="field" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Matéria ou assunto"/></label>
      <div className="weekly-scroll" tabIndex={0} aria-label="Dias do pacote"><div className="weekly-calendar">{days.map((day,i)=><section className="calendar-day" key={day}><header><strong>{day}</strong><small>{form.items.filter(it=>it.weekday===i).length} metas</small></header>
        {form.items.map((it,j)=>{const t=templates.find(t=>t.id===it.template_id);return it.weekday===i && <article className="calendar-goal" key={j}><span className="subject-tag">{t?.category}</span><strong>{t?.topic || t?.title || 'Meta indisponível'}</strong><label className="pack-day-select">Dia<select aria-label={'Dia de '+(t?.topic || t?.title || 'meta')} className="field" value={it.weekday} onChange={e=>setForm({...form,items:form.items.map((item,k)=>k===j?{...item,weekday:Number(e.target.value)}:item)})}>{days.map((d,k)=><option key={d} value={k}>{d}</option>)}</select></label><div className="pack-order"><button type="button" className="btn" aria-label="Mover para cima" disabled={!form.items.slice(0,j).some(item=>item.weekday===i)} onClick={()=>move(j,-1)}>↑</button><button type="button" className="btn" aria-label="Mover para baixo" disabled={!form.items.slice(j+1).some(item=>item.weekday===i)} onClick={()=>move(j,1)}>↓</button></div><button type="button" className="text-action" onClick={()=>setForm({...form,items:form.items.filter((_,k)=>j!==k)})}>Remover do pacote</button></article>})}
        <select className="field" aria-label={'Adicionar meta em '+day} value="" onChange={e=>{if(e.target.value)setForm({...form,items:[...form.items,{template_id:e.target.value,weekday:i}]})}}><option value="">＋ Escolher meta</option>{templates.filter(t=>(t.category+' '+t.title+' '+t.topic).toLowerCase().includes(search.toLowerCase())).map(t=><option key={t.id} value={t.id}>{t.category} · {t.topic || t.title}</option>)}</select>
      </section>)}</div></div><div className="editor-footer"><button type="button" className="btn" onClick={()=>setForm(null)}>Descartar rascunho</button><button type="button" className="btn" onClick={close}>Continuar depois</button><button className="btn primary">Salvar pacote</button></div>
    </fieldset></form></EditorDialog>}
    {loading?<Empty>Carregando pacotes…</Empty>:<div className="catalog-grid">{packs.map(p=><Card key={p.id} title={p.name} subtitle={`${p.items.length} metas · ${new Set(p.items.map(i=>templates.find(t=>t.id===i.template_id)?.category).filter(Boolean)).size} matérias`}><div className="toolbar"><button className="btn" disabled={busy} onClick={()=>open({...p,items:p.items.map(i=>({...i}))})}>Editar distribuição</button><Link className="btn primary" to={'/mentor/metas?pacote='+p.id}>Importar para aluno</Link></div></Card>)}</div>}
    {!loading && !error && !packs.length && <Empty>Crie um pacote e escolha as metas do catálogo para cada dia.</Empty>}
  </>
}
