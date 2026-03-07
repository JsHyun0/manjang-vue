import { supabase } from './supabaseClient'

export type DebateType = '자유토론' | 'SSU토론'
export type DebateSide = 'pro' | 'con'

export type DebateParticipantInput = {
  name: string
  userId?: string | null
}

export type DebateParticipantEntry = {
  name: string
  side: DebateSide
  userId: string | null
  major: string
  studentId: string
  generation: string
}

export type DebateParticipantsBySide<TParticipant> = {
  pro: TParticipant[]
  con: TParticipant[]
}

export type DebateSideMap<TValue> = {
  pro: TValue
  con: TValue
}

export type DebateListItem = {
  id: string
  topic: string
  participants: string[]
  participantsBySide: DebateParticipantsBySide<string>
  date: string // YYYY-MM-DD
  debateType: DebateType
  videoUrl: string
}

export type DebateAdminItem = DebateListItem & {
  notes: string
  participantEntries: DebateParticipantEntry[]
}

export type DebateUpsertInput = {
  topic: string
  date: string // YYYY-MM-DD
  debateType: DebateType
  participantsBySide: DebateParticipantsBySide<DebateParticipantInput>
  notes?: string
  videoUrl?: string
}

export type MemberSearchCandidate = {
  id: string
  name: string
  major: string
  studentId: string
  generation: string
}

type DebateRow = {
  id: string
  topic_text: string
  debate_date: string
  notes?: string | null
  debate_type?: string | null
  participant_names?: string[] | null
}

type DebateParticipantRow = {
  debate_id: string
  user_id: string | null
  side: string | null
  participant_name?: string | null
}

type UserRow = {
  id: string
  name: string | null
  email: string | null
  major?: string | null
  student_id?: string | null
  generation?: string | null
}

type LegacyParticipantEntry = {
  side?: string
  name?: string
  userId?: string | null
}

type LegacyMeta = {
  debateType?: DebateType
  participants?: string[]
  participantsBySide?: Partial<Record<DebateSide, string[]>>
  participantEntries?: LegacyParticipantEntry[]
  videoUrl?: string
}

const LEGACY_META_PREFIX = '@manjang_meta:'
const SIDES: DebateSide[] = ['pro', 'con']

let supportsExtendedColumns: boolean | null = null
let supportsParticipantNameColumn: boolean | null = null
let supportsUserGenerationColumn: boolean | null = null

const normalizeSide = (value: string | null | undefined): DebateSide => {
  return value === 'con' ? 'con' : 'pro'
}

const emptyBySide = <T>(): DebateParticipantsBySide<T> => ({
  pro: [],
  con: [],
})

const cleanDisplayName = (raw: string): string => raw.trim()

const cleanNameArray = (names: string[]): string[] => {
  const uniq = new Set<string>()
  const cleaned: string[] = []
  for (const raw of names) {
    const name = cleanDisplayName(raw)
    if (!name) continue
    const key = name.toLowerCase()
    if (uniq.has(key)) continue
    uniq.add(key)
    cleaned.push(name)
  }
  return cleaned
}

const displayUserName = (user: UserRow | undefined, fallbackId: string): string => {
  const name = user?.name?.trim()
  if (name) return name
  const email = user?.email?.trim()
  if (email) return (email.split('@')[0] || email).trim()
  return fallbackId ? `사용자-${fallbackId.slice(0, 6)}` : '사용자'
}

const toDebateType = (value: string): DebateType => {
  const raw = value.trim().toLowerCase()
  if (raw.includes('ssu')) return 'SSU토론'
  return '자유토론'
}

const normalizeVideoUrl = (rawValue: string | null | undefined): string => {
  const value = (rawValue ?? '').trim()
  if (!value) return ''

  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(value) ? value : `https://${value}`

  try {
    const parsed = new URL(candidate)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return parsed.toString()
  } catch (_error) {
    return ''
  }
}

const buildMetaLine = (meta: LegacyMeta): string => `${LEGACY_META_PREFIX}${JSON.stringify(meta)}`

