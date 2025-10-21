<template>
  <div class="min-h-screen">
    <!-- <header class="header">
      <div class="container">
        <div class="text-center">
          <h1 class="title">동아리방 예약</h1>
          <p class="subtitle">간편하게 동아리방을 예약하세요</p>
        </div>
      </div>
    </header> -->

    <main class="container main">
      <div class="card mb">
        <div class="toolbar">
          <div class="field">
            <label class="label" for="debate-select">토론 일정</label>
            <select id="debate-select" class="input" v-model="reservationForm.debateId">
              <option value="">선택 없음</option>
              <option value="__custom__">직접 입력</option>
            </select>
          </div>
          <div class="field" v-if="reservationForm.debateId === '__custom__'">
            <label class="label" for="debate-title">토론 이름</label>
            <input
              id="debate-title"
              class="input"
              v-model="reservationForm.debateTitle"
              placeholder="예: 10/25 회의 - 안건 검토"
            />
          </div>
          <div class="field">
            <label class="label" for="reserver-name">이름</label>
            <input
              id="reserver-name"
              class="input"
              v-model="reservationForm.name"
              placeholder="예약자 이름을 입력하세요"
            />
          </div>
        </div>
      </div>

      <div class="card mb">
        <div class="card-content">
          <Calendar
            :currentYear="currentYear"
            :currentMonth="currentMonth"
            :calendarDays="calendarDays"
            :selectedDate="selectedDateObj"
            :hasReservation="hasReservation"
            :getReservations="getReservationsForDate"
            :isToday="isToday"
            :isPastDate="isPastDate"
            @change-month="changeMonth"
            @select-date="onSelectCalendarDate"
          />
        </div>
      </div>

      <div class="card" v-show="isCardContentVisible">
        <div class="card-content">
          <div class="section">
            <h3 class="section-title">예약 현황 ({{ selectedDate }})</h3>
            <div class="timeline-container">
              <div
                class="timeline-grid"
                :style="{
                  gridTemplateColumns: `repeat(${timeSlots.length}, var(--slot-width))`,
                  gridTemplateRows: `auto var(--row-height)`,
                  '--row-height': rowHeight + 'px',
                }"
              >
                <!-- 상단 시간 라벨 -->
                <div v-for="time in timeSlots" :key="'label-' + time" class="time-label">
                  <span v-if="time.endsWith(':00')">{{ time }}</span>
                  <span v-else class="tick" />
                </div>

                <!-- 하단 선택 가능한 셀 -->
                <button
                  v-for="time in timeSlots"
                  :key="'cell-' + time"
                  class="time-cell"
                  :class="{ 'is-selected': isSelected(time), 'is-hour': time.endsWith(':00') }"
                  @mousedown="onSlotMouseDown(time, $event)"
                  @mouseenter="onSlotMouseEnter(time)"
                  @mouseleave="onSlotMouseLeave(time)"
                />

                <!-- 오버레이 레이어 (절대 위치) -->
                <div class="overlay-row">
                  <!-- 예약 이벤트(개별 라인, 충돌시 수직 스택) -->
                  <div
                    v-for="ev in eventRects"
                    :key="`ev-${ev.start}-${ev.span}-${ev.lane}-${ev.name}`"
                    class="event-abs"
                    :title="ev.title ? `${ev.title} · ${ev.name}` : ev.name"
                    :style="{
                      left: `calc(var(--slot-width) * ${ev.start})`,
                      width: `calc(var(--slot-width) * ${ev.span})`,
                      top: `${8 + 20 * ev.lane}px`,
                    }"
                    @click="onClickEvent(ev)"
                  >
                    <span class="event-label">{{
                      ev.title ? `${ev.title} · ${ev.name}` : ev.name
                    }}</span>
                  </div>

                  <!-- 드래그 미리보기 -->
                  <div
                    v-if="dragPreview"
                    class="selection-abs preview"
                    :style="{
                      left: `calc(var(--slot-width) * ${dragPreview.start})`,
                      width: `calc(var(--slot-width) * ${dragPreview.span})`,
                    }"
                  />

                  <!-- 확정된 선택 블록(다중 지원) -->
                  <div
                    v-for="sb in selectedBlocks"
                    :key="`sel-${sb.start}-${sb.span}`"
                    class="selection-abs confirmed"
                    :style="{
                      left: `calc(var(--slot-width) * ${sb.start})`,
                      width: `calc(var(--slot-width) * ${sb.span})`,
                    }"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Edit/Delete Modal -->
          <div v-if="showEditModal" class="dialog">
            <div class="dialog-content">
              <div class="dialog-header">
                <div class="dialog-title">예약 수정/삭제</div>
                <div class="dialog-desc">테스트 기능이므로 자신의 것만 수정하십시오.</div>
              </div>
              <div class="form-item">
                <label class="label">예약자 이름</label>
                <input class="input" v-model="editForm.name" />
              </div>
              <div class="form-item">
                <label class="label">토론 이름 (선택)</label>
                <input class="input" v-model="editForm.title" />
              </div>
              <div class="toolbar" style="justify-content: flex-end; padding-top: 0.5rem">
                <button class="btn btn-ghost" @click="showEditModal = false">취소</button>
                <button class="btn btn-primary" @click="submitUpdate">수정</button>
                <button class="btn btn-primary" style="background: #ef4444" @click="submitDelete">
                  삭제
                </button>
              </div>
            </div>
          </div>

          <!-- Toast -->
          <div v-if="toast.visible" class="toast">{{ toast.message }}</div>

          <div class="inline-form">
            <div class="form-item">
              <label class="label">선택한 시간</label>
              <p class="hint" v-if="selectedTimes.length">
                {{ selectedDate }} • {{ selectedTimes.join(', ') }} ({{ selectedTimes.length }}개)
              </p>
              <p class="hint" v-else>슬롯을 클릭 또는 드래그하여 선택하세요</p>
            </div>

            <button class="btn btn-primary" @click="handleReservation">예약 확정</button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import {
  generateTimeSlots,
  listReservationsByDate,
  listReservationsAroundMonth,
  createReservations,
  type ReservationSlot,
  updateReservation,
  deleteReservation,
  computeEventRects,
  type EventRect as LibEventRect,
} from '@/lib/reservation'
import { useAuth } from '@/lib/auth'
import Calendar from '@/components/Calendar.vue'
import { useCalendar } from '@/lib/calendar'

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref<string>(today)
const isCardContentVisible = ref(false)
const timeSlots = generateTimeSlots()

