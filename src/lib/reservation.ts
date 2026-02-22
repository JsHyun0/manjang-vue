import { supabase } from './supabaseClient'

export interface ReservationSlot {
  id: string // backend uuid or memory id like "mem-..."
  date: string // YYYY-MM-DD
  timeSlot: string // HH:MM
  name: string
  title?: string | null
}

export type EventRect = {
  start: number
  span: number
  lane: number
  name: string
  title?: string | null
}

export const generateTimeSlots = (): string[] => {
  const slots: string[] = []
  for (let hour = 8; hour <= 23; hour++) {
    const hh = hour.toString().padStart(2, '0')
    slots.push(`${hh}:00`)
    if (hour < 23) slots.push(`${hh}:30`)
  }
  return slots
}

type ReservationRow = {
  id: string
  reserved_by?: string | null
  reserved_by_name?: string | null
  title?: string | null
  starts_at: string // ISO
  ends_at: string // ISO
  debate_id?: string | null
}

const pad = (n: number) => n.toString().padStart(2, '0')
const toIsoAt = (date: string, time: string) => `${date}T${time}:00Z`

const parseIsoToDate = (iso: string) => new Date(iso)
const minutesBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60000)
const toYmdUtc = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const parseYmdAsUtc = (ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map((v) => Number(v))
  return new Date(Date.UTC(y, m - 1, d))
}
const addUtcDays = (ymd: string, days: number): string => {
  const d = parseYmdAsUtc(ymd)
  d.setUTCDate(d.getUTCDate() + days)
  return toYmdUtc(d)
}
const displayNameOf = (row: ReservationRow) => row.reserved_by_name || row.reserved_by || '익명'
const rowToSlots = (row: ReservationRow, date: string): ReservationSlot[] => {
  const slots = generateHalfHourSlotsBetween(row.starts_at, row.ends_at)
  const name = displayNameOf(row)
  const title = row.title ?? null
  return slots.map((time) => ({ id: row.id, date, timeSlot: time, name, title }))
}
const monthWindowFrom = (
  anyDateInMonth: string,
): { startIso: string; endExclusiveIso: string } => {
  const [year, month] = anyDateInMonth.split('-').map((v) => Number(v))
  const prevMonthStart = new Date(Date.UTC(year, month - 2, 1, 0, 0, 0))
  const monthAfterNextStart = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0))
  return {
    startIso: prevMonthStart.toISOString(),
    endExclusiveIso: monthAfterNextStart.toISOString(),
  }
}

const generateHalfHourSlotsBetween = (startIso: string, endIso: string): string[] => {
  const start = parseIsoToDate(startIso)
  const end = parseIsoToDate(endIso)
  const total = minutesBetween(start, end)
  const steps = Math.max(0, Math.floor(total / 30))
  const slots: string[] = []
  for (let i = 0; i < steps; i++) {
    const d = new Date(start.getTime() + i * 30 * 60000)
    slots.push(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`)
  }
  return slots
}

export const listReservationsByDate = async (date: string): Promise<ReservationSlot[]> => {
  try {
    const dayStart = `${date}T00:00:00Z`
    const nextDayStart = `${addUtcDays(date, 1)}T00:00:00Z`
    const { data, error } = await supabase
      .from('reservations')
      .select('id,reserved_by,reserved_by_name,title,starts_at,ends_at,debate_id')
      .gte('starts_at', dayStart)
      .lt('starts_at', nextDayStart)
      .order('starts_at', { ascending: true })
    if (error) throw new Error(error.message || 'Failed to fetch reservations')
    const flattened = (data ?? []).flatMap((row) => rowToSlots(row as ReservationRow, date))
    // merge with local memory
    const mem = memoryByDate.get(date) ?? []
    return [...flattened, ...mem]
  } catch (e) {
    console.error(e)
    // fallback to local memory cache
    return memoryByDate.get(date) ?? []
  }
}

export const listReservationsAroundMonth = async (
  anyDateInMonth: string,
): Promise<Record<string, ReservationSlot[]>> => {
  // returns map: YYYY-MM-DD -> slots[]
  const { startIso, endExclusiveIso } = monthWindowFrom(anyDateInMonth)
  const { data, error } = await supabase
    .from('reservations')
    .select('id,reserved_by,reserved_by_name,title,starts_at,ends_at,debate_id')
    .gte('starts_at', startIso)
    .lt('starts_at', endExclusiveIso)
    .order('starts_at', { ascending: true })
  if (error) throw new Error(error.message || 'Failed to fetch month reservations')
  const byDate: Record<string, ReservationSlot[]> = {}
  for (const row of data ?? []) {
    const r = row as ReservationRow
    const slots = generateHalfHourSlotsBetween(r.starts_at, r.ends_at)
    const dateKey = r.starts_at.slice(0, 10) // YYYY-MM-DD
    const displayName = displayNameOf(r)
    const title = r.title ?? null
    byDate[dateKey] = byDate[dateKey] ?? []
    for (const t of slots) {
      byDate[dateKey].push({ id: r.id, date: dateKey, timeSlot: t, name: displayName, title })
    }
  }
  return byDate
}

const nextSlot = (time: string): string => {
  const [hh, mm] = time.split(':').map(Number)
  const date = new Date(Date.UTC(2000, 0, 1, hh, mm))
  date.setUTCMinutes(date.getUTCMinutes() + 30)
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`
}

const groupContiguous = (times: string[]): string[][] => {
  const sorted = Array.from(new Set(times)).sort()
  const groups: string[][] = []
  let cur: string[] = []
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0) {
      cur = [sorted[i]]
      continue
    }
    const prev = sorted[i - 1]
    const t = sorted[i]
    if (nextSlot(prev) === t) {
      cur.push(t)
    } else {
      groups.push(cur)
      cur = [t]
    }
  }
  if (cur.length) groups.push(cur)
  return groups
}

