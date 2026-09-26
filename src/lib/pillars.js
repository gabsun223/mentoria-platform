// Categorias de atividade. O campo pillar legado permanece compatível no banco.
// Cor/ícone vêm daqui — nunca do texto livre da disciplina.

export const PILLAR_ORDER = ['teoria', 'revisao', 'questoes', 'legislacao', 'jurisprudencia', 'outros']

export const PILLARS = {
  teoria: {
    label: 'Teoria',
    glyph: '📖',
    text: 'text-pilar-leitura',
    bg: 'bg-pilar-leitura-bg',
    border: 'border-pilar-leitura',
    dot: 'bg-pilar-leitura',
  },
  legislacao: {
    label: 'Legislação',
    glyph: '⚖',
    text: 'text-pilar-legislacao',
    bg: 'bg-pilar-legislacao-bg',
    border: 'border-pilar-legislacao',
    dot: 'bg-pilar-legislacao',
  },
  jurisprudencia: {
    label: 'Jurisprudência',
    glyph: '📄',
    text: 'text-pilar-jurisprudencia',
    bg: 'bg-pilar-jurisprudencia-bg',
    border: 'border-pilar-jurisprudencia',
    dot: 'bg-pilar-jurisprudencia',
  },
  questoes: {
    label: 'Questões',
    glyph: '✓',
    text: 'text-pilar-questoes',
    bg: 'bg-pilar-questoes-bg',
    border: 'border-pilar-questoes',
    dot: 'bg-pilar-questoes',
  },
}

export function pillarOf(key) {
  return PILLARS[key === 'leitura' ? 'teoria' : key] ?? PILLARS.teoria
}

PILLARS.revisao = { ...PILLARS.teoria, label: 'Revisão', glyph: '↻' }
PILLARS.outros = { ...PILLARS.teoria, label: 'Outros', glyph: '◇' }
export function activityKey(record) {
  const key = record.activity_type || record.pillar
  return PILLAR_ORDER.includes(key) ? key : PILLAR_ORDER.includes(record.pillar) ? record.pillar : 'teoria'
}
export function storagePillar(key) {
  return ['questoes', 'legislacao', 'jurisprudencia'].includes(key) ? key : 'leitura'
}
