import { supabase } from './supabaseClient'

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? 'http://127.0.0.1:8000'

export type TournamentStatus = 'draft' | 'open' | 'ongoing' | 'completed'
export type TournamentStage = 'group' | 'final'

export type TournamentSummary = {
  id: string
  title: string
  topic: string
  description: string
  debate_format: string
  starts_on: string
  ends_on: string
  venue: string
  status: TournamentStatus
  points_per_win: number
  team_count: number
  match_count: number
  completed_match_count: number
}

export type TournamentMember = {
  id: number
  team_id: string
  user_id: string
  name: string
  student_id: string
  major: string
  generation: string
  experience_score: number
}

export type TournamentTeam = {
  id: string
  client_key: string
  name: string
  group_name: string
  seed: number
  experience_score: number
  members: TournamentMember[]
}

export type TournamentMatch = {
  id: string
  stage: TournamentStage
  group_name: string | null
  round_label: string
  starts_at: string
  venue: string
  team_a_id: string | null
  team_b_id: string | null
  team_a_source_group: string | null
  team_b_source_group: string | null
  resolved_team_a_id: string | null
  resolved_team_b_id: string | null
  team_a_name: string
  team_b_name: string
  team_a_score: number | null
  team_b_score: number | null
  winner_team_id: string | null
  winner_team_name: string | null
  status: 'scheduled' | 'completed'
  notes: string
}

export type TournamentStanding = {
  rank: number
  team_id: string
  team_name: string
  group_name: string
  played: number
  wins: number
  losses: number
  points: number
  head_to_head_wins: number
  experience_score: number
}

export type TournamentDetail = Omit<
  TournamentSummary,
  'team_count' | 'match_count' | 'completed_match_count'
> & {
  teams: TournamentTeam[]
  matches: TournamentMatch[]
  standings: TournamentStanding[]
  progress: { total: number; completed: number }
}

export type TournamentInput = {
  title: string
  topic: string
  description: string
  debate_format: string
  starts_on: string
  ends_on: string
  venue: string
  status: TournamentStatus
  points_per_win: number
}

export type TournamentSetupTeam = {
  client_key: string
  name: string
  group_name: string
  members: Array<{ user_id: string; experience_score: number }>
}

export type TournamentSetupMatch = {
  stage: TournamentStage
  round_label: string
  starts_at: string
  venue: string
  team_a_key: string | null
  team_b_key: string | null
  team_a_source_group: string | null
  team_b_source_group: string | null
  winner_team_key: string | null
  team_a_score: number | null
  team_b_score: number | null
  status: 'scheduled' | 'completed'
  notes: string
}

const extractError = async (response: Response, fallback: string): Promise<string> => {
  try {
    const body = await response.json()
    if (typeof body?.detail === 'string') return body.detail
  } catch (_error) {
    // 응답 본문이 JSON이 아니면 기본 오류를 사용한다.
  }
  return fallback
}

const authHeaders = async (): Promise<Record<string, string>> => {
  const { data } = await supabase.auth.getSession()
  if (!data.session?.access_token) throw new Error('관리자 로그인이 필요합니다.')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.session.access_token}`,
  }
}

const request = async <T>(
  path: string,
  options: RequestInit = {},
  fallback = '요청에 실패했습니다.',
) => {
  const response = await fetch(`${API_BASE}${path}`, options)
  if (!response.ok) throw new Error(await extractError(response, fallback))
  return (await response.json()) as T
}

export const fetchTournaments = () =>
  request<TournamentSummary[]>('/tournaments', {}, '대회 목록을 불러오지 못했습니다.')

export const fetchTournament = (eventId: string) =>
  request<TournamentDetail>(
    `/tournaments/${encodeURIComponent(eventId)}`,
    {},
    '대회 정보를 불러오지 못했습니다.',
  )

export const createTournament = async (input: TournamentInput) =>
  request<TournamentDetail>(
    '/tournaments',
    { method: 'POST', headers: await authHeaders(), body: JSON.stringify(input) },
    '대회를 만들지 못했습니다.',
  )

export const updateTournament = async (eventId: string, input: TournamentInput) =>
  request<TournamentDetail>(
    `/tournaments/${encodeURIComponent(eventId)}`,
    { method: 'PATCH', headers: await authHeaders(), body: JSON.stringify(input) },
    '대회 정보를 저장하지 못했습니다.',
  )

export const saveTournamentSetup = async (
  eventId: string,
  teams: TournamentSetupTeam[],
  matches: TournamentSetupMatch[],
) =>
  request<TournamentDetail>(
    `/tournaments/${encodeURIComponent(eventId)}/setup`,
    {
      method: 'PUT',
      headers: await authHeaders(),
      body: JSON.stringify({ teams, matches }),
    },
    '팀과 일정을 저장하지 못했습니다.',
  )

export const saveTournamentMatchResult = async (
  eventId: string,
  matchId: string,
  input: { team_a_score: number; team_b_score: number; winner_team_id?: string | null },
) =>
  request<TournamentDetail>(
    `/tournaments/${encodeURIComponent(eventId)}/matches/${encodeURIComponent(matchId)}/result`,
    { method: 'PATCH', headers: await authHeaders(), body: JSON.stringify(input) },
    '경기 결과를 저장하지 못했습니다.',
  )
