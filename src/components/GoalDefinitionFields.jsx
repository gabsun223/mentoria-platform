import { useState } from 'react'
import { Link } from 'react-router-dom'
import useSyllabus from '../lib/useSyllabus'
import { PILLAR_ORDER, pillarOf } from '../lib/pillars'
import { syllabusTree } from '../lib/syllabusTree'
import GoalAttachments from './GoalAttachments'

export default function GoalDefinitionFields({ value, onChange, subjects = [], onBusyChange }) {
  const {topics,error,loading}=useSyllabus()
  const [search, setSearch] = useState('')
  const normalize = text => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  const selectedTopic=topics.find(t=>t.id===value.syllabus_topic_id)
  const subject=selectedTopic?.subject || value.category
  const options=syllabusTree(topics.filter(t=>t.subject===subject))
  const update = (key, next) => onChange({ ...value, [key]: next })
  return <div className="definition-fields">
    <div className="form-section-heading"><h3>Conteúdo da meta</h3><p>Escolha no edital o que o aluno vai estudar.</p></div>
    {error && <p className="notice error">{error}</p>}
    <label>Matéria<select required aria-label="Matéria" className="field" disabled={loading} value={subject} onChange={e=>onChange({...value,category:e.target.value,topic:'',syllabus_topic_id:''})}><option value="">Selecione no edital</option>{[...new Set([...topics.map(t=>t.subject), ...(subject ? [subject] : [])])].map(s=><option key={s}>{s}</option>)}</select></label>
    <label>Filtrar assuntos<input className="field" type="search" placeholder="Digite parte do nome do assunto…" value={search} onChange={e => setSearch(e.target.value)}/></label>
    <label>Assunto<select required aria-label="Assunto" className="field" disabled={loading} value={value.syllabus_topic_id || ''} onChange={e=>{const t=topics.find(t=>t.id===e.target.value);onChange({...value,syllabus_topic_id:t?.id||'',category:t?.subject||subject,topic:t?.topic||''})}}><option value="">Selecione o assunto</option>{value.syllabus_topic_id && !selectedTopic && <option value={value.syllabus_topic_id}>{value.topic} (assunto vinculado anteriormente)</option>}{options.filter(t => t.id === value.syllabus_topic_id || normalize(t.label).includes(normalize(search))).map(t=><option value={t.id} key={t.id}>{'— '.repeat(t.depth)}{t.label}</option>)}</select></label>
    <p className="syllabus-note">Matérias e assuntos vêm do <Link className="text-action" to="/edital">Edital</Link>.</p>    <label>Categoria<select aria-label="Categoria" className="field" value={value.activity_type} onChange={e => update('activity_type', e.target.value)}>{PILLAR_ORDER.map(key => <option key={key} value={key}>{pillarOf(key).label}</option>)}</select></label>
    <div className="form-section-heading"><h3>Orientações e materiais</h3><p>Os links e anexos são opcionais.</p></div>
    <label>Link de legislação<input className="field" type="url" placeholder="https://" value={value.legislation_url || ''} onChange={e=>update('legislation_url',e.target.value)}/></label>
    <label>Link de questões<input className="field" type="url" placeholder="https://" value={value.questions_url || ''} onChange={e=>update('questions_url',e.target.value)}/></label>    <label>Observações do professor<textarea aria-label="Observações do professor" className="field" rows={4} value={value.teacher_notes || ''} onChange={e => update('teacher_notes', e.target.value)}/></label>
    <label>Prioridade<select aria-label="Prioridade" className="field" value={value.priority || 'media'} onChange={e => update('priority', e.target.value)}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label>
    {value.activity_type === 'questoes' && <label>Quantidade prevista de questões<input className="field" type="number" min="1" step="1" value={value.questions_target ?? ''} onChange={e => update('questions_target', e.target.value)}/></label>}
    {value.material_url && <label>Link de material existente<input type="url" className="field" value={value.material_url} onChange={e => update('material_url', e.target.value)}/></label>}
    <GoalAttachments files={value.attachments || []} onChange={files => update('attachments', files)} onBusyChange={onBusyChange}/>
    {(value.goal_blocks || value.blocks || []).length > 0 && <div className="legacy-materials"><div className="form-section-heading"><h3>Materiais complementares existentes</h3><p>Edite as orientações antigas sem alterar o progresso do aluno.</p></div>{(value.goal_blocks || value.blocks).map((block, index) => <div className="block-editor" key={block.id || index}>
      <label>Nome do material<input className="field" value={block.title || ''} onChange={e => update(value.goal_blocks ? 'goal_blocks' : 'blocks', (value.goal_blocks || value.blocks).map((b, i) => i === index ? { ...b, title: e.target.value } : b))}/></label>
      <label>Orientações<textarea className="field" value={block.topic || ''} onChange={e => update(value.goal_blocks ? 'goal_blocks' : 'blocks', (value.goal_blocks || value.blocks).map((b, i) => i === index ? { ...b, topic: e.target.value } : b))}/></label>
      <label>Link do material<input className="field" type="url" value={block.material_url || ''} onChange={e => update(value.goal_blocks ? 'goal_blocks' : 'blocks', (value.goal_blocks || value.blocks).map((b, i) => i === index ? { ...b, material_url: e.target.value } : b))}/></label>
    </div>)}</div>}
  </div>
}
