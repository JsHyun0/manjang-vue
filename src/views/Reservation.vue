<template>
  <div class="reservation-page">
    <main class="layout">
      <header class="page-heading">
        <h1>회의실 예약</h1>
        <p>원하는 시간대를 드래그하거나 클릭해 선택하세요.</p>
      </header>
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
                          'is-reserved': isFullyReserved(day.key, time),
                          'is-partial-reserved': isPartiallyReserved(day.key, time),
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
                        :key="`ev-${day.key}-${ev.reservationId}-${ev.start}-${ev.span}-${ev.lane}`"
                        class="event-block"
                        :class="{ 'is-open-slot': ev.allowSimultaneous && ev.laneCount < 2 }"
                        :title="`${ev.name} (${ev.startLabel}~${ev.endLabel})${ev.allowSimultaneous && ev.laneCount < 2 ? ' · 동시예약 가능' : ''}`"
                        :style="eventBlockStyle(ev)"
                        role="button"
                        tabindex="0"
                        @click="openReservationDetail(day.key, ev)"
                        @keydown.enter.prevent="openReservationDetail(day.key, ev)"
                        @keydown.space.prevent="openReservationDetail(day.key, ev)"
                      >
                        <span class="event-name">{{ ev.name }}</span>
                        <span class="event-time">{{ ev.startLabel }}~{{ ev.endLabel }}</span>
                        <span v-if="ev.allowSimultaneous && ev.laneCount < 2" class="open-slot-badge">동시 사용 가능</span>
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

                <div class="field">
                  <label class="label">동시 예약</label>
                  <label class="simultaneous-toggle">
                    <input
                      type="checkbox"
                      class="simultaneous-checkbox"
                      v-model="reservationForm.allowSimultaneous"
                    />
                    <span class="simultaneous-label-text">다른 팀의 동시 예약 허용</span>
                  </label>
                  <p class="field-help">
                    허용 시 같은 시간대에 최대 2팀까지 예약할 수 있습니다.
                    <template v-if="hasPartiallyReservedSelected && !reservationForm.allowSimultaneous">
                      <br /><span class="field-help-warn">선택한 시간대에 이미 예약이 있습니다. 동시 예약을 허용해야 예약할 수 있습니다.</span>
                    </template>
                  </p>
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

      <div
        v-if="activeReservationDetail"
        class="reservation-modal-backdrop"
        @click="closeReservationDetail"
      >
        <section class="reservation-modal card-panel" @click.stop>
          <div class="reservation-modal-head">
            <h3>예약 상세</h3>
            <button
              type="button"
              class="modal-close-btn"
              :disabled="isUpdatingReservation || isDeletingReservation"
              @click="closeReservationDetail"
            >
              닫기
            </button>
          </div>

          <div class="reservation-detail-list">
            <p><strong>날짜</strong> {{ formatKoreanDate(activeReservationDetail.dateKey) }}</p>
            <p><strong>시간</strong> {{ activeReservationDetail.startLabel }} ~ {{ activeReservationDetail.endLabel }}</p>
            <p><strong>예약자</strong> {{ activeReservationDetail.name }}</p>
            <p><strong>용도</strong> {{ activeReservationDetail.title || '미입력' }}</p>
          </div>

          <template v-if="canEditActiveReservation">
            <div class="field-group modal-edit-group">
              <div class="field">
                <label class="label" for="detail-reserver-name">예약자 이름</label>
                <input
                  id="detail-reserver-name"
                  class="input"
                  v-model="detailEditForm.name"
                  :disabled="isUpdatingReservation || isDeletingReservation"
                />
              </div>

              <div class="field">
                <label class="label" for="detail-purpose">예약 용도</label>
                <input
                  id="detail-purpose"
                  class="input"
                  v-model="detailEditForm.title"
                  placeholder="예: 스터디 모임, 연습 토론 준비"
                  maxlength="80"
                  :disabled="isUpdatingReservation || isDeletingReservation"
                />
              </div>
            </div>

            <div v-if="detailFeedback" class="feedback-banner" :class="`is-${detailFeedback.type}`">
              {{ detailFeedback.message }}
            </div>

            <div class="reservation-modal-actions">
              <button
                type="button"
                class="btn-secondary"
                :disabled="isUpdatingReservation || isDeletingReservation"
                @click="handleDeleteReservation"
              >
                {{ isDeletingReservation ? '삭제 중...' : '예약 삭제' }}
              </button>
              <button
                type="button"
                class="btn-primary"
                :disabled="isUpdatingReservation || isDeletingReservation"
                @click="handleUpdateReservation"
              >
                {{ isUpdatingReservation ? '저장 중...' : '수정 저장' }}
              </button>
            </div>
          </template>

          <p v-else class="field-help">
            본인이 예약한 항목만 수정하거나 삭제할 수 있습니다.
          </p>
        </section>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  createReservations,
  deleteReservation,
  generateTimeSlots,
  listReservationsByDateRange,
  updateReservation,
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
type EventRect = RangeBlock & {
  lane: number
  laneCount: number
  allowSimultaneous: boolean
  reservationId: string
  name: string
  title: string | null
  reservedBy: string | null
  startLabel: string
  endLabel: string
}
type ReservationDetailState = {
  reservationId: string
  dateKey: string
  startLabel: string
  endLabel: string
  name: string
  title: string
  reservedBy: string | null
}
type FeedbackState = { type: 'success' | 'error'; message: string } | null
type ScheduleMode = 'none' | 'debate' | 'custom'
type ReservationFormState = {
  name: string
  scheduleMode: ScheduleMode
  debateId: string
  customPurpose: string
  allowSimultaneous: boolean
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
  allowSimultaneous: false,
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

const initialIsMobile = typeof window !== 'undefined' ? window.innerWidth <= 960 : false
const isMobile = ref(initialIsMobile)
const isSubmitting = ref(false)
const submitFeedback = ref<FeedbackState>(null)
const updateViewportMode = () => {
  const next = window.innerWidth <= 960
  if (isMobile.value !== next) {
    isMobile.value = next
  }
}

const reservationsByDate = ref<Record<string, ReservationSlot[]>>({})
const isLoadingWeek = ref(false)
let fetchRequestId = 0
let fetchAbortController: AbortController | null = null
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

const { user, isLoggedIn, userName } = useAuth()
const currentUserId = computed(() => user.value?.id ?? null)
const activeReservationDetail = ref<ReservationDetailState | null>(null)
const detailEditForm = ref({ name: '', title: '' })
const detailFeedback = ref<FeedbackState>(null)
const isUpdatingReservation = ref(false)
const isDeletingReservation = ref(false)
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

type SlotInfo = { reservationIds: Set<string>; allAllowSimultaneous: boolean }

const slotInfoByDate = computed<Record<string, Map<string, SlotInfo>>>(() => {
  const result: Record<string, Map<string, SlotInfo>> = {}
  weekDateKeys.value.forEach((dateKey) => {
    const slotMap = new Map<string, SlotInfo>()
    for (const r of reservationsByDate.value[dateKey] ?? []) {
      const info = slotMap.get(r.timeSlot) ?? { reservationIds: new Set<string>(), allAllowSimultaneous: true }
      info.reservationIds.add(r.id)
      if (!r.allowSimultaneous) info.allAllowSimultaneous = false
      slotMap.set(r.timeSlot, info)
    }
    result[dateKey] = slotMap
  })
  return result
})

// 슬롯에 예약 존재 여부 (시각적 표시용)
const isReservedTime = (dateKey: string, time: string): boolean => {
  return (slotInfoByDate.value[dateKey]?.get(time)?.reservationIds.size ?? 0) > 0
}

// 슬롯이 완전히 차서 새 예약 불가 (2팀 이상, 또는 1팀인데 동시예약 비허용)
const isFullyReserved = (dateKey: string, time: string): boolean => {
  const info = slotInfoByDate.value[dateKey]?.get(time)
  if (!info || info.reservationIds.size === 0) return false
  if (info.reservationIds.size >= 2) return true
  return !info.allAllowSimultaneous
}

// 슬롯에 예약 1개 있고 동시예약 허용 중 (추가 예약 가능하지만 동시예약 허용 필요)
const isPartiallyReserved = (dateKey: string, time: string): boolean => {
  const info = slotInfoByDate.value[dateKey]?.get(time)
  if (!info || info.reservationIds.size !== 1) return false
  return info.allAllowSimultaneous
}

const isUnavailableSlot = (dateKey: string, time: string) => {
  return isPastSlot(dateKey, time) || isFullyReserved(dateKey, time)
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
    const grouped = new Map<
      string,
      {
        reservationId: string
        name: string
        title: string | null
        reservedBy: string | null
        allowSimultaneous: boolean
        indices: number[]
      }
    >()
    const dayReservations = reservationsByDate.value[dateKey] ?? []

    for (const r of dayReservations) {
      const idx = toIndex(r.timeSlot)
      if (idx < 0) continue
      const key = r.id ? `id:${r.id}` : `name:${r.name}-${r.timeSlot}`
      const bucket = grouped.get(key) ?? {
        reservationId: r.id,
        name: r.name,
        title: r.title ?? null,
        reservedBy: r.reservedBy ?? null,
        allowSimultaneous: r.allowSimultaneous,
        indices: [],
      }
      bucket.indices.push(idx)
      grouped.set(key, bucket)
    }

    const intervals: Array<{
      reservationId: string
      name: string
      title: string | null
      reservedBy: string | null
      allowSimultaneous: boolean
      start: number
      end: number
    }> = []
    for (const { reservationId, name, title, reservedBy, allowSimultaneous, indices } of grouped.values()) {
      indices.sort((a, b) => a - b)
      let s = -1
      let p = -2
      for (const idx of indices) {
        if (idx !== p + 1) {
          if (s !== -1) intervals.push({ reservationId, name, title, reservedBy, allowSimultaneous, start: s, end: p })
          s = idx
        }
        p = idx
      }
      if (s !== -1) intervals.push({ reservationId, name, title, reservedBy, allowSimultaneous, start: s, end: p })
    }

    intervals.sort((a, b) => a.start - b.start || b.end - a.end)
    const laneEnds: number[] = []
    type RawRect = Omit<EventRect, 'laneCount'>
    const rawRects: RawRect[] = []

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

      rawRects.push({
        start: interval.start,
        span: interval.end - interval.start + 1,
        lane,
        allowSimultaneous: interval.allowSimultaneous,
        reservationId: interval.reservationId,
        name: interval.name,
        title: interval.title,
        reservedBy: interval.reservedBy,
        startLabel,
        endLabel: addHalfHour(endBase),
      })
    }

    // 각 rect와 겹치는 rect 수를 세어 laneCount 계산 (최대 2)
    result[dateKey] = rawRects.map((rect) => {
      let concurrent = 1
      for (const other of rawRects) {
        if (other === rect) continue
        if (rect.start <= other.start + other.span - 1 && other.start <= rect.start + rect.span - 1) {
          concurrent++
        }
      }
      return { ...rect, laneCount: Math.min(concurrent, 2) }
    })
  }

  return result
})

