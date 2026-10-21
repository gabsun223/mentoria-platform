import { useEffect, useRef } from 'react'

export default function DeleteGoalDialog({ goal, studentName, busy, error, onCancel, onConfirm }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    ref.current.showModal()
    return () => { if (previous?.isConnected) previous.focus() }
  }, [])
  return <dialog ref={ref} className="week-goal-picker delete-goal-dialog" aria-labelledby="delete-goal-title" aria-describedby="delete-goal-description" onCancel={e => { e.preventDefault(); if (!busy) onCancel() }}>
    <div className="card-heading"><h2 id="delete-goal-title">Excluir meta?</h2><button type="button" className="btn" aria-label="Fechar confirmação" disabled={busy} onClick={onCancel}>×</button></div>
    <p>Aluno: <strong>{studentName}</strong></p>
    <div className="delete-goal-summary"><small>{goal.category}</small><strong>{goal.topic || goal.title}</strong></div>
    <p id="delete-goal-description">A meta será removida do calendário do aluno. O histórico de estudos e a meta do catálogo serão preservados. Esta exclusão não pode ser desfeita.</p>
    {error && <p className="notice error" role="alert">{error}</p>}
    <div className="editor-footer"><button autoFocus type="button" className="btn" disabled={busy} onClick={onCancel}>Cancelar</button><button type="button" className="btn danger" disabled={busy} onClick={onConfirm}>{busy ? 'Excluindo…' : 'Sim, excluir meta'}</button></div>
  </dialog>
}
