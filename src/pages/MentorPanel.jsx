import { useEffect, useState, useCallback } from 'react'
import { format } from 'date-fns'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import ProgressChart from '../components/ProgressChart'
import StudyPlanForm from '../components/StudyPlanForm'
import { PILLAR_ORDER, pillarOf } from '../lib/pillars'
import { fetchBlockSummaries } from '../lib/goalActions'

const emptyBlock = () => ({ title: '', topic: '', material_url: '' })

export default function MentorPanel() {
  const { user } = useAuth()
  const [meusAlunos, setMeusAlunos] = useState([])
  const [semMentor, setSemMentor] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [goals, setGoals] = useState([])
  const [blockSummaries, setBlockSummaries] = useState({})
  const [exams, setExams] = useState([])
  const [studentPlans, setStudentPlans] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    title: '',
    pillar: 'leitura',
    category: '',
    plan_id: '',
    due_date: format(new Date(), 'yyyy-MM-dd'),
  })
  const [blocksForm, setBlocksForm] = useState([emptyBlock()])
  const [saving, setSaving] = useState(false)
  const [showPlanForm, setShowPlanForm] = useState(false)

  const loadAlunos = useCallback(async () => {
    setLoading(true)
    const [{ data: meus }, { data: livres }] = await Promise.all([
      supabase.from('profiles').select('*').eq('mentor_id', user.id).eq('role', 'student'),
      supabase.from('profiles').select('*').is('mentor_id', null).eq('role', 'student'),
    ])
    setMeusAlunos(meus ?? [])
    setSemMentor(livres ?? [])
    setLoading(false)
  }, [user])

  useEffect(() => {
    loadAlunos()
  }, [loadAlunos])

  const claimStudent = async (studentId) => {
    const { error } = await supabase
      .from('profiles')
      .update({ mentor_id: user.id })
      .eq('id', studentId)
    if (!error) loadAlunos()
  }

  const loadAlunoDetalhe = async (aluno) => {
    setSelecionado(aluno)
    setShowPlanForm(false)
    setForm((previous) => ({ ...previous, plan_id: '' }))
    const [{ data: g }, { data: e }, { data: plans }] = await Promise.all([
      supabase
        .from('goals')
        .select('*')
        .eq('student_id', aluno.id)
        .order('due_date', { ascending: false })
        .limit(15),
      supabase
        .from('exam_history')
        .select('*')
        .eq('student_id', aluno.id)
        .order('exam_date', { ascending: false }),
      supabase
        .from('study_plans')
        .select('id, name, status')
        .eq('student_id', aluno.id)
        .order('created_at', { ascending: true }),
    ])
    setGoals(g ?? [])
    setExams(e ?? [])
    setStudentPlans(plans ?? [])
    setBlockSummaries(await fetchBlockSummaries((g ?? []).map((goal) => goal.id)))
  }

  const updateBlockRow = (idx, field, value) => {
    setBlocksForm((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)))
  }

  const addBlockRow = () => setBlocksForm((prev) => [...prev, emptyBlock()])

  const removeBlockRow = (idx) =>
    setBlocksForm((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))

  const handleAddGoal = async (e) => {
    e.preventDefault()
    if (!selecionado) return
    setSaving(true)

    const { data: newGoal, error } = await supabase
      .from('goals')
      .insert({
        student_id: selecionado.id,
        title: form.title,
        pillar: form.pillar,
        category: form.category || null,
        plan_id: form.plan_id || null,
        due_date: form.due_date,
      })
      .select()
      .single()

    if (!error && newGoal) {
      const blocksToInsert = blocksForm
        .filter((b) => b.title.trim())
        .map((b, i) => ({
          goal_id: newGoal.id,
          title: b.title.trim(),
          topic: b.topic.trim() || null,
          material_url: b.material_url.trim() || null,
          position: i,
        }))
      if (blocksToInsert.length) {
        await supabase.from('goal_blocks').insert(blocksToInsert)
      }
      setForm({ ...form, title: '', category: '', plan_id: '' })
      setBlocksForm([emptyBlock()])
      loadAlunoDetalhe(selecionado)
    }
    setSaving(false)
  }

  const handlePlanStatusChange = async (plan) => {
    if (!selecionado) return
    const nextStatus = plan.status === 'active' ? 'pending' : 'active'
    const { error } = await supabase
      .from('study_plans')
      .update({ status: nextStatus })
      .eq('id', plan.id)

    if (!error) loadAlunoDetalhe(selecionado)
  }

  if (loading) return <p className="text-sm text-ink-muted font-mono">Carregando painel...</p>

  return (
    <div className="max-w-5xl">
      <h1 className="font-serif text-3xl font-semibold text-ink mb-6">Painel do Mentor</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Coluna de alunos */}
        <div className="md:col-span-1 space-y-6">
          <div>
            <p className="font-mono text-[11px] text-ink-muted tracking-wide mb-2">
              MEUS ALUNOS ({meusAlunos.length})
            </p>
            <div className="space-y-1">
              {meusAlunos.map((a) => (
                <button
                  key={a.id}
                  onClick={() => loadAlunoDetalhe(a)}
                  className={`w-full text-left px-3 py-2 rounded text-sm border ${
                    selecionado?.id === a.id
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-white/60 border-paper-dark hover:border-ink-light'
                  }`}
                >
                  {a.full_name}
                </button>
              ))}
              {meusAlunos.length === 0 && (
                <p className="text-xs text-ink-muted">Nenhum aluno vinculado ainda.</p>
              )}
            </div>
          </div>

          {semMentor.length > 0 && (
            <div>
              <p className="font-mono text-[11px] text-ink-muted tracking-wide mb-2">
                CADASTRADOS SEM MENTOR
              </p>
              <div className="space-y-1">
                {semMentor.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between px-3 py-2 rounded text-sm bg-selo-ambar-bg border border-selo-ambar/30"
                  >
                    <span className="truncate">{a.full_name}</span>
                    <button
                      onClick={() => claimStudent(a.id)}
                      className="text-[11px] font-medium text-selo-ambar hover:underline shrink-0 ml-2"
                    >
                      Vincular
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Detalhe do aluno selecionado */}
        <div className="md:col-span-2">
          {!selecionado ? (
            <div className="border border-dashed border-paper-dark rounded-md p-10 text-center text-ink-muted text-sm">
              Selecione um aluno pra lançar metas e ver a evolução.
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className="font-mono text-[11px] text-ink-muted tracking-wide">
                  ACOMPANHAMENTO
                </p>
                <h2 className="font-serif text-2xl font-semibold text-ink">
                  {selecionado.full_name}
                </h2>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => setShowPlanForm((visible) => !visible)}
                  className="border border-ink text-ink text-sm font-medium py-2 px-4 rounded hover:bg-white/70 transition-colors"
                >
                  {showPlanForm ? 'Cancelar novo plano' : '+ Novo plano para este aluno'}
                </button>
              </div>

              {showPlanForm && (
                <StudyPlanForm
                  studentId={selecionado.id}
                  onCancel={() => setShowPlanForm(false)}
                  onCreated={() => loadAlunoDetalhe(selecionado)}
                />
              )}

              {studentPlans.length > 0 && (
                <div className="border border-paper-dark rounded-md overflow-hidden">
                  <p className="px-4 py-2 text-[11px] font-mono text-ink-muted tracking-wide bg-white/40">
                    PLANOS DE ESTUDO
                  </p>
                  <div className="divide-y divide-paper-dark">
                    {studentPlans.map((plan) => (
                      <div
                        key={plan.id}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 bg-white/60"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-ink truncate">{plan.name}</p>
                          <p className="text-[10px] font-mono text-ink-muted">
                            {plan.status === 'pending' ? 'PENDENTE' : 'ATIVO'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePlanStatusChange(plan)}
                          className="text-[11px] text-ink-muted hover:text-ink shrink-0"
                        >
                          {plan.status === 'pending' ? 'Reativar' : 'Marcar como pendente'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <ProgressChart exams={exams} />

              <form
                onSubmit={handleAddGoal}
                className="bg-white/60 border border-paper-dark rounded-md p-4 space-y-3"
              >
                <p className="text-xs font-mono text-ink-muted tracking-wide">NOVA META</p>
                <input
                  required
                  placeholder="Título da meta (ex: PDF - Teoria - Direito Ambiental)"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full rounded border border-paper-dark bg-white px-3 py-2 text-sm"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={form.pillar}
                    onChange={(e) => setForm({ ...form, pillar: e.target.value })}
                    className="rounded border border-paper-dark bg-white px-2 py-1.5 text-sm"
                  >
                    {PILLAR_ORDER.map((key) => (
                      <option key={key} value={key}>
                        {pillarOf(key).glyph} {pillarOf(key).label}
                      </option>
                    ))}
                  </select>
                  <input
                    placeholder="Disciplina (ex: Direito Constitucional)"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="rounded border border-paper-dark bg-white px-2 py-1.5 text-sm"
                  />
                  <select
                    value={form.plan_id}
                    onChange={(e) => setForm({ ...form, plan_id: e.target.value })}
                    className="rounded border border-paper-dark bg-white px-2 py-1.5 text-sm"
                  >
                    <option value="">Sem plano de estudo</option>
                    {studentPlans
                      .filter((plan) => plan.status === 'active')
                      .map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                  </select>
                  <input
                    type="date"
                    required
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                    className="rounded border border-paper-dark bg-white px-2 py-1.5 text-sm"
                  />
                </div>

                <div className="border-t border-paper-dark pt-3 space-y-2">
                  <p className="text-[11px] font-mono text-ink-muted tracking-wide">
                    BLOCOS DE ESTUDO (opcional — a meta só fecha quando todos forem marcados)
                  </p>
                  {blocksForm.map((block, i) => (
                    <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                      <input
                        placeholder="Bloco (ex: Teoria)"
                        value={block.title}
                        onChange={(e) => updateBlockRow(i, 'title', e.target.value)}
                        className="rounded border border-paper-dark bg-white px-2 py-1.5 text-sm"
                      />
                      <input
                        placeholder="Tópico (ex: CF, art. 14 e 17)"
                        value={block.topic}
                        onChange={(e) => updateBlockRow(i, 'topic', e.target.value)}
                        className="rounded border border-paper-dark bg-white px-2 py-1.5 text-sm"
                      />
                      <input
                        placeholder="Link do material"
                        value={block.material_url}
                        onChange={(e) => updateBlockRow(i, 'material_url', e.target.value)}
                        className="rounded border border-paper-dark bg-white px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeBlockRow(i)}
                        disabled={blocksForm.length === 1}
                        className="text-ink-muted hover:text-selo-vermelho disabled:opacity-30 px-2"
                        aria-label="Remover bloco"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addBlockRow}
                    className="text-xs font-medium text-ink-muted hover:text-ink"
                  >
                    + Adicionar bloco
                  </button>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="bg-ink text-paper text-sm font-medium py-2 px-4 rounded hover:bg-ink-light transition-colors disabled:opacity-60"
                >
                  {saving ? 'Lançando...' : 'Lançar meta'}
                </button>
              </form>

              <div>
                <p className="text-xs font-mono text-ink-muted tracking-wide mb-2">
                  ÚLTIMAS METAS LANÇADAS
                </p>
                <div className="divide-y divide-paper-dark border border-paper-dark rounded-md overflow-hidden">
                  {goals.map((g) => {
                    const pillar = pillarOf(g.pillar)
                    const summary = blockSummaries[g.id]
                    return (
                      <div
                        key={g.id}
                        className="flex items-center justify-between px-4 py-2 text-sm bg-white/50 gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${pillar.bg} ${pillar.text}`}>
                            {pillar.glyph}
                          </span>
                          <span className="truncate">{g.title}</span>
                          {summary && (
                            <span className="text-[11px] font-mono text-ink-muted shrink-0">
                              {summary.completed}/{summary.total} blocos
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-xs text-ink-muted shrink-0">
                          {new Date(`${g.due_date}T00:00:00`).toLocaleDateString('pt-BR')}
                          {g.completed ? ' · ✓' : ''}
                        </span>
                      </div>
                    )
                  })}
                  {goals.length === 0 && (
                    <p className="px-4 py-4 text-center text-sm text-ink-muted">
                      Nenhuma meta lançada ainda.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