const isOwnReservation = (reservedBy: string | null, reservationName: string): boolean => {
  if (!isLoggedIn.value) return false
  if (reservedBy && currentUserId.value) {
    return reservedBy === currentUserId.value
  }
  return !!userName.value && reservationName === userName.value
}

const canEditActiveReservation = computed(() => {
  const detail = activeReservationDetail.value
  if (!detail) return false
  return isOwnReservation(detail.reservedBy, detail.name)
})

const openReservationDetail = (dateKey: string, event: EventRect) => {
  activeReservationDetail.value = {
    reservationId: event.reservationId,
    dateKey,
    startLabel: event.startLabel,
    endLabel: event.endLabel,
    name: event.name,
    title: event.title ?? '',
    reservedBy: event.reservedBy ?? null,
  }
  detailEditForm.value = {
    name: event.name,
    title: event.title ?? '',
  }
  detailFeedback.value = null
}

const resetReservationDetailState = () => {
  activeReservationDetail.value = null
  detailEditForm.value = { name: '', title: '' }
  detailFeedback.value = null
}

const closeReservationDetail = () => {
  if (isUpdatingReservation.value || isDeletingReservation.value) return
  resetReservationDetailState()
}

const selectedCount = computed(() => selectedSet.value.size)
const selectedDurationLabel = computed(() => formatDuration(selectedCount.value))
const actionLabel = computed(() => {
  if (!selectedCount.value) return '예약 확정'
  return `${selectedDurationLabel.value} 예약 확정`
})