const reservations = ref<ReservationSlot[]>([])
const reservationForm = ref<{
  name: string
  selectedSlots: string[]
  debateId: string
  debateTitle?: string
}>({
  name: '',
  selectedSlots: [],
  debateId: '',
  debateTitle: '',
})

// 로그인 사용자 이름으로 자동 채우기 (사용자 입력은 유지)
const { isLoggedIn, userName } = useAuth()
onMounted(() => {
  if (isLoggedIn.value && !reservationForm.value.name) {
    reservationForm.value.name = userName.value
  }
})
watch([isLoggedIn, userName], () => {
  if (isLoggedIn.value && !reservationForm.value.name) {
    reservationForm.value.name = userName.value
  }
})

// 선택 상태 (다중/비연속 지원)
const selectedSet = ref<Set<string>>(new Set())

// 드래그 선택 프레임
const isDragging = ref(false)
const dragStart = ref<string | null>(null)
const dragCurrent = ref<string | null>(null)
const dragMode = ref<'select' | 'deselect'>('select')
let baseSetDuringDrag: Set<string> = new Set()

const toIndex = (t: string) => timeSlots.findIndex((s) => s === t)
const normalizeRange = (a: string, b: string) => {
  const ai = toIndex(a)
  const bi = toIndex(b)
  if (ai === -1 || bi === -1) return [a, b] as const
  return ai <= bi ? ([a, b] as const) : ([b, a] as const)
}