const parseLegacyMeta = (rawNotes: string | null | undefined): { notes: string; meta: LegacyMeta } => {
  const notes = (rawNotes ?? '').trim()
  if (!notes) return { notes: '', meta: {} }

  const lines = notes.split('\n')
  const lastLine = (lines[lines.length - 1] ?? '').trim()
  if (!lastLine.startsWith(LEGACY_META_PREFIX)) return { notes, meta: {} }

  try {
    const parsed = JSON.parse(lastLine.slice(LEGACY_META_PREFIX.length)) as LegacyMeta
    return {
      notes: lines.slice(0, -1).join('\n').trim(),
      meta: parsed ?? {},
    }
  } catch (_error) {
    return { notes, meta: {} }
  }
}

const buildStoredNotes = (notes: string, meta: LegacyMeta): string => {
  const body = notes.trim()
  const metaLine = buildMetaLine(meta)
  return body ? `${body}\n${metaLine}` : metaLine
}

const inferDebateType = (row: DebateRow, legacyMeta: LegacyMeta): DebateType => {
  if (legacyMeta.debateType) return legacyMeta.debateType
  if (row.debate_type) return toDebateType(row.debate_type)
  const source = `${row.topic_text ?? ''} ${row.notes ?? ''}`.toLowerCase()
  return source.includes('ssu') ? 'SSU토론' : '자유토론'
}

const normalizeInputParticipants = (
  side: DebateSide,
  participants: DebateParticipantInput[],
): DebateParticipantEntry[] => {
  const out: DebateParticipantEntry[] = []
  const uniq = new Set<string>()

  for (const raw of participants) {
    const name = cleanDisplayName(raw.name)
    const userId = raw.userId?.trim() || null
    if (!name) continue
    const key = userId ? `u:${userId}` : `n:${side}:${name.toLowerCase()}`
    if (uniq.has(key)) continue
    uniq.add(key)

    out.push({
      name,
      side,
      userId,
      major: '',
      studentId: '',
      generation: '',
    })
  }

  return out
}

const entriesToBySideNames = (entries: DebateParticipantEntry[]): DebateParticipantsBySide<string> => {
  const grouped = emptyBySide<string>()
  for (const side of SIDES) {
    grouped[side] = cleanNameArray(entries.filter((entry) => entry.side === side).map((entry) => entry.name))
  }
  return grouped
}

const flattenBySideNames = (bySide: DebateParticipantsBySide<string>): string[] => {
  return cleanNameArray([...bySide.pro, ...bySide.con])
}

const legacyEntriesToBySide = (meta: LegacyMeta): DebateParticipantEntry[] => {
  const normalized: DebateParticipantEntry[] = []

  if (Array.isArray(meta.participantEntries) && meta.participantEntries.length > 0) {
    for (const raw of meta.participantEntries) {
      const name = cleanDisplayName(String(raw?.name ?? ''))
      if (!name) continue
      normalized.push({
        name,
        side: normalizeSide(raw?.side ?? null),
        userId: raw?.userId?.trim() || null,
        major: '',
        studentId: '',
        generation: '',
      })
    }
    if (normalized.length > 0) return normalized
  }

  const fromBySide: DebateParticipantEntry[] = []
  if (meta.participantsBySide) {
    for (const side of SIDES) {
      const names = Array.isArray(meta.participantsBySide[side])
        ? (meta.participantsBySide[side] as string[])
        : []
      for (const name of cleanNameArray(names.map((v) => String(v)))) {
        fromBySide.push({
          name,
          side,
          userId: null,
          major: '',
          studentId: '',
          generation: '',
        })
      }
    }
  }
  if (fromBySide.length > 0) return fromBySide

  const fallback = Array.isArray(meta.participants) ? cleanNameArray(meta.participants.map((v) => String(v))) : []
  return fallback.map((name) => ({
    name,
    side: 'pro',
    userId: null,
    major: '',
    studentId: '',
    generation: '',
  }))
}