// 선택된 슬롯 중 동시예약 허용 중인 슬롯(1팀 예약 + allAllowSimultaneous)이 있는지
const hasPartiallyReservedSelected = computed(() => {
  for (const key of selectedSet.value) {
    const { dateKey, time } = parseSlotKey(key)
    if (isPartiallyReserved(dateKey, time)) return true
  }
  return false
})

const isSubmitDisabled = computed(() => {
  if (!reservationForm.value.name || selectedCount.value === 0 || isSubmitting.value) return true
  if (reservationForm.value.scheduleMode === 'debate' && !reservationForm.value.debateId) return true
  if (reservationForm.value.scheduleMode === 'custom' && !customPurposeTitle.value) return true
  if (hasPartiallyReservedSelected.value && !reservationForm.value.allowSimultaneous) return true
  return false
})

const selectionBlockStyle = (block: RangeBlock) => ({
  top: `calc(var(--slot-height) * ${block.start} + 3px)`,
  height: `calc(var(--slot-height) * ${block.span} - 6px)`,
})

const eventBlockStyle = (event: EventRect) => {
  const top = `calc(var(--slot-height) * ${event.start} + 3px)`
  const height = `calc(var(--slot-height) * ${event.span} - 6px)`
  if (event.laneCount >= 2) {
    // 2개 예약: 바깥쪽 각 8px, 블록 사이 4px 간격으로 균일하게
    return {
      top,
      height,
      left: event.lane === 0 ? '8px' : 'calc(50% + 2px)',
      right: event.lane === 0 ? 'calc(50% + 2px)' : '8px',
    }
  }
  return { top, height, left: '16px', right: '16px' }
}

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
  fetchAbortController?.abort()
  const controller = new AbortController()
  fetchAbortController = controller
  isLoadingWeek.value = true

  try {
    const byDate = await listReservationsByDateRange(weekDateKeys.value, {
      signal: controller.signal,
    })

    if (requestId !== fetchRequestId) return

    const next: Record<string, ReservationSlot[]> = {}
    weekDateKeys.value.forEach((dateKey) => {
      next[dateKey] = byDate[dateKey] ?? []
    })

    reservationsByDate.value = next
    selectedSet.value = new Set()
    await scrollToDefaultTime()
  } catch (e: unknown) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return
    }
    console.error('예약 목록 조회 실패:', e)
  } finally {
    if (fetchAbortController === controller) {
      fetchAbortController = null
    }
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
          currentUserId.value,
          reservationForm.value.allowSimultaneous,
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

const handleUpdateReservation = async () => {
  const detail = activeReservationDetail.value
  if (!detail || !canEditActiveReservation.value) return

  const nextName = detailEditForm.value.name.trim()
  const nextTitle = detailEditForm.value.title.trim()
  if (!nextName) {
    detailFeedback.value = { type: 'error', message: '예약자 이름을 입력해주세요.' }
    return
  }

  isUpdatingReservation.value = true
  detailFeedback.value = null
  try {
    await updateReservation(detail.reservationId, {
      reservedByName: nextName,
      title: nextTitle || null,
    })
    await refreshWeekReservations()
    activeReservationDetail.value = {
      ...detail,
      name: nextName,
      title: nextTitle,
    }
    detailEditForm.value = { name: nextName, title: nextTitle }
    detailFeedback.value = { type: 'success', message: '예약 정보를 수정했습니다.' }
  } catch (e: any) {
    detailFeedback.value = {
      type: 'error',
      message: e?.message || '예약 수정 중 오류가 발생했습니다.',
    }
  } finally {
    isUpdatingReservation.value = false
  }
}

const handleDeleteReservation = async () => {
  const detail = activeReservationDetail.value
  if (!detail || !canEditActiveReservation.value) return

  const ok = window.confirm('이 예약을 삭제하시겠습니까?')
  if (!ok) return

  isDeletingReservation.value = true
  detailFeedback.value = null
  try {
    await deleteReservation(detail.reservationId)
    await refreshWeekReservations()
    resetReservationDetailState()
    submitFeedback.value = { type: 'success', message: '예약을 삭제했습니다.' }
  } catch (e: any) {
    detailFeedback.value = {
      type: 'error',
      message: e?.message || '예약 삭제 중 오류가 발생했습니다.',
    }
  } finally {
    isDeletingReservation.value = false
  }
}

watch(
  [
    selectedCount,
    () => reservationForm.value.name,
    () => reservationForm.value.scheduleMode,
    () => reservationForm.value.debateId,
    () => reservationForm.value.customPurpose,
    () => reservationForm.value.allowSimultaneous,
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
  fetchAbortController?.abort()
  fetchAbortController = null
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
  padding: 44px 0 56px;
  background: #f6f8fc;
}

.layout {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 32px;
}

.page-heading {
  margin-bottom: 24px;
}

.page-heading h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #0f1b2d;
  letter-spacing: -0.02em;
}

.page-heading p {
  margin: 6px 0 0;
  font-size: 14.5px;
  color: #5b6473;
}

.reservation-shell {
  display: block;
}

.workspace {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: stretch;
}

.schedule-panel {
  display: flex;
  flex-direction: column;
  gap: 0;
  min-width: 0;
  padding: 0;
  border: 1px solid rgba(45, 108, 223, 0.11);
  border-radius: 20px;
  background: #ffffff;
  box-shadow:
    0 1px 0 rgba(15, 27, 45, 0.03),
    0 8px 20px -12px rgba(45, 108, 223, 0.18);
  overflow: hidden;
  width: 100%;
}

.card-panel {
  padding: 28px;
  border-radius: 20px;
  border: 1px solid rgba(45, 108, 223, 0.11);
  background: #ffffff;
  box-shadow:
    0 1px 0 rgba(15, 27, 45, 0.03),
    0 8px 20px -12px rgba(45, 108, 223, 0.18);
}

.schedule-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(15, 27, 45, 0.07);
}