const computeRange = (a: string, b: string): string[] => {
  const [start, end] = normalizeRange(a, b)
  const s = toIndex(start)
  const e = toIndex(end)
  if (s === -1 || e === -1) return []
  return timeSlots.slice(s, e + 1)
}

const effectiveSelectedHas = (time: string): boolean => {
  if (!isDragging.value || !dragStart.value || !dragCurrent.value)
    return selectedSet.value.has(time)
  const range = new Set(computeRange(dragStart.value, dragCurrent.value))
  const allSelected = Array.from(range).every((t) => baseSetDuringDrag.has(t))
  // 미리보기: 모두 선택되어 있으면 범위를 해제한 상태로, 아니면 선택한 상태로 미리보기
  if (allSelected) {
    return baseSetDuringDrag.has(time) && !range.has(time)
  }
  return baseSetDuringDrag.has(time) || range.has(time)
}

const isSelected = (time: string) => effectiveSelectedHas(time)

const onSlotMouseDown = (time: string, e?: MouseEvent) => {
  e?.preventDefault()
  e?.stopPropagation()
  isDragging.value = true
  dragStart.value = time
  dragCurrent.value = time
  baseSetDuringDrag = new Set(selectedSet.value)
  dragMode.value = baseSetDuringDrag.has(time) ? 'deselect' : 'select'
}

const onSlotMouseEnter = (time: string) => {
  if (!isDragging.value) return
  dragCurrent.value = time
}

const handleMouseUp = () => {
  if (!isDragging.value || !dragStart.value || !dragCurrent.value) {
    isDragging.value = false
    dragStart.value = null
    dragCurrent.value = null
    return
  }
  const range = computeRange(dragStart.value, dragCurrent.value)
  const allSelected = range.every((t) => baseSetDuringDrag.has(t))
  const next = new Set(baseSetDuringDrag)
  // 토글 규칙: 범위 내 모든 슬롯이 이미 선택되어 있으면 해제, 아니면 선택
  if (allSelected) {
    range.forEach((t) => next.delete(t))
  } else {
    range.forEach((t) => next.add(t))
  }
  selectedSet.value = next
  isDragging.value = false
  dragStart.value = null
  dragCurrent.value = null
}

onMounted(() => document.addEventListener('mouseup', handleMouseUp))
onBeforeUnmount(() => document.removeEventListener('mouseup', handleMouseUp))

const onSlotMouseLeave = (_time: string) => {
  if (!isDragging.value) return
}

const selectedTimes = computed(() =>
  Array.from(selectedSet.value).sort((a, b) => toIndex(a) - toIndex(b)),
)

const handleReservation = async () => {
  if (!reservationForm.value.name || selectedTimes.value.length === 0) {
    alert('이름과 시간을 선택해주세요.')
    return
  }

  try {
    const title =
      reservationForm.value.debateId === '__custom__'
        ? reservationForm.value.debateTitle || null
        : null
    await createReservations(
      selectedDate.value,
      reservationForm.value.name,
      selectedTimes.value,
      title,
    )
    await refreshReservations()
    await prefetchMonthReservations()
    alert('예약이 완료되었습니다.')
    reservationForm.value = {
      name: isLoggedIn.value ? userName.value : '',
      selectedSlots: [],
      debateId: '',
      debateTitle: '',
    }
    selectedSet.value = new Set()
    // 월간 캐시는 prefetchMonthReservations에서 재구성됨
  } catch (e: any) {
    alert(e?.message || '예약 중 오류가 발생했습니다.')
  }
}

const refreshReservations = async () => {
  reservations.value = await listReservationsByDate(selectedDate.value)
  // 날짜 변경 시 선택 초기화
  selectedSet.value = new Set()
}

