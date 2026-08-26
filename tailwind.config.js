/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F3F2ED',
        'paper-dark': '#E8E6DD',
        ink: {
          DEFAULT: '#1B2A4A',
          light: '#2E4270',
          muted: '#5B6B8C',
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
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}
