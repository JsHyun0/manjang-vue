const API_BASE: string = (import.meta as any).env?.VITE_API_BASE ?? 'http://127.0.0.1:8000'

const WARMUP_TTL_MS = 3 * 60 * 1000
const WARMUP_TIMEOUT_MS = 4500

let warmedAt = 0
let warmupPromise: Promise<void> | null = null

const isWarm = (): boolean => {
  return warmedAt > 0 && Date.now() - warmedAt < WARMUP_TTL_MS
}

export const warmBackend = async (): Promise<void> => {
  if (isWarm()) return
  if (warmupPromise) return warmupPromise

  warmupPromise = (async () => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), WARMUP_TIMEOUT_MS)

    try {
      const res = await fetch(`${API_BASE}/health`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        keepalive: true,
        headers: { 'x-manjang-warmup': '1' },
      })
      // health 응답이 오면 cold-start 해소로 간주한다.
      if (res.ok) {
        warmedAt = Date.now()
      }
    } catch (_error) {
      // best-effort warmup: 실패해도 사용자 흐름을 막지 않음
    } finally {
      window.clearTimeout(timeoutId)
      warmupPromise = null
    }
  })()

  return warmupPromise
}

