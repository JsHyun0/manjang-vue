import { ref, computed } from 'vue'

type AuthUser = {
  name: string
  email: string
}

const STORAGE_KEY = 'manjang_auth_user'

const userRef = ref<AuthUser | null>(null)

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      userRef.value = JSON.parse(raw)
    }
  } catch (_) {
    // ignore
  }
}

function saveToStorage(user: AuthUser | null) {
  if (!user) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
}

loadFromStorage()

export function useAuth() {
  const isLoggedIn = computed(() => !!userRef.value)
  const userName = computed(() => userRef.value?.name ?? '')

  function setUser(user: AuthUser) {
    userRef.value = user
    saveToStorage(user)
  }

  function clearUser() {
    userRef.value = null
    saveToStorage(null)
  }

  return { user: userRef, isLoggedIn, userName, setUser, clearUser }
}


