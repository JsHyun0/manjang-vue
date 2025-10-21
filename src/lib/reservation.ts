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

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? 'http://0.0.0.0:8000'

type ApiReservation = {
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
    const res = await fetch(`${API_BASE}/reservations?date=${encodeURIComponent(date)}`)
    if (!res.ok) throw new Error(`Failed to fetch reservations: ${res.status}`)
    const data: ApiReservation[] = await res.json()
    const flattened: ReservationSlot[] = []
    for (const r of data) {
      const slots = generateHalfHourSlotsBetween(r.starts_at, r.ends_at)
      for (const time of slots) {
        const displayName = r.reserved_by_name || r.reserved_by || '익명'
        const title = r.title ?? null
        flattened.push({ id: r.id, date, timeSlot: time, name: displayName, title })
      }
    }
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
  const res = await fetch(`${API_BASE}/reservations/month?date=${encodeURIComponent(anyDateInMonth)}`)
  if (!res.ok) throw new Error(`Failed to fetch month reservations: ${res.status}`)
  const data: ApiReservation[] = await res.json()
  const byDate: Record<string, ReservationSlot[]> = {}
  for (const r of data) {
    const slots = generateHalfHourSlotsBetween(r.starts_at, r.ends_at)
    const dateKey = r.starts_at.slice(0, 10) // YYYY-MM-DD
    const displayName = r.reserved_by_name || r.reserved_by || '익명'
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
      const res = await fetch(`${API_BASE}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const msg = await res.text().catch(() => '')
        // If backend table is missing or server error, store locally as a soft-fallback
        if (res.status >= 500 || /relation .*reservations.* does not exist/i.test(msg)) {
          addMemoryReservation(date, name, start, end, title ?? null)
          continue
        }
        throw new Error(msg || `Failed to create reservation (${res.status})`)
      }
    } catch (err) {
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
  slots.forEach((t, i) => {
    list.push({ id: groupId, date, timeSlot: t, name, title: title ?? null })
  })
  memoryByDate.set(date, list)
}

export const updateReservation = async (
  id: string,
  fields: { reserved_by_name?: string; title?: string | null },
): Promise<void> => {
  try {
    const res = await fetch(`${API_BASE}/reservations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reserved_by_name: fields.reserved_by_name,
        title: fields.title ?? null,
      }),
    })
    if (!res.ok) {
      const msg = await res.text().catch(() => '')
      throw new Error(msg || `Failed to update reservation (${res.status})`)
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
    const res = await fetch(`${API_BASE}/reservations/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const msg = await res.text().catch(() => '')
      throw new Error(msg || `Failed to delete reservation (${res.status})`)
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
