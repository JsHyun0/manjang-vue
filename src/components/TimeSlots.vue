<template>
  <div class="time-slots">
    <h4>시간대 선택</h4>
    <div class="slots-grid">
      <button 
        v-for="slot in timeSlots"
        :key="slot"
        :class="getSlotClasses(slot)"
        @click="selectTime(slot)"
        :disabled="isTimeReserved(slot)"
      >
        {{ slot }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { generateTimeSlots } from '@/lib/reservation'

const timeSlots = generateTimeSlots()

interface Props {
  selectedStartTime: string
  selectedEndTime: string
  selectedDate: Date
  isTimeReserved: (date: Date, time: string) => boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'select-time': [time: string]
}>()

const getSlotClasses = (slot: string) => {
  const classes = ['time-slot']
  const isStart = props.selectedStartTime === slot
  const isEnd = props.selectedEndTime === slot
  
  if (isStart) classes.push('start')
  if (isEnd) classes.push('end')
  if (isInRange(slot)) classes.push('in-range')
  if (isTimeReserved(slot)) classes.push('reserved')
  
  return classes
}

const isTimeReserved = (time: string): boolean => {
  return props.isTimeReserved(props.selectedDate, time)
}

const toMinutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

const isInRange = (slot: string): boolean => {
  if (!props.selectedStartTime || !props.selectedEndTime) return false
  const minutes = toMinutes(slot)
  return toMinutes(props.selectedStartTime) < minutes && minutes < toMinutes(props.selectedEndTime)
}

const selectTime = (time: string) => {
  if (!isTimeReserved(time)) {
    emit('select-time', time)
  }
}
</script>

<style scoped>
.time-slots {
  margin-bottom: 1.25rem;
}

.time-slots h4 {
  color: var(--primary-blue);
  margin-bottom: 1rem;
}

.slots-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 0.6rem;
}

.time-slot {
  padding: 0.55rem 0.6rem;
  border: 2px solid #e9eef5;
  background: #ffffff;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.9rem;
}

.time-slot:hover:not(:disabled) {
  border-color: var(--primary-blue);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(74, 144, 226, 0.15);
}

.time-slot.start,
.time-slot.end {
  background: linear-gradient(135deg, var(--primary-blue), var(--secondary-blue));
  color: white;
  border-color: transparent;
}

.time-slot.in-range {
  background: rgba(74, 144, 226, 0.12);
  border-color: rgba(74, 144, 226, 0.25);
}

.time-slot.reserved {
  background: #fff1f3;
  color: #9b2c2c;
  cursor: not-allowed;
  opacity: 0.7;
}

.time-slot:disabled {
  cursor: not-allowed;
}
</style> 