import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'
import ProgressChart from '../components/ProgressChart'

export default function ExamHistory() {
  const { user } = useAuth()
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    exam_name: '',
    exam_date: '',
    total_questions: '',
    correct_answers: '',
  })
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('exam_history')
      .select('*')
      .eq('student_id', user.id)
      .order('exam_date', { ascending: false })
    if (!error) setExams(data ?? [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await supabase.from('exam_history').insert({
      student_id: user.id,
      exam_name: form.exam_name,
      exam_date: form.exam_date,
      total_questions: Number(form.total_questions),
      correct_answers: Number(form.correct_answers),
    })
    setSaving(false)
    if (!error) {
      setForm({ exam_name: '', exam_date: '', total_questions: '', correct_answers: '' })
      load()
    }
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-serif text-3xl font-semibold text-ink mb-6">Histórico de Provas</h1>

      <ProgressChart exams={exams} />

      <form
        onSubmit={handleSubmit}
        className="mt-6 bg-white/60 border border-paper-dark rounded-md p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end"
      >
        <div className="col-span-2 sm:col-span-1">
          <label className="text-xs text-ink-muted">Prova</label>
          <input
            required
            value={form.exam_name}
            onChange={(e) => setForm({ ...form, exam_name: e.target.value })}
            className="mt-1 w-full rounded border border-paper-dark bg-white px-2 py-1.5 text-sm"
            placeholder="Ex: ALE-RR"
          />
        </div>
        <div>
          <label className="text-xs text-ink-muted">Data</label>
          <input
            required
            type="date"
            value={form.exam_date}
            onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
            className="mt-1 w-full rounded border border-paper-dark bg-white px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-ink-muted">Questões</label>
          <input
            required
            type="number"
            min="1"
            value={form.total_questions}
            onChange={(e) => setForm({ ...form, total_questions: e.target.value })}
            className="mt-1 w-full rounded border border-paper-dark bg-white px-2 py-1.5 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-ink-muted">Acertos</label>
          <input
            required
            type="number"
            min="0"
            value={form.correct_answers}
            onChange={(e) => setForm({ ...form, correct_answers: e.target.value })}
            className="mt-1 w-full rounded border border-paper-dark bg-white px-2 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="col-span-2 sm:col-span-4 bg-ink text-paper text-sm font-medium py-2 rounded hover:bg-ink-light transition-colors disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Registrar prova'}
        </button>
      </form>

      {loading ? (
        <p className="text-sm text-ink-muted font-mono mt-6">Carregando...</p>
      ) : (
        <div className="mt-6 divide-y divide-paper-dark border border-paper-dark rounded-md overflow-hidden">
          <div className="grid grid-cols-4 gap-2 px-4 py-2 bg-paper-dark text-[11px] font-mono text-ink-muted">
            <span>PROVA</span>
            <span>DATA</span>
            <span>ACERTOS</span>
            <span>%</span>
          </div>
          {exams.map((e) => (
            <div key={e.id} className="grid grid-cols-4 gap-2 px-4 py-2.5 text-sm bg-white/50">
              <span className="truncate">{e.exam_name}</span>
              <span className="font-mono text-xs text-ink-muted">
                {new Date(`${e.exam_date}T00:00:00`).toLocaleDateString('pt-BR')}
              </span>
              <span className="font-mono text-xs">
                {e.correct_answers}/{e.total_questions}
              </span>
              <span className="font-mono text-xs font-semibold">
                {e.total_questions
                  ? `${Math.round((e.correct_answers / e.total_questions) * 1000) / 10}%`
                  : '-'}
              </span>
            </div>
          ))}
          {exams.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-ink-muted">
              Nenhuma prova registrada ainda.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