.schedule-title-group {
  display: flex;
  align-items: center;
}

.schedule-range {
  margin: 0;
  color: #0f1b2d;
  font-size: 17px;
  font-weight: 700;
}

.nav-controls {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.nav-triangle {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(15, 27, 45, 0.07);
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
  border-right: 8px solid #5b6473;
  margin-left: -1px;
}

.nav-triangle.next::before {
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-left: 8px solid #5b6473;
  margin-left: 1px;
}

.nav-triangle:hover {
  border-color: rgba(45, 108, 223, 0.4);
}

.today-btn {
  height: 32px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid rgba(45, 108, 223, 0.11);
  background: #eef4fe;
  color: #2d6cdf;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: border-color 0.12s ease;
}

.today-btn:hover {
  border-color: rgba(45, 108, 223, 0.4);
}

.week-scroller {
  position: relative;
  overflow: auto;
  min-height: 340px;
  height: clamp(340px, 60vh, 760px);
  border: 0;
  border-radius: 0 0 20px 20px;
  background: #ffffff;
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
  height: 48px;
  display: flex;
  justify-content: center;
  padding: 8px;
  border-bottom: 1px solid rgba(15, 27, 45, 0.07);
  background: #fafbfd;
}

.corner-head {
  left: 0;
  z-index: 40;
  align-items: flex-end;
  font-size: 11.5px;
  color: #5b6473;
  font-weight: 600;
  border-right: 1px solid rgba(15, 27, 45, 0.07);
}

.day-head {
  align-items: center;
  border-right: 1px solid rgba(15, 27, 45, 0.07);
}

.day-head.is-today {
  background: #eef4fe;
}

.day-head.is-past {
  background: #fafbfd;
}

.day-display {
  font-size: 13px;
  color: #0f1b2d;
  font-weight: 600;
  white-space: nowrap;
}

.time-column {
  position: sticky;
  left: 0;
  z-index: 30;
  background: #fff;
  border-right: 1px solid rgba(15, 27, 45, 0.07);
  box-shadow: 10px 0 14px -14px rgba(45, 108, 223, 0.18);
}

.time-slot-label {
  height: var(--slot-height);
  border-bottom: 1px solid rgba(15, 27, 45, 0.04);
  display: flex;
  align-items: flex-start;
  justify-content: flex-end;
  padding-right: 8px;
  font-size: 11px;
  color: #94a3b8;
  line-height: 1;
}

.time-slot-label.is-boundary {
  color: #5b6473;
  border-bottom-color: rgba(15, 27, 45, 0.07);
}

.time-slot-label:first-child {
  border-top: 1px solid rgba(15, 27, 45, 0.07);
}

.time-slot-label.final {
  height: 22px;
  border-bottom: none;
  padding-top: 2px;
}

.day-column {
  position: relative;
  height: calc(var(--slot-height) * var(--slot-count));
  border-right: 1px solid rgba(15, 27, 45, 0.04);
  background: #fff;
}

.day-column.is-today {
  background: #fafcff;
}

.day-column.is-past {
  background: #fafbfd;
}

.slot-grid {
  display: grid;
  grid-template-rows: repeat(var(--slot-count), var(--slot-height));
}

.slot-cell {
  width: 100%;
  border: 0;
  border-bottom: 1px solid rgba(15, 27, 45, 0.04);
  background: transparent;
  cursor: crosshair;
  padding: 0;
  transition: background-color 0.12s ease;
}

.slot-cell.is-boundary {
  border-bottom-color: rgba(15, 27, 45, 0.07);
}

.slot-cell:first-child {
  border-top: 1px solid rgba(15, 27, 45, 0.07);
}

.slot-cell:hover:not(:disabled) {
  background: rgba(45, 108, 223, 0.08);
}

.slot-cell.is-selected {
  background: rgba(45, 108, 223, 0.16);
}

.slot-cell.is-reserved {
  background: rgba(248, 250, 252, 0.9);
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
  background: #eef4fe;
  border: 1px solid rgba(45, 108, 223, 0.18);
  color: #2d6cdf;
  z-index: 2;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  gap: 2px;
  padding: 5px 7px;
  overflow: hidden;
  box-shadow: none;
  pointer-events: auto;
  cursor: pointer;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    border-color 0.12s ease;
}

.event-block:hover {
  border-color: rgba(45, 108, 223, 0.4);
  box-shadow: 0 4px 12px rgba(45, 108, 223, 0.18);
  transform: translateY(-1px);
}

.event-block:focus-visible {
  outline: 2px solid rgba(45, 108, 223, 0.75);
  outline-offset: 1px;
}

.open-slot-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 700;
  color: #065f46;
  background: rgba(16, 185, 129, 0.18);
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 3px;
  padding: 1px 4px;
  line-height: 1.3;
  white-space: nowrap;
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 1px;
}

