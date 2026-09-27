import { useId } from 'react'
import { PILLAR_ORDER, pillarOf } from '../lib/pillars'
import GoalAttachments from './GoalAttachments'

export default function GoalDefinitionFields({ value, onChange, subjects = [], onBusyChange }) {
  const listId = useId()
  const update = (key, next) => onChange({ ...value, [key]: next })
  return <>
    <label>Matéria<input required className="field" list={listId} value={value.category} onChange={e => update('category', e.target.value)}/></label>
    <datalist id={listId}>{subjects.map(subject => <option key={subject} value={subject}/>)}</datalist>
    <label>Assunto<input required className="field" value={value.topic} onChange={e => update('topic', e.target.value)}/></label>
    <label>Categoria<select aria-label="Categoria" className="field" value={value.activity_type} onChange={e => update('activity_type', e.target.value)}>{PILLAR_ORDER.map(key => <option key={key} value={key}>{pillarOf(key).label}</option>)}</select></label>
    <label>Link do Material<input className="field" type="url" placeholder="https://" value={value.material_url} onChange={e => update('material_url', e.target.value)}/></label>
    <label>Observações do professor<textarea aria-label="Observações do professor" className="field" rows={4} value={value.teacher_notes || ''} onChange={e => update('teacher_notes', e.target.value)}/></label>
    <label>Prioridade<select aria-label="Prioridade" className="field" value={value.priority || 'media'} onChange={e => update('priority', e.target.value)}><option value="baixa">Baixa</option><option value="media">Média</option><option value="alta">Alta</option></select></label>
    {value.activity_type === 'questoes' && <label>Quantidade prevista de questões<input className="field" type="number" min="1" step="1" value={value.questions_target ?? ''} onChange={e => update('questions_target', e.target.value)}/></label>}
    <GoalAttachments files={value.attachments || []} onChange={files => update('attachments', files)} onBusyChange={onBusyChange}/>
  </>
}
