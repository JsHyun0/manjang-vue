<template>
  <div class="timer-settings">
    <h3>시간 설정</h3>
    <div class="settings-grid">
      <div v-for="(phase, index) in phases" :key="index" class="setting-item">
        <label :for="`phase-${index}`">{{ phase.name }}</label>
        <div class="input-group">
          <input
            :id="`phase-${index}-min`"
            type="number"
            :value="Math.floor(phaseDurations[index] / 60)"
            min="0"
            max="999"
            class="duration-input"
            @change="onMinutesChange(index, $event)"
          />
          <span class="unit">분</span>
          <input
            :id="`phase-${index}-sec`"
            type="number"
            :value="phaseDurations[index] % 60"
            min="0"
            max="59"
            class="duration-input"
            @change="onSecondsChange(index, $event)"
          />
          <span class="unit">초</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface PhaseLike {
  name: string
  duration: number // 초 단위
}

interface Props {
  phases: PhaseLike[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update-phase': [index: number, durationSeconds: number]
}>()

// 각 phase의 duration은 초 단위로 저장되어 있음
const phaseDurations = ref<number[]>(props.phases.map((phase) => phase.duration))

// phases가 변경될 때 phaseDurations 업데이트
watch(
  () => props.phases,
  (newPhases) => {
    phaseDurations.value = newPhases.map((phase) => phase.duration)
  },
  { deep: true },
)

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const onMinutesChange = (index: number, e: Event) => {
  const target = e.target as HTMLInputElement
  const minutes = clamp(parseInt(target.value || '0', 10) || 0, 0, 999)
  const seconds = phaseDurations.value[index] % 60
  const total = Math.max(1, minutes * 60 + seconds)
  phaseDurations.value[index] = total
  emit('update-phase', index, total)
}

const onSecondsChange = (index: number, e: Event) => {
  const target = e.target as HTMLInputElement
  const secondsOnly = clamp(parseInt(target.value || '0', 10) || 0, 0, 59)
  const minutes = Math.floor(phaseDurations.value[index] / 60)
  const total = Math.max(1, minutes * 60 + secondsOnly)
  phaseDurations.value[index] = total
  emit('update-phase', index, total)
}
</script>

<style scoped>
.timer-settings {
  margin-top: 3rem;
  padding: 1.5rem 1.5rem 1rem;
  background: #f8fafc;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
}

.timer-settings h3 {
  margin: 0 0 1.25rem 0;
  color: var(--primary-blue);
  font-size: 1.25rem;
}

.settings-grid {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.75rem;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 0.25rem;
  -webkit-overflow-scrolling: touch;
}

.setting-item {
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: stretch;
  gap: 0.6rem;
  padding: 0.9rem 1rem;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-sizing: border-box;
  min-width: 200px;
  /* width: clamp(320px, 34vw, 380px); */
  width: 200px;
  flex: 0 0 auto;
}

.setting-item label {
  color: #111827;
  font-weight: 700;
  font-size: 1rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
  margin-bottom: 0.1rem;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.duration-input {
  width: 56px;
  height: 36px;
  padding: 0.45rem 0.5rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  text-align: center;
  font-size: 1rem;
  box-sizing: border-box;
}

.duration-input:focus {
  outline: none;
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
}

.unit {
  color: #6b7280;
  font-size: 0.9rem;
  margin: 0 2px;
}

/* 모바일 (단일 열) 보장 */
@media (max-width: 640px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }
}
</style>
