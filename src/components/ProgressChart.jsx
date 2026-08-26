import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

export default function ProgressChart({ exams }) {
  const data = [...exams]
    .sort((a, b) => new Date(a.exam_date) - new Date(b.exam_date))
    .map((e) => ({
      date: new Date(e.exam_date).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      }),
      percentual: e.total_questions
        ? Math.round((e.correct_answers / e.total_questions) * 1000) / 10
        : 0,
      nome: e.exam_name,
    }))

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-ink-muted text-sm font-mono border border-dashed border-paper-dark rounded-md">
        Nenhuma prova registrada ainda.
      </div>
    )
  }

  return (
    <div className="h-64 bg-white/60 border border-paper-dark rounded-md p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
          <CartesianGrid stroke="#E8E6DD" vertical={false} />
          <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#5B6B8C' }} />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#5B6B8C' }}
            width={36}
            unit="%"
          />
          <Tooltip
            formatter={(value) => [`${value}%`, 'Acertos']}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.nome ?? label}
            contentStyle={{ fontSize: 12, borderRadius: 6 }}
          />
          <Line
            type="monotone"
            dataKey="percentual"
            stroke="#2E4270"
            strokeWidth={2}
            dot={{ r: 4, fill: '#2E4270' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
