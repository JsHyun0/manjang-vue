<template>
  <div class="min-h-screen">
    <header class="header">
      <div class="container">
        <div class="text-center">
          <h1 class="title">동아리방 예약</h1>
          <p class="subtitle">간편하게 동아리방을 예약하세요</p>
        </div>
      </div>
    </header>

    <main class="container main">
      <div class="card mb">
        <div class="card-header">
          <h2 class="card-title with-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            날짜 선택
          </h2>
        </div>
        <div class="card-content">
          <input
            class="input"
            type="date"
            :min="today"
            v-model="selectedDate"
          />
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="room-title">{{ clubRoom.name }}</h2>
          <p class="room-desc">{{ clubRoom.location }} • 수용인원 {{ clubRoom.capacity }}명 • {{ clubRoom.features.join(', ') }}</p>
        </div>
        <div class="card-content">
          <div class="section">
            <h3 class="section-title">예약 현황 ({{ selectedDate }})</h3>
            <div class="grid">
              <div
                v-for="time in timeSlots"
                :key="time"
                :class="['slot', getSlotReservationCount(time) > 0 ? 'slot-has' : 'slot-empty', isSelected(time) ? 'slot-selected' : '']"
                @mousedown="onSlotMouseDown(time)"
                @mouseenter="onSlotMouseEnter(time)"
                @mouseleave="onSlotMouseLeave(time)"
              >
                <div class="slot-time">{{ time }}</div>
                <div class="slot-meta" v-if="getSlotReservationCount(time) > 0">
                  <div class="slot-badges">
                    <div class="badge-line" v-if="getSlotNameBadges(time).first[0]">
                      <span class="badge">{{ getSlotNameBadges(time).first[0] }}</span>
                    </div>
                    <div class="badge-line" v-if="getSlotNameBadges(time).first[1] || getSlotNameBadges(time).remaining > 0">
                      <span v-if="getSlotNameBadges(time).first[1]" class="badge">{{ getSlotNameBadges(time).first[1] }}</span>
                      <span v-if="getSlotNameBadges(time).remaining > 0" class="more-wrapper">
                        <span
                          class="badge more"
                          @mouseenter.stop="showMore(time)"
                          @mouseleave.stop="hideMore()"
                          @click.stop="toggleMore(time)"
                        >+{{ getSlotNameBadges(time).remaining }}</span>
                        <div v-if="hoverMoreFor === time" class="popover">
                          <div class="popover-item" v-for="n in getSlotNameBadges(time).rest" :key="n">{{ n }}</div>
                        </div>
                      </span>
                    </div>
                  </div>
                </div>
                <div class="slot-meta empty" v-else>예약 없음</div>
              </div>
            </div>
          </div>

          <div class="inline-form">
            <div class="form-item">
              <label class="label" for="name-inline">이름</label>
              <input
                id="name-inline"
                class="input"
                v-model="reservationForm.name"
                placeholder="예약자 이름을 입력하세요"
              />
            </div>

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
import { ref, computed, watchEffect, onMounted, onBeforeUnmount } from 'vue'
import { generateTimeSlots, listReservationsByDate, createReservations, type ReservationSlot } from '@/lib/reservation'

const clubRoom = {
  id: 1,
  name: '동아리방',
  capacity: 15,
  features: ['WiFi', '화이트보드', '프로젝터'],
  location: '학생회관 3층',
}

const today = new Date().toISOString().split('T')[0]
const selectedDate = ref<string>(today)
const timeSlots = generateTimeSlots()

const reservations = ref<ReservationSlot[]>([])
const reservationForm = ref<{ name: string; selectedSlots: string[] }>({ name: '', selectedSlots: [] })

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
  if (dragMode.value === 'select') {
    return baseSetDuringDrag.has(time) || range.has(time)
  } else {
    return baseSetDuringDrag.has(time) && !range.has(time)
  }
}

const isSelected = (time: string) => effectiveSelectedHas(time)

const onSlotMouseDown = (time: string) => {
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
  if (!isDragging.value || !dragStart.value || !dragCurrent.value) { isDragging.value = false; return }
  const range = computeRange(dragStart.value, dragCurrent.value)
  const next = new Set(baseSetDuringDrag)
  if (dragMode.value === 'select') {
    range.forEach(t => next.add(t))
  } else {
    range.forEach(t => next.delete(t))
  }
  selectedSet.value = next
  isDragging.value = false
  dragStart.value = null
  dragCurrent.value = null
}

onMounted(() => document.addEventListener('mouseup', handleMouseUp))
onBeforeUnmount(() => document.removeEventListener('mouseup', handleMouseUp))

const getSlotReservations = (time: string) => reservations.value.filter(r => r.date === selectedDate.value && r.timeSlot === time)
const getSlotReservationCount = (time: string) => getSlotReservations(time).length
const getSlotNameBadges = (time: string): { first: string[]; remaining: number; rest: string[] } => {
  const names = getSlotReservations(time).map(r => r.name)
  const unique = Array.from(new Set(names))
  return { first: unique.slice(0, 2), remaining: Math.max(0, unique.length - 2), rest: unique.slice(2) }
}

const hoverMoreFor = ref<string | null>(null)
const showMore = (time: string) => { hoverMoreFor.value = time }
const hideMore = () => { hoverMoreFor.value = null }
const toggleMore = (time: string) => { hoverMoreFor.value = hoverMoreFor.value === time ? null : time }
const onSlotMouseLeave = (time: string) => {
  if (hoverMoreFor.value === time) return
  // 드래그 상태만 초기화
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
    reservationForm.value = { name: '', selectedSlots: [] }
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
</style>
