import { useState } from 'react'
import { supabase } from '../supabaseClient'

const emptyTarget = () => ({ subject: '', hours: '' })

function normalizeSubject(value) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
}

export default function StudyPlanForm({ studentId, onCreated, onCancel }) {
  const [name, setName] = useState('')
  const [targetRows, setTargetRows] = useState([emptyTarget()])
  const [saving, setSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const updateTarget = (index, field, value) => {
    setTargetRows((previous) =>
      previous.map((target, current) =>
        current === index ? { ...target, [field]: value } : target
      )
    )
  }

  const removeTarget = (index) => {
    setTargetRows((previous) =>
      previous.length > 1 ? previous.filter((_, current) => current !== index) : previous
    )
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    const cleanTargets = targetRows
      .map((target) => ({
        subject: target.subject.trim().replace(/\s+/g, ' '),
        target_seconds: Math.round(Number(target.hours) * 3600),
      }))
      .filter((target) => target.subject && target.target_seconds > 0)

    if (!name.trim() || !cleanTargets.length) {
      setErrorMessage('Informe o nome e ao menos uma matéria com horas.')
      return
    }

    const uniqueSubjects = new Set(cleanTargets.map((target) => normalizeSubject(target.subject)))
    if (uniqueSubjects.size !== cleanTargets.length) {
      setErrorMessage('Não repita a mesma matéria dentro do plano.')
      return
    }

    setSaving(true)
    const { error } = await supabase.rpc('create_study_plan', {
      p_name: name.trim(),
      p_targets: cleanTargets,
      p_student_id: studentId,
    })
    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    onCreated?.()
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white/60 border border-paper-dark rounded-md p-5 space-y-4"
    >
      <div>
        <label className="text-xs text-ink-muted">Nome do plano</label>
        <input
          required
          maxLength={120}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Ex.: PGM Manaus"
          className="mt-1 w-full rounded border border-paper-dark bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <div>
          <p className="font-mono text-[11px] text-ink-muted tracking-wide">
            META TOTAL DE TEMPO POR MATÉRIA
          </p>
          <p className="text-[11px] text-ink-muted mt-0.5">
            As horas acumulam desde o início até a conclusão do plano.
          </p>
        </div>
        {targetRows.map((target, index) => (
          <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_7rem_auto] gap-2">
            <input
              required
              maxLength={120}
              value={target.subject}
              onChange={(event) => updateTarget(index, 'subject', event.target.value)}
              placeholder="Direito Constitucional"
              className="rounded border border-paper-dark bg-white px-3 py-2 text-sm"
            />
            <input
              required
              type="number"
              min="0.25"
              max="1000"
              step="0.25"
              value={target.hours}
              onChange={(event) => updateTarget(index, 'hours', event.target.value)}
              placeholder="Horas"
              className="rounded border border-paper-dark bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              disabled={targetRows.length === 1}
              onClick={() => removeTarget(index)}
              className="px-2 text-ink-muted hover:text-selo-vermelho disabled:opacity-30"
              aria-label="Remover matéria"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setTargetRows((previous) => [...previous, emptyTarget()])}
          className="text-xs font-medium text-ink-muted hover:text-ink"
        >
          + Adicionar matéria
        </button>
      </div>

      {errorMessage && <p className="text-xs text-selo-vermelho">{errorMessage}</p>}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="bg-ink text-paper text-sm font-medium py-2 px-4 rounded hover:bg-ink-light transition-colors disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Criar plano'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-ink-muted hover:text-ink"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}
