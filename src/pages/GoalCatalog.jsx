import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import useGoalCatalog from '../lib/useGoalCatalog'
import { Card, PageTitle, Empty } from '../components/WorkspaceUI'
import GoalDefinitionFields from '../components/GoalDefinitionFields'
import { definitionFrom, definitionPayload } from '../lib/goalDefinition'
import { activityKey, pillarOf } from '../lib/pillars'
const blank = { category: '', topic: '', activity_type: 'teoria', material_url: '' }
export default function GoalCatalog() {
  const { templates, error, loading, reload } = useGoalCatalog()
  const [search, setSearch] = useState(''), [form, setForm] = useState(null), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const groups = templates.reduce((all, template) => ({ ...all, [template.category]: [...(all[template.category] || []), template] }), {})
  const matches = template => (template.category + ' ' + (template.topic || template.title)).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
  async function save(e) {
    e.preventDefault(); setBusy(true); setNotice('')
    try {
      const payload = definitionPayload(form)
      const result = form.id
        ? await supabase.from('goal_templates').update(payload).eq('id', form.id).select().single()
        : await supabase.from('goal_templates').insert({ ...payload, blocks: [] }).select().single()
      if (result.error) throw result.error
      setForm(null); await reload(); setNotice('Meta padrão salva no catálogo.')
    } catch (e) { setNotice(e.message) } finally { setBusy(false) }
  }
  return <>
    <PageTitle title="Catálogo de metas" subtitle="Seus modelos organizados por matéria. Alterações aqui não modificam metas já atribuídas."><button className="btn primary" disabled={!!error || loading || busy} onClick={() => setForm({ ...blank })}>＋ Nova meta padrão</button><Link className="btn" to="/mentor/pacotes">Pacotes semanais</Link></PageTitle>
    {(error || notice) && <p className="notice" role="status">{error || notice}</p>}
    <input className="field catalog-search" aria-label="Buscar no catálogo" placeholder="Buscar matéria ou assunto…" value={search} onChange={e => setSearch(e.target.value)}/>
    {form && <Card title={form.id ? 'Editar meta padrão' : 'Nova meta padrão'}><form onSubmit={save}><fieldset className="editor-fields" disabled={busy}>
      <GoalDefinitionFields value={form} onChange={setForm} subjects={Object.keys(groups)} onBusyChange={setBusy}/>
      <div className="editor-footer"><button type="button" className="btn" onClick={() => setForm(null)}>Cancelar</button><button className="btn primary">Salvar no catálogo</button></div>
    </fieldset></form></Card>}
    {loading ? <Empty>Carregando catálogo…</Empty> : <div className="catalog-grid">{Object.entries(groups).map(([category, rows]) => {
      const visible = rows.filter(matches)
      return visible.length > 0 && <Card key={category} title={category} subtitle={`${rows.length} metas · ${new Set(rows.map(t => (t.topic || t.title).trim().toLowerCase()).filter(Boolean)).size} assuntos`}>
        {visible.map(t => <div key={t.id} className="catalog-row"><div><strong>{t.topic || t.title}</strong><small>{pillarOf(activityKey(t)).label}</small></div><button className="btn" disabled={busy} onClick={() => setForm({ id: t.id, ...definitionFrom(t) })}>Editar</button></div>)}
      </Card>
    })}</div>}
    {!loading && !error && !templates.some(matches) && <Empty>Nenhuma meta encontrada. Crie sua primeira meta padrão.</Empty>}
  </>
}
