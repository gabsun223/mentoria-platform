import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { differenceInCalendarWeeks, format, startOfWeek } from 'date-fns'
import DeleteGoalDialog from '../components/DeleteGoalDialog'
import EditorDialog from '../components/EditorDialog'
import DraftNotice from '../components/DraftNotice'
import useEditorDraft from '../lib/useEditorDraft'
import WeeklyGoalCalendar from '../components/WeeklyGoalCalendar'
import WeekGoalPicker from '../components/WeekGoalPicker'
import GoalDefinitionFields from '../components/GoalDefinitionFields'
import { definitionFrom } from '../lib/goalDefinition'
import useSyllabus from '../lib/useSyllabus'
import useGoalCatalog from '../lib/useGoalCatalog'
import useWorkspace from '../lib/useWorkspace'
import { saveAssignedGoal } from '../lib/saveAssignedGoal'
import { supabase } from '../supabaseClient'

import { PageTitle, WeekPicker, weekDates, dateKey, Card, Empty, Icon, Avatar, goalStatus } from '../components/WorkspaceUI'

const fresh = (student, date) => ({ student_id: student, due_date: date, category: '', topic: '', activity_type: 'teoria', material_url: '', isNew: true, addToCatalog: false })

export default function MentorPanel() {
  const { students, goals, loading, error, user, reload } = useWorkspace()
  const catalog = useGoalCatalog()
  const syllabus = useSyllabus()
  const [params, setParams] = useSearchParams()
  const student = params.get('aluno') || '', all = params.get('periodo') === 'todos'
  const [day, setDay] = useState('')
  const [offset, setOffset] = useState(0), [status, setStatus] = useState('')
  const { form, draft, setForm, open: openEditor, close: closeEditor, resume, storageError } = useEditorDraft(user.id + ':goal:' + student)
  const [picker, setPicker] = useState(null)
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
  const [selected, setSelected] = useState([]), [batchDate, setBatchDate] = useState('')
  const [showPack, setShowPack] = useState(!!params.get('pacote')), [packId, setPackId] = useState(params.get('pacote') || '')
  const [deleteTarget, setDeleteTarget] = useState(null), [deleteError, setDeleteError] = useState('')
  const mine = students.filter(s => s.mentor_id === user.id)
  const currentStudent = mine.find(s => s.id === student)
  const studentName = currentStudent?.full_name || 'Aluno sem nome'
  const week = weekDates(offset)
  const filtered = goals.filter(g => g.student_id === currentStudent?.id && (all || (g.due_date >= week.from && g.due_date <= week.to)) && (!day || g.due_date === day) && (!status || goalStatus(g) === status))
  const calendarStarts = day ? [dateKey(startOfWeek(new Date(day + 'T12:00:00'), { weekStartsOn: 1 }))] : all ? [...new Set(filtered.map(g => dateKey(startOfWeek(new Date(g.due_date + 'T12:00:00'), { weekStartsOn: 1 }))))].sort().reverse() : [week.from]
  const catalogReady = !catalog.error && !catalog.loading

  useEffect(() => {
    setDay(''); setSelected([]); setBatchDate(''); setPicker(null); setNotice(''); setDeleteTarget(null); setDeleteError('')
  }, [student, all, offset, status])

  useEffect(() => {
    const id = params.get('meta')
    if (!id || loading || !currentStudent) return
    const goal = goals.find(g => g.id === id && g.student_id === student)
    if (goal) openEditor({ ...goal, ...definitionFrom(goal) })
    const next = new URLSearchParams(params); next.delete('meta'); setParams(next, { replace: true })
  }, [loading, student, params.get('meta'), currentStudent?.id])

  function changeFilter(key, value) {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next)
  }
  const focusedDay = day
  function openPicker(day) {
    if (!currentStudent) return
    if (draft) { resume(); return }
    setShowPack(false); setNotice('')
    setPicker({ date: typeof day === 'string' ? day : focusedDay || (all ? dateKey() : week.from) })
  }
  function createGoal() {
    const topic = syllabus.topics.find(t => t.id === params.get('assunto')); setForm({ ...fresh(student, picker.date), ...(topic ? {syllabus_topic_id:topic.id,category:topic.subject,topic:topic.topic} : {}) }); setPicker(null); setNotice('')
  }
  function edit(goal) {
    setDay(goal.due_date); setSelected([])
    setPicker(null); setNotice('')
    openEditor({ ...goal, ...definitionFrom(goal) })
  }
  async function save(e) {
    e.preventDefault(); if (busy || !currentStudent || form.student_id !== student) return
    setBusy(true); setNotice('')
    try {
      await saveAssignedGoal(form, { onProgress: setForm })
      const added = form.addToCatalog
      setForm(null); setDay('')
      if (!all) setOffset(differenceInCalendarWeeks(new Date(form.due_date + 'T12:00:00'), new Date(), { weekStartsOn: 1 }))
      await reload()
      if (added) await catalog.reload()
      setNotice(added ? 'Meta salva para o aluno e incluída no catálogo.' : 'Meta salva com sucesso.')
    } catch (e) {
      if (e.draft) setForm(e.draft)
      setNotice((e.draft?.id ? 'A meta já existe, mas o salvamento não terminou. Tente salvar novamente para concluir sem duplicar. ' : 'Não foi possível salvar. ') + e.message)
    } finally { setBusy(false) }
  }
  function requestDelete(target) {
    if (busy || !currentStudent || target?.student_id !== student) return
    setDeleteError(''); setDeleteTarget(target)
  }
  async function deleteGoal() {
    const target = deleteTarget
    if (busy || !currentStudent || !target?.id || target.student_id !== student) return
    if (target.timer_started_at) {
      setDeleteError('Pause o cronômetro desta meta antes de excluí-la.')
      return
    }
    setBusy(true); setNotice(''); setDeleteError('')
    try {
      const r = await supabase.from('goals').delete().eq('id', target.id).eq('student_id', target.student_id).is('timer_started_at', null).select('id')
      if (r.error) throw r.error
      if (r.data?.length !== 1) throw Error('A meta não foi removida. Confira sua permissão e se o cronômetro está pausado.')
      setForm(current => current?.id === target.id ? null : current); setSelected(ids => ids.filter(id => id !== target.id)); await reload()
      setDeleteTarget(null)
      setNotice('Meta excluída de ' + studentName + '. Os registros de estudo foram preservados.')
    } catch (e) { setDeleteError('Não foi possível excluir a meta. ' + e.message) }
    finally { setBusy(false) }
  }
  async function importTemplate(template) {
    if (busy || !currentStudent || !picker.date) return
    setBusy(true)
    const draft = picker.draft?.id ? picker.draft : { ...fresh(student, picker.date), ...definitionFrom(template), importLegacyBlocks: true, goal_blocks: (template.blocks || []).map(b => ({ title: b.title, topic: b.topic, material_url: b.material_url })) }
    try {
      await saveAssignedGoal(draft, { onProgress: saved => setPicker(p => ({ ...p, draft: saved })) })
      setPicker(null); await reload(); setNotice('Meta importada para ' + studentName + '.')
    } catch (e) {
      setPicker(p => ({ ...p, draft: e.draft, error: e.message }))
    } finally { setBusy(false) }
  }
  function selectGoals(ids) {
    setSelected(ids)
    setBatchDate(ids.length === 1 ? goals.find(g => g.id === ids[0])?.due_date || '' : '')
  }
  async function saveDates(e) {
    e.preventDefault(); if (busy || !currentStudent || !selected.length) return
    setBusy(true); setNotice('')
    try {
      const r = await supabase.from('goals').update({ due_date: batchDate }).eq('student_id', student).in('id', selected).select('id')
      if (r.error) throw r.error
      if (r.data.length !== selected.length) throw Error('Nem todas as metas puderam ser reagendadas. Atualize a página e confira as datas antes de tentar novamente.')
      setSelected([]); setBatchDate(''); await reload()
      setNotice(r.data.length + (r.data.length === 1 ? ' meta reagendada.' : ' metas reagendadas.'))
    } catch (e) { setNotice('Não foi possível alterar a data. ' + e.message) }
    finally { setBusy(false) }
  }
  async function importPack() {
    if (busy || !currentStudent || !packId || all) return
    setBusy(true); setNotice('')
    try {
      const r = await supabase.rpc('import_goal_week_pack', { p_pack: packId, p_student: student, p_week: week.from })
      if (r.error) throw r.error
      setShowPack(false); await reload(); setNotice(r.data + ' metas importadas.')
    } catch (e) { setNotice(e.message) }
    finally { setBusy(false) }
  }

  return <>
    {deleteTarget && <DeleteGoalDialog goal={deleteTarget} studentName={studentName} busy={busy} error={deleteError} onCancel={() => { if (!busy) setDeleteTarget(null) }} onConfirm={deleteGoal}/>}
    <PageTitle title="Metas semanais" subtitle="Escolha o aluno para organizar as metas da semana."><div className="toolbar-actions"><Link className="btn" to="/mentor/catalogo">Catálogo de metas</Link><Link className="btn" to="/mentor/pacotes">Pacotes semanais</Link><Link className="btn" to="/edital">Edital</Link></div></PageTitle>
    {(error || notice) && <p className={'notice ' + (error ? 'error' : '')} role="status">{error || notice}</p>}
    <fieldset disabled={busy} className="toolbar">
      <label className="inline-field">Aluno<select className="field" aria-label="Aluno" value={student} onChange={e => changeFilter('aluno', e.target.value)}><option value="">Selecione um aluno</option>{mine.map(s => <option key={s.id} value={s.id}>{s.full_name || 'Aluno sem nome'}</option>)}</select></label>
      {currentStudent && <><WeekPicker offset={offset} onChange={n => { setOffset(n); changeFilter('periodo', '') }}/><label className="check-label"><input type="checkbox" checked={all} onChange={e => changeFilter('periodo', e.target.checked ? 'todos' : '')}/>Todo o histórico</label></>}
    </fieldset>
    {!currentStudent ? <p className="student-selection-hint">{loading ? 'Carregando alunos…' : student ? 'Selecione um aluno vinculado à sua mentoria.' : 'Selecione um aluno acima para visualizar e editar suas metas.'}</p> : <>
      <div className="editing-student"><Avatar name={studentName}/><div><small>Editando metas de</small><strong>{studentName}</strong><span>{all ? 'Todo o histórico' : format(week.start, 'dd/MM/yyyy') + ' a ' + format(week.end, 'dd/MM/yyyy')}</span></div></div>
      <DraftNotice draft={!form && draft} onResume={resume}/><div className="goals-workspace">
        <Card title={'Metas de ' + studentName} subtitle={filtered.length + ' metas no período'} action={<div className="toolbar-actions"><button className="btn primary" disabled={busy} onClick={openPicker}>＋ Adicionar meta</button><button className="btn" disabled={busy} onClick={() => setShowPack(!showPack)}>Importar pacote semanal</button></div>}>
          <fieldset disabled={busy} className="week-selection-toolbar">
            <label className="check-label"><input type="checkbox" disabled={!filtered.length} checked={!!filtered.length && filtered.every(g => selected.includes(g.id))} onChange={e => selectGoals(e.target.checked ? filtered.map(g => g.id) : [])}/>Selecionar todas</label>
            <select className="field" aria-label="Filtrar status" value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos os status</option><option value="Pendente">Pendentes</option><option value="Atrasada">Atrasadas</option><option value="Em andamento">Em andamento</option><option value="Concluída">Concluídas</option></select>
          </fieldset>
          {selected.length > 0 && <form onSubmit={saveDates} className="selected-goal-dates"><strong>{selected.length} {selected.length === 1 ? 'meta selecionada' : 'metas selecionadas'}</strong><label>Nova data<input type="date" className="field" required disabled={busy} value={batchDate} onChange={e => setBatchDate(e.target.value)}/></label><button disabled={busy} className="btn primary">Aplicar data</button><button type="button" disabled={busy} className="text-action" onClick={() => selectGoals([])}>Limpar seleção</button></form>}
          {showPack && <section className="inline-week-panel" aria-label="Importar pacote"><div className="card-heading"><h3>Importar pacote semanal</h3><button className="btn" disabled={busy} onClick={() => setShowPack(false)}>Fechar</button></div>
            {catalog.error ? <p className="notice">{catalog.error}</p> : catalog.loading ? <p>Carregando pacotes…</p> : <>
              <div className="toolbar"><select aria-label="Pacote semanal" className="field" value={packId} disabled={busy} onChange={e => setPackId(e.target.value)}><option value="">Escolha o pacote</option>{catalog.packs.map(p => <option key={p.id} value={p.id}>{p.name} · {p.items.length} metas</option>)}</select><Link className="text-action" to="/mentor/pacotes">Organizar pacotes</Link></div>
              <p className="muted">{studentName} · Semana de {format(week.start, 'dd/MM/yyyy')}. As metas existentes serão mantidas.</p>
              {packId && <div className="pack-preview">{['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((d,i) => <div key={d}><strong>{d}</strong>{catalog.packs.find(p => p.id === packId)?.items.filter(it => it.weekday === i).map((it,j) => <p key={j}>{catalog.templates.find(t => t.id === it.template_id)?.title || 'Meta indisponível'}</p>)}</div>)}</div>}
              <button className="btn primary" disabled={busy || !packId || all} onClick={importPack}>Importar pacote para esta semana</button>{all && <p>Desmarque “Todo o histórico” para escolher a semana.</p>}
            </>}
          </section>}
          {day && <button className="btn" disabled={busy} onClick={() => { setDay(''); setSelected([]); setPicker(null) }}>← Voltar à semana</button>}{loading ? <Empty>Carregando metas…</Empty> : calendarStarts.length ? calendarStarts.map(start => <section key={start}><h3 className="calendar-week-label">Semana de {format(new Date(start + 'T12:00:00'), 'dd/MM/yyyy')}</h3><WeeklyGoalCalendar start={new Date(start + 'T12:00:00')} goals={filtered} dayOnly={day} onDay={date => { setDay(date); setPicker(null); setSelected([]) }} onEdit={edit} onDelete={requestDelete} onAdd={openPicker} selected={selected} disabled={busy} onSelect={(id, checked) => selectGoals(checked ? [...selected,id] : selected.filter(x => x !== id))}/></section>) : <Empty>Nenhuma meta neste período.</Empty>}
          {picker && <WeekGoalPicker catalog={catalog} picker={picker} studentName={studentName} busy={busy} onDate={date => setPicker(p => ({ ...p, date, draft: null }))} onImport={importTemplate} onCreate={createGoal} onClose={() => setPicker(null)}/>}
        </Card>
        {form && <EditorDialog title={form.isNew ? 'Nova meta' : 'Editar meta'} subtitle={'Aluno: ' + studentName} busy={busy} onClose={closeEditor}>
          {notice && <p className="notice" role="status">{notice}</p>}{storageError && <p className="notice error">{storageError}</p>}
          <form onSubmit={save}><fieldset disabled={busy} className="editor-fields">
            <label>Dia da meta<input aria-label="Dia da meta" type="date" required className="field" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}/></label>
            <GoalDefinitionFields value={form} onChange={setForm} onBusyChange={setBusy}/>
            <div className="catalog-save-choice"><label className="check-label"><input type="checkbox" disabled={!catalogReady} checked={!!form.addToCatalog} onChange={e => setForm({ ...form, addToCatalog: e.target.checked })}/>Também incluir esta meta no catálogo</label><p className="muted small">Cria um modelo reutilizável, sem copiar o tempo nem os resultados do aluno.</p></div>
            <p className="muted small">Rascunho guardado nesta aba. Fechar o editor permite retomar depois.</p>
            <div className="editor-footer"><button type="button" className="btn" onClick={() => setForm(null)}>Descartar rascunho</button><button type="button" className="btn" onClick={closeEditor}>Continuar depois</button><button className="btn primary" type="submit">{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
          </fieldset></form>
        </EditorDialog>}
      </div>
    </>}
  </>
}
