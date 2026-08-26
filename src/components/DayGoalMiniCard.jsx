import { Link } from 'react-router-dom'
import { pillarOf } from '../lib/pillars'

export default function DayGoalMiniCard({ goal }) {
  const pillar = pillarOf(goal.pillar)

  return (
    <Link
      to={`/metas/${goal.id}`}
      className={`block rounded-md border border-paper-dark border-l-4 ${pillar.border} bg-white/60 hover:bg-white transition-colors px-2.5 py-2`}
    >
      <p className={`text-[10px] font-medium ${pillar.text} flex items-center gap-1`}>
        <span aria-hidden>{pillar.glyph}</span>
        {pillar.label}
      </p>
      <p className="text-xs font-medium text-ink truncate mt-0.5">{goal.title}</p>
      {goal.category && (
        <p className="text-[10px] text-ink-muted truncate">{goal.category}</p>
      )}
      {goal.completed && (
        <p className="text-[10px] font-mono text-selo-verde mt-0.5">✓ concluído</p>
      )}
    </Link>
  )
}