const mergeEntries = (
  baseEntries: DebateParticipantEntry[],
  relationEntries: DebateParticipantEntry[],
): DebateParticipantEntry[] => {
  if (baseEntries.length === 0) return relationEntries
  if (relationEntries.length === 0) return baseEntries

  const merged: DebateParticipantEntry[] = [...baseEntries]

  for (const incoming of relationEntries) {
    const targetIndex = merged.findIndex((entry) => {
      if (incoming.userId && entry.userId) return incoming.userId === entry.userId
      if (incoming.userId || entry.userId) return false
      return incoming.side === entry.side && incoming.name.toLowerCase() === entry.name.toLowerCase()
    })

    if (targetIndex < 0) {
      merged.push(incoming)
      continue
    }

    merged[targetIndex] = {
      ...merged[targetIndex],
      ...incoming,
    }
  }

  const uniq = new Set<string>()
  return merged.filter((entry) => {
    const key = entry.userId ? `u:${entry.userId}` : `n:${entry.side}:${entry.name.toLowerCase()}`
    if (uniq.has(key)) return false
    uniq.add(key)
    return true
  })
}

const detectExtendedColumns = async (): Promise<boolean> => {
  if (supportsExtendedColumns !== null) return supportsExtendedColumns
  const { error } = await supabase.from('debates').select('id,debate_type,participant_names').limit(1)
  if (!error) {
    supportsExtendedColumns = true
    return true
  }
  if (/column .*debate_type.*does not exist/i.test(error.message)) {
    supportsExtendedColumns = false
    return false
  }
  if (/column .*participant_names.*does not exist/i.test(error.message)) {
    supportsExtendedColumns = false
    return false
  }
  throw new Error(error.message || '토론 스키마 확인에 실패했습니다.')
}

const detectParticipantNameColumn = async (): Promise<boolean> => {
  if (supportsParticipantNameColumn !== null) return supportsParticipantNameColumn

  const { error } = await supabase.from('debate_participants').select('id,participant_name').limit(1)
  if (!error) {
    supportsParticipantNameColumn = true
    return true
  }
  if (/column .*participant_name.*does not exist/i.test(error.message)) {
    supportsParticipantNameColumn = false
    return false
  }
  throw new Error(error.message || '토론 참가자 스키마 확인에 실패했습니다.')
}

const fetchUsersByIds = async (userIds: string[]): Promise<Map<string, UserRow>> => {
  const usersById = new Map<string, UserRow>()
  if (userIds.length === 0) return usersById

  const queryUsers = async (withGeneration: boolean): Promise<{ data: UserRow[] | null; error: any }> => {
    const selectColumns = withGeneration
      ? 'id,name,email,major,student_id,generation'
      : 'id,name,email,major,student_id'

    const { data, error } = await supabase
      .from('users')
      .select(selectColumns)
      .in('id', userIds)

    return {
      data: (data as UserRow[] | null) ?? null,
      error,
    }
  }

  const tryWithGeneration = supportsUserGenerationColumn !== false
  const first = await queryUsers(tryWithGeneration)

  if (first.error) {
    const generationMissing = /column .*generation.*does not exist/i.test(first.error.message || '')
    if (tryWithGeneration && generationMissing) {
      supportsUserGenerationColumn = false
      const fallback = await queryUsers(false)
      if (fallback.error) {
        console.warn('[debates] failed to fetch users:', fallback.error.message)
        return usersById
      }
      for (const user of fallback.data ?? []) {
        usersById.set(user.id, user)
      }
      return usersById
    }

    console.warn('[debates] failed to fetch users:', first.error.message)
    return usersById
  }

  if (tryWithGeneration) supportsUserGenerationColumn = true
  for (const user of first.data ?? []) {
    usersById.set(user.id, user)
  }
  return usersById
}

