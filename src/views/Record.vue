<template>
  <div class="record">
    <div class="record-container">
      <div class="record-header">
        <h2>토론 기록</h2>
        <p>이전 토론의 주제와 내용을 확인하고 검색하세요</p>
      </div>
      
      <RecordSearch
        :search-query="searchQuery"
        :selected-category="selectedCategory"
        :sort-by="sortBy"
        @update:search-query="searchQuery = $event"
        @update:selected-category="selectedCategory = $event"
        @update:sort-by="sortBy = $event"
        @search="handleSearch"
      />
      
      <RecordList
        ref="recordListRef"
        :filtered-records="filteredRecords"
        :search-query="searchQuery"
        :loading="loading"
        @edit="editRecord"
        @delete="deleteRecord"
      />
      
      <div class="add-record">
        <button @click="showModal = true" class="add-btn">
          새 토론 기록 추가
        </button>
      </div>
      
      <RecordModal
        :show="showModal"
        :editing-record="editingRecord"
        @close="closeModal"
        @save="saveRecord"
      />
      
      <div class="back-home">
        <router-link to="/home" class="back-btn">홈으로 돌아가기</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import RecordSearch from '@/components/RecordSearch.vue'
import RecordList from '@/components/RecordList.vue'
import RecordModal from '@/components/RecordModal.vue'
import { sampleRecords, useRecordFilters } from '@/lib/recordUtils'
import type { DebateRecord } from '@/lib/recordUtils'

const loading = ref(false)
const showModal = ref(false)
const editingRecord = ref<DebateRecord | null>(null)
const recordListRef = ref<InstanceType<typeof RecordList>>()

// 샘플 데이터로 시작
const allRecords = ref<DebateRecord[]>([...sampleRecords])

// 필터링 로직 사용
const { searchQuery, selectedCategory, sortBy, filteredRecords } = useRecordFilters(allRecords.value)

const handleSearch = () => {
  recordListRef.value?.resetExpanded()
}

const editRecord = (record: DebateRecord) => {
  editingRecord.value = record
  showModal.value = true
}

const deleteRecord = (id: string) => {
  if (confirm('이 토론 기록을 삭제하시겠습니까?')) {
    allRecords.value = allRecords.value.filter(r => r.id !== id)
    alert('토론 기록이 삭제되었습니다.')
  }
}

const saveRecord = (recordData: Partial<DebateRecord>) => {
  if (editingRecord.value) {
    // 수정
    const index = allRecords.value.findIndex(r => r.id === editingRecord.value!.id)
    if (index !== -1) {
      allRecords.value[index] = {
        ...editingRecord.value,
        ...recordData
      }
    }
    alert('토론 기록이 수정되었습니다.')
  } else {
    // 새로 추가
    const newRecord: DebateRecord = {
      id: Date.now().toString(),
      date: new Date(),
      ...recordData
    } as DebateRecord
    
    allRecords.value.unshift(newRecord)
    alert('새 토론 기록이 추가되었습니다.')
  }
  
  closeModal()
}

const closeModal = () => {
  showModal.value = false
  editingRecord.value = null
}
</script>

<style scoped>
.record {
  min-height: 100vh;
  padding: 2rem;
  background: linear-gradient(135deg, #f0f7ff, #e6f3ff);
}

.record-container {
  max-width: 900px;
  margin: 0 auto;
  background: white;
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(74, 144, 226, 0.1);
}

.record-header {
  text-align: center;
  margin-bottom: 2rem;
}

.record-header h2 {
  color: var(--primary-blue);
  margin-bottom: 0.5rem;
}

.add-record {
  text-align: center;
  margin: 2rem 0;
}

.add-btn {
  padding: 1rem 2rem;
  background: #28a745;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.add-btn:hover {
  background: #218838;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
}

.back-home {
  text-align: center;
  margin-top: 2rem;
}

.back-btn {
  color: var(--primary-blue);
  text-decoration: none;
  font-size: 1rem;
  transition: color 0.3s ease;
}

.back-btn:hover {
  color: var(--secondary-blue);
  text-decoration: underline;
}
</style> 