// 초기 로드 및 날짜 변경 시 업데이트
refreshReservations()
watchEffect(refreshReservations)

// -----------------
// Timeline computed
// -----------------
type EventRect = LibEventRect

const eventRects = computed<EventRect[]>(() =>
  computeEventRects(selectedDate.value, reservations.value, timeSlots),
)

type RangeBlock = { start: number; span: number }

const selectedBlocks = computed<RangeBlock[]>(() => {
  const idxs = Array.from(selectedSet.value)
    .map((t) => toIndex(t))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b)
  const blocks: RangeBlock[] = []
  let j = 0
  while (j < idxs.length) {
    let k = j + 1
    while (k < idxs.length && idxs[k] === idxs[k - 1] + 1) k++
    blocks.push({ start: idxs[j], span: idxs[k - 1] - idxs[j] + 1 })
    j = k
  }
  return blocks
})

// -----------------
// Event click & modal
// -----------------
type ClickedEvent = EventRect & { id?: string }
const showEditModal = ref(false)
const clickedEvent = ref<ClickedEvent | null>(null)
const editForm = ref<{ name: string; title: string | null }>({ name: '', title: null })

const onClickEvent = (ev: EventRect) => {
  // 경고: 본인 것만 수정 (toast)
  showToast('테스트 기능이므로 자신의 것만 수정하십시오.')
  // 선택된 이벤트의 대표 슬롯을 찾아 id/title/name 추정
  const startIndex = ev.start
  const time = timeSlots[startIndex]
  const found = reservations.value.find((r) => r.date === selectedDate.value && r.timeSlot === time)
  clickedEvent.value = { ...ev, id: found?.id }
  editForm.value = { name: found?.name ?? ev.name, title: found?.title ?? ev.title ?? null }
  // 수정/삭제 상태 진입 시 선택된 time-cell 초기화
  selectedSet.value = new Set()
  isDragging.value = false
  dragStart.value = null
  dragCurrent.value = null
  showEditModal.value = true
}

const submitUpdate = async () => {
  if (!clickedEvent.value?.id) {
    showEditModal.value = false
    return
  }
  await updateReservation(clickedEvent.value.id, {
    reserved_by_name: editForm.value.name,
    title: editForm.value.title ?? null,
  })
  await refreshReservations()
  await prefetchMonthReservations()
  showEditModal.value = false
}

// -----------------
// Toast
// -----------------
const toast = ref<{ visible: boolean; message: string }>({ visible: false, message: '' })
let toastTimer: number | null = null
const showToast = (message: string, duration = 2500) => {
  toast.value = { visible: true, message }
  if (toastTimer) window.clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toast.value.visible = false
    toastTimer = null
  }, duration)
}

const submitDelete = async () => {
  if (!clickedEvent.value?.id) {
    showEditModal.value = false
    return
  }
  await deleteReservation(clickedEvent.value.id)
  await refreshReservations()
  await prefetchMonthReservations()
  showEditModal.value = false
}

const dragPreview = computed<RangeBlock | null>(() => {
  if (!isDragging.value || !dragStart.value || !dragCurrent.value) return null
  const a = toIndex(dragStart.value)
  const b = toIndex(dragCurrent.value)
  if (a < 0 || b < 0) return null
  const start = Math.min(a, b)
  const span = Math.abs(b - a) + 1
  return { start, span }
})

// 예약 여부 (단일 슬롯)
const isReservedTime = (time: string): boolean => {
  return reservations.value.some((r) => r.date === selectedDate.value && r.timeSlot === time)
}

