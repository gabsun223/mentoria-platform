import { activityKey, storagePillar } from './pillars'

export function definitionFrom(record) {
  const blocks = record.goal_blocks || record.blocks || []
  return {
    category: record.category || '', topic: record.topic || record.title || '',
    activity_type: activityKey(record),
    teacher_notes: record.teacher_notes || '',
    material_url: record.material_url ?? blocks.find(b => b.material_url)?.material_url ?? '',
  }
}

export function definitionPayload(form) {
  const category = form.category.trim(), topic = form.topic.trim(), material_url = (form.material_url || '').trim()
  if (!category || !topic) throw Error('Preencha a matéria e o assunto.')
  if (material_url) {
    let url
    try { url = new URL(material_url) } catch { throw Error('Informe um link válido para o material.') }
    if (!['https:', 'http:'].includes(url.protocol)) throw Error('Use um link começando com https:// ou http://.')
  }
  const activity_type = activityKey(form)
  // title/pillar remain compatibility fields for older records and consumers.
  return { category, topic, title: topic, activity_type, pillar: storagePillar(activity_type), material_url, teacher_notes: (form.teacher_notes || '').trim() }
}
