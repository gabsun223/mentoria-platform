import { useState } from 'react'
import { Link } from 'react-router-dom'
import './LandingEditorial.css'

const pillars = [
  ['01', 'Organização', 'Cada coisa no seu lugar.', 'Um plano que transforma o edital em prioridades e a sua semana em passos possíveis.'],
  ['02', 'Foco', 'O essencial, à sua frente.', 'Clareza sobre o que merece sua atenção agora, sem tentar abraçar todas as matérias ao mesmo tempo.'],
  ['03', 'Constância', 'Um ritmo que cabe na vida.', 'Metas para avançar com regularidade e ajustes para os dias que não saem como o planejado.'],
  ['04', 'Despreocupação', 'Menos decisões para carregar.', 'Com o caminho organizado e acompanhamento próximo, você pode dedicar sua energia ao estudo.'],
]
const routine = {
  Seg: ['Direito Constitucional', 'Controle de constitucionalidade', 'Direito Administrativo', 'Atos administrativos'],
  Ter: ['Direito Tributário', 'Competência tributária', 'Processo Civil', 'Tutela provisória'],
  Qua: ['Direito Administrativo', 'Licitações e contratos', 'Direito Constitucional', 'Direitos fundamentais'],
  Qui: ['Processo Civil', 'Recursos', 'Direito Financeiro', 'Orçamento público'],
  Sex: ['Direito Tributário', 'Crédito tributário', 'Revisão da semana', 'Retome os pontos de atenção'],
}
function Brand() { return <span className="ed-brand"><span className="ed-brand-symbol" aria-hidden="true">m<span>.</span></span><span>mentoria<small>CONCURSOS</small></span></span> }

