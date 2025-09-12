<template>
  <div class="timer-display">
    <div class="time-circle">
      <div class="time-text">
        {{ formattedTime }}
      </div>
      <div class="phase-text">{{ currentPhase }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatTime } from '@/lib/timer'

interface Props {
  currentTime: number
  currentPhase: string
}

const props = defineProps<Props>()

const formattedTime = computed(() => formatTime(props.currentTime))
</script>

<style scoped>
.timer-display {
  display: flex;
  justify-content: center;
  margin-bottom: 1rem;
}

.time-circle {
  width: 200px;
  height: 200px;
  border: 8px solid var(--primary-blue);
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-blue), var(--secondary-blue));
  color: white;
}

.time-text {
  font-size: 2.5rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
}

.phase-text {
  font-size: 1rem;
  opacity: 0.9;
}
</style>
