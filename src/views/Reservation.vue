<template>
  <div class="reservation-page">
    <main class="layout">
      <section class="reservation-shell">
        <section class="workspace">
          <div class="schedule-panel">
            <header class="schedule-head">
              <div class="schedule-title-group">
                <h2 class="schedule-range">{{ currentMonthLabel }}</h2>
              </div>

              <div class="nav-controls">
                <button
                  class="nav-triangle prev"
                  type="button"
                  :aria-label="isMobile ? '이전 2일' : '이전 주'"
                  @click="movePeriod(-1)"
                />
                <button class="today-btn" type="button" @click="goToToday">오늘</button>
                <button
                  class="nav-triangle next"
                  type="button"
                  :aria-label="isMobile ? '다음 2일' : '다음 주'"
                  @click="movePeriod(1)"
                />
              </div>
            </header>

            <div
              ref="weekScrollerRef"
              class="week-scroller"
              :style="{
                '--slot-count': String(timeSlots.length),
                '--slot-height': `${slotHeight}px`,
                '--day-count': String(weekDays.length),
                '--day-min-width': isMobile ? '136px' : '148px',
              }"
              @mousedown="onWeekScrollerMouseDown"
            >
              <div class="week-grid-wrap" :class="periodAnimationClass">
                <div class="week-grid">
                  <div class="corner-head">시간</div>

                  <div
                    v-for="day in weekDays"
                    :key="`head-${day.key}`"
                    class="day-head"
                    :class="{ 'is-today': isToday(day.key), 'is-past': isPastDate(day.key) }"
                  >
                    <span class="day-display">{{ day.day }}일 ({{ day.weekday }})</span>
                  </div>

                  <div class="time-column">
                    <div
                      v-for="time in timeSlots"
                      :key="`axis-${time}`"
                      class="time-slot-label"
                      :class="{ 'is-boundary': isHalfHourMark(time) }"
                    >
                      <span v-if="isHourMark(time)">{{ formatHourLabel(time) }}</span>
                    </div>
                    <div class="time-slot-label final">24시</div>
                  </div>

                  <div
                    v-for="day in weekDays"
                    :key="`col-${day.key}`"
                    class="day-column"
                    :class="{ 'is-today': isToday(day.key), 'is-past': isPastDate(day.key) }"
                  >
                    <div class="slot-grid">
                      <button
                        v-for="time in timeSlots"
                        :key="`${day.key}-${time}`"
                        class="slot-cell"
                        :class="{
                          'is-boundary': isHalfHourMark(time),
                          'is-selected': isSelected(day.key, time),
                          'is-reserved': isReservedTime(day.key, time),
                          'is-disabled': isUnavailableSlot(day.key, time),
                          'is-past-slot': isPastSlot(day.key, time),
                        }"
                        :disabled="isUnavailableSlot(day.key, time) || isSubmitting"
                        @mousedown="onSlotMouseDown(day.key, time, $event)"
                        @mouseenter="onSlotMouseEnter(day.key, time)"
                        @click="onSlotClick(day.key, time)"
                      />
                    </div>

                    <div class="overlay-layer">
                      <div
                        v-for="ev in eventRectsByDate[day.key] ?? []"
                        :key="`ev-${day.key}-${ev.start}-${ev.span}-${ev.lane}-${ev.name}`"
                        class="event-block"
                        :title="`${ev.name} (${ev.startLabel}~${ev.endLabel})`"
                        :style="eventBlockStyle(ev)"
                      >
                        <span class="event-name">{{ ev.name }}</span>
                        <span class="event-time">{{ ev.startLabel }}~{{ ev.endLabel }}</span>
                      </div>

                      <div
                        v-for="sb in selectedBlocksByDate[day.key] ?? []"
                        :key="`sel-${day.key}-${sb.start}-${sb.span}`"
                        class="selection-block confirmed"
                        :style="selectionBlockStyle(sb)"
                      />

                      <div
                        v-if="dragPreview && dragPreview.date === day.key"
                        class="selection-block preview"
                        :style="selectionBlockStyle(dragPreview)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="isLoadingWeek" class="loading-overlay">예약 현황을 불러오는 중입니다...</div>
            </div>
          </div>

          <aside class="booking-panel">
            <section class="form-card card-panel">
              <div class="form-head">
                <h3>예약 정보</h3>
              </div>

              <div class="field-group">
                <div class="field">
                  <label class="label" for="reserver-name">예약자 이름</label>
                  <input
                    id="reserver-name"
                    class="input"
                    v-model="reservationForm.name"
                    placeholder="예약자 이름을 입력하세요"
                    autocomplete="name"
                  />
                </div>

                <div class="field">
                  <label class="label" for="schedule-mode">토론 일정 연동</label>
                  <select id="schedule-mode" class="select" v-model="reservationForm.scheduleMode">
                    <option value="none">선택 안 함</option>
                    <option value="debate">등록된 토론에서 선택</option>
                    <option value="custom">직접 용도 입력</option>
                  </select>

                  <template v-if="reservationForm.scheduleMode === 'debate'">
                    <select id="debate-schedule" class="select" v-model="reservationForm.debateId">
                      <option value="">
                        {{
                          isLoadingDebateSchedules
                            ? '토론 일정 불러오는 중...'
                            : filteredDebateSchedules.length > 0
                              ? '토론 일정을 선택하세요'
                              : '선택 가능한 토론 일정이 없습니다'
                        }}
                      </option>
                      <option v-for="debate in filteredDebateSchedules" :key="debate.id" :value="debate.id">
                        {{ formatDebateScheduleLabel(debate) }}
                      </option>
                    </select>
                    <p class="field-help">
                      {{ debateFilterLabel }} 이후 일정만 표시됩니다.
                    </p>
                    <p v-if="debateScheduleLoadError" class="field-help is-error">{{ debateScheduleLoadError }}</p>
                  </template>

                  <template v-else-if="reservationForm.scheduleMode === 'custom'">
                    <input
                      id="custom-purpose"
                      class="input"
                      v-model="reservationForm.customPurpose"
                      placeholder="예: 스터디 모임, 연습 토론 준비"
                      maxlength="80"
                    />
                    <p class="field-help">등록되지 않은 일정은 용도를 직접 입력해 예약할 수 있습니다.</p>
                  </template>
                </div>
              </div>

              <div
                v-if="submitFeedback"
                class="feedback-banner"
                :class="`is-${submitFeedback.type}`"
              >
                {{ submitFeedback.message }}
              </div>

              <button
                class="btn-primary wide"
                type="button"
                :disabled="isSubmitDisabled"
                @click="handleReservation"
              >
                {{ isSubmitting ? '예약 처리 중...' : actionLabel }}
              </button>
            </section>
          </aside>
        </section>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  createReservations,
  generateTimeSlots,
  listReservationsByDateRange,
  type ReservationSlot,
} from '@/lib/reservation'
import { listDebateItems, type DebateListItem } from '@/lib/debates'
import { useAuth } from '@/lib/auth'