.event-name {
  font-size: 11.5px;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #2d6cdf;
}

.event-time {
  font-size: 10.5px;
  color: #5b6473;
  line-height: 1.25;
}

.selection-block {
  position: absolute;
  left: 5px;
  right: 5px;
  border-radius: 10px;
  z-index: 3;
}

.selection-block.confirmed {
  background: rgba(45, 108, 223, 0.12);
  border: 2px solid rgba(45, 108, 223, 0.52);
}

.selection-block.preview {
  background: rgba(45, 108, 223, 0.08);
  border: 2px dashed rgba(45, 108, 223, 0.5);
  z-index: 4;
}

.loading-overlay {
  position: sticky;
  left: 0;
  bottom: 0;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.96);
  border-top: 1px solid rgba(15, 27, 45, 0.07);
  font-size: 12.5px;
  color: #5b6473;
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
  color: #0f1b2d;
  font-size: 18px;
  font-weight: 700;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 12.5px;
  color: #5b6473;
  font-weight: 600;
}

.field-help {
  margin: 6px 0 0;
  font-size: 12px;
  color: #5b6473;
  line-height: 1.55;
}

.field-help.is-error {
  color: #b91c1c;
}

.field-help-warn {
  color: #b45309;
  font-weight: 600;
}

.simultaneous-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.simultaneous-checkbox {
  width: 16px;
  height: 16px;
  accent-color: #2d6cdf;
  cursor: pointer;
  flex-shrink: 0;
}

