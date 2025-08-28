<template>
  <div class="search-section">
    <div class="search-bar">
      <input 
        type="text" 
        :value="searchQuery"
        @input="updateSearch"
        placeholder="주제, 내용, 참가자로 검색..."
        class="search-input"
      />
      <button @click="$emit('search')" class="search-btn">
        🔍
      </button>
    </div>
    
    <div class="filters">
      <select :value="selectedCategory" @change="updateCategory" class="filter-select">
        <option value="">전체 카테고리</option>
        <option v-for="category in categories" :key="category" :value="category">
          {{ category }}
        </option>
      </select>
      
      <select :value="sortBy" @change="updateSort" class="filter-select">
        <option v-for="option in sortOptions" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { categories, sortOptions } from '@/lib/recordUtils'

interface Props {
  searchQuery: string
  selectedCategory: string
  sortBy: string
}

defineProps<Props>()

const emit = defineEmits<{
  'update:search-query': [value: string]
  'update:selected-category': [value: string]
  'update:sort-by': [value: string]
  'search': []
}>()

const updateSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  emit('update:search-query', target.value)
}

const updateCategory = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:selected-category', target.value)
  emit('search')
}

const updateSort = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:sort-by', target.value)
  emit('search')
}
</script>

<style scoped>
.search-section {
  margin-bottom: 2rem;
}

.search-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.search-input {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e1e1e1;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-blue);
}

.search-btn {
  padding: 0.75rem 1rem;
  background: var(--primary-blue);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.search-btn:hover {
  background: var(--secondary-blue);
}

.filters {
  display: flex;
  gap: 1rem;
}

.filter-select {
  padding: 0.5rem;
  border: 2px solid #e1e1e1;
  border-radius: 6px;
  transition: border-color 0.3s ease;
}

.filter-select:focus {
  outline: none;
  border-color: var(--primary-blue);
}
</style> 