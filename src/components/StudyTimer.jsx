import { useEffect, useState, useRef } from 'react'

const clock = value => {
  const seconds = Math.max(0, Math.floor(value || 0))
  return [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map(n => String(n).padStart(2, '0')).join(':')
}

// Running timestamps belong to the goal in the database, not to the open page.
export default function StudyTimer({ goal, onTimerChange, onBusyChange }) {
  const [now, setNow] = useState(Date.now()), [saving, setSaving] = useState(false), [error, setError] = useState('')
  const [mode, setMode] = useState('clock'), [minutes, setMinutes] = useState(25)
  const autoPause = useRef(false)
  const running = !!goal.timer_started_at
  const elapsed = running ? Math.max(0, Math.floor((now - Date.parse(goal.timer_started_at)) / 1000)) : 0
  useEffect(() => {
    setNow(Date.now())
    if (!running) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [goal.id, goal.timer_started_at])
  useEffect(() => { onBusyChange?.(saving || running) }, [saving, running, onBusyChange])
  async function change(next) {
    if (saving) return
    setSaving(true); setError('')
    try { await onTimerChange(next); setNow(Date.now()) }
    catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }
  useEffect(() => {
    if (!running) { autoPause.current = false; return }
    if (mode === 'timer' && elapsed >= minutes * 60 && !autoPause.current) {
      autoPause.current = true
      change(false)
    }
  }, [elapsed, running, mode, minutes])
  return <fieldset disabled={saving} className="surface mb-4">
    <div className="card-heading"><h2>Cronômetro desta meta</h2><div className="toolbar-actions"><button type="button" className="btn" onClick={() => setMode('clock')}>Cronômetro</button><button type="button" className="btn" onClick={() => setMode('timer')}>Timer</button></div></div>
    {mode === 'timer' && <label>Minutos do timer<input aria-label="Minutos do timer" className="field" type="number" min="1" max="180" disabled={running} value={minutes} onChange={e => setMinutes(Math.min(180, Math.max(1, Number(e.target.value) || 1)))}/></label>}
    <div className="focus-clock" aria-live="off">{clock(mode === 'timer' ? Math.max(0, minutes * 60 - elapsed) : (goal.time_seconds || 0) + elapsed)}</div>
    <p className="muted small">{mode === 'timer' ? 'O tempo estudado também é somado a esta meta.' : 'Tempo total estudado nesta meta.'}</p>
    {running && <p className="muted small">Em andamento. Continua contando ao sair desta página; use Pausar ao terminar.</p>}
    {error && <p role="alert" className="notice error">{error}</p>}
    <button type="button" className="btn primary" disabled={goal.completed && !running} onClick={() => change(!running)}>{saving ? 'Salvando…' : running ? 'Pausar' : 'Iniciar'}</button>
    {goal.completed && !running && <p className="muted small">Reabra a meta para estudar novamente.</p>}
  </fieldset>
}
