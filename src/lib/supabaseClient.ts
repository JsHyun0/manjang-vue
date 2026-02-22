import { createClient } from '@supabase/supabase-js'

const normalizeEnv = (value: string | undefined): string => {
  if (!value) return ''
  const trimmed = value.trim()
  if (trimmed.length < 2) return trimmed

  const start = trimmed[0]
  const end = trimmed[trimmed.length - 1]
  const hasWrappedPair =
    (start === '"' && end === '"') ||
    (start === "'" && end === "'") ||
    (start === '<' && end === '>')

  return hasWrappedPair ? trimmed.slice(1, -1).trim() : trimmed
}

const supabaseUrl = normalizeEnv(import.meta.env.VITE_SUPABASE_URL)
const supabaseAnonKey = normalizeEnv(import.meta.env.VITE_SUPABASE_ANON_KEY)

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[auth] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Check manjang-vue/.env.local',
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseAnonKey || 'public-anon-key-not-configured',
)
