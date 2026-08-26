import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', user.id)
    setSaving(false)
    if (!error) {
      setSaved(true)
      refreshProfile()
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="font-serif text-3xl font-semibold text-ink mb-6">Perfil</h1>

      <form
        onSubmit={handleSave}
        className="bg-white/60 border border-paper-dark rounded-md p-5 space-y-4"
      >
        <div>
          <label className="text-xs text-ink-muted">Nome completo</label>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full rounded border border-paper-dark bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-ink-muted">E-mail</label>
          <p className="mt-1 text-sm text-ink-muted font-mono">{user?.email}</p>
        </div>
        <div>
          <label className="text-xs text-ink-muted">Papel</label>
          <p className="mt-1 text-sm capitalize">
            {profile?.role === 'mentor' ? 'Mentor' : 'Aluno(a)'}
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="bg-ink text-paper text-sm font-medium py-2 px-4 rounded hover:bg-ink-light transition-colors disabled:opacity-60"
        >
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
        {saved && <p className="text-xs text-selo-verde">Salvo com sucesso.</p>}
      </form>
    </div>
  )
}
