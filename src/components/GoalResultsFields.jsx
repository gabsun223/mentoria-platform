export function resultsPayload(form) {
  const seconds=Number(form.time_seconds || 0)
  const total=form.questions_total==null || form.questions_total===''?null:Number(form.questions_total)
  const correct=form.questions_correct==null || form.questions_correct===''?null:Number(form.questions_correct)
  if(!Number.isInteger(seconds) || seconds<0) throw Error('Informe um tempo válido.')
  if((total===null)!==(correct===null) || (total!==null && (!Number.isInteger(total)||!Number.isInteger(correct)||total<0||correct<0||correct>total))) throw Error('Informe questões e acertos; os acertos não podem superar as questões.')
  return {time_seconds:seconds,questions_total:total,questions_correct:correct}
}
export default function GoalResultsFields({value,onChange,questions=true}) {
  const seconds=Number(value.time_seconds || 0)
  return <><h3>Registro do estudo</h3><div className="field-grid">
    <label>Horas estudadas<input className="field" type="number" min="0" step="1" value={Math.floor(seconds/3600)} onChange={e=>onChange({...value,time_seconds:Number(e.target.value)*3600+seconds%3600})}/></label>
    <label>Minutos estudados<input className="field" type="number" min="0" max="59" step="1" value={Math.floor(seconds%3600/60)} onChange={e=>onChange({...value,time_seconds:Math.floor(seconds/3600)*3600+Number(e.target.value)*60+seconds%60})}/></label>
  </div>{questions && <div className="field-grid"><label>Questões respondidas<input className="field" type="number" min="0" step="1" value={value.questions_total ?? ''} onChange={e=>onChange({...value,questions_total:e.target.value})}/></label><label>Acertos<input className="field" type="number" min="0" step="1" value={value.questions_correct ?? ''} onChange={e=>onChange({...value,questions_correct:e.target.value})}/></label></div>}
  <p className="muted small">Tempo total já estudado nesta meta. {questions?'Deixe questões e acertos vazios se não houver registro.':''}</p></>
}
