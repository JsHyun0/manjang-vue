export interface ReservationSlot {
  id: string
  date: string // YYYY-MM-DD
  timeSlot: string // HH:MM
  name: string
  title: string | null
  reservedBy: string | null
  startsAt: string
  endsAt: string
}

type ReservationListOptions = {
  signal?: AbortSignal
}

export const generateTimeSlots = (): string[] => {
  const slots: string[] = []
  for (let hour = 8; hour <= 23; hour++) {
    const hh = hour.toString().padStart(2, '0')
    slots.push(`${hh}:00`)
    slots.push(`${hh}:30`)
  }
  return slots
}

const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? 'http://127.0.0.1:8000'
const RANGE_CACHE_TTL_MS = 10_000

const rangeCache = new Map<string, { expiresAt: number; data: Record<string, ReservationSlot[]> }>()

type ApiReservation = {
  id: string
  reserved_by?: string | null
  reserved_by_name?: string | null
  title?: string | null
  starts_at: string // ISO
  ends_at: string // ISO
  debate_id?: string | null
}

type ReservationUpdatePayload = {
  reservedByName: string
  title?: string | null
}

const pad = (n: number) => n.toString().padStart(2, '0')
const toIsoAt = (date: string, time: string) => {
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const baseUtc = Date.UTC(year, month - 1, day, 0, 0, 0)
  const totalMinutes = hour * 60 + minute
  return new Date(baseUtc + totalMinutes * 60000).toISOString()
}

const parseIsoToDate = (iso: string) => new Date(iso)
const minutesBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 60000)
const addDaysToDateKey = (dateKey: string, days: number): string => {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  date.setUTCDate(date.getUTCDate() + days)
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`
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

const isAbortError = (error: unknown): boolean => {
  return error instanceof DOMException && error.name === 'AbortError'
}

const cloneByDate = (
  byDate: Record<string, ReservationSlot[]>,
  dateKeys: string[],
): Record<string, ReservationSlot[]> => {
  const cloned: Record<string, ReservationSlot[]> = {}
  dateKeys.forEach((dateKey) => {
    cloned[dateKey] = [...(byDate[dateKey] ?? [])]
  })
  return cloned
}

const buildRangeCacheKey = (dateKeys: string[]): string => dateKeys.join('|')

const pruneRangeCache = () => {
  const now = Date.now()
  rangeCache.forEach((entry, key) => {
    if (entry.expiresAt <= now) {
      rangeCache.delete(key)
    }
  })
}

const invalidateRangeCache = () => {
  rangeCache.clear()
}

const isMemoryReservationId = (reservationId: string): boolean => reservationId.startsWith('memory-')

const parseApiReservationId = (reservation: ApiReservation): string => {
  const id = reservation.id?.trim()
  if (!id) return `memory-remote-${reservation.starts_at}-${reservation.ends_at}-${reservation.reserved_by_name ?? 'anon'}`
  return id
}

export const listReservationsByDate = async (
  date: string,
  options: ReservationListOptions = {},
): Promise<ReservationSlot[]> => {
  try {
    const res = await fetch(`${API_BASE}/reservations?date=${encodeURIComponent(date)}`, {
      signal: options.signal,
    })
    if (!res.ok) throw new Error(`Failed to fetch reservations: ${res.status}`)
    const data: ApiReservation[] = await res.json()
    const flattened: ReservationSlot[] = []
    for (const r of data) {
      const slots = generateHalfHourSlotsBetween(r.starts_at, r.ends_at)
      for (const time of slots) {
        const displayName = r.reserved_by_name || r.reserved_by || '익명'
        flattened.push({
          id: parseApiReservationId(r),
          date,
          timeSlot: time,
          name: displayName,
          title: r.title?.trim() || null,
          reservedBy: r.reserved_by ?? null,
          startsAt: r.starts_at,
          endsAt: r.ends_at,
        })
      }
    }
    // merge with local memory
    const mem = memoryByDate.get(date) ?? []
    return [...flattened, ...mem]
  } catch (e) {
    if (isAbortError(e)) throw e
    console.error(e)
    // fallback to local memory cache
    return memoryByDate.get(date) ?? []
  }
}

export const listReservationsByDateRange = async (
  dateKeys: string[],
  options: ReservationListOptions = {},
): Promise<Record<string, ReservationSlot[]>> => {
  const uniqueSorted = Array.from(new Set(dateKeys)).sort()
  if (uniqueSorted.length === 0) return {}

  pruneRangeCache()
  const cacheKey = buildRangeCacheKey(uniqueSorted)
  const cached = rangeCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cloneByDate(cached.data, uniqueSorted)
  }

  const requested = new Set(uniqueSorted)
  const first = uniqueSorted[0]
  const last = uniqueSorted[uniqueSorted.length - 1]
  const endExclusive = addDaysToDateKey(last, 1)

  try {
    const res = await fetch(
      `${API_BASE}/reservations?start=${encodeURIComponent(first)}&end=${encodeURIComponent(endExclusive)}`,
      { signal: options.signal },
    )
    if (!res.ok) throw new Error(`Failed to fetch range reservations: ${res.status}`)
    const data: ApiReservation[] = await res.json()

    const byDate: Record<string, ReservationSlot[]> = {}
    uniqueSorted.forEach((dateKey) => {
      byDate[dateKey] = [...(memoryByDate.get(dateKey) ?? [])]
    })

    for (const r of data) {
      const dateKey = r.starts_at.slice(0, 10)
      if (!requested.has(dateKey)) continue
      const slots = generateHalfHourSlotsBetween(r.starts_at, r.ends_at)
      const displayName = r.reserved_by_name || r.reserved_by || '익명'
      for (const time of slots) {
        byDate[dateKey].push({
          id: parseApiReservationId(r),
          date: dateKey,
          timeSlot: time,
          name: displayName,
          title: r.title?.trim() || null,
          reservedBy: r.reserved_by ?? null,
          startsAt: r.starts_at,
          endsAt: r.ends_at,
        })
      }
    }

    rangeCache.set(cacheKey, {
      expiresAt: Date.now() + RANGE_CACHE_TTL_MS,
      data: cloneByDate(byDate, uniqueSorted),
    })
    return byDate
  } catch (e) {
    if (isAbortError(e)) throw e
    console.error(e)
    const entries = await Promise.all(
      uniqueSorted.map(
        async (dateKey) => [dateKey, await listReservationsByDate(dateKey, { signal: options.signal })] as const,
      ),
    )
    const fallback: Record<string, ReservationSlot[]> = {}
    entries.forEach(([dateKey, list]) => {
      fallback[dateKey] = list
    })
    rangeCache.set(cacheKey, {
      expiresAt: Date.now() + RANGE_CACHE_TTL_MS,
      data: cloneByDate(fallback, uniqueSorted),
    })
    return fallback
  }
}

const nextSlot = (time: string): string => {
  const [hh, mm] = time.split(':').map(Number)
  const date = new Date(Date.UTC(2000, 0, 1, hh, mm))
  date.setUTCMinutes(date.getUTCMinutes() + 30)
  if (date.getUTCDate() !== 1) return '24:00'
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
  debateId?: string | null,
  title?: string | null,
  reservedBy?: string | null,
): Promise<void> => {
  const normalizedTitle = title?.trim() || null
  const normalizedReservedBy = reservedBy?.trim() || null
  const groups = groupContiguous(times)
  for (const group of groups) {
    const start = group[0]
    const end = nextSlot(group[group.length - 1])
    const payload = {
      reserved_by_name: name,
      title: normalizedTitle,
      starts_at: toIsoAt(date, start),
      ends_at: toIsoAt(date, end),
      debate_id: debateId || null,
      reserved_by: normalizedReservedBy,
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
          addMemoryReservation(date, name, start, end)
          continue
        }
        throw new Error(msg || `Failed to create reservation (${res.status})`)
      }
      invalidateRangeCache()
    } catch (err) {
      // Network or unexpected error -> soft-fallback to local memory
      addMemoryReservation(date, name, start, end)
    }
  }
}

export const updateReservation = async (
  reservationId: string,
  payload: ReservationUpdatePayload,
): Promise<void> => {
  const normalizedName = payload.reservedByName.trim()
  const normalizedTitle = payload.title?.trim() || null
  if (!normalizedName) {
    throw new Error('예약자 이름은 비워둘 수 없습니다.')
  }

  if (isMemoryReservationId(reservationId)) {
    updateMemoryReservation(reservationId, normalizedName, normalizedTitle)
    return
  }

  const res = await fetch(`${API_BASE}/reservations/${encodeURIComponent(reservationId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reserved_by_name: normalizedName,
      title: normalizedTitle,
    }),
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || `Failed to update reservation (${res.status})`)
  }
  invalidateRangeCache()
}

