/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F9FA',
        'paper-dark': '#E4E9ED',
        ink: {
          DEFAULT: '#176B48',
          light: '#11583A',
          muted: '#6A7689',
        },
        selo: {
          verde: '#2F6B3C',
          'verde-bg': '#E5EEE3',
          ambar: '#B8791F',
          'ambar-bg': '#F5E9D4',
          vermelho: '#9C3B2E',
          'vermelho-bg': '#F2E1DD',
        },
        pilar: {
          leitura: '#2454A6',
          'leitura-bg': '#E1E9F5',
          legislacao: '#6B3FA0',
          'legislacao-bg': '#EDE3F5',
          jurisprudencia: '#B8791F',
          'jurisprudencia-bg': '#F5E9D4',
          questoes: '#1F7A6C',
          'questoes-bg': '#DCEEEA',
        },
      },
      fontFamily: {
        serif: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
