import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

// Mounted inside the weekly panel; the dialog leaves the page's scroll position intact.
export default function WeekGoalPicker({ catalog, picker, studentName, busy, onDate, onImport, onCreate, onClose }) {
  const ref = useRef(null)
  const [query, setQuery] = useState(''), [subject, setSubject] = useState('')
  useEffect(() => { ref.current.showModal() }, [])
  const rows = catalog.templates.filter(t => (!subject || t.category === subject) && normalize(`${t.category} ${t.title} ${t.topic}`).includes(normalize(query)))
  return <dialog ref={ref} className="week-goal-picker" aria-labelledby="week-picker-title" onCancel={e => { e.preventDefault(); if (!busy) onClose() }}>
    <div className="card-heading"><div><h2 id="week-picker-title">Adicionar meta</h2><p>Aluno: <strong>{studentName}</strong></p></div><button className="btn" disabled={busy} onClick={onClose}>Fechar</button></div>
    <fieldset disabled={busy} className="editor-fields">
      <label>Dia da meta<input required className="field" type="date" value={picker.date} disabled={!!picker.draft?.id} onChange={e => onDate(e.target.value)}/></label>
      {picker.error && <p role="alert" className="notice error">{picker.error}</p>}
      {picker.draft?.id ? <><p>Parte da meta já foi salva. Conclua a importação para incluir todos os blocos.</p><button className="btn primary" onClick={() => onImport(null)}>Tentar concluir importação</button></> : <>
        <div className="field-grid"><label>Buscar no catálogo<input autoFocus className="field" placeholder="Título, assunto ou matéria" value={query} onChange={e => setQuery(e.target.value)}/></label>
          <label>Filtrar matéria<select className="field" value={subject} onChange={e => setSubject(e.target.value)}><option value="">Todas as matérias</option>{[...new Set(catalog.templates.map(t => t.category))].map(c => <option key={c}>{c}</option>)}</select></label></div>
        {catalog.error ? <p className="notice error">{catalog.error}</p> : catalog.loading ? <p>Carregando catálogo…</p> : <div className="picker-results">
          {rows.map(t => <article className="catalog-row" key={t.id}><div><span className="subject-tag">{t.category}</span><strong>{t.title}</strong><p>{t.topic}</p></div><button disabled={!picker.date} className="btn primary" aria-label={'Importar '+t.title} onClick={() => onImport(t)}>Importar</button></article>)}
          {!rows.length && <p className="empty-state">Nenhuma meta encontrada neste filtro.</p>}
        </div>}
        <div className="picker-create"><div><strong>Precisa de uma meta diferente?</strong><p>Crie uma meta para este aluno e escolha se deseja guardá-la no catálogo.</p></div><button className="btn" disabled={!picker.date} onClick={onCreate}>＋ Criar outra meta</button></div>
        <Link className="text-action" to="/mentor/catalogo">Organizar catálogo →</Link>
      </>}
    </fieldset>
  </dialog>
}
