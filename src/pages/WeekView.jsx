import { useEffect, useState, useCallback, useMemo } from 'react'
import { startOfWeek, addDays, addWeeks, format, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import DayGoalMiniCard from '../components/DayGoalMiniCard'
import { PILLAR_ORDER, pillarOf } from '../lib/pillars'

export default function WeekView() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [weekOffset, setWeekOffset] = useState(0)
  const [visiblePillars, setVisiblePillars] = useState(() => new Set(PILLAR_ORDER))

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const from = format(weekStart, 'yyyy-MM-dd')
    const to = format(addDays(weekStart, 6), 'yyyy-MM-dd')
    const { data, error } = await supabase
      .from('goals')
      .select('*')
      .eq('student_id', user.id)
      .gte('due_date', from)
      .lte('due_date', to)
      .order('created_at', { ascending: true })

    if (!error) setGoals(data ?? [])
    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, weekOffset])

  useEffect(() => {
    load()
  }, [load])

  const togglePillar = (key) => {
    setVisiblePillars((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const monthLabel = useMemo(
    () => format(addDays(weekStart, 3), "MMMM 'de' yyyy", { locale: ptBR }),
    [weekStart]
  )

  return (
    <div>
      <div className="flex items-start justify-between gap-4 flex-wrap mb-1">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-ink">Minha Semana</h1>
          <p className="text-sm text-ink-muted capitalize">{monthLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekOffset(0)}
            className="text-xs font-mono border border-paper-dark rounded px-3 py-1.5 hover:bg-paper-dark transition-colors"
          >
            Hoje
          </button>
          <button
            onClick={() => setWeekOffset((w) => w - 1)}
            aria-label="Semana anterior"
            className="border border-paper-dark rounded px-2.5 py-1.5 hover:bg-paper-dark transition-colors"
          >
            ‹
          </button>
          <button
            onClick={() => setWeekOffset((w) => w + 1)}
            aria-label="Próxima semana"
            className="border border-paper-dark rounded px-2.5 py-1.5 hover:bg-paper-dark transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap mt-4 mb-6">
        <span className="text-[11px] font-mono text-ink-muted tracking-wide mr-1">
          CATEGORIAS:
        </span>
        {PILLAR_ORDER.map((key) => {
          const pillar = pillarOf(key)
          const active = visiblePillars.has(key)
          return (
            <button
              key={key}
              onClick={() => togglePillar(key)}
              className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors flex items-center gap-1 ${
                active
                  ? `${pillar.bg} ${pillar.text} border-transparent`
                  : 'bg-transparent text-ink-muted border-paper-dark'
              }`}
            >
              <span aria-hidden>{pillar.glyph}</span>
              {pillar.label}
            </button>
          )
        })}
      </div>

      {loading ? (
        <p className="text-sm text-ink-muted font-mono">Carregando cronograma...</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          {days.map((day) => {
            const dayGoals = goals.filter((g) =>
              isSameDay(new Date(`${g.due_date}T00:00:00`), day)
            )
            const visibleGoals = dayGoals.filter((g) => visiblePillars.has(g.pillar))
            const concluidas = dayGoals.filter((g) => g.completed).length
            const today = isSameDay(day, new Date())

            return (
              <div
                key={day.toISOString()}
                className={`rounded-md border bg-white/40 p-3 flex flex-col gap-2 ${
                  today ? 'border-ink' : 'border-paper-dark'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-serif text-lg font-semibold text-ink">
                      {format(day, 'dd')}
                    </span>
                    <span className="text-[11px] text-ink-muted uppercase ml-1">
                      {format(day, 'EEE', { locale: ptBR })}
                    </span>
                  </div>
                  {today && (
                    <span className="text-[10px] bg-ink text-paper px-1.5 py-0.5 rounded font-mono">
                      HOJE
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-mono text-ink-muted">
                  {concluidas}/{dayGoals.length} concluídas
                </p>

                <div className="space-y-1.5 min-h-8">
                  {visibleGoals.length === 0 ? (
                    <p className="text-[11px] text-ink-muted">
                      {dayGoals.length === 0 ? 'Sem metas lançadas.' : 'Nada nesse filtro.'}
                    </p>
                  ) : (
                    visibleGoals.map((goal) => <DayGoalMiniCard key={goal.id} goal={goal} />)
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
