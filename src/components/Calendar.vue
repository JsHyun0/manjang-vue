<template>
  <div class="calendar-section">
    <div class="calendar-header">
      <button @click="$emit('change-month', -1)" class="nav-btn">
        &#8249;
      </button>
      <h3>{{ currentYear }}년 {{ currentMonth + 1 }}월</h3>
      <button @click="$emit('change-month', 1)" class="nav-btn">
        &#8250;
      </button>
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
          {{ day.day }}
          <div v-if="hasReservation(day.date)" class="reservation-dot"></div>
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
  if (props.hasReservation(day.date)) classes.push('reserved')
  if (props.isPastDate(day.date)) classes.push('past')
  
  return classes
}

const selectDate = (date: Date) => {
  if (!props.isPastDate(date)) {
    emit('select-date', date)
  }
}
</script>

<style scoped>
.calendar-section {
  margin-bottom: 1rem;
}

.calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
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
  font-weight: 500;
}

.days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid #f5f7fb;
  cursor: pointer;
  transition: background-color 0.06s ease, color 0.06s ease, border-color 0.06s ease;
  position: relative;
  background: #fff;
}

.day:hover:not(.past) {
  background: #f6f9ff;
}

.day.other-month {
  color: #ccc;
}

.day.selected {
  background: linear-gradient(135deg, var(--primary-blue), var(--secondary-blue));
  color: white;
}

.day.today {
  border-color: #ffd659;
  box-shadow: inset 0 0 0 2px #ffd659;
  font-weight: 600;
}

.day.reserved {
  background: #fff6f7;
}

.day.past {
  color: #c7c7c7;
  cursor: not-allowed;
  background: #fafbfc;
}

.reservation-dot {
  width: 6px;
  height: 6px;
  background: #dc3545;
  border-radius: 50%;
  position: absolute;
  top: 6px;
  right: 6px;
}
</style> 