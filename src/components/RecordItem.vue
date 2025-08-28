<template>
  <div class="record-item" @click="toggleExpand">
    <div class="record-header-info">
      <div class="record-title">{{ record.title }}</div>
      <div class="record-meta">
        <span class="record-date">{{ formattedDate }}</span>
        <span class="record-category">{{ record.category }}</span>
        <span class="record-participants">참가자 {{ record.participants }}명</span>
      </div>
    </div>
    
    <div class="record-summary">
      {{ record.summary }}
    </div>
    
    <div v-if="isExpanded" class="record-details">
      <div class="detail-section">
        <h4>주요 논점</h4>
        <ul>
          <li v-for="point in record.keyPoints" :key="point">{{ point }}</li>
        </ul>
      </div>
      
      <div class="detail-section">
        <h4>결론</h4>
        <p>{{ record.conclusion }}</p>
      </div>
      
      <div class="detail-section">
        <h4>참가자</h4>
        <div class="participants-list">
          <span v-for="participant in record.participantNames" :key="participant" class="participant-tag">
            {{ participant }}
          </span>
        </div>
      </div>
      
      <div class="record-actions">
        <button @click.stop="$emit('edit', record)" class="action-btn edit-btn">
          수정
        </button>
        <button @click.stop="$emit('delete', record.id)" class="action-btn delete-btn">
          삭제
        </button>
      </div>
    </div>
    
    <div class="expand-indicator">
      {{ isExpanded ? '▲' : '▼' }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { DebateRecord } from '@/lib/recordUtils'
import { formatDate } from '@/lib/recordUtils'

interface Props {
  record: DebateRecord
  isExpanded: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'toggle': [id: string]
  'edit': [record: DebateRecord]
  'delete': [id: string]
}>()

const formattedDate = computed(() => formatDate(props.record.date))

const toggleExpand = () => {
  emit('toggle', props.record.id)
}
</script>

<style scoped>
.record-item {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 1.5rem;
  border-left: 4px solid var(--primary-blue);
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  margin-bottom: 1rem;
}

.record-item:hover {
  background: #f0f7ff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.15);
}

.record-header-info {
  margin-bottom: 1rem;
}

.record-title {
  font-size: 1.2rem;
  font-weight: bold;
  color: var(--primary-blue);
  margin-bottom: 0.5rem;
}

.record-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: #666;
}

.record-category {
  background: var(--primary-blue);
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.8rem;
}

.record-summary {
  margin-bottom: 1rem;
  line-height: 1.6;
}

.record-details {
  border-top: 1px solid #e1e1e1;
  padding-top: 1rem;
  margin-top: 1rem;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section h4 {
  color: var(--primary-blue);
  margin-bottom: 0.5rem;
}

.detail-section ul {
  margin: 0;
  padding-left: 1.5rem;
}

.detail-section li {
  margin-bottom: 0.3rem;
}

.participants-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.participant-tag {
  background: var(--secondary-blue);
  color: white;
  padding: 0.3rem 0.6rem;
  border-radius: 16px;
  font-size: 0.8rem;
}

.record-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.action-btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s ease;
}

.edit-btn {
  background: #28a745;
  color: white;
}

.edit-btn:hover {
  background: #218838;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover {
  background: #c82333;
}

.expand-indicator {
  position: absolute;
  top: 1rem;
  right: 1rem;
  color: var(--primary-blue);
  font-weight: bold;
}
</style> 