.simultaneous-label-text {
  font-size: 14px;
  color: #0f1b2d;
  font-weight: 500;
}

.input,
.select {
  border: 1px solid rgba(15, 27, 45, 0.07);
  padding: 0 14px;
  height: 42px;
  border-radius: 10px;
  background: #fafbfd;
  font-size: 14.5px;
  color: #0f1b2d;
}

.input:focus,
.select:focus {
  outline: none;
  border-color: rgba(45, 108, 223, 0.55);
  box-shadow: 0 0 0 3px rgba(45, 108, 223, 0.12);
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
  padding: 14px;
  border-radius: 10px;
  border: none;
  background: #2d6cdf;
  color: #fff;
  cursor: pointer;
  font-weight: 700;
  font-size: 15px;
  transition: background-color 0.12s ease;
  box-shadow: 0 6px 18px -6px rgba(45, 108, 223, 0.5);
}

.btn-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1px solid rgba(225, 29, 72, 0.25);
  background: #fff;
  color: #be123c;
  cursor: pointer;
  font-weight: 600;
  font-size: 14px;
  transition: background-color 0.12s ease;
}

.btn-secondary:hover {
  background: rgba(225, 29, 72, 0.08);
}

.btn-primary:hover {
  background: #1d57c4;
}

.btn-primary.wide {
  width: 100%;
  margin-top: 18px;
}