// 동적 row 높이 계산: 이벤트 라인의 최대 lane 수에 따라 증가
const maxLane = computed(() => {
  return eventRects.value.reduce((m, r) => Math.max(m, r.lane), -1) + 1
})
const rowHeight = computed(() => {
  const base = 52 // 기본 셀 높이
  const laneGap = 20 // 각 라인 간격 (사용자 조정 반영)
  const topPadding = 6
  const selectionHeight = 40
  const needed =
    topPadding +
    Math.max(selectionHeight, maxLane.value > 0 ? 8 + (maxLane.value - 1) * laneGap + 12 : 0)
  return Math.max(base, needed)
})

// -----------------
// Calendar bindings
// -----------------
const { currentYear, currentMonth, calendarDays, changeMonth, isToday, isPastDate } = useCalendar()

const pad = (n: number) => n.toString().padStart(2, '0')
const toYmd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const ymdToDate = (s: string) => new Date(`${s}T00:00:00`)

const selectedDateObj = computed<Date | null>(() =>
  selectedDate.value ? ymdToDate(selectedDate.value) : null,
)

const reservedDates = ref<Set<string>>(new Set())
const hasReservation = (date: Date): boolean => reservedDates.value.has(toYmd(date))
const monthEventsByDate = ref<Map<string, { name: string; startTime: string }[]>>(new Map())
const monthCache = ref<Map<string, ReservationSlot[]>>(new Map()) // key: YYYY-MM

// 선택한 날짜 여부와 관계없이 월 단위 캐시를 사용하여 시작 시간만 노출
// 상세 이름 표시가 필요하면 캐시에 이름을 포함하도록 확장 가능
const getReservationsForDate = (date: Date): { name: string; startTime: string }[] => {
  const ymd = toYmd(date)
  return monthEventsByDate.value.get(ymd) ?? []
}

const prefetchMonthReservations = async () => {
  // 기준일: 달력 그리드의 중앙일 또는 1일. 간단히 현재 년/월의 15일을 사용
  const y = currentYear.value
  const m = currentMonth.value + 1
  const centerYmd = `${y}-${String(m).padStart(2, '0')}-15`

  // 월 범위 일괄 조회 (이전/현재/다음달 포함)
  const byDate = await listReservationsAroundMonth(centerYmd)

  // 캐시와 달력 뷰 모델을 완전히 재구성 (이전 캐시와의 병합 제거)
  const nextReserved = new Set<string>()
  const eventsMap = new Map<string, { name: string; startTime: string }[]>()
  const nextMonthCache = new Map<string, ReservationSlot[]>()

  // 날짜별 슬롯을 저장하고, 월 캐시(YYYY-MM)에도 병합 저장
  for (const [ymd, slots] of Object.entries(byDate)) {
    if (slots.length > 0) nextReserved.add(ymd)
    // day view용 이벤트 리스트 (시작 시간 라벨만 필요)
    type Earliest = { startTime: string; name: string }
    const byKey = new Map<string, Earliest>()
    for (const s of slots) {
      const key = s.id ? `id:${s.id}` : `name:${s.name}|title:${s.title ?? ''}`
      const cur = byKey.get(key)
      if (!cur || s.timeSlot < cur.startTime) {
        byKey.set(key, { startTime: s.timeSlot, name: s.name })
      }
    }
    const items = Array.from(byKey.values())
      .map(({ name, startTime }) => ({ name, startTime }))
      .sort((a, b) => (a.startTime < b.startTime ? -1 : a.startTime > b.startTime ? 1 : 0))
    eventsMap.set(ymd, items)

    const ym = ymd.slice(0, 7)
    const prev = nextMonthCache.get(ym) ?? []
    nextMonthCache.set(ym, [...prev, ...slots])
  }

  reservedDates.value = nextReserved
  monthEventsByDate.value = eventsMap
  monthCache.value = nextMonthCache
}

watch(
  [currentYear, currentMonth],
  () => {
    prefetchMonthReservations()
  },
  { immediate: true },
)

