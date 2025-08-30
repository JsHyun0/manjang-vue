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
            <label class="label" for="date-picker">날짜 선택</label>
            <input
              id="date-picker"
              class="input"
              type="date"
              :min="today"
              v-model="selectedDate"
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

      <div class="card">
        <div class="card-content">
          <div class="section">
            <h3 class="section-title">예약 현황 ({{ selectedDate }})</h3>
            <div class="timeline-container">
              <div
                class="timeline-grid"
                :style="{ gridTemplateColumns: `repeat(${timeSlots.length}, var(--slot-width))`, gridTemplateRows: `auto var(--row-height)`, '--row-height': rowHeight + 'px' }"
              >
                <!-- 상단 시간 라벨 -->
                <div
                  v-for="time in timeSlots"
                  :key="'label-' + time"
                  class="time-label"
                >
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
                    :title="ev.name"
                    :style="{ left: `calc(var(--slot-width) * ${ev.start})`, width: `calc(var(--slot-width) * ${ev.span})`, top: `${8 + (20 * ev.lane)}px` }"
                  >
                    <span class="event-label">{{ ev.name }}</span>
                  </div>

                  <!-- 드래그 미리보기 -->
                  <div
                    v-if="dragPreview"
                    class="selection-abs preview"
                    :style="{ left: `calc(var(--slot-width) * ${dragPreview.start})`, width: `calc(var(--slot-width) * ${dragPreview.span})` }"
                  />

                  <!-- 확정된 선택 블록(다중 지원) -->
                  <div
                    v-for="sb in selectedBlocks"
                    :key="`sel-${sb.start}-${sb.span}`"
                    class="selection-abs confirmed"
                    :style="{ left: `calc(var(--slot-width) * ${sb.start})`, width: `calc(var(--slot-width) * ${sb.span})` }"
                  />
                </div>
              </div>
            </div>
          </div>

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
import { generateTimeSlots, listReservationsByDate, createReservations, type ReservationSlot } from '@/lib/reservation'
import { useAuth } from '@/lib/auth'

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref<string>(today)
const timeSlots = generateTimeSlots()

const reservations = ref<ReservationSlot[]>([])
const reservationForm = ref<{ name: string; selectedSlots: string[] }>({ name: '', selectedSlots: [] })

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

const toIndex = (t: string) => timeSlots.findIndex(s => s === t)
const normalizeRange = (a: string, b: string) => {
  const ai = toIndex(a); const bi = toIndex(b)
  if (ai === -1 || bi === -1) return [a, b] as const
  return ai <= bi ? [a, b] as const : [b, a] as const
}

const computeRange = (a: string, b: string): string[] => {
  const [start, end] = normalizeRange(a, b)
  const s = toIndex(start); const e = toIndex(end)
  if (s === -1 || e === -1) return []
  return timeSlots.slice(s, e + 1)
}