export const deleteReservation = async (reservationId: string): Promise<void> => {
  if (isMemoryReservationId(reservationId)) {
    deleteMemoryReservation(reservationId)
    return
  }

  const res = await fetch(`${API_BASE}/reservations/${encodeURIComponent(reservationId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const msg = await res.text().catch(() => '')
    throw new Error(msg || `Failed to delete reservation (${res.status})`)
  }
  invalidateRangeCache()
}

// ----------------------
// Local memory fallback
// ----------------------
const memoryByDate = new Map<string, ReservationSlot[]>()

const addMemoryReservation = (date: string, name: string, startTime: string, endTime: string) => {
  const slots = generateHalfHourSlotsBetween(toIsoAt(date, startTime), toIsoAt(date, endTime))
  const memoryId = `memory-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const list = memoryByDate.get(date) ?? []
  const startsAt = toIsoAt(date, startTime)
  const endsAt = toIsoAt(date, endTime)
  slots.forEach((t) => {
    list.push({
      id: memoryId,
      date,
      timeSlot: t,
      name,
      title: null,
      reservedBy: null,
      startsAt,
      endsAt,
    })
  })
  memoryByDate.set(date, list)
  invalidateRangeCache()
}

const updateMemoryReservation = (reservationId: string, reservedByName: string, title: string | null) => {
  memoryByDate.forEach((slots, dateKey) => {
    const next = slots.map((slot) => {
      if (slot.id !== reservationId) return slot
      return {
        ...slot,
        name: reservedByName,
        title,
      }
    })
    memoryByDate.set(dateKey, next)
  })
  invalidateRangeCache()
}

const deleteMemoryReservation = (reservationId: string) => {
  memoryByDate.forEach((slots, dateKey) => {
    const next = slots.filter((slot) => slot.id !== reservationId)
    memoryByDate.set(dateKey, next)
  })
  invalidateRangeCache()
}