const onSelectCalendarDate = (date: Date) => {
  selectedDate.value = toYmd(date)
  isCardContentVisible.value = true
  // 상세 타임라인용 개별 날짜 데이터는 기존과 동일하게 당일만 호출
  // 캐시된 월 데이터가 있는 경우 reservations를 캐시에서 우선 채움
  const ym = selectedDate.value.slice(0, 7)
  const day = selectedDate.value
  const cached = monthCache.value.get(ym)
  if (cached) {
    reservations.value = cached.filter((s) => s.date === day)
  }
  // 최신화를 위해 당일 상세만 백엔드에 재요청 (UI 즉시반응 + 최신 동기화)
  refreshReservations()
}

// 중복 정의 제거됨
</script>

<style scoped>
.min-h-screen {
  min-height: 100vh;
}
.w-full {
  width: 100%;
}
.mt-8 {
  margin-top: 0.5rem;
}
.mb {
  margin-bottom: 1.5rem;
}

.header {
  background: white;
  border-bottom: 1px solid var(--light-blue);
}
.container {
  max-width: 64rem;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
.text-center {
  text-align: center;
}
.title {
  font-weight: 700;
  font-size: 1.25rem;
  color: var(--primary-blue);
}
.subtitle {
  color: #64748b;
  margin-top: 0.25rem;
}

.main {
  padding-top: 2rem;
  padding-bottom: 2rem;
}

.card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(74, 144, 226, 0.06);
}
.card-header {
  padding: 1rem 1rem 0.5rem;
}
.card-content {
  padding: 1rem;
}
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 1rem;
  align-items: flex-end;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  flex: 1 1 240px;
  min-width: 220px;
}
.card-title {
  font-size: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #0f172a;
}
.with-icon svg {
  color: #0f172a;
}
.room-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary-blue);
}
.room-desc {
  color: #0f172a;
  opacity: 0.75;
  margin-top: 0.25rem;
}

.input {
  border: 1px solid #e5e7eb;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: #f9fafb;
}

.section {
  margin-top: 0.25rem;
}
.section-title {
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: #0f172a;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}
@media (min-width: 640px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}
@media (min-width: 1024px) {
  .grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

.slot {
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid;
  text-align: center;
  font-size: 0.9rem;
  transition: background-color 0.15s ease;
}
.slot-empty {
  background: #f8fafc;
  border-color: #e2e8f0;
  color: #475569;
}
.slot-empty:hover {
  background: #f1f5f9;
}
.slot-has {
  background: #ecfeff;
  border-color: #bae6fd;
  color: #0c4a6e;
}
.slot-selected {
  outline: 2px solid var(--primary-blue);
  outline-offset: 0;
  box-shadow: 0 0 0 2px rgba(74, 144, 226, 0.15) inset;
}
.slot-time {
  font-weight: 600;
}
.slot-meta {
  font-size: 0.75rem;
  margin-top: 0.25rem;
}
.slot-meta.empty {
  color: #64748b;
}

.slot-badges {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  position: relative;
}
.badge-line {
  display: flex;
  flex-direction: row;
  gap: 6px;
  align-items: center;
}
.more-wrapper {
  position: relative;
  display: inline-flex;
}
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  border-radius: 999px;
  background: #e0f2fe;
  color: #075985;
  font-weight: 600;
  font-size: 0.7rem;
  border: 1px solid #bae6fd;
}
.badge.more {
  background: #eef2ff;
  color: #3730a3;
  border-color: #c7d2fe;
}

.popover {
  position: absolute;
  top: 100%;
  margin-top: 6px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 6px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  z-index: 10;
  min-width: 140px;
}
.popover-item {
  font-size: 0.8rem;
  padding: 4px 6px;
  color: #0f172a;
}
.popover-item + .popover-item {
  border-top: 1px solid #f1f5f9;
}

.dialog {
  margin-top: 1rem;
}
.dialog-content {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.08);
}
.dialog-header {
  margin-bottom: 0.75rem;
}
.dialog-title {
  font-weight: 600;
  font-size: 1rem;
}
.dialog-desc {
  color: #64748b;
}
.toast {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  background: rgba(17, 24, 39, 0.92);
  color: #fff;
  padding: 10px 14px;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.18);
  z-index: 50;
  font-size: 0.9rem;
}
.form-item {
  margin-top: 0.75rem;
}
.label {
  display: block;
  margin-bottom: 0.375rem;
  font-size: 0.9rem;
  color: #0f172a;
}
.select-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  max-height: 12rem;
  overflow-y: auto;
}
.select-slot {
  padding: 0.5rem;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.15s ease;
}
.select-slot:hover {
  background: #f8fafc;
}
.select-slot.is-selected {
  background: var(--primary-blue);
  color: white;
  border-color: var(--primary-blue);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.625rem 0.75rem;
  border-radius: 8px;
  border: 1px solid transparent;
  cursor: pointer;
  font-weight: 600;
}
.btn-primary {
  background: var(--primary-blue);
  color: white;
}
.btn-primary:hover {
  background: var(--secondary-blue);
}
.btn-ghost {
  background: transparent;
  color: #334155;
  border-color: #e5e7eb;
}
.btn-ghost:hover {
  background: #f8fafc;
}