export default function LandingEditorial() {
  const [menu, setMenu] = useState(false)
  const [day, setDay] = useState('Seg')
  const subjects = routine[day]
  return <div className="editorial-landing">
    <a className="ed-skip" href="#ed-inicio">Pular para o conteúdo</a>
    <header className="ed-header ed-container">
      <Link to="/" aria-label="Minha Mentoria — início"><Brand /></Link>
      <nav id="ed-navigation" className={menu ? 'ed-navigation open' : 'ed-navigation'} aria-label="Navegação da apresentação">
        <a href="#ed-pilares" onClick={() => setMenu(false)}>Nossa essência</a><a href="#ed-metodo" onClick={() => setMenu(false)}>Como funciona</a><a href="#ed-duvidas" onClick={() => setMenu(false)}>Dúvidas</a>
      </nav>
      <Link to="/login" className="ed-login">Área do aluno <span aria-hidden="true">↗</span></Link>
      <button className="ed-menu" aria-label={menu ? 'Fechar menu' : 'Abrir menu'} aria-expanded={menu} aria-controls="ed-navigation" onClick={() => setMenu(!menu)}>{menu ? '×' : '☰'}</button>
    </header>
    <main id="ed-inicio">
      <section className="ed-hero ed-container">
        <div className="ed-hero-copy"><span className="ed-overline"><i /> MENTORIA PARA CONCURSOS</span>
          <h1>Um caminho claro.<br />Uma mente <em>livre<br />para estudar.</em></h1>
          <p>Você não precisa decidir tudo, todos os dias. Organize sua preparação, encontre seu ritmo e avance com alguém acompanhando o caminho.</p>
          <div className="ed-hero-actions"><Link className="ed-button" to="/cadastro">Quero organizar minha preparação <span aria-hidden="true">↗</span></Link><a className="ed-text-link" href="#ed-metodo">Conheça o método <span aria-hidden="true">↓</span></a></div>
          <div className="ed-small-note"><span aria-hidden="true">↳</span> Seu objetivo é grande. Seu próximo passo pode ser simples.</div>
        </div>
        <div className="ed-plan-scene">
          <div className="ed-scene-top"><span>MENOS RUÍDO. MAIS DIREÇÃO.</span><span aria-hidden="true">↗</span></div>
          <div className="ed-plan">
            <div className="ed-plan-heading"><span className="ed-overline">UM DIA DE CADA VEZ</span><span className="ed-example">EXEMPLO</span></div>
            <h2>Sua semana,<br /><em>com intenção.</em></h2>
            <div className="ed-plan-days" role="group" aria-label="Escolha um dia para visualizar o exemplo">{Object.keys(routine).map((d,i)=><button key={d} aria-pressed={day===d} onClick={() => setDay(d)}><span>{d}</span><strong>{String(i+1).padStart(2,'0')}</strong><i /></button>)}</div>
            <div className="ed-plan-tasks" aria-live="polite"><div className="ed-task"><span className="ed-task-icon">01</span><div><small>APROFUNDAR · 60 MIN</small><h3>{subjects[0]}</h3><p>{subjects[1]}</p></div><span className="ed-task-arrow" aria-hidden="true">↗</span></div><div className="ed-task"><span className="ed-task-icon">02</span><div><small>PRATICAR E REVISAR · 45 MIN</small><h3>{subjects[2]}</h3><p>{subjects[3]}</p></div><span className="ed-task-arrow" aria-hidden="true">↗</span></div></div>
            <div className="ed-plan-foot"><span aria-hidden="true">☼</span><p>Você cuida do próximo passo.<br /><strong>O plano mantém a direção.</strong></p></div>
          </div>
          <div className="ed-scene-bottom"><span className="ed-seal" aria-hidden="true">↟</span><p>Uma rotina possível.<br /><strong>Uma preparação mais leve.</strong></p><span className="ed-scene-number">01 — 05</span></div>
          <p className="ed-demo-note">Planejamento ilustrativo. Selecione os dias para explorar.</p>
        </div>
      </section>
      <section className="ed-principles ed-container" aria-label="Os quatro pilares"><span>O QUE SUSTENTA<br />A SUA JORNADA</span><p>Organização <i>·</i> Foco <i>·</i> Constância <i>·</i> Despreocupação</p></section>
      <section className="ed-essence ed-container" id="ed-pilares"><div className="ed-section-intro"><div><span className="ed-overline">NOSSA ESSÊNCIA</span><h2>Estudar com seriedade.<br /><em>Seguir com tranquilidade.</em></h2></div><p>Preparar-se para um concurso exige dedicação. A nossa proposta é dar estrutura a esse esforço, com clareza para agir e espaço para respirar.</p></div>
        <div className="ed-pillars">{pillars.map(([n,title,subtitle,copy])=><article key={n}><div className="ed-pillar-top"><span>{n}</span><span aria-hidden="true">{['▤','◎','↗','≈'][Number(n)-1]}</span></div><h3>{title}</h3><strong>{subtitle}</strong><p>{copy}</p></article>)}</div>
      </section>
      <section className="ed-method" id="ed-metodo"><div className="ed-container ed-method-layout"><div><span className="ed-overline">O MÉTODO, NA PRÁTICA</span><h2>O plano acompanha<br />a sua vida.<br /><em>E você avança.</em></h2><p>Uma preparação não precisa ser perfeita para ser consistente. Precisa ter direção, continuidade e espaço para ajustes.</p><Link to="/cadastro" className="ed-method-link">Dar o primeiro passo <span aria-hidden="true">↗</span></Link></div><ol>{[['Começamos pela sua realidade.','Seu momento, seu objetivo e o tempo disponível orientam a construção do plano.'],['Transformamos o objetivo em rotina.','Disciplinas, revisões e questões ganham lugar na semana, com prioridades claras.'],['Acompanhamos para ajustar.','Metas e desempenho ajudam a perceber avanços e recalcular a rota quando necessário.']].map(([title,copy],i)=><li key={title}><span>0{i+1}</span><div><h3>{title}</h3><p>{copy}</p></div></li>)}</ol></div></section>
      <section className="ed-breath ed-container"><span className="ed-overline">CONSTÂNCIA, NÃO CORRERIA</span><p>“Não é sobre fazer tudo hoje.<br />É sobre saber o que fazer <em>agora.</em>”</p><span className="ed-breath-line" /></section>
      <section className="ed-faq ed-container" id="ed-duvidas"><div><span className="ed-overline">ANTES DE COMEÇAR</span><h2>Clareza desde<br /><em>a primeira conversa.</em></h2></div><div>{[
        ['A mentoria é para quem está começando?', 'A preparação pode partir de diferentes níveis. Seu momento, sua rotina e seu objetivo são o ponto de partida para organizar os estudos.'],
        ['E se eu tiver pouco tempo para estudar?', 'A proposta é trabalhar com o tempo que você realmente tem. Prioridades claras e metas possíveis ajudam a construir uma rotina sustentável.'],
        ['Como acompanho minha preparação?', 'Na área do aluno, você encontra o planejamento semanal, as metas e os indicadores de desempenho, além dos materiais disponibilizados na mentoria.'],
        ['Despreocupação significa não precisar me dedicar?', 'Não. Estudar e executar o plano continua sendo sua parte. Despreocupação, aqui, significa reduzir a sobrecarga de organizar tudo sozinho e ter mais clareza sobre o próximo passo.'],
      ].map(([q,a])=><details key={q}><summary>{q}<span aria-hidden="true">+</span></summary><p>{a}</p></details>)}</div></section>
      <section className="ed-cta ed-container"><div><span className="ed-overline">SEU PRÓXIMO PASSO</span><h2>Mais direção para o estudo.<br /><em>Mais leveza para a jornada.</em></h2></div><div><Link className="ed-button" to="/cadastro">Começar minha preparação <span aria-hidden="true">↗</span></Link><p>Organização para hoje. Constância para seguir.</p></div></section>
    </main>
    <footer className="ed-footer ed-container"><Link to="/" aria-label="Minha Mentoria — início"><Brand /></Link><p>Organização. Foco. Constância.<br /><span>Um caminho construído com você.</span></p><a href="#ed-inicio">Voltar ao início ↑</a></footer>
  </div>
}
