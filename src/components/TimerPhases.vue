<template>
  <div class="timer-phases">
    <div
      v-for="(phase, index) in phases"
      :key="index"
      :class="[
        'phase-item',
        {
          active: currentPhaseIndex === index,
          completed: index < currentPhaseIndex,
        },
      ]"
    >
      <div class="phase-number">{{ index + 1 }}</div>
      <div class="phase-info">
        <div class="phase-name">{{ phase.name }}</div>
        <div class="phase-duration">{{ phase.duration }}분</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
type PhaseLike = { name: string; duration: number }

interface Props {
  phases: PhaseLike[]
  currentPhaseIndex: number
}

defineProps<Props>()
</script>

<style scoped>
.timer-phases {
  margin-bottom: 2rem;
}

.phase-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  margin-bottom: 0.5rem;
  border-radius: 8px;
  background: #f8f9fa;
  transition: all 0.3s ease;
}

.phase-item.active {
  background: var(--primary-blue);
  color: white;
}

.phase-item.completed {
  background: #d4edda;
  color: #155724;
}

.phase-number {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #dee2e6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 1rem;
  font-weight: bold;
}

.phase-item.active .phase-number {
  background: white;
  color: var(--primary-blue);
}

.phase-item.completed .phase-number {
  background: #28a745;
  color: white;
}

.phase-info {
  flex: 1;
}

.phase-name {
  font-weight: 500;
  margin-bottom: 0.2rem;
}

.phase-duration {
  font-size: 0.9rem;
  opacity: 0.8;
}
</style>
