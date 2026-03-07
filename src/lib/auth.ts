import { computed, ref } from 'vue'
import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'

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
}

type PublicUserRow = {
  id: string
  email: string | null
  name: string | null
  student_id: string | null
  major: string | null
  role: string | null
}

const userRef = ref<AuthUser | null>(null)
const readyRef = ref(false)
let initPromise: Promise<void> | null = null

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, '')

const getAuthRedirectUrl = (path: '/login' | '/reset-password'): string => {
  const configuredBase = import.meta.env.VITE_PUBLIC_SITE_URL?.trim()
  const base =
    configuredBase && configuredBase.length > 0
      ? trimTrailingSlash(configuredBase)
      : window.location.origin
  return `${base}${path}`
}

const isExistingEmailSignUpResponse = (user: User | null, hasSession: boolean): boolean => {
  if (hasSession || !user || !Array.isArray(user.identities)) return false
  // Supabase may return an obfuscated user with empty identities when the email already exists.
  return user.identities.length === 0
}

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
  }
}

const readPublicUser = async (userId: string): Promise<PublicUserRow | null> => {
  const { data, error } = await supabase
    .from('users')
    .select('id,email,name,student_id,major,role')
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

type SignUpProfile = {
  name: string
  studentId: string
  major: string
}

export async function signUpWithEmail(
  email: string,
  password: string,
  profile: SignUpProfile,
): Promise<boolean> {
  const cleanName = profile.name.trim()
  const cleanStudentId = profile.studentId.trim()
  const cleanMajor = profile.major.trim()

  if (!cleanName || !cleanStudentId || !cleanMajor) {
    throw new Error('이름, 학번, 학과를 모두 입력해주세요.')
  }

  const options: {
    emailRedirectTo: string
    data: { name: string; student_id: string; sid: string; major: string }
  } = {
    emailRedirectTo: getAuthRedirectUrl('/login'),
    data: {
      name: cleanName,
      student_id: cleanStudentId,
      sid: cleanStudentId,
      major: cleanMajor,
    },
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options,
  })
  if (error) throw error

  const hasSession = !!data.session
  if (isExistingEmailSignUpResponse(data.user ?? null, hasSession)) {
    throw new Error('이미 가입된 이메일입니다. 로그인으로 진행해주세요.')
  }
  if (!data.user && !hasSession) {
    throw new Error('회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
  }

  userRef.value = hasSession ? await toMappedUser(data.user ?? null) : null
  readyRef.value = true
  return !hasSession
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (error) throw error
  userRef.value = await toMappedUser(data.user ?? null)
  readyRef.value = true
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const cleanEmail = email.trim()
  if (!cleanEmail) {
    throw new Error('비밀번호 재설정 메일을 받을 이메일을 입력해주세요.')
  }

  const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo: getAuthRedirectUrl('/reset-password'),
  })
  if (error) throw error
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
  }
}
