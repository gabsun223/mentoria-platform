import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import GoalItem from '../components/GoalItem'
import { fetchBlockSummaries, quickCompleteGoal } from '../lib/goalActions'

function todayISO() {
  return format(new Date(), 'yyyy-MM-dd')
}

export default function Dashboard() {
  const { user, profile } = useAuth()
  const [goals, setGoals] = useState([])
  const [blockSummaries, setBlockSummaries] = useState({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState(null)

  const loadGoals = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('student_id', user.id)
      .eq('due_date', todayISO())
      .order('created_at', { ascending: true })

    if (!error) {
      const list = data ?? []
      setGoals(list)
      setBlockSummaries(await fetchBlockSummaries(list.map((g) => g.id)))
    }
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadGoals()
  }, [loadGoals])

  const toggleGoal = async (goal) => {
    setBusyId(goal.id)
    const error = await quickCompleteGoal(goal)
    if (!error) {
      setGoals((prev) =>
        prev.map((g) => (g.id === goal.id ? { ...g, completed: !g.completed } : g))
      )
      if (!goal.completed) {
        setBlockSummaries((prev) => {
          const s = prev[goal.id]
          if (!s) return prev
          return { ...prev, [goal.id]: { ...s, completed: s.total } }
        })
      }
    }
    setBusyId(null)
  }

  const concluidas = goals.filter((g) => g.completed).length
  const pct = goals.length ? Math.round((concluidas / goals.length) * 100) : 0

  return (
    <div className="max-w-3xl">
      <p className="font-mono text-[11px] text-ink-muted tracking-wide">
        {new Date().toLocaleDateString('pt-BR', {
          weekday: 'long',
          day: '2-digit',
          month: 'long',
        })}
      </p>
      <h1 className="font-serif text-3xl font-semibold text-ink mt-1">
        Bom estudo, {profile?.full_name?.split(' ')[0]}.
      </h1>

      <div className="mt-6 mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 bg-paper-dark rounded-full overflow-hidden">
          <div
            className="h-full bg-selo-verde transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="font-mono text-xs text-ink-muted">{pct}%</span>
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted font-mono">Carregando metas...</p>
      ) : goals.length === 0 ? (
        <div className="border border-dashed border-paper-dark rounded-md p-8 text-center text-ink-muted">
          <p className="text-sm">Nenhuma meta cadastrada para hoje.</p>
          <p className="text-xs mt-1 font-mono">
            Peça ao seu mentor para lançar as metas do dia.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {goals.map((goal) => (
            <GoalItem
              key={goal.id}
              goal={goal}
              blockSummary={blockSummaries[goal.id]}
              busy={busyId === goal.id}
              onQuickComplete={toggleGoal}
            />
          ))}
        </div>
      )}
    </div>
  )
}
