import { computed, ref } from 'vue'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

type AuthUser = {
  id: string
  name: string
  email: string
}

const userRef = ref<AuthUser | null>(null)
const readyRef = ref(false)
let initPromise: Promise<void> | null = null

const toDisplayName = (user: User): string => {
  const rawMetaName = user.user_metadata?.name
  if (typeof rawMetaName === 'string' && rawMetaName.trim()) {
    return rawMetaName.trim()
  }
  const email = user.email ?? ''
  const localPart = email.split('@')[0] ?? ''
  return localPart || '사용자'
}

const mapUser = (user: User | null): AuthUser | null => {
  if (!user || !user.email) return null
  return {
    id: user.id,
    name: toDisplayName(user),
    email: user.email,
  }
}

export async function initAuth(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      userRef.value = null
    } else {
      userRef.value = mapUser(data.user ?? null)
    }
    readyRef.value = true
  })()
  return initPromise
}

supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
  userRef.value = mapUser(session?.user ?? null)
  readyRef.value = true
})

export async function signUpWithEmail(email: string, password: string, name: string): Promise<boolean> {
  const options: { emailRedirectTo: string; data?: { name: string } } = {
    emailRedirectTo: `${window.location.origin}/login`,
  }
  if (name.trim()) {
    options.data = { name: name.trim() }
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options,
  })
  if (error) throw error
  userRef.value = mapUser(data.user ?? null)
  return !data.session
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  userRef.value = mapUser(data.user ?? null)
}

export async function signOutAuth(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  userRef.value = null
}

export function useAuth() {
  const isLoggedIn = computed(() => !!userRef.value)
  const userName = computed(() => userRef.value?.name ?? '')
  const userEmail = computed(() => userRef.value?.email ?? '')
  const isAuthReady = computed(() => readyRef.value)

  return { user: userRef, isLoggedIn, userName, userEmail, isAuthReady }
}