const effectiveSelectedHas = (time: string): boolean => {
  if (!isDragging.value || !dragStart.value || !dragCurrent.value) return selectedSet.value.has(time)
  const range = new Set(computeRange(dragStart.value, dragCurrent.value))
  const allSelected = Array.from(range).every(t => baseSetDuringDrag.has(t))
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
  if (!isDragging.value || !dragStart.value || !dragCurrent.value) { isDragging.value = false; dragStart.value = null; dragCurrent.value = null; return }
  const range = computeRange(dragStart.value, dragCurrent.value)
  const allSelected = range.every(t => baseSetDuringDrag.has(t))
  const next = new Set(baseSetDuringDrag)
  // 토글 규칙: 범위 내 모든 슬롯이 이미 선택되어 있으면 해제, 아니면 선택
  if (allSelected) {
    range.forEach(t => next.delete(t))
  } else {
    range.forEach(t => next.add(t))
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

const selectedTimes = computed(() => Array.from(selectedSet.value).sort((a, b) => toIndex(a) - toIndex(b)))

const handleReservation = async () => {
  if (!reservationForm.value.name || selectedTimes.value.length === 0) {
    alert('이름과 시간을 선택해주세요.')
    return
  }

  try {
    await createReservations(selectedDate.value, reservationForm.value.name, selectedTimes.value)
    await refreshReservations()
    alert('예약이 완료되었습니다.')
    reservationForm.value = { name: isLoggedIn.value ? userName.value : '', selectedSlots: [] }
    selectedSet.value = new Set()
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
type EventRect = { start: number; span: number; lane: number; name: string }

const eventRects = computed<EventRect[]>(() => {
  const curDate = selectedDate.value
  // key -> { name, indices }
  const keyTo = new Map<string, { name: string; indices: number[] }>()
  for (const r of reservations.value) {
    if (r.date !== curDate) continue
    const idx = toIndex(r.timeSlot)
    if (idx < 0) continue
    const key = r.id && r.id !== 0 ? `id:${r.id}` : `name:${r.name}`
    const bucket = keyTo.get(key) ?? { name: r.name, indices: [] }
    bucket.indices.push(idx)
    keyTo.set(key, bucket)
  }

  type Interval = { name: string; start: number; end: number }
  const intervals: Interval[] = []
  for (const { name, indices } of keyTo.values()) {
    indices.sort((a, b) => a - b)
    let s = -1, p = -2
    for (const i of indices) {
      if (i === p + 1) {
        // extend
      } else {
        if (s !== -1) intervals.push({ name, start: s, end: p })
        s = i
      }
      p = i
    }
    if (s !== -1) intervals.push({ name, start: s, end: p })
  }

  // lane assignment (interval graph coloring)
  intervals.sort((a, b) => a.start - b.start || b.end - a.end)
  const laneEnds: number[] = [] // exclusive end index for each lane
  const rects: EventRect[] = []
  for (const it of intervals) {
    let lane = 0
    while (lane < laneEnds.length && laneEnds[lane] > it.start) {
      lane++
    }
    if (lane === laneEnds.length) {
      laneEnds.push(it.end + 1)
    } else {
      laneEnds[lane] = it.end + 1
    }
    rects.push({ start: it.start, span: it.end - it.start + 1, lane, name: it.name })
  }
  return rects
})

type RangeBlock = { start: number; span: number }

const selectedBlocks = computed<RangeBlock[]>(() => {
  const idxs = Array.from(selectedSet.value)
    .map(t => toIndex(t))
    .filter(i => i >= 0)
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
  return reservations.value.some(r => r.date === selectedDate.value && r.timeSlot === time)
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
  const needed = topPadding + Math.max(selectionHeight, maxLane.value > 0 ? (8 + (maxLane.value - 1) * laneGap) + 12 : 0)
  return Math.max(base, needed)
})
</script>

<style scoped>
.min-h-screen { min-height: 100vh; }
.w-full { width: 100%; }
.mt-8 { margin-top: 0.5rem; }
.mb { margin-bottom: 1.5rem; }

.header {
  background: white;
  border-bottom: 1px solid var(--light-blue);
}
.container {
  max-width: 64rem;
  margin: 0 auto;
  padding: 1.5rem 1rem;
}
.text-center { text-align: center; }
.title { font-weight: 700; font-size: 1.25rem; color: var(--primary-blue); }
.subtitle { color: #64748b; margin-top: 0.25rem; }

.main { padding-top: 2rem; padding-bottom: 2rem; }

.card { background: white; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 4px 16px rgba(74, 144, 226, 0.06); }
.card-header { padding: 1rem 1rem 0.5rem; }
.card-content { padding: 1rem; }
.toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; padding: 1rem; align-items: flex-end; }
.field { display: flex; flex-direction: column; gap: 0.375rem; flex: 1 1 240px; min-width: 220px; }
.card-title { font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; color: #0f172a; }
.with-icon svg { color: #0f172a; }
.room-title { font-size: 1.1rem; font-weight: 600; color: var(--primary-blue); }
.room-desc { color: #0f172a; opacity: 0.75; margin-top: 0.25rem; }

.input { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; border-radius: 8px; background: #f9fafb; }

.section { margin-top: 0.25rem; }
.section-title { font-weight: 600; margin-bottom: 0.75rem; color: #0f172a; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.5rem; }
@media (min-width: 640px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 768px) { .grid { grid-template-columns: repeat(4, 1fr); } }
@media (min-width: 1024px) { .grid { grid-template-columns: repeat(6, 1fr); } }

.slot { padding: 0.5rem; border-radius: 8px; border: 1px solid; text-align: center; font-size: 0.9rem; transition: background-color 0.15s ease; }
.slot-empty { background: #f8fafc; border-color: #e2e8f0; color: #475569; }
.slot-empty:hover { background: #f1f5f9; }
.slot-has { background: #ecfeff; border-color: #bae6fd; color: #0c4a6e; }
.slot-selected { outline: 2px solid var(--primary-blue); outline-offset: 0; box-shadow: 0 0 0 2px rgba(74,144,226,0.15) inset; }
.slot-time { font-weight: 600; }
.slot-meta { font-size: 0.75rem; margin-top: 0.25rem; }
.slot-meta.empty { color: #64748b; }

.slot-badges { display: flex; flex-direction: column; gap: 4px; align-items: center; position: relative; }
.badge-line { display: flex; flex-direction: row; gap: 6px; align-items: center; }
.more-wrapper { position: relative; display: inline-flex; }
.badge { display: inline-flex; align-items: center; padding: 2px 6px; border-radius: 999px; background: #e0f2fe; color: #075985; font-weight: 600; font-size: 0.7rem; border: 1px solid #bae6fd; }
.badge.more { background: #eef2ff; color: #3730a3; border-color: #c7d2fe; }

.popover { position: absolute; top: 100%; margin-top: 6px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 6px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); z-index: 10; min-width: 140px; }
.popover-item { font-size: 0.8rem; padding: 4px 6px; color: #0f172a; }
.popover-item + .popover-item { border-top: 1px solid #f1f5f9; }

.dialog { margin-top: 1rem; }
.dialog-content { background: white; border: 1px solid #e5e7eb; border-radius: 12px; padding: 1rem; box-shadow: 0 12px 30px rgba(0,0,0,0.08); }
.dialog-header { margin-bottom: 0.75rem; }
.dialog-title { font-weight: 600; font-size: 1rem; }
.dialog-desc { color: #64748b; }
.form-item { margin-top: 0.75rem; }
.label { display: block; margin-bottom: 0.375rem; font-size: 0.9rem; color: #0f172a; }
.select-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.5rem; max-height: 12rem; overflow-y: auto; }
.select-slot { padding: 0.5rem; border-radius: 8px; border: 1px solid #e5e7eb; background: white; font-size: 0.9rem; cursor: pointer; transition: all 0.15s ease; }
.select-slot:hover { background: #f8fafc; }
.select-slot.is-selected { background: var(--primary-blue); color: white; border-color: var(--primary-blue); }

.btn { display: inline-flex; align-items: center; justify-content: center; padding: 0.625rem 0.75rem; border-radius: 8px; border: 1px solid transparent; cursor: pointer; font-weight: 600; }
.btn-primary { background: var(--primary-blue); color: white; }
.btn-primary:hover { background: var(--secondary-blue); }
.btn-ghost { background: transparent; color: #334155; border-color: #e5e7eb; }
.btn-ghost:hover { background: #f8fafc; }

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
  height: var(--row-height);
  border: none;
  border-right: 1px solid #eef2f7;
  background: #f8fafc;
  cursor: pointer;
  transition: background-color 0.06s linear;
  position: relative;
}
.time-cell:hover { background: #f1f5f9; }
.time-cell.is-selected { background: #e0efff; }
.time-cell.is-hour::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: #cbd5e1;
}
.time-cell.is-reserved { background: #fff1f3; cursor: not-allowed; }

/* 오버레이 레이어 (절대 위치) */
.overlay-row { position: absolute; left: 0; right: 0; bottom: 0; height: var(--row-height); pointer-events: none; }
.event-abs { position: absolute; height: 16px; background: #93c5fd; border-radius: 4px; z-index: 1; display: flex; align-items: center; }
.event-abs .event-label { position: static; margin-left: 6px; font-size: 12px; color: #0f172a; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.selection-abs { position: absolute; top: 4px; height: calc(var(--row-height) - 8px); background: rgba(74,144,226,0.18); border: 2px solid rgba(74,144,226,0.65); border-radius: 10px; z-index: 3; }
.selection-abs.preview { border-style: dashed; }
.selection-abs.confirmed { border-style: solid; }
</style>
