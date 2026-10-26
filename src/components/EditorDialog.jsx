import { useEffect, useRef } from 'react'

export default function EditorDialog({ title, subtitle, children, onClose, busy, wide = false }) {
  const ref = useRef(null)
  useEffect(() => {
    const previous = document.activeElement
    ref.current?.showModal()
    return () => { previous?.focus?.() }
  }, [])
  return <dialog ref={ref} className={'editor-dialog' + (wide ? ' editor-dialog-wide' : '')}
    aria-label={title} onCancel={e => { e.preventDefault(); if (!busy) onClose() }}>
    <header className="editor-dialog-heading"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>
      <button type="button" className="btn" aria-label="Fechar editor" disabled={busy} onClick={onClose}>Fechar</button>
    </header><div className="editor-dialog-content">{children}</div>
  </dialog>
}