/* Timeline */
.timeline-container {
  --slot-width: 84px;
  overflow-x: auto;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  user-select: none;
}

.timeline-grid {
  display: grid;
  grid-template-rows: auto var(--row-height);
  align-items: stretch;
  position: relative;
}

.time-label {
  grid-row: 1;
  width: var(--slot-width);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: #475569;
  border-right: 1px solid #eef2f7;
  padding: 0.25rem 0;
}
.time-label .tick {
  width: 1px;
  height: 10px;
  background: #cbd5e1;
}

.time-cell {
  grid-row: 2;
  width: var(--slot-width);
  height: calc(var(--row-height) + 8px); /* 높이 소폭 상향 */
  border: none;
  border-right: 1px solid #eef2f7;
  background: #f8fafc;
  cursor: pointer;
  transition: background-color 0.06s linear;
  position: relative;
}
.time-cell:hover {
  background: #f1f5f9;
}
.time-cell.is-selected {
  background: #eef6ff; /* 옅은 선택 배경 (라벨은 오버레이 상단 유지) */
  z-index: 1;
  position: relative;
}
.time-cell.is-selected:hover {
  background: #d6e8ff;
}
.time-cell.is-hour::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #cbd5e1;
}
.time-cell.is-reserved {
  background: #fff1f3;
  cursor: not-allowed;
}

/* 오버레이 레이어 (절대 위치) */
.overlay-row {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: var(--row-height);
  pointer-events: none;
}
.event-abs {
  position: absolute;
  height: 18px; /* 약간 커진 라벨 높이 */
  background: #2563eb1a; /* 옅은 파란 배경(투명) */
  border: 1px solid #3b82f6; /* 테두리로 클릭 가능한 객체 느낌 강화 */
  border-radius: 6px;
  z-index: 2; /* 라벨이 선택 하이라이트보다 위에 보이도록 */
  display: flex;
  align-items: center;
  pointer-events: auto; /* 오버레이 컨테이너가 pointer-events: none 이어도 클릭 가능 */
}
.event-abs .event-label {
  position: static;
  margin-left: 6px;
  font-size: 12.5px;
  color: #0b2451;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.selection-abs {
  position: absolute;
  top: 4px;
  height: calc(var(--row-height) - 8px);
  background: transparent; /* 내부 채움 제거 */
  border: 2px solid rgba(74, 144, 226, 0.9); /* 선명한 직선 테두리 */
  border-radius: 0; /* 둥근 모서리 제거 */
  z-index: 1; /* 셀 위에 보이게, 이벤트 라벨(z=2)보다 아래 */
}
.selection-abs.preview {
  border-style: dashed;
}
.selection-abs.confirmed {
  border-style: solid;
}
</style>
