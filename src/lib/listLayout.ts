import { ref, watch } from 'vue'

export type DebateListLayout = 'card' | 'list'

const STORAGE_KEY = 'manjang:debate-list-layout'

const readInitial = (): DebateListLayout => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'list' ? 'list' : 'card'
  } catch {
    return 'card'
  }
}

const layoutRef = ref<DebateListLayout>(readInitial())

watch(layoutRef, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // storage unavailable (private mode 등) — 무시하고 세션 내에서만 유지
  }
})

export function useDebateListLayout() {
  return { listLayout: layoutRef }
}
