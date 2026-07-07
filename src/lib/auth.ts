import { computed, ref } from 'vue'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { lookupLoginEmail } from './members'

type AuthRole = 'member' | 'admin'
type AuthProvider = 'supabase'

type AuthUser = {
  id: string
  name: string
  email: string
  studentId: string
  major: string
  role: AuthRole
  provider: AuthProvider
  mustChangePassword: boolean
}

type PublicUserRow = {
  id: string
  email: string | null
  name: string | null
  student_id: string | null
  major: string | null
  role: string | null
  must_change_password: boolean | null
}

const userRef = ref<AuthUser | null>(null)
const readyRef = ref(false)
let initPromise: Promise<void> | null = null

const normalizeRole = (value: string | null | undefined): AuthRole => {
  return value === 'admin' ? 'admin' : 'member'
}

const toDisplayName = (user: User): string => {
  const rawMetaName = user.user_metadata?.name
  if (typeof rawMetaName === 'string' && rawMetaName.trim()) {
    return rawMetaName.trim()
  }
  const email = user.email ?? ''
  const localPart = email.split('@')[0] ?? ''
  return localPart || '사용자'
}

const readMetadataField = (user: User, key: string, fallbackKey?: string): string => {
  const value = user.user_metadata?.[key]
  if (typeof value === 'string' && value.trim()) return value.trim()
  if (fallbackKey) {
    const fallbackValue = user.user_metadata?.[fallbackKey]
    if (typeof fallbackValue === 'string' && fallbackValue.trim()) return fallbackValue.trim()
  }
  return ''
}

const toFallbackUser = (user: User): AuthUser => {
  return {
    id: user.id,
    name: toDisplayName(user),
    email: user.email ?? '',
    studentId: readMetadataField(user, 'student_id', 'sid'),
    major: readMetadataField(user, 'major'),
    role: 'member',
    provider: 'supabase',
    mustChangePassword: false,
  }
}

const readPublicUser = async (userId: string): Promise<PublicUserRow | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('id,email,name,student_id,major,role,must_change_password')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('[auth] failed to read public.users profile:', error.message)
    return null
  }

  return (data as PublicUserRow | null) ?? null
}

const toMappedUser = async (user: User | null): Promise<AuthUser | null> => {
  if (!user || !user.email) return null

  const fallback = toFallbackUser(user)
  const profile = await readPublicUser(user.id)
  if (!profile) return fallback

  return {
    id: user.id,
    name: profile.name?.trim() || fallback.name,
    email: profile.email?.trim() || user.email,
    studentId: profile.student_id?.trim() || fallback.studentId,
    major: profile.major?.trim() || fallback.major,
    role: normalizeRole(profile.role),
    provider: 'supabase',
    mustChangePassword: profile.must_change_password === true,
  }
}

const syncAuthUser = async (user: User | null) => {
  userRef.value = await toMappedUser(user)
  readyRef.value = true
}

export async function initAuth(): Promise<void> {
  if (initPromise) return initPromise
  initPromise = (async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error) {
      userRef.value = null
      readyRef.value = true
      return
    }
    await syncAuthUser(data.user ?? null)
  })()
  return initPromise
}

supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
  void syncAuthUser(session?.user ?? null)
})

export async function signInWithNameAndStudentId(
  name: string,
  studentId: string,
  password: string,
): Promise<AuthUser | null> {
  const cleanName = name.trim()
  const cleanStudentId = studentId.trim()
  if (!cleanName || !cleanStudentId || !password) {
    throw new Error('이름, 학번, 비밀번호를 모두 입력해주세요.')
  }

  const email = await lookupLoginEmail(cleanName, cleanStudentId)
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  userRef.value = await toMappedUser(data.user ?? null)
  readyRef.value = true
  return userRef.value
}

/** 비밀번호 변경 완료 후 로컬 상태의 변경 요구 플래그를 해제합니다. */
export function markPasswordChanged(): void {
  if (userRef.value) {
    userRef.value = { ...userRef.value, mustChangePassword: false }
  }
}

export async function updatePasswordWithRecovery(newPassword: string): Promise<void> {
  const cleanPassword = newPassword.trim()
  if (cleanPassword.length < 6) {
    throw new Error('비밀번호는 최소 6자 이상이어야 합니다.')
  }

  const { data, error } = await supabase.auth.updateUser({
    password: cleanPassword,
  })
  if (error) throw error

  userRef.value = await toMappedUser(data.user ?? null)
  readyRef.value = true
}

export async function signOutAuth(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
  userRef.value = null
  readyRef.value = true
}

export function useAuth() {
  const isLoggedIn = computed(() => !!userRef.value)
  const isAdmin = computed(() => userRef.value?.role === 'admin')
  const userName = computed(() => userRef.value?.name ?? '')
  const userEmail = computed(() => userRef.value?.email ?? '')
  const userStudentId = computed(() => userRef.value?.studentId ?? '')
  const userMajor = computed(() => userRef.value?.major ?? '')
  const userRole = computed<AuthRole>(() => userRef.value?.role ?? 'member')
  const authProvider = computed<AuthProvider>(() => userRef.value?.provider ?? 'supabase')
  const isAuthReady = computed(() => readyRef.value)
  const mustChangePassword = computed(() => userRef.value?.mustChangePassword === true)

  return {
    user: userRef,
    isLoggedIn,
    isAdmin,
    userName,
    userEmail,
    userStudentId,
    userMajor,
    userRole,
    authProvider,
    isAuthReady,
    mustChangePassword,
  }
}