.btn-primary:disabled,
.btn-secondary:disabled,
.today-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  background: #d1d9e6;
}

.btn-secondary:disabled {
  background: #fff;
}

.reservation-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}

.reservation-modal {
  width: min(460px, 100%);
  max-height: calc(100vh - 60px);
  overflow-y: auto;
  background: #fff;
  padding: 24px;
}

.reservation-modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.7rem;
}

.reservation-modal-head h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: #0f1b2d;
}

.modal-close-btn {
  border: 1px solid rgba(15, 27, 45, 0.07);
  background: #fff;
  color: #5b6473;
  border-radius: 8px;
  padding: 7px 12px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
}

.modal-close-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.reservation-detail-list {
  margin-top: 0.8rem;
  display: grid;
  gap: 0.3rem;
}

.reservation-detail-list p {
  margin: 0;
  font-size: 13.5px;
  color: #5b6473;
}

.reservation-detail-list strong {
  color: #0f1b2d;
  font-weight: 700;
  margin-right: 8px;
}

.modal-edit-group {
  margin-top: 0.95rem;
}

.reservation-modal-actions {
  margin-top: 0.95rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.56rem;
}

@media (min-width: 1181px) {
  .workspace {
    flex-direction: row;
    align-items: flex-start;
    gap: 20px;
  }

  .schedule-panel {
    flex: 1 1 auto;
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
    width: 320px;
    min-width: 320px;
    border-top: 0;
    background: transparent;
    position: sticky;
    top: 24px;
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
  .reservation-page {
    padding: 24px 0 36px;
  }

  .layout {
    padding: 0 16px;
  }

  .page-heading h1 {
    font-size: 22px;
  }

  .page-heading p {
    font-size: 13px;
  }

  .page-heading {
    margin-bottom: 16px;
  }

  .workspace {
    gap: 14px;
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

  .card-panel {
    padding: 20px;
  }
}

@media (max-width: 768px) {
  .schedule-panel {
    border-radius: 16px;
  }

  .card-panel {
    border-radius: 16px;
  }

  .schedule-head {
    padding: 14px 16px;
  }

  .schedule-range {
    font-size: 15px;
    white-space: nowrap;
  }

  .form-head h3 {
    font-size: 16px;
    white-space: nowrap;
  }

  .week-scroller {
    min-height: 300px;
    height: 56vh;
    border-radius: 0 0 16px 16px;
  }

  .week-grid {
    --time-col-width: 56px;
  }

  .corner-head,
  .day-head {
    height: 44px;
  }

  .day-display {
    font-size: 12px;
  }

  .time-slot-label {
    font-size: 10.5px;
  }

  .label {
    font-size: 12px;
    white-space: nowrap;
  }

  .input,
  .select {
    font-size: 14px;
    height: 40px;
  }

  .today-btn {
    font-size: 12.5px;
    white-space: nowrap;
  }

  .btn-primary {
    font-size: 14.5px;
    white-space: nowrap;
  }

  .btn-secondary {
    font-size: 14px;
    white-space: nowrap;
  }

  .reservation-modal-actions {
    grid-template-columns: 1fr;
  }

  .loading-overlay {
    font-size: 11.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
</style>
