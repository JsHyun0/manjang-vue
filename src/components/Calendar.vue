<template>
  <div class="calendar-section">
    <div class="calendar-header">
      <button @click="$emit('change-month', -1)" class="nav-btn">&#8249;</button>
      <h3>{{ currentYear }}년 {{ currentMonth + 1 }}월</h3>
      <button @click="$emit('change-month', 1)" class="nav-btn">&#8250;</button>
    </div>

    <div class="calendar">
      <div class="weekdays">
        <div v-for="day in weekdays" :key="day" class="weekday">
          {{ day }}
        </div>
      </div>

      <div class="days">
        <div
          v-for="day in calendarDays"
          :key="day.date.getTime()"
          :class="getDayClasses(day)"
          @click="selectDate(day.date)"
        >
          <span class="day-number">{{ day.day }}</span>
          <div class="events">
            <div
              v-for="(ev, idx) in limitedEvents(day.date)"
              :key="idx"
              class="event-item"
              :title="`${ev.name}  ${ev.startTime}`"
            >
              <template v-if="!isNameOnly(day.date)">
                <span class="event-name">{{ truncateName(ev.name) }}</span>
                <span class="event-time">{{ ev.startTime }}</span>
              </template>
              <template v-else>
                <span class="event-name">{{ truncateName(ev.name) }}</span>
              </template>
            </div>
            <div v-if="extraCount(day.date) > 0" class="event-more" title="더 보기">
              +{{ extraCount(day.date) }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, computed } from 'vue'
import { weekdays } from '@/lib/calendar'
import type { CalendarDay } from '@/lib/calendar'

interface Props {
  currentYear: number
  currentMonth: number
  calendarDays: CalendarDay[]
  selectedDate: Date | null
  hasReservation: (date: Date) => boolean
  isToday: (date: Date) => boolean
  isPastDate: (date: Date) => boolean
  getReservations: (date: Date) => { name: string; startTime: string }[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'change-month': [delta: number]
  'select-date': [date: Date]
}>()

const getDayClasses = (day: CalendarDay) => {
  const classes = ['day']

  if (!day.isCurrentMonth) classes.push('other-month')
  if (props.selectedDate && props.selectedDate.toDateString() === day.date.toDateString()) {
    classes.push('selected')
  }
  if (props.isToday(day.date)) classes.push('today')
  // if (props.hasReservation(day.date)) classes.push('reserved')
  if (props.isPastDate(day.date)) classes.push('past')

  return classes
}

const selectDate = (date: Date) => {
  if (!props.isPastDate(date)) {
    emit('select-date', date)
  }
}

// 반응형: 모바일에서는 표시 가능한 이벤트 수를 줄여 가독성 확보
const isMobile = ref(false)
const updateIsMobile = () => {
  if (typeof window !== 'undefined' && 'matchMedia' in window) {
    isMobile.value = window.matchMedia('(max-width: 450px)').matches
  }
}
onMounted(() => {
  updateIsMobile()
  if (typeof window !== 'undefined' && 'matchMedia' in window) {
    const mq = window.matchMedia('(max-width: 450px)')
    const handler = () => updateIsMobile()
    mq.addEventListener?.('change', handler)
    // onBeforeUnmount에서 제거하기 위해 참조 저장
    ;(updateIsMobile as any)._mq = mq
    ;(updateIsMobile as any)._handler = handler
  }
})
onBeforeUnmount(() => {
  const mq = (updateIsMobile as any)._mq as MediaQueryList | undefined
  const handler = (updateIsMobile as any)._handler as ((this: MediaQueryList, ev: MediaQueryListEvent) => any) | undefined
  if (mq && handler) {
    mq.removeEventListener?.('change', handler)
  }
})
const mobileVisibleCount = (date: Date): number => {
  if (!isMobile.value) return 3
  const total = props.getReservations(date).length
  if (total <= 2) return total
  if (total === 3) return 3
  return 3 // 4개 이상이면 3개까지 표시 후 +n
}

const isNameOnly = (date: Date): boolean => {
  if (!isMobile.value) return false
  const total = props.getReservations(date).length
  return total >= 3
}

const limitedEvents = (date: Date) => {
  const list = props.getReservations(date)
  return list.slice(0, mobileVisibleCount(date))
}

const extraCount = (date: Date) => {
  const list = props.getReservations(date)
  if (!isMobile.value) return Math.max(0, list.length - 3)
  if (list.length >= 4) return list.length - 3
  return 0
}

const truncateName = (name: string): string => {
  if (!name) return ''
  return name.length > 3 ? name.slice(0, 3) : name
}
</script>

<style scoped>
.calendar-section {
  margin-bottom: 1rem;
  font-family:
    -apple-system,
    BlinkMacSystemFont,
    'Apple SD Gothic Neo',
    'Noto Sans KR',
    Segoe UI,
    Roboto,
    Helvetica,
    Arial,
    'Apple Color Emoji',
    'Segoe UI Emoji',
    'Segoe UI Symbol';
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.calendar-header h3 {
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: #0f172a;
}

.nav-btn {
  background: var(--primary-blue);
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s ease;
}

.nav-btn:hover {
  background: var(--secondary-blue);
  transform: scale(1.1);
}

.calendar {
  background: #ffffff;
  border: 1px solid #e9eef5;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.05);
}

.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: linear-gradient(135deg, var(--primary-blue), var(--secondary-blue));
  color: white;
}

.weekday {
  padding: 0.85rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.9rem;
}

.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  /* 콘텐츠 최소폭으로 인해 트랙이 밀리는 것을 방지 */
  min-width: 0;
}

