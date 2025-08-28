<template>
  <div class="records-section">
    <div v-if="loading" class="loading">
      토론 기록을 불러오는 중...
    </div>
    
    <div v-else-if="filteredRecords.length === 0" class="no-records">
      <div class="no-records-icon">📝</div>
      <h3>토론 기록이 없습니다</h3>
      <p>{{ searchQuery ? '검색 조건에 맞는 기록이 없습니다.' : '첫 토론을 시작해보세요!' }}</p>
    </div>
    
    <div v-else class="records-list">
      <RecordItem
        v-for="record in displayedRecords"
        :key="record.id"
        :record="record"
        :is-expanded="expandedRecords.has(record.id)"
        @toggle="toggleRecord"
        @edit="$emit('edit', $event)"
        @delete="$emit('delete', $event)"
      />
    </div>
    
    <div v-if="hasMoreRecords && !loading" class="load-more">
      <button @click="loadMore" class="load-more-btn">
        더 보기
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import RecordItem from './RecordItem.vue'
import type { DebateRecord } from '@/lib/recordUtils'
import { useInfiniteScroll } from '@/lib/useInfiniteScroll'

interface Props {
  filteredRecords: DebateRecord[]
  searchQuery: string
  loading: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'edit': [record: DebateRecord]
  'delete': [id: string]
}>()

const expandedRecords = ref(new Set<string>())
const { getDisplayedItems, hasMore, loadMore, resetPagination, handleScroll } = useInfiniteScroll(10)

const displayedRecords = computed(() => getDisplayedItems(props.filteredRecords))
const hasMoreRecords = computed(() => hasMore(props.filteredRecords, displayedRecords.value))

const toggleRecord = (id: string) => {
  if (expandedRecords.value.has(id)) {
    expandedRecords.value.delete(id)
  } else {
    expandedRecords.value.add(id)
  }
}

const onScroll = () => {
  handleScroll(props.filteredRecords, displayedRecords.value)
}

const resetExpanded = () => {
  expandedRecords.value.clear()
  resetPagination()
}

// 검색어나 필터가 변경될 때 호출
defineExpose({
  resetExpanded
})

onMounted(() => {
  window.addEventListener('scroll', onScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.records-section {
  margin-bottom: 2rem;
}

.loading {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.no-records {
  text-align: center;
  padding: 3rem;
  color: #666;
}

.no-records-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.records-list {
  display: flex;
  flex-direction: column;
}

.load-more {
  text-align: center;
  margin-top: 2rem;
}

.load-more-btn {
  padding: 1rem 2rem;
  background: var(--primary-blue);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s ease;
}

.load-more-btn:hover {
  background: var(--secondary-blue);
}
</style> 