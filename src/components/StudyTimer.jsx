import { useEffect, useRef, useState } from 'react'

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds))
  const hh = Math.floor(s / 3600)
  const mm = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const mmSs = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
  return hh > 0 ? `${hh}:${mmSs}` : mmSs
}

function beep() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext
    const ctx = new Ctx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.15, ctx.currentTime)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.35)
    osc.onended = () => ctx.close()
  } catch {
    // ambiente sem suporte a Web Audio — ignora silenciosamente
  }
}

// Cronômetro soma tempo real ao total salvo da meta (onAddSeconds).
// Timer é um contador regressivo tipo pomodoro, não persiste tempo.
export default function StudyTimer({ totalSeconds, onAddSeconds, onBusyChange }) {
  const [saving,setSaving]=useState(false)
  const [saveError,setSaveError]=useState('')
  const callbackRef=useRef(onAddSeconds)
  callbackRef.current=onAddSeconds
  const savingRef=useRef(false)
  const [tab, setTab] = useState('cronometro')
  const [running, setRunning] = useState(false)
  const [sessionElapsed, setSessionElapsed] = useState(0)
  const [muted, setMuted] = useState(false)

  const [targetMinutes, setTargetMinutes] = useState(25)
  const [remaining, setRemaining] = useState(25 * 60)

  const intervalRef = useRef(null)
  const sessionElapsedRef = useRef(0)

  useEffect(() => {
    sessionElapsedRef.current = sessionElapsed
  }, [sessionElapsed])

  const commitSession = async () => {
    if (savingRef.current || sessionElapsedRef.current <= 0) return
    const delta=sessionElapsedRef.current
    savingRef.current=true;setSaving(true);setSaveError('')
    sessionElapsedRef.current=0;setSessionElapsed(0)
    try { await callbackRef.current(delta) }
    catch(e){sessionElapsedRef.current+=delta;setSessionElapsed(sessionElapsedRef.current);setSaveError('Tempo ainda não salvo. '+e.message)}
    finally {savingRef.current=false;setSaving(false)}
  }

  useEffect(()=>{onBusyChange?.(running || saving || sessionElapsed>0)},[running,saving,sessionElapsed,onBusyChange])
  useEffect(()=>{
    const warn=e=>{if(sessionElapsedRef.current>0 || savingRef.current){e.preventDefault();e.returnValue=''}}
    window.addEventListener('beforeunload',warn)
    return ()=>window.removeEventListener('beforeunload',warn)
  },[])

  useEffect(() => {
    if (!running) return
    const started=Date.now(), elapsedAtStart=sessionElapsedRef.current, remainingAtStart=remaining
    intervalRef.current = setInterval(() => {
      if (tab === 'cronometro') {
        sessionElapsedRef.current=elapsedAtStart+Math.floor((Date.now()-started)/1000)
        setSessionElapsed(sessionElapsedRef.current)
      } else {
        const left=Math.max(0,remainingAtStart-Math.floor((Date.now()-started)/1000))
        setRemaining(left)
        if(left===0){setRunning(false);if(!muted)beep()}
      }
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [running, tab, muted])

  useEffect(() => {
    return () => commitSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleStartStop = () => {
    if (running) {
      setRunning(false)
      if (tab === 'cronometro') commitSession()
    } else {
      setRunning(true)
    }
  }

  const handleReset = () => {
    setRunning(false)
    if (tab === 'cronometro') {
      commitSession()
    } else {
      setRemaining(targetMinutes * 60)
    }
  }

  const switchTab = (next) => {
    setRunning(false)
    if (tab === 'cronometro') commitSession()
    setTab(next)
  }

  return (
    <fieldset disabled={saving} className="border border-paper-dark rounded-md bg-white/60 p-4">
      {saveError && <div role="alert" className="notice error">{saveError}<button type="button" className="btn" onClick={commitSession}>Tentar salvar tempo</button></div>}
      {saving && <p role="status">Salvando tempo…</p>}
      <div className="flex items-center justify-between mb-3">
        <p className="font-mono text-[11px] text-ink-muted tracking-wide">
          CRONÔMETRO DE ESTUDO
        </p>
        <div className="flex rounded-md border border-paper-dark overflow-hidden text-[11px]">
          <button
            onClick={() => switchTab('cronometro')}
            className={`px-2.5 py-1 ${tab === 'cronometro' ? 'bg-ink text-paper' : 'text-ink-muted'}`}
          >
            Cronômetro
          </button>
          <button
            onClick={() => switchTab('timer')}
            className={`px-2.5 py-1 ${tab === 'timer' ? 'bg-ink text-paper' : 'text-ink-muted'}`}
          >
            Timer
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 py-2">
        {tab === 'cronometro' ? (
          <>
            <div className="w-32 h-32 rounded-full border border-paper-dark flex items-center justify-center">
              <span className="font-mono text-2xl text-ink">
                {formatClock(totalSeconds + sessionElapsed)}
              </span>
            </div>
            <p className="text-[10px] text-ink-muted font-mono">tempo total nesta meta</p>
          </>
        ) : (
          <>
            {!running && remaining === targetMinutes * 60 && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={targetMinutes}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 1
                    setTargetMinutes(v)
                    setRemaining(v * 60)
                  }}
                  className="w-16 text-center rounded border border-paper-dark bg-white px-2 py-1 text-sm"
                />
                <span className="text-xs text-ink-muted">minutos</span>
              </div>
            )}
            <div className="w-32 h-32 rounded-full border border-paper-dark flex items-center justify-center">
              <span className="font-mono text-2xl text-ink">{formatClock(remaining)}</span>
            </div>
          </>
        )}

        <div className="flex items-center gap-2">
          <button
            onClick={handleStartStop}
            className="bg-ink text-paper text-sm font-medium py-2 px-5 rounded hover:bg-ink-light transition-colors"
          >
            {running ? 'Pausar' : 'Iniciar'}
          </button>
          <button
            onClick={handleReset}
            aria-label="Resetar"
            className="border border-paper-dark rounded p-2 text-ink-muted hover:bg-paper-dark transition-colors"
          >
            ↺
          </button>
          <button
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? 'Ativar som' : 'Silenciar'}
            className="border border-paper-dark rounded p-2 text-ink-muted hover:bg-paper-dark transition-colors"
          >
            {muted ? '🔇' : '🔊'}
          </button>
        </div>
      </div>
    </fieldset>
  )
}
