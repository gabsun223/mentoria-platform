import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import useGoalCatalog from '../lib/useGoalCatalog'
import { Card, PageTitle, Empty } from '../components/WorkspaceUI'
import { PILLAR_ORDER, pillarOf } from '../lib/pillars'
const blank={title:'',category:'',topic:'',pillar:'leitura',blocks:[]}
export default function GoalCatalog() {
  const {templates,error,loading,reload}=useGoalCatalog()
  const [search,setSearch]=useState(''),[form,setForm]=useState(null),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false)
  const groups=Object.groupBy?Object.groupBy(templates,t=>t.category):templates.reduce((a,t)=>({...a,[t.category]:[...(a[t.category] || []),t]}),{})
  async function save(e){e.preventDefault();setBusy(true);setNotice('');try{
    if(form.blocks.some(b=>b.material_url && !/^https?:\/\//i.test(b.material_url)))throw Error('Os links devem começar com https:// ou http://.')
    const payload={title:form.title.trim(),category:form.category.trim(),topic:form.topic.trim(),pillar:form.pillar,blocks:form.blocks}
    const r=form.id?await supabase.from('goal_templates').update(payload).eq('id',form.id).select().single():await supabase.from('goal_templates').insert(payload).select().single()
    if(r.error)throw r.error;setForm(null);await reload();setNotice('Meta padrão salva no catálogo.')
  }catch(e){setNotice(e.message)}finally{setBusy(false)}}
  function block(i,k,v){setForm({...form,blocks:form.blocks.map((b,j)=>j===i?{...b,[k]:v}:b)})}
  return <><PageTitle title="Catálogo de metas" subtitle="Seus modelos organizados por matéria. Alterações aqui não modificam metas já atribuídas."><button className="btn primary" disabled={!!error || loading || busy} onClick={()=>setForm({...blank})}>＋ Nova meta padrão</button><Link className="btn" to="/mentor/pacotes">Pacotes semanais</Link></PageTitle>
    {(error || notice) && <p className="notice" role="status">{error || notice}</p>}
    <input className="field catalog-search" aria-label="Buscar no catálogo" placeholder="Buscar matéria, assunto ou meta…" value={search} onChange={e=>setSearch(e.target.value)}/>
    {form && <Card title={form.id?'Editar meta padrão':'Nova meta padrão'}><form onSubmit={save}><fieldset className="editor-fields" disabled={busy}>
      <div className="field-grid"><label>Matéria<input required className="field" list="catalog-subjects" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/><datalist id="catalog-subjects">{Object.keys(groups).map(c=><option key={c} value={c}/>)}</datalist></label><label>Título da meta<input required className="field" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label></div>
      <label>Assunto<input required className="field" value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})}/></label>
      <label>Tipo de atividade<select className="field" value={form.pillar} onChange={e=>setForm({...form,pillar:e.target.value})}>{PILLAR_ORDER.map(p=><option value={p} key={p}>{pillarOf(p).label}</option>)}</select></label>
      {form.blocks.map((b,i)=><div className="block-editor" key={i}><label>Nome do bloco<input required className="field" value={b.title} onChange={e=>block(i,'title',e.target.value)}/></label><label>Orientações<textarea className="field" value={b.topic} onChange={e=>block(i,'topic',e.target.value)}/></label><label>Material<input className="field" type="url" value={b.material_url} onChange={e=>block(i,'material_url',e.target.value)}/></label><button type="button" className="text-action" onClick={()=>setForm({...form,blocks:form.blocks.filter((_,j)=>j!==i)})}>Remover bloco</button></div>)}
      <button type="button" className="btn" onClick={()=>setForm({...form,blocks:[...form.blocks,{title:'',topic:'',material_url:''}]})}>＋ Bloco de estudo</button><div className="editor-footer"><button type="button" className="btn" onClick={()=>setForm(null)}>Cancelar</button><button className="btn primary">Salvar no catálogo</button></div>
    </fieldset></form></Card>}
    {loading?<Empty>Carregando catálogo…</Empty>:<div className="catalog-grid">{Object.entries(groups).map(([category,rows])=>{
      const visible=rows.filter(t=>(t.category+' '+t.title+' '+t.topic).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')))
      return visible.length>0 && <Card key={category} title={category} subtitle={`${rows.length} metas · ${new Set(rows.map(t=>t.topic.trim().toLowerCase()).filter(Boolean)).size} assuntos`}>
        {visible.map(t=><div key={t.id} className="catalog-row"><div><strong>{t.title}</strong><p>{t.topic}</p><small>{pillarOf(t.pillar).label}</small></div><button className="btn" disabled={busy} onClick={()=>setForm({...t,blocks:t.blocks.map(b=>({...b}))})}>Editar</button></div>)}
      </Card>
    })}</div>}
    {!loading && !error && !templates.some(t=>(t.category+' '+t.title+' '+t.topic).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))) && <Empty>Nenhuma meta encontrada. Crie sua primeira meta padrão.</Empty>}
  </>
}
