import { supabase } from '../supabaseClient'
import { resultsPayload } from '../components/GoalResultsFields'

// Preserve IDs after each successful write so a partial failure can be retried.
export async function saveAssignedGoal(draft, { questions = true, onProgress = () => {} } = {}) {
  let saved = { ...draft, goal_blocks: draft.goal_blocks.map(b => ({ ...b })) }
  try {
    if (!saved.student_id || !saved.title.trim()) throw Error('Escolha um aluno e preencha o título.')
    if (!saved.due_date) throw Error('Escolha o dia da meta.')
    if (saved.addToCatalog && (!saved.category.trim() || !saved.catalogTopic?.trim())) {
      throw Error('Preencha a matéria e o assunto para incluir a meta no catálogo.')
    }
    if (saved.goal_blocks.some(b => !b.title.trim())) throw Error('Preencha o nome de cada bloco.')
    if (saved.goal_blocks.some(b => b.material_url && !/^https?:\/\//i.test(b.material_url.trim()))) {
      throw Error('Use links de materiais começando com https:// ou http://.')
    }
    const measures = resultsPayload(saved)
    const payload = {
      student_id: saved.student_id, title: saved.title.trim(), category: saved.category.trim(),
      pillar: saved.pillar, due_date: saved.due_date, time_seconds: measures.time_seconds,
      ...(questions ? { questions_total: measures.questions_total, questions_correct: measures.questions_correct } : {}),
    }
    const result = saved.id
      ? await supabase.from('goals').update(payload).eq('id', saved.id).eq('student_id', saved.student_id).eq('time_seconds', saved.originalSeconds ?? 0).select().single()
      : await supabase.from('goals').insert(payload).select().single()
    if (result.error) throw Error(result.error.code === 'PGRST116'
      ? 'O tempo foi alterado em outra tela. Atualize a página e reabra a meta.' : result.error.message)
    saved = { ...saved, id: result.data.id, originalSeconds: result.data.time_seconds }
    onProgress(saved)
    for (let i = 0; i < saved.goal_blocks.length; i++) {
      const block = saved.goal_blocks[i]
      const fields = { title: block.title.trim(), topic: (block.topic || '').trim(), material_url: (block.material_url || '').trim(), position: i }
      const response = block.id
        ? await supabase.from('goal_blocks').update(fields).eq('id', block.id).eq('goal_id', saved.id).select().single()
        : await supabase.from('goal_blocks').insert({ ...fields, goal_id: saved.id }).select().single()
      if (response.error) throw response.error
      saved = { ...saved, goal_blocks: saved.goal_blocks.map((b, j) => i === j ? { ...b, id: response.data.id } : b) }
      onProgress(saved)
    }
    if (saved.addToCatalog) {
      saved = { ...saved, catalogModelId: saved.catalogModelId || crypto.randomUUID() }
      onProgress(saved)
      const response = await supabase.from('goal_templates').upsert({
        id: saved.catalogModelId, title: saved.title.trim(), category: saved.category.trim(),
        topic: saved.catalogTopic.trim(), pillar: saved.pillar,
        blocks: saved.goal_blocks.map(b => ({ title: b.title.trim(), topic: (b.topic || '').trim(), material_url: (b.material_url || '').trim() })),
      }).select().single()
      if (response.error) throw response.error
    }
    return saved
  } catch (error) {
    error.draft = saved
    throw error
  }
}