.day {
  height: 124px;
  /* 그리드 아이템이 자식 콘텐츠 폭 때문에 컬럼을 밀지 않도록 */
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 6px 8px 8px 8px;
  border: 1px solid #f5f7fb;
  cursor: pointer;
  transition:
    background-color 0.06s ease,
    color 0.06s ease,
    border-color 0.06s ease;
  position: relative;
  background: #fff;
  font-weight: 500;
  color: #0f172a;
}

.day:hover:not(.past):not(.selected) {
  background: #f1f6ff;
  border-color: #e1e8f9;
}

.day.other-month {
  color: #ccc;
}

.day.selected {
  background: linear-gradient(135deg, var(--primary-blue), var(--secondary-blue));
  color: white;
  border-color: transparent;
  box-shadow:
    inset 0 0 0 2px rgba(255, 255, 255, 0.4),
    0 2px 10px rgba(14, 58, 150, 0.25);
}

.day.selected:hover {
  background: linear-gradient(135deg, var(--primary-blue), var(--secondary-blue));
  color: white;
}

.day.today {
  /* 셀 배경/테두리 강조 제거, 숫자만 강조 */
  border-color: #f5f7fb;
  box-shadow: none;
}
.day.today .day-number {
  color: #7f1d1d; /* 적갈색 */
  font-weight: 800;
}

.day.reserved {
  /* 예약 칠하는 하이라이트 제거 */
  /* background: transparent; */
  border-left: none;
}

.day.past {
  color: #c7c7c7;
  cursor: not-allowed;
  background: #fafbfc;
}

/* 날짜 숫자: 우측 상단 고정 */
.day-number {
  position: absolute;
  top: 6px;
  right: 6px;
  font-weight: 700;
  font-size: 0.9rem;
}

/* 이벤트 리스트 */
.events {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.event-item {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  font-size: 0.7rem;
  line-height: 0.95rem;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-time {
  display: inline-block;
  flex: 0 0 auto; /* 시간 뱃지가 줄지 않도록 고정 */
  min-width: auto;
  padding: 0;
  background: transparent; /* 배경 제거 */
  color: #0b3fa1;
  font-weight: 700;
}

.event-name {
  flex: 1 1 auto;
  min-width: 0; /* ellipsis가 정상 동작하도록 최소폭 해제 */
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-more {
  margin-top: 2px;
  font-size: 0.7rem;
  color: #475569;
}

/* Responsive - Mobile first adjustments */
@media (max-width: 640px) {
  .calendar-header h3 {
    font-size: 1rem;
  }
  .nav-btn {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }

  .weekday {
    padding: 0.45rem;
    font-size: 0.78rem;
  }

  .days {
    grid-template-columns: repeat(7, 1fr);
  }
  .day {
    height: 88px;
    padding: 4px 6px 6px 6px;
  }
  .day-number {
    top: 4px;
    right: 4px;
    font-size: 0.8rem;
  }

  .events {
    margin-top: 18px;
    gap: 3px;
  }
  .event-item {
    font-size: 0.55rem;
    line-height: 0.95rem;
    gap: 1px;
  }
  .event-time {
    min-width: auto;
    padding: 0;
    font-weight: 700;
  }
}

@media (max-width: 450px) {
  .calendar-header h3 {
    font-size: 0.95rem;
  }
  .day {
    height: 85px;
  }
  .events {
    margin-top: 16px;
  }
  .event-item {
    font-size: 0.55rem;
    flex-direction: column; /* 모바일에서 두 줄(시간/이름) */
    align-items: flex-start;
  }
  .event-time {
    min-width: auto;
    font-size: 0.6rem;
    line-height: 0.85rem;
  }
  .event-name {
    font-size: 0.6rem;
    line-height: 0.9rem;
  }
}

/* Landscape phones / very narrow */
@media (max-width: 360px) {
  .weekday {
    font-size: 0.75rem;
  }
  .day {
    height: 88px;
  }
  .day-number {
    font-size: 0.8rem;
  }
  .event-item {
    font-size: 0.6rem;
  }
  .event-time {
    min-width: auto;
    font-size: 0.6rem;
  }
}
</style>
