import { useEffect, useState } from 'react'

function read(key) {
  try { return JSON.parse(sessionStorage.getItem(key)) } catch { return null }
}

// Per-account and per-student drafts survive reloads in this browser tab.
export default function useEditorDraft(scope) {
  const key = 'mentoria:editor:' + scope
  const [state, setState] = useState(() => ({ key, draft: read(key), open: false }))
  const [storageError, setStorageError] = useState('')
  const current = state.key === key ? state : { key, draft: read(key), open: false }
  useEffect(() => { setState({ key, draft: read(key), open: false }); setStorageError('') }, [key])
  function setForm(next) {
    const value = typeof next === 'function' ? next(current.draft) : next
    try {
      if (value) sessionStorage.setItem(key, JSON.stringify(value)); else sessionStorage.removeItem(key)
      setStorageError('')
    } catch { setStorageError('O navegador não conseguiu guardar o rascunho. Salve antes de sair desta página.') }
    setState({ key, draft: value, open: !!value })
  }
  return {
    form: current.open ? current.draft : null, draft: current.draft, setForm, storageError,
    open: value => { if (current.draft) setState({ ...current, open: true }); else setForm(value) },
    close: () => setState({ ...current, open: false }),
    resume: () => setState({ ...current, open: true }),
  }
}
