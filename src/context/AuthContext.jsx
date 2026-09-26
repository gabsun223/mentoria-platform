import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const activeUserId = useRef(undefined)
  const profileRequest = useRef(0)

  const loadProfile = useCallback(async (userId) => {
    const request = ++profileRequest.current
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (request !== profileRequest.current || activeUserId.current !== userId) return
    if (error) {
      // eslint-disable-next-line no-console
      console.error('Erro ao carregar perfil:', error.message)
      setProfile(null)
    } else {
      setProfile(data)
    }
  }, [])

  useEffect(() => {
    let active = true
    let generation = 0
    let pending
    activeUserId.current = undefined
    // INITIAL_SESSION also covers startup. Same-account events on tab focus or
    // token refresh must not unmount protected pages and discard draft forms.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      const nextId = nextSession?.user?.id ?? null
      setSession(nextSession)
      if (nextId === activeUserId.current) return
      activeUserId.current = nextId
      const version = ++generation
      ++profileRequest.current
      clearTimeout(pending)
      setProfile(null)
      setLoading(!!nextId)
      if (!nextId) return
      // Run profile queries outside Supabase's auth callback/lock.
      pending = setTimeout(() => {
        loadProfile(nextId).finally(() => {
          if (active && version === generation) setLoading(false)
        })
      }, 0)
    })

    return () => {
      active = false
      ++profileRequest.current
      clearTimeout(pending)
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signUp = async ({ email, password, fullName }) => {
    // A linha de perfil é criada por uma trigger no banco (migração
    // 0003_profile_on_signup.sql), não aqui — no instante do cadastro,
    // se o projeto exige confirmação de e-mail, ainda não existe uma
    // sessão autenticada pra passar pela política de RLS de `profiles`.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { data, error }
  }

  const signIn = async ({ email, password }) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = () => loadProfile(session?.user?.id)

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa ser usado dentro de um AuthProvider')
  return ctx
}
