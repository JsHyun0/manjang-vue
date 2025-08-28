export interface ReservationSlot {
  id: number
  date: string // YYYY-MM-DD
  timeSlot: string // HH:MM
  name: string
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
        flattened.push({ id: Number(r.id) || 0, date, timeSlot: time, name: displayName })
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
    if (i === 0) { cur = [sorted[i]]; continue }
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

export const createReservations = async (date: string, name: string, times: string[]): Promise<void> => {
  const groups = groupContiguous(times)
  for (const group of groups) {
    const start = group[0]
    const end = nextSlot(group[group.length - 1])
    const payload = {
      reserved_by_name: name,
      title: null,
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
          addMemoryReservation(date, name, start, end)
          continue
        }
        throw new Error(msg || `Failed to create reservation (${res.status})`)
      }
    } catch (err) {
      // Network or unexpected error -> soft-fallback to local memory
      addMemoryReservation(date, name, start, end)
    }
  }
}

// ----------------------
// Local memory fallback
// ----------------------
const memoryByDate = new Map<string, ReservationSlot[]>()

const addMemoryReservation = (date: string, name: string, startTime: string, endTime: string) => {
  const slots = generateHalfHourSlotsBetween(toIsoAt(date, startTime), toIsoAt(date, endTime))
  const base = Date.now()
  const list = memoryByDate.get(date) ?? []
  slots.forEach((t, i) => {
    list.push({ id: base + i, date, timeSlot: t, name })
  })
  memoryByDate.set(date, list)
}


