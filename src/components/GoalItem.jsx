import { Link } from 'react-router-dom'
import { pillarOf } from '../lib/pillars'

export default function GoalItem({ goal, blockSummary, onQuickComplete, busy }) {
  const pillar = pillarOf(goal.pillar)
  const total = blockSummary?.total ?? 0
  const completedBlocks = blockSummary?.completed ?? 0
  const hasBlocks = total > 0

  const handleQuickComplete = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onQuickComplete(goal)
  }

  return (
    <Link
      to={`/metas/${goal.id}`}
      className={`relative flex items-center justify-between gap-4 rounded-md border border-paper-dark border-l-4 ${pillar.border} bg-white/60 px-4 py-3 hover:bg-white transition-colors`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[11px] px-2 py-0.5 rounded ${pillar.bg} ${pillar.text} font-medium`}>
            {pillar.glyph} {pillar.label}
          </span>
          {goal.category && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-paper-dark text-ink-muted">
              {goal.category}
            </span>
          )}
          {hasBlocks && (
            <span className="text-[11px] font-mono text-ink-muted">
              {completedBlocks}/{total} blocos
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-ink truncate mt-1">{goal.title}</p>
      </div>

      <button
        disabled={busy}
        onClick={handleQuickComplete}
        className="shrink-0 relative"
        aria-label={goal.completed ? 'Marcar como pendente' : 'Concluir meta'}
      >
        {goal.completed ? (
          <span className="carimbo inline-block border-2 border-selo-verde text-selo-verde font-mono text-[11px] font-semibold px-2 py-1 rounded -rotate-6 tracking-wide">
            CONCLUÍDO
          </span>
        ) : (
          <span className="inline-block border border-ink-muted text-ink-muted text-xs px-3 py-1.5 rounded hover:bg-ink hover:text-paper hover:border-ink transition-colors">
            Concluir
          </span>
        )}
      </button>
    </Link>
  )
}
