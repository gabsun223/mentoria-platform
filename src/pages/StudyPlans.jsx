import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

const emptyTarget = () => ({ subject: '', hours: '' })

function normalizeSubject(value) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
}

function formatDuration(totalSeconds) {
  const minutes = Math.round((totalSeconds ?? 0) / 60)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest}min`
  if (!rest) return `${hours}h`
  return `${hours}h ${rest}min`
}

export default function StudyPlans() {
  const { user } = useAuth()
  const [plans, setPlans] = useState([])
  const [targets, setTargets] = useState([])
  const [goals, setGoals] = useState([])
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [targetRows, setTargetRows] = useState([emptyTarget()])
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const [plansResult, targetsResult, goalsResult] = await Promise.all([
      supabase
        .from('study_plans')
        .select('*')
        .eq('student_id', user.id)
        .order('created_at', { ascending: true }),
      supabase.from('study_plan_targets').select('*').order('position', { ascending: true }),
      supabase
        .from('goals')
        .select('id, plan_id, category, time_seconds')
        .eq('student_id', user.id)
        .not('plan_id', 'is', null),
    ])

    const firstError = plansResult.error ?? targetsResult.error ?? goalsResult.error
    if (firstError) {
      setMessage({ type: 'error', text: firstError.message })
      setLoading(false)
      return
    }

    const nextPlans = plansResult.data ?? []
    setPlans(nextPlans)
    setTargets(targetsResult.data ?? [])
    setGoals(goalsResult.data ?? [])
    setSelectedIds((previous) => {
      const available = new Set(nextPlans.map((plan) => plan.id))
      const preserved = new Set([...previous].filter((id) => available.has(id)))
      return preserved.size ? preserved : available
    })
    setLoading(false)
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const togglePlan = (planId) => {
    setSelectedIds((previous) => {
      const next = new Set(previous)
      if (next.has(planId)) next.delete(planId)
      else next.add(planId)
      return next
    })
  }

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

  const handleCreate = async (event) => {
    event.preventDefault()
    setMessage(null)
    const cleanTargets = targetRows
      .map((target) => ({
        subject: target.subject.trim().replace(/\s+/g, ' '),
        target_seconds: Math.round(Number(target.hours) * 3600),
      }))
      .filter((target) => target.subject && target.target_seconds > 0)

    if (!name.trim() || !cleanTargets.length) {
      setMessage({ type: 'error', text: 'Informe o nome e ao menos uma matéria com horas.' })
      return
    }

    const uniqueSubjects = new Set(cleanTargets.map((target) => normalizeSubject(target.subject)))
    if (uniqueSubjects.size !== cleanTargets.length) {
      setMessage({ type: 'error', text: 'Não repita a mesma matéria dentro do plano.' })
      return
    }

    setSaving(true)
    const { error } = await supabase.rpc('create_study_plan', {
      p_name: name.trim(),
      p_targets: cleanTargets,
    })
    setSaving(false)

    if (error) {
      setMessage({ type: 'error', text: error.message })
      return
    }

    setName('')
    setTargetRows([emptyTarget()])
    setShowForm(false)
    setMessage({ type: 'success', text: 'Plano criado com sucesso.' })
    load()
  }

  const handleDelete = async (plan) => {
    const confirmed = window.confirm(
      `Excluir o plano “${plan.name}”? As metas continuarão existindo, mas ficarão sem plano.`
    )
    if (!confirmed) return
    const { error } = await supabase.from('study_plans').delete().eq('id', plan.id)
    if (error) setMessage({ type: 'error', text: error.message })
    else {
      setMessage({ type: 'success', text: 'Plano excluído.' })
      load()
    }
  }

  const summary = useMemo(() => {
    const rows = new Map()
    const selectedTargets = targets.filter((target) => selectedIds.has(target.plan_id))
    const selectedGoals = goals.filter((goal) => selectedIds.has(goal.plan_id) && goal.category)

    for (const target of selectedTargets) {
      const key = normalizeSubject(target.subject)
      const current = rows.get(key) ?? { subject: target.subject, target: 0, actual: 0 }
      current.target += target.target_seconds
      rows.set(key, current)
    }

    for (const goal of selectedGoals) {
      const key = normalizeSubject(goal.category)
      const current = rows.get(key) ?? { subject: goal.category, target: 0, actual: 0 }
      current.actual += goal.time_seconds ?? 0
      rows.set(key, current)
    }

    return [...rows.values()].sort((a, b) => a.subject.localeCompare(b.subject, 'pt-BR'))
  }, [goals, selectedIds, targets])

  const selectedPlans = plans.filter((plan) => selectedIds.has(plan.id))
  const combined = selectedPlans.length > 1

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="font-mono text-[11px] text-ink-muted tracking-wide">CONTROLE DE ESTUDOS</p>
          <h1 className="font-serif text-3xl font-semibold text-ink">Planos de Estudo</h1>
          <p className="text-sm text-ink-muted mt-1">
            Compare planos paralelos e acompanhe o tempo real por matéria.
          </p>
        </div>
        <button
          onClick={() => setShowForm((visible) => !visible)}
          className="bg-ink text-paper text-sm font-medium py-2 px-4 rounded hover:bg-ink-light transition-colors"
        >
          {showForm ? 'Cancelar' : '+ Novo plano'}
        </button>
      </div>

      {message && (
        <p
          className={`mb-4 rounded border px-3 py-2 text-sm ${
            message.type === 'error'
              ? 'border-selo-vermelho/30 bg-selo-vermelho-bg text-selo-vermelho'
              : 'border-selo-verde/30 bg-selo-verde-bg text-selo-verde'
          }`}
        >
          {message.text}
        </p>
      )}

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 bg-white/60 border border-paper-dark rounded-md p-5 space-y-4"
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
            <p className="font-mono text-[11px] text-ink-muted tracking-wide">
              METAS DE TEMPO POR MATÉRIA
            </p>
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

          <button
            type="submit"
            disabled={saving}
            className="bg-ink text-paper text-sm font-medium py-2 px-4 rounded hover:bg-ink-light transition-colors disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Criar plano'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-ink-muted font-mono">Carregando planos...</p>
      ) : plans.length === 0 ? (
        <div className="border border-dashed border-paper-dark rounded-md p-10 text-center">
          <p className="text-sm text-ink">Você ainda não possui planos de estudo.</p>
          <p className="text-xs text-ink-muted mt-1">
            Crie o primeiro plano e defina a meta de horas de cada matéria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-6">
          <aside className="space-y-2">
            <p className="font-mono text-[11px] text-ink-muted tracking-wide mb-2">
              SELECIONE UM OU MAIS PLANOS
            </p>
            {plans.map((plan) => {
              const planTargets = targets.filter((target) => target.plan_id === plan.id)
              const total = planTargets.reduce((sum, target) => sum + target.target_seconds, 0)
              return (
                <div
                  key={plan.id}
                  className={`rounded-md border p-3 ${
                    selectedIds.has(plan.id)
                      ? 'border-ink bg-white/70'
                      : 'border-paper-dark bg-white/30'
                  }`}
                >
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(plan.id)}
                      onChange={() => togglePlan(plan.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-ink block truncate">{plan.name}</span>
                      <span className="text-[11px] font-mono text-ink-muted">
                        {planTargets.length} matérias · {formatDuration(total)}
                      </span>
                    </span>
                  </label>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="mt-2 ml-6 text-[11px] text-ink-muted hover:text-selo-vermelho"
                  >
                    Excluir
                  </button>
                </div>
              )
            })}
          </aside>

          <section>
            <div className="mb-3">
              <p className="font-mono text-[11px] text-ink-muted tracking-wide">
                {combined ? 'VISÃO COMBINADA' : 'VISÃO DO PLANO'}
              </p>
              <h2 className="font-serif text-2xl font-semibold text-ink">
                {selectedPlans.length
                  ? selectedPlans.map((plan) => plan.name).join(' + ')
                  : 'Nenhum plano selecionado'}
              </h2>
            </div>

            {!selectedPlans.length ? (
              <div className="border border-dashed border-paper-dark rounded-md p-8 text-center text-sm text-ink-muted">
                Selecione ao menos um plano para visualizar o progresso.
              </div>
            ) : summary.length === 0 ? (
              <div className="border border-dashed border-paper-dark rounded-md p-8 text-center text-sm text-ink-muted">
                Este plano ainda não possui matérias ou tempo registrado.
              </div>
            ) : (
              <div className="border border-paper-dark rounded-md overflow-hidden divide-y divide-paper-dark">
                {summary.map((row) => {
                  const percentage = row.target ? Math.round((row.actual / row.target) * 100) : 0
                  return (
                    <div key={normalizeSubject(row.subject)} className="bg-white/50 px-4 py-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <span className="text-sm font-medium text-ink">{row.subject}</span>
                        <span className="text-xs font-mono text-ink-muted">
                          {formatDuration(row.actual)} /{' '}
                          {row.target ? formatDuration(row.target) : 'sem meta'}
                        </span>
                      </div>
                      <div className="h-2 bg-paper-dark rounded-full overflow-hidden">
                        <div
                          className="h-full bg-selo-verde transition-all"
                          style={{ width: `${Math.min(100, percentage)}%` }}
                        />
                      </div>
                      <p className="mt-1 text-[10px] font-mono text-ink-muted text-right">
                        {row.target ? `${percentage}%` : 'tempo sem meta definida'}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
