import { useState } from 'react'
import { supabase } from '../supabaseClient'
import GoalResultsFields, { resultsPayload } from './GoalResultsFields'
export default function GoalResultsEditor({goal,onSaved,disabled}) {
  const [form,setForm]=useState(null),[busy,setBusy]=useState(false),[notice,setNotice]=useState('')
  async function save(e){e.preventDefault();setBusy(true);setNotice('');try{
    const payload=resultsPayload(form)
    if(!('questions_total' in goal)){delete payload.questions_total;delete payload.questions_correct}
    const r=await supabase.from('goals').update(payload).eq('id',goal.id).eq('time_seconds',form.originalSeconds).select().single()
    if(r.error)throw Error(r.error.code==='PGRST116'?'O tempo foi atualizado em outra tela. Cancele, atualize a página e tente novamente.':r.error.message)
    onSaved(r.data);setForm(null);setNotice('Registro do estudo salvo.')
  }catch(e){setNotice(e.message)}finally{setBusy(false)}}
  return <section className="surface results-editor"><div className="card-heading"><h2>Tempo e resultados</h2></div>
    {notice && <p role="status" className="notice">{notice}</p>}
    {form?<form onSubmit={save}><fieldset disabled={busy || disabled} className="editor-fields"><GoalResultsFields value={form} onChange={setForm} questions={'questions_total' in goal}/><div className="editor-footer"><button type="button" className="btn" onClick={()=>setForm(null)}>Cancelar</button><button className="btn primary">Salvar registro</button></div></fieldset></form>:<button disabled={disabled} className="btn" onClick={()=>{setNotice('');setForm({...goal,originalSeconds:goal.time_seconds})}}>Editar tempo e resultados</button>}
    {disabled && <p className="muted small">Pause o cronômetro e aguarde o salvamento para editar o tempo.</p>}
    {goal.questions_total>0 && <p>{Math.round(goal.questions_correct/goal.questions_total*100)}% de acertos · {goal.questions_correct} de {goal.questions_total} questões</p>}
  </section>
}
