import { useEffect, useState, useCallback, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import StudyTimer from '../components/StudyTimer'
import GoalAttachments from '../components/GoalAttachments'
import { Status, Priority } from '../components/WorkspaceUI'
import StudyCompletionModal from '../components/StudyCompletionModal'
import { pillarOf, activityKey } from '../lib/pillars'

export default function GoalDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const isMentor = profile?.role === 'mentor'

  const [goal, setGoal] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [sequence, setSequence] = useState({ position: null, total: null, prevId: null, nextId: null })
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [savingBlockId, setSavingBlockId] = useState(null)
  const [concluding, setConcluding] = useState(false)
  const [copiedBlockId, setCopiedBlockId] = useState(null)
  const [timerBusy, setTimerBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [recording, setRecording] = useState(null)

  // Ref sincronizado com `goal` — o StudyTimer pode chamar onAddSeconds a partir
  // de uma closure "velha" (ex: commit no unmount, com o mount original). Ler
  // sempre do ref (e não da variável `goal` capturada) evita perder segundos
  // já contabilizados entre um commit e outro.
  const goalRef = useRef(null)
  useEffect(() => {
    goalRef.current = goal
  }, [goal])

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    setNotFound(false)

    const [{ data: goalData, error: goalError }, { data: blockData }] = await Promise.all([
      supabase.from('goals').select('*').eq('id', id).single(),
      supabase.from('goal_blocks').select('*').eq('goal_id', id).order('position', { ascending: true }),
    ])

    if (goalError || !goalData) {
      setNotFound(true)
      setLoading(false)
      return
    }
    setGoal(goalData)
    setBlocks(blockData ?? [])

    const { data: allGoals } = await supabase
      .from('goals')
      .select('id, due_date, created_at, day_order')
      .eq('student_id', goalData.student_id)
      .order('due_date', { ascending: true })
      .order('day_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (allGoals) {
      const idx = allGoals.findIndex((g) => g.id === id)
      setSequence({
        position: idx >= 0 ? idx + 1 : null,
        total: allGoals.length,
        prevId: idx > 0 ? allGoals[idx - 1].id : null,
        nextId: idx >= 0 && idx < allGoals.length - 1 ? allGoals[idx + 1].id : null,
      })
    }

    setLoading(false)
  }, [id, user?.id])
  useEffect(() => { window.addEventListener('study-saved', load); return () => window.removeEventListener('study-saved', load) }, [load])


  useEffect(() => {
    load()
  }, [load])

  const handleTimerChange = async running => {
    const { data, error } = await supabase.rpc('set_goal_timer', { p_goal: goal.id, p_running: running })
    if (error) throw error
    goalRef.current = data; setGoal(data); return data
  }
  const toggleBlock = async (block) => {
    setSavingBlockId(block.id)
    const nextCompleted = !block.completed
    const { error } = await supabase
      .from('goal_blocks')
      .update({ completed: nextCompleted })
      .eq('id', block.id)
    if (!error) {
      setBlocks((prev) =>
        prev.map((b) => (b.id === block.id ? { ...b, completed: nextCompleted } : b))
      )
    }
    setSavingBlockId(null)
    if(error) setNotice(error.message)
  }

  const copyMaterial = async (block) => {
    try {
      await navigator.clipboard.writeText(block.material_url)
      setCopiedBlockId(block.id)
      setTimeout(() => setCopiedBlockId(null), 1500)
    } catch {
      // clipboard indisponível — ignora silenciosamente
    }
  }

  async function openRecord(complete) {
    setConcluding(true); setNotice('')
    try { const current = goal.timer_started_at ? await handleTimerChange(false) : goal; setRecording({goal:current,complete}) }
    catch(e){setNotice(e.message)}finally{setConcluding(false)}
  }
  const toggleGoalCompleted = async () => {
    if (!goal) return
    if (!goal.completed) { await openRecord(true); return }
    setConcluding(true)
    const nextCompleted = !goal.completed
    if (nextCompleted && goal.timer_started_at) {
      try { await handleTimerChange(false) } catch (e) { setNotice(e.message); setConcluding(false); return }
    }
    const { error } = await supabase
      .from('goals')
      .update({ completed: nextCompleted })
      .eq('id', goal.id)
    if (!error) setGoal((g) => ({ ...g, completed: nextCompleted }))
    else setNotice(error.message)
    setConcluding(false)
  }

  if (loading) {
    return <p className="text-sm text-ink-muted font-mono">Carregando meta...</p>
  }

  if (notFound) {
    return (
      <div className="max-w-2xl">
        <p className="text-sm text-ink-muted">Meta não encontrada.</p>
        <Link to={isMentor ? "/mentor/metas?periodo=todos" : "/semana"} className="text-sm text-ink underline mt-2 inline-block">
          Voltar ao cronograma
        </Link>
      </div>
    )
  }

  const pillar = pillarOf(activityKey(goal))
  const hasBlocks = blocks.length > 0
  const allBlocksDone = hasBlocks && blocks.every((b) => b.completed)
  const canConclude = hasBlocks ? allBlocksDone : true

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <Link to={isMentor ? "/mentor" : "/semana"} className="text-sm text-ink-muted hover:text-ink flex items-center gap-1">
          ← {isMentor ? 'Voltar aos alunos' : 'Voltar ao Cronograma'}
        </Link>
        <div className="flex items-center gap-2 text-xs font-mono text-ink-muted">
          <button
            disabled={!sequence.prevId}
            onClick={() => navigate(`/metas/${sequence.prevId}`)}
            className="border border-paper-dark rounded px-2 py-1 disabled:opacity-30 hover:bg-paper-dark transition-colors"
          >
            ‹ Anterior
          </button>
          {sequence.position && sequence.total && (
            <span>
              Meta {sequence.position} de {sequence.total}
            </span>
          )}
          <button
            disabled={!sequence.nextId}
            onClick={() => navigate(`/metas/${sequence.nextId}`)}
            className="border border-paper-dark rounded px-2 py-1 disabled:opacity-30 hover:bg-paper-dark transition-colors"
          >
            Próxima ›
          </button>
        </div>
      </div>

      <div className="border border-paper-dark rounded-md bg-white/60 p-4 mb-4">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Status goal={goal}/><Priority value={goal.priority}/>
          <span className={`text-[11px] px-2 py-0.5 rounded font-medium ${pillar.bg} ${pillar.text}`}>
            {pillar.glyph} {pillar.label}
          </span>
          {goal.category && (
            <span className="text-[11px] px-2 py-0.5 rounded bg-paper-dark text-ink-muted">
              {goal.category}
            </span>
          )}
        </div>
        <h1 className="font-serif text-2xl font-semibold text-ink">{goal.title}</h1>
        <p className="text-xs text-ink-muted mt-1">
          {new Date(`${goal.due_date}T00:00:00`).toLocaleDateString('pt-BR', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </p>
      </div>

      {goal.questions_target > 0 && <p className="notice">Questões: {goal.questions_total || 0} de {goal.questions_target} previstas</p>}
      {goal.attachments?.length > 0 && <section className="surface mb-4"><GoalAttachments files={goal.attachments}/></section>}
      {goal.teacher_notes && <section className="surface mb-4"><div className="card-heading"><h2>Observações do professor</h2></div><p style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{goal.teacher_notes}</p></section>}

      <div className="mb-4">
        {notice && <p className="notice error" role="alert">{notice}</p>}
        {isMentor ? <p>Tempo estudado pelo aluno: {Math.floor((goal.time_seconds || 0) / 60)} minutos</p> : <StudyTimer key={'timer-'+goal.id} goal={goal} onTimerChange={handleTimerChange} onBusyChange={setTimerBusy} />}
        {!isMentor && <button className="btn" disabled={concluding} onClick={()=>openRecord(false)}>Registrar ou ajustar estudo</button>}
      </div>

      {recording && <StudyCompletionModal goal={recording.goal} complete={recording.complete} onClose={()=>setRecording(null)} onSaved={g=>{goalRef.current=g;setGoal(g);setNotice('Estudo registrado com sucesso.')}}/>}
      <div className="toolbar">
        {/^https?:\/\//i.test(goal.legislation_url || '') && <a className="btn" href={goal.legislation_url} target="_blank" rel="noopener noreferrer">Abrir legislação ↗</a>}
        {/^https?:\/\//i.test(goal.questions_url || '') && <a className="btn" href={goal.questions_url} target="_blank" rel="noopener noreferrer">Abrir questões ↗</a>}
        {/^https?:\/\//i.test(goal.material_url || '') && goal.material_url!==goal.legislation_url && goal.material_url!==goal.questions_url && <a className="btn" href={goal.material_url} target="_blank" rel="noopener noreferrer">Material anterior ↗</a>}
      </div>

      {hasBlocks && <div className="mb-4">
        <p className="font-mono text-[11px] text-ink-muted tracking-wide mb-2">MATERIAIS E ORIENTAÇÕES ANTERIORES</p>

        {!hasBlocks ? (
          <p className="text-sm text-ink-muted border border-dashed border-paper-dark rounded-md p-4 text-center">
            Essa meta não tem blocos detalhados.
          </p>
        ) : (
          <div className="space-y-3">
            {blocks.map((block) => (
              <div key={block.id} className="border border-paper-dark rounded-md bg-white/60 overflow-hidden">
                <button
                  onClick={() => toggleBlock(block)}
                  disabled={isMentor || savingBlockId === block.id}
                  className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{block.title}</p>
                    {block.topic && (
                      <p className="text-xs text-ink-muted truncate">{block.topic}</p>
                    )}
                  </div>
                  <span
                    className={`shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-[11px] ${
                      block.completed
                        ? 'bg-selo-verde border-selo-verde text-paper'
                        : 'border-ink-muted text-transparent'
                    }`}
                  >
                    ✓
                  </span>
                </button>

                {block.material_url && (
                  <div className="bg-selo-verde-bg/40 border-t border-paper-dark px-4 py-3">
                    <p className="text-[11px] font-mono text-ink-muted tracking-wide mb-1.5">
                      ORIENTAÇÕES DO MENTOR
                    </p>
                    <p className="text-xs text-ink-muted truncate mb-2">{block.material_url}</p>
                    <div className="flex items-center gap-3">
                      <a
                        href={block.material_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-selo-verde hover:underline"
                      >
                        ↗ Acessar Material
                      </a>
                      <button
                        onClick={() => copyMaterial(block)}
                        className="text-xs font-medium text-ink-muted hover:text-ink"
                      >
                        {copiedBlockId === block.id ? 'Copiado ✓' : '⧉ Copiar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      }
      {!isMentor && <div className="border border-paper-dark rounded-md p-4">
        <p className="font-mono text-[11px] text-ink-muted tracking-wide mb-2">CONCLUIR META</p>
        <button
          onClick={toggleGoalCompleted}
          disabled={concluding || (!goal.completed && !canConclude)}
          className={`w-full py-2.5 rounded text-sm font-medium transition-colors ${
            goal.completed
              ? 'bg-paper-dark text-ink-muted hover:bg-paper'
              : canConclude
              ? 'bg-selo-verde text-paper hover:opacity-90'
              : 'bg-paper-dark text-ink-muted cursor-not-allowed'
          }`}
        >
          {goal.completed
            ? 'Marcar como pendente'
            : canConclude
            ? '✓ Concluir Meta'
            : 'Marque todos os blocos para concluir'}
        </button>
      </div>}
    </div>
  )
}
