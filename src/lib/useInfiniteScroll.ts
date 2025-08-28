import { ref, computed, onMounted, onUnmounted } from 'vue'

export const useInfiniteScroll = (itemsPerPage: number = 10) => {
  const currentPage = ref(1)
  const loading = ref(false)

  const getDisplayedItems = (items: any[]) => {
    return items.slice(0, currentPage.value * itemsPerPage)
  }

  const hasMore = (filteredItems: any[], displayedItems: any[]) => {
    return displayedItems.length < filteredItems.length
  }

  const loadMore = () => {
    if (!loading.value) {
      currentPage.value++
    }
  }

  const resetPagination = () => {
    currentPage.value = 1
  }

  const handleScroll = (filteredItems: any[], displayedItems: any[]) => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement
    const hasMoreItems = hasMore(filteredItems, displayedItems)
    
    if (scrollTop + clientHeight >= scrollHeight - 5 && hasMoreItems && !loading.value) {
      loadMore()
    }
  }

  return {
    currentPage,
    loading,
    getDisplayedItems,
    hasMore,
    loadMore,
    resetPagination,
    handleScroll
  }
} 