export const createReservations = async (
  date: string,
  name: string,
  times: string[],
  title?: string | null,
): Promise<void> => {
  const groups = groupContiguous(times)
  for (const group of groups) {
    const start = group[0]
    const end = nextSlot(group[group.length - 1])
    const payload = {
      reserved_by_name: name,
      title: title ?? null,
      starts_at: toIsoAt(date, start),
      ends_at: toIsoAt(date, end),
      debate_id: null,
    }
    try {
      const { error } = await supabase.from('reservations').insert(payload)
      if (error) {
        const msg = error.message || 'Failed to create reservation'
        // If table is missing, store locally as a soft-fallback
        if (/relation .*reservations.* does not exist/i.test(msg)) {
          addMemoryReservation(date, name, start, end, title ?? null)
          continue
        }
        throw new Error(msg)
      }
    } catch (_err) {
      // Network or unexpected error -> soft-fallback to local memory
      addMemoryReservation(date, name, start, end, title ?? null)
    }
  }
}

// ----------------------
// Local memory fallback
// ----------------------
const memoryByDate = new Map<string, ReservationSlot[]>()

const addMemoryReservation = (
  date: string,
  name: string,
  startTime: string,
  endTime: string,
  title?: string | null,
) => {
  const slots = generateHalfHourSlotsBetween(toIsoAt(date, startTime), toIsoAt(date, endTime))
  const groupId = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const list = memoryByDate.get(date) ?? []
  slots.forEach((t) => {
    list.push({ id: groupId, date, timeSlot: t, name, title: title ?? null })
  })
  memoryByDate.set(date, list)
}

export const updateReservation = async (
  id: string,
  fields: { reserved_by_name?: string; title?: string | null },
): Promise<void> => {
  try {
    const payload: { reserved_by_name?: string; title?: string | null } = {}
    if (fields.reserved_by_name !== undefined) payload.reserved_by_name = fields.reserved_by_name
    if ('title' in fields) payload.title = fields.title ?? null
    if (Object.keys(payload).length === 0) return

    const { error } = await supabase.from('reservations').update(payload).eq('id', id)
    if (error) {
      throw new Error(error.message || 'Failed to update reservation')
    }
  } catch (_e) {
    // memory fallback: update all slots with the same id
    for (const [d, list] of memoryByDate.entries()) {
      let changed = false
      for (const slot of list) {
        if (slot.id === id) {
          if (fields.reserved_by_name) slot.name = fields.reserved_by_name
          if ('title' in fields) slot.title = fields.title ?? null
          changed = true
        }
      }
      if (changed) memoryByDate.set(d, list)
    }
  }
}

export const deleteReservation = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase.from('reservations').delete().eq('id', id)
    if (error) {
      throw new Error(error.message || 'Failed to delete reservation')
    }
  } catch (_e) {
    // memory fallback: remove all slots with the same id
    for (const [d, list] of memoryByDate.entries()) {
      const next = list.filter((s) => s.id !== id)
      if (next.length !== list.length) memoryByDate.set(d, next)
    }
  }
}

// ----------------------
// Event rectangles helper
// ----------------------
export const computeEventRects = (
  date: string,
  reservations: ReservationSlot[],
  timeSlots: string[],
): EventRect[] => {
  const toIndex = new Map<string, number>()
  for (let i = 0; i < timeSlots.length; i++) toIndex.set(timeSlots[i], i)

  // key -> { name, title, indices }
  const keyTo = new Map<string, { name: string; title: string | null; indices: number[] }>()
  for (const r of reservations) {
    if (r.date !== date) continue
    const idx = toIndex.get(r.timeSlot)
    if (idx === undefined || idx < 0) continue
    const key = r.id ? `id:${r.id}` : `name:${r.name}|title:${r.title ?? ''}`
    const bucket = keyTo.get(key) ?? { name: r.name, title: r.title ?? null, indices: [] }
    bucket.indices.push(idx)
    keyTo.set(key, bucket)
  }

  type Interval = { name: string; title: string | null; start: number; end: number }
  const intervals: Interval[] = []
  for (const { name, title, indices } of keyTo.values()) {
    indices.sort((a, b) => a - b)
    let s = -1
    let p = -2
    for (const i of indices) {
      if (i === p + 1) {
        // extend
      } else {
        if (s !== -1) intervals.push({ name, title, start: s, end: p })
        s = i
      }
      p = i
    }
    if (s !== -1) intervals.push({ name, title, start: s, end: p })
  }

  // lane assignment (interval graph coloring)
  intervals.sort((a, b) => a.start - b.start || b.end - a.end)
  const laneEnds: number[] = [] // exclusive end index for each lane
  const rects: EventRect[] = []
  for (const it of intervals) {
    let lane = 0
    while (lane < laneEnds.length && laneEnds[lane] > it.start) lane++
    if (lane === laneEnds.length) laneEnds.push(it.end + 1)
    else laneEnds[lane] = it.end + 1
    rects.push({
      start: it.start,
      span: it.end - it.start + 1,
      lane,
      name: it.name,
      title: it.title,
    })
  }
  return rects
}
