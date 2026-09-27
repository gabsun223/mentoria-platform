import { useState } from 'react'
import { supabase } from '../supabaseClient'

export default function GoalAttachments({ files = [], onChange, onBusyChange }) {
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function upload(event) {
    const selected = Array.from(event.target.files || [])
    event.target.value = ''
    if (!selected.length) return
    setBusy(true); onBusyChange?.(true); setError('')
    let next = [...files]
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw Error('Entre novamente para anexar arquivos.')
      for (const file of selected) {
        if (file.size > 20 * 1024 * 1024) throw Error('Cada arquivo pode ter até 20 MB.')
        const path = user.id + '/' + crypto.randomUUID() + '/' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const { error } = await supabase.storage.from('goal-materials').upload(path, file)
        if (error) throw error
        next = [...next, { path, name: file.name, size: file.size }]
        onChange(next)
      }
    } catch (e) { setError(e.message) }
    finally { setBusy(false); onBusyChange?.(false) }
  }
  async function open(file) {
    setError('')
    const { data, error } = await supabase.storage.from('goal-materials').createSignedUrl(file.path, 60, { download: file.name })
    if (error) { setError(error.message); return }
    const link = document.createElement('a'); link.href = data.signedUrl; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.click()
  }
  return <div className="goal-attachments"><strong>Material de apoio</strong>
    {files.map(file => <div className="attachment-row" key={file.path}><button type="button" className="text-action" onClick={() => open(file)}>📎 {file.name}</button>{onChange && <button type="button" className="text-action" disabled={busy} aria-label={'Remover anexo '+file.name} onClick={() => onChange(files.filter(f => f.path !== file.path))}>Remover</button>}</div>)}
    {onChange && <label>Anexar material<input type="file" multiple disabled={busy} accept=".pdf,.png,.jpg,.jpeg,.txt,.docx" onChange={upload}/><small>PDF, imagens, TXT ou DOCX · até 20 MB por arquivo</small></label>}
    {busy && <p role="status">Enviando material…</p>}{error && <p role="alert" className="notice error">{error}</p>}
  </div>
}
