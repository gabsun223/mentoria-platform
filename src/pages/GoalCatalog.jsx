import EditorDialog from '../components/EditorDialog'
import DraftNotice from '../components/DraftNotice'
import useEditorDraft from '../lib/useEditorDraft'
import { useAuth } from '../context/AuthContext'
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
  const { user } = useAuth()
  const { form, draft, setForm, open, close, resume, storageError } = useEditorDraft(user.id + ':catalog')
  const [search, setSearch] = useState(''), [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const groups = templates.reduce((all, template) => ({ ...all, [template.category]: [...(all[template.category] || []), template] }), {})
  const matches = template => (template.category + ' ' + (template.topic || template.title)).toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR'))
  async function save(e) {
    e.preventDefault(); setBusy(true); setNotice('')
    try {
      const payload = { ...definitionPayload(form), blocks: form.blocks || [] }
      const result = form.id
        ? await supabase.from('goal_templates').update(payload).eq('id', form.id).select().single()
        : await supabase.from('goal_templates').insert(payload).select().single()
      if (result.error) throw result.error
      setForm(null); await reload(); setNotice('Meta padrão salva no catálogo.')
    } catch (e) { setNotice(e.message) } finally { setBusy(false) }
  }
  return <>
    <PageTitle title="Catálogo de metas" subtitle="Seus modelos organizados por matéria. Alterações aqui não modificam metas já atribuídas."><button className="btn primary" disabled={!!error || loading || busy} onClick={() => open({ ...blank })}>＋ Nova meta padrão</button><Link className="btn" to="/mentor/metas">Cronograma dos alunos</Link><Link className="btn" to="/mentor/pacotes">Pacotes semanais</Link></PageTitle>
    {(error || notice) && <p className="notice" role="status">{error || notice}</p>}
    <DraftNotice draft={!form && draft} onResume={resume}/><input className="field catalog-search" aria-label="Buscar no catálogo" placeholder="Buscar matéria ou assunto…" value={search} onChange={e => setSearch(e.target.value)}/>
    {form && <EditorDialog title={form.id ? 'Editar meta padrão' : 'Nova meta padrão'} subtitle="As metas já atribuídas aos alunos serão mantidas." onClose={close} busy={busy}>{notice && <p className="notice" role="status">{notice}</p>}{storageError && <p className="notice error">{storageError}</p>}<form onSubmit={save}><fieldset className="editor-fields" disabled={busy}>
      <GoalDefinitionFields value={form} onChange={setForm} subjects={Object.keys(groups)} onBusyChange={setBusy}/>
      <div className="editor-footer"><button type="button" className="btn" onClick={() => setForm(null)}>Descartar rascunho</button><button type="button" className="btn" onClick={close}>Continuar depois</button><button className="btn primary">Salvar no catálogo</button></div>
    </fieldset></form></EditorDialog>}
    {loading ? <Empty>Carregando catálogo…</Empty> : <div className="catalog-grid">{Object.entries(groups).map(([category, rows]) => {
      const visible = rows.filter(matches)
      return visible.length > 0 && <Card key={category} title={category} subtitle={`${rows.length} metas · ${new Set(rows.map(t => (t.topic || t.title).trim().toLowerCase()).filter(Boolean)).size} assuntos`}>
        {visible.map(t => <div key={t.id} className="catalog-row"><div><strong>{t.topic || t.title}</strong><small>{pillarOf(activityKey(t)).label}</small></div><button className="btn" disabled={busy} onClick={() => open({ id: t.id, blocks: t.blocks || [], ...definitionFrom(t) })}>Editar</button></div>)}
      </Card>
    })}</div>}
    {!loading && !error && !templates.some(matches) && <Empty>Nenhuma meta encontrada. Crie sua primeira meta padrão.</Empty>}
  </>
}