const getParticipantEntriesByDebateId = async (
  debateRows: DebateRow[],
): Promise<Map<string, DebateParticipantEntry[]>> => {
  const debateIds = debateRows.map((debate) => debate.id)
  if (debateIds.length === 0) return new Map()

  const withParticipantName = await detectParticipantNameColumn()
  const participantSelect = withParticipantName
    ? 'debate_id,user_id,side,participant_name'
    : 'debate_id,user_id,side'

  const { data: participantRows, error: participantError } = await supabase
    .from('debate_participants')
    .select(participantSelect)
    .in('debate_id', debateIds)

  if (participantError) {
    throw new Error(participantError.message || '토론 참가자 정보를 불러오지 못했습니다.')
  }

  const rows = (participantRows ?? []) as unknown as DebateParticipantRow[]
  const userIds = Array.from(
    new Set(
      rows
        .map((row) => row.user_id?.trim() || '')
        .filter((id) => !!id),
    ),
  )

  const usersById = await fetchUsersByIds(userIds)
  const entriesByDebateId = new Map<string, DebateParticipantEntry[]>()
  const uniqByDebateId = new Map<string, Set<string>>()

  for (const row of rows) {
    const side = normalizeSide(row.side)
    const userId = row.user_id?.trim() || null
    const user = userId ? usersById.get(userId) : undefined
    const fallbackName = cleanDisplayName(String(row.participant_name ?? ''))
    const name = fallbackName || (userId ? displayUserName(user, userId) : '')
    if (!name) continue

    const major = user?.major?.trim() || ''
    const studentId = user?.student_id?.trim() || ''
    const generation = user?.generation?.trim() || ''

    const dedupeKey = userId ? `u:${userId}` : `n:${side}:${name.toLowerCase()}`
    const dedupeSet = uniqByDebateId.get(row.debate_id) ?? new Set<string>()
    if (dedupeSet.has(dedupeKey)) continue
    dedupeSet.add(dedupeKey)
    uniqByDebateId.set(row.debate_id, dedupeSet)

    const list = entriesByDebateId.get(row.debate_id) ?? []
    list.push({
      name,
      side,
      userId,
      major,
      studentId,
      generation,
    })
    entriesByDebateId.set(row.debate_id, list)
  }

  return entriesByDebateId
}

const listDebateRows = async (): Promise<DebateRow[]> => {
  const { data, error } = await supabase.from('debates').select('*').order('debate_date', { ascending: true })
  if (error) throw new Error(error.message || '토론 목록을 불러오지 못했습니다.')
  return (data ?? []) as DebateRow[]
}

const buildEntriesFromRow = (
  row: DebateRow,
  meta: LegacyMeta,
  relationEntries: DebateParticipantEntry[],
): DebateParticipantEntry[] => {
  const legacyEntries = legacyEntriesToBySide(meta)
  let baseEntries = legacyEntries

  if (baseEntries.length === 0 && Array.isArray(row.participant_names) && row.participant_names.length > 0) {
    baseEntries = cleanNameArray(row.participant_names.map((v) => String(v))).map((name) => ({
      name,
      side: 'pro',
      userId: null,
      major: '',
      studentId: '',
      generation: '',
    }))
  }

  const merged = mergeEntries(baseEntries, relationEntries)
  return merged
}

const toLegacyMetaFromEntries = (
  debateType: DebateType,
  entries: DebateParticipantEntry[],
  videoUrl: string,
): LegacyMeta => {
  const participantsBySide = entriesToBySideNames(entries)
  return {
    debateType,
    participants: flattenBySideNames(participantsBySide),
    participantsBySide,
    participantEntries: entries.map((entry) => ({
      side: entry.side,
      name: entry.name,
      userId: entry.userId,
    })),
    videoUrl: videoUrl || undefined,
  }
}

