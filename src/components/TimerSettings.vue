<template>
  <div class="timer-settings">
    <div class="settings-head">
      <h3>단계별 시간 설정</h3>
      <p>각 단계를 분/초로 조정하면 즉시 반영됩니다.</p>
    </div>
    <div class="settings-grid">
      <div v-for="(phase, index) in phases" :key="index" class="setting-item">
        <div class="setting-title-row">
          <label :for="`phase-${index}`">{{ phase.name }}</label>
          <span class="phase-preview">
            {{ Math.floor(phaseDurations[index] / 60) }}분 {{ phaseDurations[index] % 60 }}초
          </span>
        </div>
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
  margin-top: 1rem;
  padding: 1rem;
  background: linear-gradient(150deg, #f8fcff, #f2f8ff);
  border-radius: 16px;
  border: 1px solid #d6e4f6;
}

.settings-head {
  margin-bottom: 0.85rem;
}

.timer-settings h3 {
  margin: 0;
  color: #1f4f82;
  font-size: clamp(1.04rem, 1.2vw, 1.3rem);
}

.settings-head p {
  margin: 0.35rem 0 0;
  color: #49698d;
  font-size: 0.9rem;
  line-height: 1.45;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 0.75rem;
}

.setting-item {
  display: grid;
  gap: 0.58rem;
  padding: 0.8rem;
  background: #fff;
  border: 1px solid #d7e5f8;
  border-radius: 12px;
  box-shadow: 0 8px 18px rgba(23, 90, 161, 0.08);
}

.setting-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.4rem;
}

.setting-item label {
  color: #14395f;
  font-weight: 800;
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.phase-preview {
  font-size: 0.76rem;
  color: #3f6389;
  background: #ebf4ff;
  border: 1px solid #cadcf1;
  border-radius: 999px;
  padding: 0.12rem 0.5rem;
  white-space: nowrap;
  font-weight: 700;
}

.input-group {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.duration-input {
  width: 72px;
  height: 44px;
  padding: 0 0.5rem;
  border: 1px solid #bdd4f0;
  border-radius: 10px;
  text-align: center;
  font-size: 1.14rem;
  font-weight: 700;
  color: #13395f;
  background: #fafdff;
  box-sizing: border-box;
}

.duration-input:focus {
  outline: none;
  border-color: #77a8de;
  box-shadow: 0 0 0 3px rgba(85, 147, 215, 0.18);
}

.unit {
  color: #4b688a;
  font-size: 0.88rem;
  font-weight: 700;
  margin: 0 2px;
}

@media (max-width: 640px) {
  .settings-grid {
    grid-template-columns: 1fr;
  }

  .duration-input {
    width: 66px;
    height: 40px;
    font-size: 1.02rem;
  }
}
</style>
