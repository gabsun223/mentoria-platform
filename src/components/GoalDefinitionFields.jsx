import { useId } from 'react'
import { PILLAR_ORDER, pillarOf } from '../lib/pillars'

export default function GoalDefinitionFields({ value, onChange, subjects = [] }) {
  const listId = useId()
  const update = (key, next) => onChange({ ...value, [key]: next })
  return <>
    <label>Matéria<input required className="field" list={listId} value={value.category} onChange={e => update('category', e.target.value)}/></label>
    <datalist id={listId}>{subjects.map(subject => <option key={subject} value={subject}/>)}</datalist>
    <label>Assunto<input required className="field" value={value.topic} onChange={e => update('topic', e.target.value)}/></label>
    <label>Categoria<select aria-label="Categoria" className="field" value={value.activity_type} onChange={e => update('activity_type', e.target.value)}>{PILLAR_ORDER.map(key => <option key={key} value={key}>{pillarOf(key).label}</option>)}</select></label>
    <label>Link do Material<input className="field" type="url" placeholder="https://" value={value.material_url} onChange={e => update('material_url', e.target.value)}/></label>
  </>
}