const syncDebateParticipants = async (debateId: string, entries: DebateParticipantEntry[]): Promise<void> => {
  try {
    await supabase.from('debate_participants').delete().eq('debate_id', debateId)

    if (entries.length === 0) return

    const hasParticipantName = await detectParticipantNameColumn()

    if (hasParticipantName) {
      const rows = entries.map((entry) => ({
        debate_id: debateId,
        user_id: entry.userId,
        side: entry.side,
        participant_name: entry.name,
      }))

      const { error } = await supabase.from('debate_participants').insert(rows)
      if (!error) return

      // user_id가 NOT NULL인 구 스키마일 때 fallback
      const userLinkedRows = entries
        .filter((entry) => !!entry.userId)
        .map((entry) => ({
          debate_id: debateId,
          user_id: entry.userId,
          side: entry.side,
          participant_name: entry.name,
        }))
      if (userLinkedRows.length === 0) return

      const retry = await supabase.from('debate_participants').insert(userLinkedRows)
      if (retry.error) {
        console.warn('[debates] failed to sync participants:', retry.error.message)
      }
      return
    }

    const rows = entries
      .filter((entry) => !!entry.userId)
      .map((entry) => ({
        debate_id: debateId,
        user_id: entry.userId,
        side: entry.side,
      }))

    if (rows.length === 0) return

    const { error } = await supabase.from('debate_participants').insert(rows)
    if (error) {
      console.warn('[debates] failed to sync participants:', error.message)
    }
  } catch (error: any) {
    console.warn('[debates] failed to sync participants:', error?.message || error)
  }
}

const mapDebates = async (rows: DebateRow[]): Promise<DebateAdminItem[]> => {
  const relationEntriesByDebateId = await getParticipantEntriesByDebateId(rows)

  return rows.map((row) => {
    const { notes, meta } = parseLegacyMeta(row.notes)
    const relationEntries = relationEntriesByDebateId.get(row.id) ?? []
    const participantEntries = buildEntriesFromRow(row, meta, relationEntries)
    const participantsBySide = entriesToBySideNames(participantEntries)

    return {
      id: row.id,
      topic: row.topic_text,
      date: row.debate_date,
      debateType: inferDebateType(row, meta),
      videoUrl: normalizeVideoUrl(meta.videoUrl),
      participants: flattenBySideNames(participantsBySide),
      participantsBySide,
      participantEntries,
      notes,
    }
  })
}

export const listDebateItems = async (): Promise<DebateListItem[]> => {
  const rows = await listDebateRows()
  const items = await mapDebates(rows)
  return items.map(({ notes: _notes, participantEntries: _participantEntries, ...item }) => item)
}

export const listDebateAdminItems = async (): Promise<DebateAdminItem[]> => {
  const rows = await listDebateRows()
  return mapDebates(rows)
}

const normalizeUpsertEntries = (input: DebateUpsertInput): DebateParticipantEntry[] => {
  const pro = normalizeInputParticipants('pro', input.participantsBySide.pro)
  const con = normalizeInputParticipants('con', input.participantsBySide.con)
  return [...pro, ...con]
}

const buildDebatePayload = async (
  topic: string,
  date: string,
  debateType: DebateType,
  entries: DebateParticipantEntry[],
  notes: string,
  videoUrl: string,
): Promise<Record<string, any>> => {
  const hasExtended = await detectExtendedColumns()
  const participantsBySide = entriesToBySideNames(entries)
  const flattened = flattenBySideNames(participantsBySide)
  const storedNotes = buildStoredNotes(notes, toLegacyMetaFromEntries(debateType, entries, videoUrl))

  if (hasExtended) {
    return {
      topic_text: topic,
      debate_date: date,
      debate_type: debateType,
      participant_names: flattened,
      notes: storedNotes,
    }
  }

  return {
    topic_text: topic,
    debate_date: date,
    notes: storedNotes,
  }
}

