import { activityKey, storagePillar } from './pillars'

export function definitionFrom(record) {
  const blocks = record.goal_blocks || record.blocks || []
  return {
    category: record.category || '', topic: record.topic || record.title || '',
    activity_type: activityKey(record),
    syllabus_topic_id: record.syllabus_topic_id || '', legislation_url:record.legislation_url || '', questions_url:record.questions_url || '',
    teacher_notes: record.teacher_notes || '',
    priority: record.priority || 'media', questions_target: record.questions_target ?? '', attachments: record.attachments || [],
    material_url: record.material_url ?? blocks.find(b => b.material_url)?.material_url ?? '',
  }
}

export function definitionPayload(form) {
  const category = form.category.trim(), topic = form.topic.trim(), material_url = (form.material_url || '').trim()
  if (!category || !topic) throw Error('Preencha a matéria e o assunto.')
  const legislation_url=(form.legislation_url || '').trim(), questions_url=(form.questions_url || '').trim()
  if (!form.syllabus_topic_id) throw Error('Selecione a matéria e o assunto do edital.')
  for (const material_url of [legislation_url,questions_url].filter(Boolean)) {
    let url
    try { url = new URL(material_url) } catch { throw Error('Informe um link válido para o material.') }
    if (!['https:', 'http:'].includes(url.protocol)) throw Error('Use um link começando com https:// ou http://.')
  }
  const activity_type = activityKey(form)
  const questions_target = activity_type === 'questoes' && form.questions_target !== '' && form.questions_target != null ? Number(form.questions_target) : null
  if (questions_target != null && (!Number.isSafeInteger(questions_target) || questions_target < 1)) throw Error('Informe uma quantidade inteira positiva de questões.')
  // title/pillar remain compatibility fields for older records and consumers.
  return { syllabus_topic_id:form.syllabus_topic_id, legislation_url, questions_url, category, topic, title: topic, activity_type, pillar: storagePillar(activity_type), material_url, teacher_notes: (form.teacher_notes || '').trim(), priority: form.priority || 'media', questions_target, attachments: form.attachments || [] }
}
