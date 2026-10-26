export default function DraftNotice({ draft, onResume }) {
  return draft && <div className="draft-notice" role="status"><div><strong>Você tem um rascunho</strong><p>{draft.topic || draft.name || 'Edição ainda não salva'} · Continue de onde parou antes de iniciar outra edição.</p></div><button className="btn" onClick={onResume}>Retomar edição</button></div>
}
