// Metadados fixos dos quatro pilares (categoria de topo de uma meta).
// Cor/ícone vêm daqui — nunca do texto livre da disciplina.

export const PILLAR_ORDER = ['leitura', 'legislacao', 'jurisprudencia', 'questoes']

export const PILLARS = {
  leitura: {
    label: 'Leitura',
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
  return PILLARS[key] ?? PILLARS.leitura
}
