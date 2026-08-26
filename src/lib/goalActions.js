import { supabase } from '../supabaseClient'

// Mapa goalId -> { total, completed } de blocos de estudo.
export async function fetchBlockSummaries(goalIds) {
  const summary = {}
  if (!goalIds.length) return summary

  const { data, error } = await supabase
    .from('goal_blocks')
    .select('goal_id, completed')
    .in('goal_id', goalIds)

  if (error || !data) return summary

  for (const block of data) {
    const s = summary[block.goal_id] ?? { total: 0, completed: 0 }
    s.total += 1
    if (block.completed) s.completed += 1
    summary[block.goal_id] = s
  }
  return summary
}

// Atalho de conclusão a partir de uma lista (Metas de Hoje / Minha Semana):
// concluir marca também todos os blocos da meta; desmarcar só desmarca a meta.
export async function quickCompleteGoal(goal) {
  const nextCompleted = !goal.completed

  if (nextCompleted) {
    await supabase.from('goal_blocks').update({ completed: true }).eq('goal_id', goal.id)
  }

  const { error } = await supabase
    .from('goals')
    .update({ completed: nextCompleted })
    .eq('id', goal.id)

  return error
}
