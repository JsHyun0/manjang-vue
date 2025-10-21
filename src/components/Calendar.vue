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
              <span class="event-name">{{ ev.name }}</span>
              <span class="event-time">{{ ev.startTime }}</span>
            </div>
            <div v-if="extraCount(day.date) > 0" class="event-more" title="더 보기">+@</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
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

const limitedEvents = (date: Date) => {
  const list = props.getReservations(date)
  return list.slice(0, 3)
}

const extraCount = (date: Date) => {
  const list = props.getReservations(date)
  return Math.max(0, list.length - 3)
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
  padding: 1rem;
  text-align: center;
  font-weight: 600;
}

.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.day {
  height: 124px;
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
  font-size: 0.95rem;
}

/* 이벤트 리스트 */
.events {
  margin-top: 24px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.event-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  line-height: 1.1rem;
  color: #0f172a;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.event-time {
  display: inline-block;
  min-width: 40px;
  padding: 2px 6px;
  border-radius: 6px;
  background: #e7f0ff;
  color: #0b4dbb;
  font-weight: 700;
}

.event-name {
  flex: 1 1 auto;
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
    padding: 0.5rem;
    font-size: 0.8rem;
  }

  .days {
    grid-template-columns: repeat(7, 1fr);
  }
  .day {
    height: 92px;
    padding: 4px 6px 6px 6px;
  }
  .day-number {
    top: 4px;
    right: 4px;
    font-size: 0.85rem;
  }

  .events {
    margin-top: 18px;
    gap: 3px;
  }
  .event-item {
    font-size: 0.7rem;
    line-height: 1rem;
    gap: 4px;
  }
  .event-time {
    min-width: 34px;
    padding: 1px 4px;
    border-radius: 5px;
    font-weight: 700;
  }
}

@media (max-width: 420px) {
  .calendar-header h3 {
    font-size: 0.95rem;
  }
  .day {
    height: 84px;
  }
  .events {
    margin-top: 16px;
  }
  .event-item {
    font-size: 0.68rem;
  }
  .event-time {
    min-width: 32px;
    font-size: 0.68rem;
  }
}

/* Landscape phones / very narrow */
@media (max-width: 360px) {
  .weekday {
    font-size: 0.75rem;
  }
  .day {
    height: 78px;
  }
  .day-number {
    font-size: 0.8rem;
  }
  .event-item {
    font-size: 0.65rem;
  }
  .event-time {
    min-width: 30px;
    font-size: 0.65rem;
  }
}
</style>