type WeekDay = {
  date: Date
  key: string
  weekday: string
  day: number
}

type RangeBlock = { start: number; span: number }
type DragPreview = RangeBlock & { date: string }
type EventRect = RangeBlock & { lane: number; name: string; startLabel: string; endLabel: string }
type FeedbackState = { type: 'success' | 'error'; message: string } | null
type ScheduleMode = 'none' | 'debate' | 'custom'
type ReservationFormState = {
  name: string
  scheduleMode: ScheduleMode
  debateId: string
  customPurpose: string
}

const weekdayNames = ['일', '월', '화', '수', '목', '금', '토']
const timeSlots = generateTimeSlots()
const slotHeight = 24

const pad = (n: number) => n.toString().padStart(2, '0')
const formatDateKey = (date: Date): string =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())
const addDays = (date: Date, days: number): Date => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}
const startOfWeekSunday = (date: Date): Date => {
  const start = startOfDay(date)
  start.setDate(start.getDate() - start.getDay())
  return start
}
const toMinutes = (time: string): number => {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}
const addHalfHour = (time: string): string => {
  const [h, m] = time.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return ''
  const total = h * 60 + m + 30
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`
}
const isHourMark = (time: string) => time.endsWith(':00')
const isHalfHourMark = (time: string) => time.endsWith(':30')
const formatHourLabel = (time: string) => {
  const hour = Number(time.split(':')[0])
  return `${hour.toString().padStart(2, '0')}시`
}
const formatDuration = (slotCount: number): string => {
  if (slotCount <= 0) return '0분'

  const totalMinutes = slotCount * 30
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours && minutes) return `${hours}시간 ${minutes}분`
  if (hours) return `${hours}시간`
  return `${minutes}분`
}
const currentDateKey = () => formatDateKey(new Date())
const formatKoreanDate = (dateKey: string): string => {
  const [year, month, day] = dateKey.split('-').map(Number)
  if (!year || !month || !day) return dateKey
  return `${year}년 ${month}월 ${day}일`
}
const buildInitialReservationForm = (): ReservationFormState => ({
  name: '',
  scheduleMode: 'none',
  debateId: '',
  customPurpose: '',
})

const weekAnchor = ref<Date>(startOfDay(new Date()))
const reservationForm = ref<ReservationFormState>(buildInitialReservationForm())
const weekScrollerRef = ref<HTMLElement | null>(null)
const selectedSet = ref<Set<string>>(new Set())
const debateSchedules = ref<DebateListItem[]>([])
const isLoadingDebateSchedules = ref(false)
const debateScheduleLoadError = ref('')
const hasLoadedDebateSchedules = ref(false)
const selectedDebateId = computed(() =>
  reservationForm.value.scheduleMode === 'debate' ? reservationForm.value.debateId || null : null,
)
const customPurposeTitle = computed(() =>
  reservationForm.value.scheduleMode === 'custom' ? reservationForm.value.customPurpose.trim() : '',
)

const refreshDebateSchedules = async () => {
  isLoadingDebateSchedules.value = true
  debateScheduleLoadError.value = ''
  try {
    debateSchedules.value = await listDebateItems()
    hasLoadedDebateSchedules.value = true
  } catch (e: any) {
    debateScheduleLoadError.value = e?.message || '토론 일정 목록을 불러오지 못했습니다.'
    debateSchedules.value = []
  } finally {
    isLoadingDebateSchedules.value = false
  }
}

const isMobile = ref(false)
const isSubmitting = ref(false)
const submitFeedback = ref<FeedbackState>(null)
const updateViewportMode = () => {
  isMobile.value = window.innerWidth <= 960
}

const reservationsByDate = ref<Record<string, ReservationSlot[]>>({})
const isLoadingWeek = ref(false)
let fetchRequestId = 0
const periodAnimationClass = ref('')
let periodAnimationTimer: number | null = null

const isDragging = ref(false)
const dragDateKey = ref<string | null>(null)
const dragStartTime = ref<string | null>(null)
const dragCurrentTime = ref<string | null>(null)
let baseSetDuringDrag = new Set<string>()
let suppressClickSelection = false
let isHorizontalDragging = false
let dragScrollStartX = 0
let dragScrollStartLeft = 0

const { isLoggedIn, userName } = useAuth()
const fillNameFromAuth = () => {
  if (isLoggedIn.value && !reservationForm.value.name) {
    reservationForm.value.name = userName.value
  }
}
fillNameFromAuth()
watch([isLoggedIn, userName], fillNameFromAuth)

const visibleDayCount = computed(() => (isMobile.value ? 2 : 7))
const displayStartDate = computed(() =>
  isMobile.value ? startOfDay(weekAnchor.value) : startOfWeekSunday(weekAnchor.value),
)

const weekDays = computed<WeekDay[]>(() => {
  const start = displayStartDate.value
  return Array.from({ length: visibleDayCount.value }, (_, i) => {
    const date = addDays(start, i)
    return {
      date,
      key: formatDateKey(date),
      weekday: weekdayNames[date.getDay()],
      day: date.getDate(),
    }
  })
})

const weekDateKeys = computed(() => weekDays.value.map((day) => day.key))
const currentMonthLabel = computed(() => {
  const anchor = weekAnchor.value
  return `${anchor.getFullYear()}년 ${anchor.getMonth() + 1}월`
})
const selectedStartSlot = computed<{ dateKey: string; time: string } | null>(() => {
  let earliest: { dateKey: string; time: string } | null = null
  selectedSet.value.forEach((key) => {
    const parsed = parseSlotKey(key)
    if (
      !earliest ||
      parsed.dateKey < earliest.dateKey ||
      (parsed.dateKey === earliest.dateKey && parsed.time < earliest.time)
    ) {
      earliest = parsed
    }
  })
  return earliest
})
const debateFilterDateKey = computed(() => selectedStartSlot.value?.dateKey ?? currentDateKey())
const filteredDebateSchedules = computed(() =>
  debateSchedules.value.filter((debate) => debate.date >= debateFilterDateKey.value),
)
const debateFilterLabel = computed(() => formatKoreanDate(debateFilterDateKey.value))
const formatDebateScheduleLabel = (debate: DebateListItem) => {
  return `${formatKoreanDate(debate.date)} · ${debate.topic}`
}

const periodStepDays = computed(() => (isMobile.value ? 2 : 7))

const movePeriod = (delta: number) => {
  triggerPeriodAnimation(delta)
  weekAnchor.value = addDays(weekAnchor.value, delta * periodStepDays.value)
}

const goToToday = () => {
  const today = startOfDay(new Date())
  const direction = Math.sign(today.getTime() - weekAnchor.value.getTime()) || 1
  triggerPeriodAnimation(direction)
  weekAnchor.value = startOfDay(new Date())
}

const triggerPeriodAnimation = (direction: number) => {
  periodAnimationClass.value = direction >= 0 ? 'is-moving-next' : 'is-moving-prev'
  if (periodAnimationTimer !== null) {
    window.clearTimeout(periodAnimationTimer)
  }
  periodAnimationTimer = window.setTimeout(() => {
    periodAnimationClass.value = ''
    periodAnimationTimer = null
  }, 240)
}

const isPastDate = (dateKey: string) => dateKey < currentDateKey()
const isToday = (dateKey: string) => dateKey === currentDateKey()
const isPastSlot = (dateKey: string, time: string) => {
  if (dateKey < currentDateKey()) return true
  if (dateKey !== currentDateKey()) return false
  const now = new Date()
  return toMinutes(time) <= now.getHours() * 60 + now.getMinutes()
}

const slotIndexMap = new Map(timeSlots.map((time, idx) => [time, idx]))
const toIndex = (time: string) => slotIndexMap.get(time) ?? -1
const slotKey = (dateKey: string, time: string) => `${dateKey} ${time}`
const parseSlotKey = (key: string): { dateKey: string; time: string } => {
  const [dateKey, time] = key.split(' ')
  return { dateKey, time }
}

const computeTimeRange = (start: string, end: string): string[] => {
  const si = toIndex(start)
  const ei = toIndex(end)
  if (si < 0 || ei < 0) return []
  const from = Math.min(si, ei)
  const to = Math.max(si, ei)
  return timeSlots.slice(from, to + 1)
}

const clearDragState = () => {
  isDragging.value = false
  dragDateKey.value = null
  dragStartTime.value = null
  dragCurrentTime.value = null
}

const isReservedTime = (dateKey: string, time: string): boolean => {
  return (reservationsByDate.value[dateKey] ?? []).some((r) => r.timeSlot === time)
}

const isUnavailableSlot = (dateKey: string, time: string) => {
  return isPastSlot(dateKey, time) || isReservedTime(dateKey, time)
}

const onSlotMouseDown = (dateKey: string, time: string, e?: MouseEvent) => {
  if (isUnavailableSlot(dateKey, time) || isSubmitting.value) return
  e?.preventDefault()
  e?.stopPropagation()
  suppressClickSelection = false
  isDragging.value = true
  dragDateKey.value = dateKey
  dragStartTime.value = time
  dragCurrentTime.value = time
  baseSetDuringDrag = new Set(selectedSet.value)
}

const onSlotMouseEnter = (dateKey: string, time: string) => {
  if (!isDragging.value || dragDateKey.value !== dateKey || isUnavailableSlot(dateKey, time)) return
  dragCurrentTime.value = time
}

const onSlotClick = (dateKey: string, time: string) => {
  if (suppressClickSelection) {
    suppressClickSelection = false
    return
  }
  if (isUnavailableSlot(dateKey, time) || isSubmitting.value) return

  const next = new Set(selectedSet.value)
  const key = slotKey(dateKey, time)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  selectedSet.value = next
}

const onWeekScrollerMouseDown = (e: MouseEvent) => {
  if (isMobile.value || e.button !== 0) return

  const target = e.target as HTMLElement | null
  if (!target) return
  const allowDragSource = target.closest('.day-head, .corner-head, .time-slot-label, .time-column')
  if (!allowDragSource) return

  const scroller = weekScrollerRef.value
  if (!scroller) return

  isHorizontalDragging = true
  dragScrollStartX = e.clientX
  dragScrollStartLeft = scroller.scrollLeft
  scroller.classList.add('is-drag-scrolling')
  e.preventDefault()
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isHorizontalDragging) return
  const scroller = weekScrollerRef.value
  if (!scroller) return
  const deltaX = e.clientX - dragScrollStartX
  scroller.scrollLeft = dragScrollStartLeft - deltaX
}

const clearHorizontalDragState = () => {
  if (!isHorizontalDragging) return
  isHorizontalDragging = false
  weekScrollerRef.value?.classList.remove('is-drag-scrolling')
}

const handleMouseUp = () => {
  clearHorizontalDragState()

  if (!isDragging.value || !dragDateKey.value || !dragStartTime.value || !dragCurrentTime.value) {
    clearDragState()
    return
  }

  const dateKey = dragDateKey.value
  const range = computeTimeRange(dragStartTime.value, dragCurrentTime.value).filter(
    (time) => !isUnavailableSlot(dateKey, time),
  )

  if (range.length === 0) {
    clearDragState()
    return
  }

  const next = new Set(baseSetDuringDrag)
  const allSelected = range.every((time) => baseSetDuringDrag.has(slotKey(dateKey, time)))

  if (allSelected) {
    range.forEach((time) => next.delete(slotKey(dateKey, time)))
  } else {
    range.forEach((time) => next.add(slotKey(dateKey, time)))
  }

  selectedSet.value = next
  suppressClickSelection = true
  clearDragState()
}

const effectiveSelectedHas = (dateKey: string, time: string): boolean => {
  const key = slotKey(dateKey, time)
  if (
    !isDragging.value ||
    !dragDateKey.value ||
    !dragStartTime.value ||
    !dragCurrentTime.value ||
    dragDateKey.value !== dateKey
  ) {
    return selectedSet.value.has(key)
  }

  const range = computeTimeRange(dragStartTime.value, dragCurrentTime.value).filter(
    (slot) => !isUnavailableSlot(dateKey, slot),
  )
  if (range.length === 0) return baseSetDuringDrag.has(key)

  const rangeKeys = new Set(range.map((slot) => slotKey(dateKey, slot)))
  const allSelected = range.every((slot) => baseSetDuringDrag.has(slotKey(dateKey, slot)))

  if (allSelected) {
    return baseSetDuringDrag.has(key) && !rangeKeys.has(key)
  }
  return baseSetDuringDrag.has(key) || rangeKeys.has(key)
}

const isSelected = (dateKey: string, time: string) => effectiveSelectedHas(dateKey, time)

const toBlocks = (indices: number[]): RangeBlock[] => {
  const sorted = [...indices].sort((a, b) => a - b)
  const blocks: RangeBlock[] = []
  let i = 0

  while (i < sorted.length) {
    let j = i + 1
    while (j < sorted.length && sorted[j] === sorted[j - 1] + 1) j++
    blocks.push({ start: sorted[i], span: sorted[j - 1] - sorted[i] + 1 })
    i = j
  }

  return blocks
}

const selectedBlocksByDate = computed<Record<string, RangeBlock[]>>(() => {
  const result: Record<string, RangeBlock[]> = {}

  weekDateKeys.value.forEach((dateKey) => {
    const indices = Array.from(selectedSet.value)
      .filter((key) => key.startsWith(`${dateKey} `))
      .map((key) => toIndex(parseSlotKey(key).time))
      .filter((idx) => idx >= 0)
    result[dateKey] = toBlocks(indices)
  })

  return result
})

const dragPreview = computed<DragPreview | null>(() => {
  if (!isDragging.value || !dragDateKey.value || !dragStartTime.value || !dragCurrentTime.value) {
    return null
  }

  const filtered = computeTimeRange(dragStartTime.value, dragCurrentTime.value).filter(
    (time) => !isUnavailableSlot(dragDateKey.value as string, time),
  )
  if (filtered.length === 0) return null

  const indices = filtered.map((time) => toIndex(time)).filter((idx) => idx >= 0)
  if (indices.length === 0) return null

  const start = Math.min(...indices)
  const end = Math.max(...indices)

  return {
    date: dragDateKey.value,
    start,
    span: end - start + 1,
  }
})

const eventRectsByDate = computed<Record<string, EventRect[]>>(() => {
  const result: Record<string, EventRect[]> = {}

  for (const dateKey of weekDateKeys.value) {
    const grouped = new Map<string, { name: string; indices: number[] }>()
    const dayReservations = reservationsByDate.value[dateKey] ?? []

    for (const r of dayReservations) {
      const idx = toIndex(r.timeSlot)
      if (idx < 0) continue
      const key = r.id && r.id !== 0 ? `id:${r.id}` : `name:${r.name}`
      const bucket = grouped.get(key) ?? { name: r.name, indices: [] }
      bucket.indices.push(idx)
      grouped.set(key, bucket)
    }

    const intervals: Array<{ name: string; start: number; end: number }> = []
    for (const { name, indices } of grouped.values()) {
      indices.sort((a, b) => a - b)
      let s = -1
      let p = -2
      for (const idx of indices) {
        if (idx !== p + 1) {
          if (s !== -1) intervals.push({ name, start: s, end: p })
          s = idx
        }
        p = idx
      }
      if (s !== -1) intervals.push({ name, start: s, end: p })
    }

    intervals.sort((a, b) => a.start - b.start || b.end - a.end)
    const laneEnds: number[] = []
    const rects: EventRect[] = []

    for (const interval of intervals) {
      let lane = 0
      while (lane < laneEnds.length && laneEnds[lane] > interval.start) lane++

      if (lane === laneEnds.length) {
        laneEnds.push(interval.end + 1)
      } else {
        laneEnds[lane] = interval.end + 1
      }

      const startLabel = timeSlots[interval.start] ?? ''
      const endBase = timeSlots[interval.end] ?? ''

      rects.push({
        start: interval.start,
        span: interval.end - interval.start + 1,
        lane,
        name: interval.name,
        startLabel,
        endLabel: addHalfHour(endBase),
      })
    }

    result[dateKey] = rects
  }

  return result
})

const selectedCount = computed(() => selectedSet.value.size)
const selectedDurationLabel = computed(() => formatDuration(selectedCount.value))
const actionLabel = computed(() => {
  if (!selectedCount.value) return '예약 확정'
  return `${selectedDurationLabel.value} 예약 확정`
})
const isSubmitDisabled = computed(() => {
  if (!reservationForm.value.name || selectedCount.value === 0 || isSubmitting.value) return true
  if (reservationForm.value.scheduleMode === 'debate' && !reservationForm.value.debateId) return true
  if (reservationForm.value.scheduleMode === 'custom' && !customPurposeTitle.value) return true
  return false
})

const selectionBlockStyle = (block: RangeBlock) => ({
  top: `calc(var(--slot-height) * ${block.start} + 3px)`,
  height: `calc(var(--slot-height) * ${block.span} - 6px)`,
})

const eventBlockStyle = (event: EventRect) => ({
  top: `calc(var(--slot-height) * ${event.start} + 3px)`,
  height: `calc(var(--slot-height) * ${event.span} - 6px)`,
  left: `${8 + event.lane * 12}px`,
  right: '8px',
})

async function scrollToDefaultTime() {
  await nextTick()
  const el = weekScrollerRef.value
  if (!el) return

  if (!weekDateKeys.value.includes(currentDateKey())) {
    el.scrollTop = 0
    return
  }

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const startMinutes = 8 * 60
  const rawIndex = Math.floor((currentMinutes - startMinutes) / 30)
  const index = Math.min(Math.max(rawIndex, 0), timeSlots.length - 1)
  el.scrollTop = Math.max(0, index * slotHeight - slotHeight * 4)
}

const refreshWeekReservations = async () => {
  const requestId = ++fetchRequestId
  isLoadingWeek.value = true

  try {
    const byDate = await listReservationsByDateRange(weekDateKeys.value)

    if (requestId !== fetchRequestId) return

    const next: Record<string, ReservationSlot[]> = {}
    weekDateKeys.value.forEach((dateKey) => {
      next[dateKey] = byDate[dateKey] ?? []
    })

    reservationsByDate.value = next
    selectedSet.value = new Set()
    await scrollToDefaultTime()
  } finally {
    if (requestId === fetchRequestId) {
      isLoadingWeek.value = false
    }
  }
}

const handleReservation = async () => {
  if (!reservationForm.value.name || selectedSet.value.size === 0) {
    submitFeedback.value = { type: 'error', message: '예약자 이름과 시간을 모두 선택해주세요.' }
    return
  }
  if (reservationForm.value.scheduleMode === 'debate' && !reservationForm.value.debateId) {
    submitFeedback.value = { type: 'error', message: '연결할 토론 일정을 선택해주세요.' }
    return
  }
  if (reservationForm.value.scheduleMode === 'custom' && !customPurposeTitle.value) {
    submitFeedback.value = { type: 'error', message: '예약 용도를 입력해주세요.' }
    return
  }

  const grouped = new Map<string, string[]>()
  selectedSet.value.forEach((key) => {
    const { dateKey, time } = parseSlotKey(key)
    const list = grouped.get(dateKey) ?? []
    list.push(time)
    grouped.set(dateKey, list)
  })

  isSubmitting.value = true
  submitFeedback.value = null

  try {
    await Promise.all(
      Array.from(grouped.entries()).map(([dateKey, times]) =>
        createReservations(
          dateKey,
          reservationForm.value.name,
          times.sort((a, b) => toIndex(a) - toIndex(b)),
          selectedDebateId.value,
          customPurposeTitle.value || null,
        ),
      ),
    )

    await refreshWeekReservations()
    reservationForm.value = {
      ...buildInitialReservationForm(),
      name: isLoggedIn.value ? userName.value : '',
    }
    selectedSet.value = new Set()
    submitFeedback.value = {
      type: 'success',
      message: '예약이 완료되었습니다. 캘린더에서 최신 예약 현황을 확인할 수 있습니다.',
    }
  } catch (e: any) {
    submitFeedback.value = {
      type: 'error',
      message: e?.message || '예약 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    }
  } finally {
    isSubmitting.value = false
  }
}

watch(
  [
    selectedCount,
    () => reservationForm.value.name,
    () => reservationForm.value.scheduleMode,
    () => reservationForm.value.debateId,
    () => reservationForm.value.customPurpose,
  ],
  () => {
    if (submitFeedback.value?.type === 'error') {
      submitFeedback.value = null
    }
  },
)

watch(
  () => reservationForm.value.scheduleMode,
  (mode) => {
    if (mode === 'debate' && !hasLoadedDebateSchedules.value && !isLoadingDebateSchedules.value) {
      void refreshDebateSchedules()
    }
    if (mode !== 'debate') {
      reservationForm.value.debateId = ''
    }
    if (mode !== 'custom') {
      reservationForm.value.customPurpose = ''
    }
  },
)

watch(filteredDebateSchedules, (nextOptions) => {
  if (reservationForm.value.scheduleMode !== 'debate' || !reservationForm.value.debateId) return
  const exists = nextOptions.some((debate) => debate.id === reservationForm.value.debateId)
  if (!exists) {
    reservationForm.value.debateId = ''
  }
})

watch(
  weekDateKeys,
  () => {
    void refreshWeekReservations()
  },
  { immediate: true },
)

onMounted(() => {
  updateViewportMode()
  window.addEventListener('resize', updateViewportMode)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  void scrollToDefaultTime()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewportMode)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  clearHorizontalDragState()
  if (periodAnimationTimer !== null) {
    window.clearTimeout(periodAnimationTimer)
  }
})
</script>

<style scoped>
.reservation-page {
  min-height: calc(100vh - 80px);
  padding: 1rem 0 1.4rem;
  background:
    radial-gradient(circle at 0% 0%, rgba(86, 144, 216, 0.16), transparent 38%),
    radial-gradient(circle at 100% 100%, rgba(86, 144, 216, 0.12), transparent 34%),
    linear-gradient(160deg, #f5f9ff 0%, #f8fcff 55%, #eef5ff 100%);
}

.layout {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 0 20px;
}

.reservation-shell {
  display: block;
  min-height: calc(100vh - 80px);
}

.workspace {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: stretch;
  min-height: calc(100vh - 80px);
}

.schedule-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  padding: 0;
  border: 1px solid #d5e4f4;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 10px 26px rgba(30, 73, 119, 0.08);
  overflow: hidden;
  width: 100%;
}

.card-panel {
  padding: 0.95rem 1rem 1rem;
  border-radius: 12px;
  border: 1px solid #d8e6f6;
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 8px 20px rgba(30, 73, 119, 0.08);
}

.schedule-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid #e2e8f0;
}

.schedule-title-group {
  display: flex;
  align-items: center;
}

.schedule-range {
  margin: 0;
  color: #0f172a;
  font-size: 1.05rem;
  font-weight: 700;
}

.nav-controls {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex-shrink: 0;
}

.nav-triangle {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: 1px solid #d6deea;
  background: #fff;
  cursor: pointer;
  position: relative;
  transition: border-color 0.12s ease;
}

.nav-triangle::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 0;
  height: 0;
}

.nav-triangle.prev::before {
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 8px solid #475569;
  margin-left: -1px;
}

.nav-triangle.next::before {
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid #475569;
  margin-left: 1px;
}

.nav-triangle:hover {
  border-color: #9caec8;
}

.today-btn {
  height: 34px;
  padding: 0 0.75rem;
  border-radius: 8px;
  border: 1px solid #d6deea;
  background: #fff;
  color: #334155;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.12s ease;
}

.today-btn:hover {
  border-color: #9caec8;
}

.week-scroller {
  position: relative;
  overflow: auto;
  min-height: 340px;
  height: clamp(340px, 60vh, 760px);
  border: 0;
  border-radius: 0 0 14px 14px;
  background: rgba(255, 255, 255, 0.92);
  user-select: none;
}

.week-grid {
  --time-col-width: 68px;
  display: grid;
  grid-template-columns: var(--time-col-width) repeat(
      var(--day-count),
      minmax(var(--day-min-width), 1fr)
    );
  grid-template-rows: auto 1fr;
  min-width: calc(var(--time-col-width) + var(--day-count) * var(--day-min-width));
  align-items: start;
}

.week-grid-wrap.is-moving-next .week-grid {
  animation: week-shift-next 0.24s ease;
}

.week-grid-wrap.is-moving-prev .week-grid {
  animation: week-shift-prev 0.24s ease;
}

@keyframes week-shift-next {
  from {
    opacity: 0.6;
    transform: translateX(10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes week-shift-prev {
  from {
    opacity: 0.6;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.corner-head,
.day-head {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 42px;
  display: flex;
  justify-content: center;
  padding: 0.45rem 0.45rem;
  border-bottom: 1px solid #e7edf5;
  background: #f8fafc;
}

.corner-head {
  left: 0;
  z-index: 40;
  align-items: flex-end;
  font-size: 0.72rem;
  color: #64748b;
  font-weight: 600;
  border-right: 1px solid #e7edf5;
}

.day-head {
  align-items: center;
  border-right: 1px solid #eef2f7;
}

.day-head.is-today {
  background: #eff6ff;
}

.day-head.is-past {
  background: #f8fafc;
}

.day-display {
  font-size: 0.84rem;
  color: #0f172a;
  font-weight: 600;
  white-space: nowrap;
}

.time-column {
  position: sticky;
  left: 0;
  z-index: 30;
  background: #fff;
  border-right: 1px solid #e7edf5;
  box-shadow: 10px 0 14px -14px rgba(30, 73, 119, 0.35);
}

.time-slot-label {
  height: var(--slot-height);
  border-bottom: 1px solid #f1f5f9;
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-right: 0.4rem;
  font-size: 0.68rem;
  color: #94a3b8;
  line-height: 1;
}

.time-slot-label.is-boundary {
  color: #475569;
  border-bottom-color: #e2e8f0;
}

.time-slot-label:first-child {
  border-top: 1px solid #e2e8f0;
}

.time-slot-label.final {
  height: 22px;
  border-bottom: none;
  padding-top: 2px;
}

.day-column {
  position: relative;
  height: calc(var(--slot-height) * var(--slot-count));
  border-right: 1px solid #eef2f7;
  background: #fff;
}

.day-column.is-today {
  background: #f8fbff;
}

.day-column.is-past {
  background: #fafbfc;
}

.slot-grid {
  display: grid;
  grid-template-rows: repeat(var(--slot-count), var(--slot-height));
}

.slot-cell {
  width: 100%;
  border: 0;
  border-bottom: 1px solid #f1f5f9;
  background: transparent;
  cursor: crosshair;
  padding: 0;
  transition: background-color 0.12s ease;
}

.slot-cell.is-boundary {
  border-bottom-color: #e2e8f0;
}

.slot-cell:first-child {
  border-top: 1px solid #e2e8f0;
}

.slot-cell:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.08);
}

.slot-cell.is-selected {
  background: rgba(59, 130, 246, 0.18);
}

.slot-cell.is-reserved {
  background: rgba(148, 163, 184, 0.2);
}

.slot-cell.is-past-slot {
  background: rgba(248, 250, 252, 0.9);
}

.slot-cell.is-disabled {
  cursor: not-allowed;
}

.slot-cell:disabled {
  cursor: not-allowed;
}

.overlay-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.event-block {
  position: absolute;
  border-radius: 8px;
  background: #e2e8f0;
  border: 1px solid #cbd5e1;
  color: #1e293b;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 2px;
  padding: 5px 7px;
  overflow: hidden;
  box-shadow: none;
}

.event-name {
  font-size: 0.72rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-time {
  font-size: 0.66rem;
  color: #475569;
  line-height: 1.2;
}

.selection-block {
  position: absolute;
  left: 5px;
  right: 5px;
  border-radius: 12px;
  z-index: 3;
}

.selection-block.confirmed {
  background: rgba(59, 130, 246, 0.12);
  border: 2px solid rgba(59, 130, 246, 0.52);
}

.selection-block.preview {
  background: rgba(59, 130, 246, 0.08);
  border: 2px dashed rgba(59, 130, 246, 0.5);
  z-index: 4;
}

.loading-overlay {
  position: sticky;
  left: 0;
  bottom: 0;
  padding: 0.45rem 0.6rem;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid #e5e7eb;
  font-size: 0.78rem;
  color: #475569;
}

.booking-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  width: 100%;
  position: static;
  border-top: 0;
  background: transparent;
}

.form-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.6rem;
}

.form-head h3 {
  margin: 0;
  color: #0f172a;
  font-size: 1.02rem;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.label {
  font-size: 0.84rem;
  color: #334155;
  font-weight: 600;
}

.field-help {
  margin: 0.35rem 0 0;
  font-size: 0.74rem;
  color: #5b6e86;
}

.field-help.is-error {
  color: #b91c1c;
}

.input,
.select {
  border: 1px solid #d7dfea;
  padding: 0.62rem 0.7rem;
  border-radius: 8px;
  background: #fff;
  font-size: 0.92rem;
  color: #0f172a;
}

.input:focus,
.select:focus {
  outline: none;
  border-color: rgba(74, 144, 226, 0.55);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.12);
}

.feedback-banner {
  margin-top: 0.7rem;
  padding: 0.62rem 0.72rem;
  border-radius: 8px;
  font-size: 0.86rem;
  line-height: 1.45;
}

.feedback-banner.is-success {
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
  color: #047857;
}

.feedback-banner.is-error {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.22);
  color: #b91c1c;
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.72rem 0.9rem;
  border-radius: 8px;
  border: 1px solid #1d4ed8;
  background: #2563eb;
  color: #fff;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.92rem;
  transition: background-color 0.12s ease;
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-primary.wide {
  width: 100%;
  margin-top: 0.9rem;
}

.btn-primary:disabled,
.today-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

@media (min-width: 1181px) {
  .layout {
    max-width: 1600px;
    padding: 0 28px;
  }

  .workspace {
    flex-direction: row;
    align-items: flex-start;
    gap: 14px;
    padding: 6px 0 16px;
  }

  .schedule-panel {
    flex: 1 1 auto;
    max-width: min(1260px, calc(100vw - 330px));
    border-radius: 16px;
    box-shadow: 0 14px 32px rgba(30, 73, 119, 0.1);
  }

  .week-scroller {
    min-height: 560px;
    height: clamp(560px, 74vh, 980px);
    cursor: grab;
  }

  .week-scroller.is-drag-scrolling {
    cursor: grabbing;
  }

  .day-head,
  .corner-head,
  .time-slot-label {
    cursor: inherit;
  }

  .booking-panel {
    width: 250px;
    min-width: 240px;
    border-top: 0;
    background: transparent;
    position: sticky;
    top: 92px;
  }

  .booking-panel .card-panel {
    padding: 0.8rem 0.85rem 0.9rem;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 12px 30px rgba(30, 73, 119, 0.1);
  }

  .form-head h3 {
    font-size: 0.94rem;
  }

  .field-group {
    gap: 0.62rem;
    margin-top: 0.62rem;
  }

  .label {
    font-size: 0.8rem;
  }

  .input,
  .select {
    padding: 0.52rem 0.62rem;
    font-size: 0.86rem;
    border-radius: 7px;
  }

  .btn-primary {
    font-size: 0.86rem;
    padding: 0.62rem 0.75rem;
  }

  .btn-primary.wide {
    margin-top: 0.75rem;
  }
}

@media (max-width: 1180px) {
  .workspace {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
}

@media (max-width: 960px) {
  .layout {
    padding: 0 14px;
  }

  .form-head {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.55rem;
  }

  .schedule-title-group {
    width: 100%;
    min-width: 0;
  }

  .nav-controls {
    width: auto;
    justify-content: flex-start;
    flex-wrap: nowrap;
  }
}

@media (max-width: 768px) {
  .layout {
    padding: 0 10px;
  }

  .schedule-panel {
    border-radius: 12px;
  }

  .card-panel {
    border-radius: 12px;
    padding: 0.85rem 0.8rem;
  }

  .schedule-range {
    font-size: 0.96rem;
    white-space: nowrap;
  }

  .form-head h3 {
    font-size: 0.94rem;
    white-space: nowrap;
  }

  .week-scroller {
    min-height: 300px;
    height: 56vh;
    border-radius: 0 0 12px 12px;
  }

  .week-grid {
    --time-col-width: 64px;
  }

  .corner-head,
  .day-head {
    height: 38px;
  }

  .day-display {
    font-size: 0.74rem;
  }

  .time-slot-label {
    font-size: 0.62rem;
  }

  .label {
    font-size: 0.78rem;
    white-space: nowrap;
  }

  .input,
  .select {
    font-size: 0.86rem;
  }

  .today-btn {
    font-size: 0.8rem;
    white-space: nowrap;
  }

  .btn-primary {
    font-size: 0.84rem;
    white-space: nowrap;
  }

  .loading-overlay {
    font-size: 0.72rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

}
</style>
