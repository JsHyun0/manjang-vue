<template>
  <div class="timer-controls">
    <button 
      @click="$emit('start')" 
      :disabled="isRunning" 
      class="control-btn start-btn"
    >
      시작
    </button>
    <button 
      @click="$emit('pause')" 
      :disabled="!isRunning" 
      class="control-btn pause-btn"
    >
      일시정지
    </button>
    <button 
      @click="$emit('reset')" 
      class="control-btn reset-btn"
    >
      리셋
    </button>
    <button 
      @click="$emit('next')" 
      class="control-btn next-btn"
    >
      다음 단계
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  isRunning: boolean
}

defineProps<Props>()

defineEmits<{
  start: []
  pause: []
  reset: []
  next: []
}>()
</script>

<style scoped>
.timer-controls {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.control-btn {
  flex: 1;
  padding: 0.75rem;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-btn {
  background: #28a745;
  color: white;
}

.pause-btn {
  background: #ffc107;
  color: #212529;
}

.reset-btn {
  background: #6c757d;
  color: white;
}

.next-btn {
  background: var(--primary-blue);
  color: white;
}

.control-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 