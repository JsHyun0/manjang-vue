import { supabase } from './supabaseClient'

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? 'http://127.0.0.1:8000'

export type MemberProfile = {
  id: string
  email: string
  name: string
  student_id: string
  major: string
  generation: string
  role: 'member' | 'admin'
  must_change_password: boolean
}

export type MemberSyncResult = {
  source: 'sheet' | 'csv'
  total_rows: number
  created: number
  updated: number
  unchanged: number
  created_names: string[]
  errors: string[]
}

export type MyDebate = {
  debate_id: string
  topic: string
  date: string // YYYY-MM-DD
  debate_type: string
  side: 'pro' | 'con'
  winner_side: 'pro' | 'con' | null
  result: 'win' | 'loss' | 'pending'
}

export type MemberStatsRow = {
  user_id: string
  name: string
  generation: string
  major: string
  wins: number
  losses: number
  total: number
  win_rate: number
}

const extractErrorMessage = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body = await response.json()
    if (typeof body?.detail === 'string' && body.detail.trim()) return body.detail
  } catch (_error) {
    // ignore body parse failure
  }
  return fallback
}

const authHeaders = async (): Promise<Record<string, string>> => {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('로그인이 필요합니다.')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

const requestJson = async <T>(
  path: string,
  options: RequestInit,
  fallbackError: string,
): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, options)
  if (!response.ok) {
    throw new Error(await extractErrorMessage(response, fallbackError))
  }
  return (await response.json()) as T
}

export const lookupLoginEmail = async (name: string, studentId: string): Promise<string> => {
  const result = await requestJson<{ email: string }>(
    '/auth/login-lookup',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, student_id: studentId }),
    },
    '로그인 정보 확인에 실패했습니다.',
  )
  return result.email
}

export const changeMyPassword = async (newPassword: string): Promise<void> => {
  await requestJson(
    '/auth/change-password',
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({ new_password: newPassword }),
    },
    '비밀번호 변경에 실패했습니다.',
  )
}

export const fetchMyProfile = async (): Promise<MemberProfile> => {
  return requestJson<MemberProfile>(
    '/members/me',
    { headers: await authHeaders() },
    '내 정보를 불러오지 못했습니다.',
  )
}

export const fetchMyDebates = async (): Promise<MyDebate[]> => {
  return requestJson<MyDebate[]>(
    '/members/me/debates',
    { headers: await authHeaders() },
    '내 토론 목록을 불러오지 못했습니다.',
  )
}

export const fetchMemberStats = async (): Promise<MemberStatsRow[]> => {
  return requestJson<MemberStatsRow[]>('/members/stats', {}, '전적 정보를 불러오지 못했습니다.')
}

export const fetchMembers = async (): Promise<MemberProfile[]> => {
  return requestJson<MemberProfile[]>(
    '/members',
    { headers: await authHeaders() },
    '회원 목록을 불러오지 못했습니다.',
  )
}

export const syncMembers = async (input: {
  sheetUrl?: string
  csvText?: string
}): Promise<MemberSyncResult> => {
  return requestJson<MemberSyncResult>(
    '/members/sync',
    {
      method: 'POST',
      headers: await authHeaders(),
      body: JSON.stringify({
        sheet_url: input.sheetUrl || null,
        csv_text: input.csvText || null,
      }),
    },
    '회원 동기화에 실패했습니다.',
  )
}

export const resetMemberPassword = async (userId: string): Promise<void> => {
  await requestJson(
    `/members/${encodeURIComponent(userId)}/reset-password`,
    { method: 'POST', headers: await authHeaders() },
    '비밀번호 초기화에 실패했습니다.',
  )
}