export const createDebateItem = async (input: DebateUpsertInput): Promise<void> => {
  const topic = input.topic.trim()
  const date = input.date.trim()
  const notes = (input.notes ?? '').trim()
  const rawVideoUrl = (input.videoUrl ?? '').trim()
  const videoUrl = normalizeVideoUrl(rawVideoUrl)
  if (!topic) throw new Error('논제를 입력해주세요.')
  if (!date) throw new Error('날짜를 입력해주세요.')
  if (rawVideoUrl && !videoUrl) throw new Error('영상 URL 형식이 올바르지 않습니다.')

  const entries = normalizeUpsertEntries(input)
  const payload = await buildDebatePayload(topic, date, input.debateType, entries, notes, videoUrl)

  const { data, error } = await supabase.from('debates').insert(payload).select('id').single()
  if (error) throw new Error(error.message || '토론 생성에 실패했습니다.')

  const debateId = String(data?.id ?? '')
  if (debateId) {
    await syncDebateParticipants(debateId, entries)
  }
}

export const updateDebateItem = async (id: string, input: DebateUpsertInput): Promise<void> => {
  const topic = input.topic.trim()
  const date = input.date.trim()
  const notes = (input.notes ?? '').trim()
  const rawVideoUrl = (input.videoUrl ?? '').trim()
  const videoUrl = normalizeVideoUrl(rawVideoUrl)
  if (!topic) throw new Error('논제를 입력해주세요.')
  if (!date) throw new Error('날짜를 입력해주세요.')
  if (rawVideoUrl && !videoUrl) throw new Error('영상 URL 형식이 올바르지 않습니다.')

  const entries = normalizeUpsertEntries(input)
  const payload = await buildDebatePayload(topic, date, input.debateType, entries, notes, videoUrl)

  const { error } = await supabase.from('debates').update(payload).eq('id', id)
  if (error) throw new Error(error.message || '토론 수정에 실패했습니다.')

  await syncDebateParticipants(id, entries)
}

export const deleteDebateItem = async (id: string): Promise<void> => {
  const { error } = await supabase.from('debates').delete().eq('id', id)
  if (error) throw new Error(error.message || '토론 삭제에 실패했습니다.')
}

const mapToCandidate = (row: UserRow): MemberSearchCandidate => {
  return {
    id: row.id,
    name: row.name?.trim() || row.email?.split('@')[0] || '이름 미입력',
    major: row.major?.trim() || '',
    studentId: row.student_id?.trim() || '',
    generation: row.generation?.trim() || '',
  }
}

const queryMemberCandidates = async (keyword: string, limit: number): Promise<MemberSearchCandidate[]> => {
  const withGeneration = supportsUserGenerationColumn !== false
  const selectColumns = withGeneration
    ? 'id,name,email,major,student_id,generation'
    : 'id,name,email,major,student_id'

  const { data, error } = await supabase
    .from('users')
    .select(selectColumns)
    .ilike('name', `%${keyword}%`)
    .order('name', { ascending: true })
    .limit(limit)

  if (error) {
    const generationMissing = /column .*generation.*does not exist/i.test(error.message || '')
    if (withGeneration && generationMissing) {
      supportsUserGenerationColumn = false
      return queryMemberCandidates(keyword, limit)
    }
    throw new Error(error.message || '회원 이름 검색에 실패했습니다.')
  }

  if (withGeneration) supportsUserGenerationColumn = true
  const candidates = ((data ?? []) as unknown as UserRow[]).map(mapToCandidate)

  candidates.sort((a, b) => {
    const aStarts = a.name.startsWith(keyword) ? 0 : 1
    const bStarts = b.name.startsWith(keyword) ? 0 : 1
    if (aStarts !== bStarts) return aStarts - bStarts
    return a.name.localeCompare(b.name, 'ko')
  })

  return candidates
}

export const searchMemberCandidatesByName = async (
  rawKeyword: string,
  limit = 8,
): Promise<MemberSearchCandidate[]> => {
  const keyword = rawKeyword.trim()
  if (!keyword) return []

  const candidates = await queryMemberCandidates(keyword, Math.max(1, Math.min(limit, 20)))
  const uniq = new Set<string>()

  return candidates.filter((candidate) => {
    if (uniq.has(candidate.id)) return false
    uniq.add(candidate.id)
    return true
  })
}
