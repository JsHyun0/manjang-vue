<template>
  <div v-if="show" class="modal-overlay" @click="closeModal">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h3>{{ editingRecord ? '토론 기록 수정' : '새 토론 기록 추가' }}</h3>
        <button @click="closeModal" class="close-btn">×</button>
      </div>
      
      <form @submit.prevent="saveRecord" class="record-form">
        <div class="form-group">
          <label>토론 주제</label>
          <input type="text" v-model="form.title" required />
        </div>
        
        <div class="form-group">
          <label>카테고리</label>
          <select v-model="form.category" required>
            <option value="">선택하세요</option>
            <option v-for="category in categories" :key="category" :value="category">
              {{ category }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label>토론 요약</label>
          <textarea v-model="form.summary" rows="3" required></textarea>
        </div>
        
        <div class="form-group">
          <label>주요 논점 (한 줄씩 입력)</label>
          <textarea 
            v-model="keyPointsText" 
            rows="5" 
            placeholder="첫 번째 논점&#10;두 번째 논점&#10;..."
          ></textarea>
        </div>
        
        <div class="form-group">
          <label>결론</label>
          <textarea v-model="form.conclusion" rows="3"></textarea>
        </div>
        
        <div class="form-group">
          <label>참가자 (쉼표로 구분)</label>
          <input 
            type="text" 
            v-model="participantsText" 
            placeholder="김철수, 이영희, 박민수" 
          />
        </div>
        
        <div class="form-actions">
          <button type="button" @click="closeModal" class="cancel-btn">취소</button>
          <button type="submit" class="save-btn">저장</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from 'vue'
import type { DebateRecord } from '@/lib/recordUtils'
import { categories, parseKeyPoints, parseParticipants } from '@/lib/recordUtils'

interface Props {
  show: boolean
  editingRecord?: DebateRecord | null
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'close': []
  'save': [record: Partial<DebateRecord>]
}>()

const form = reactive({
  title: '',
  category: '',
  summary: '',
  conclusion: ''
})

const keyPointsText = ref('')
const participantsText = ref('')

const closeModal = () => {
  emit('close')
}

const saveRecord = () => {
  const keyPoints = parseKeyPoints(keyPointsText.value)
  const participantNames = parseParticipants(participantsText.value)

  const recordData = {
    ...form,
    keyPoints,
    participantNames,
    participants: participantNames.length
  }

  emit('save', recordData)
}

const resetForm = () => {
  Object.assign(form, {
    title: '',
    category: '',
    summary: '',
    conclusion: ''
  })
  keyPointsText.value = ''
  participantsText.value = ''
}

// 편집 중인 기록이 변경될 때 폼 업데이트
watch(() => props.editingRecord, (newRecord) => {
  if (newRecord) {
    Object.assign(form, {
      title: newRecord.title,
      category: newRecord.category,
      summary: newRecord.summary,
      conclusion: newRecord.conclusion
    })
    keyPointsText.value = newRecord.keyPoints.join('\n')
    participantsText.value = newRecord.participantNames.join(', ')
  } else {
    resetForm()
  }
})

// 모달이 닫힐 때 폼 초기화
watch(() => props.show, (isShowing) => {
  if (!isShowing) {
    resetForm()
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e1e1e1;
}

.modal-header h3 {
  color: var(--primary-blue);
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.close-btn:hover {
  background: #f0f0f0;
}

.record-form {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: var(--primary-blue);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e1e1;
  border-radius: 6px;
  font-family: inherit;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--primary-blue);
}

.form-group textarea {
  resize: vertical;
  min-height: 60px;
}

.form-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
}

.cancel-btn {
  padding: 0.75rem 1.5rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s ease;
}

.cancel-btn:hover {
  background: #5a6268;
}

.save-btn {
  padding: 0.75rem 1.5rem;
  background: var(--primary-blue);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s ease;
}

.save-btn:hover {
  background: var(--secondary-blue);
}
</style> 