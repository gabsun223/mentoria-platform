import { supabase } from '../supabaseClient'
import { definitionPayload } from './goalDefinition'

// Definition edits never send the student's time, results or completion state.
export async function saveAssignedGoal(draft, { onProgress = () => {} } = {}) {
  let saved = { ...draft, goal_blocks: (draft.goal_blocks || []).map(b => ({ ...b })) }
  try {
    if (!saved.student_id || !saved.due_date) throw Error('Escolha um aluno e o dia da meta.')
    const definition = definitionPayload(saved)
    const payload = { ...definition, student_id: saved.student_id, due_date: saved.due_date }
    const result = saved.id
      ? await supabase.from('goals').update(payload).eq('id', saved.id).eq('student_id', saved.student_id).select().single()
      : await supabase.from('goals').insert(payload).select().single()
    if (result.error) throw result.error
    saved = { ...saved, id: result.data.id }
    onProgress(saved)
    // Only legacy templates may still carry additional material/notes.
    if (saved.importLegacyBlocks) for (let i = 0; i < saved.goal_blocks.length; i++) {
      const block = saved.goal_blocks[i]
      if (block.id) continue
      const response = await supabase.from('goal_blocks').insert({ goal_id: saved.id, title: block.title || 'Material complementar', topic: block.topic || '', material_url: block.material_url || '', position: i }).select().single()
      if (response.error) throw response.error
      saved = { ...saved, goal_blocks: saved.goal_blocks.map((b, j) => i === j ? { ...b, id: response.data.id } : b) }
      onProgress(saved)
    }
    if (saved.addToCatalog) {
      saved = { ...saved, catalogModelId: saved.catalogModelId || crypto.randomUUID() }
      onProgress(saved)
      const response = await supabase.from('goal_templates').upsert({ id: saved.catalogModelId, ...definition, blocks: [] }).select().single()
      if (response.error) throw response.error
    }
    return saved
  } catch (error) {
    error.draft = saved
    throw error
  }
}
