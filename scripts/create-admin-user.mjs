import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createClient } from '@supabase/supabase-js'

const ENV_FILES = ['.env.local', '.env']

const stripWrapper = (value) => {
  const trimmed = value.trim()
  if (trimmed.length < 2) return trimmed
  const start = trimmed[0]
  const end = trimmed[trimmed.length - 1]
  const wrapped =
    (start === '"' && end === '"') ||
    (start === "'" && end === "'") ||
    (start === '<' && end === '>')
  return wrapped ? trimmed.slice(1, -1).trim() : trimmed
}

const normalizeEnvValue = (value) => {
  let normalized = value.trim()
  // .env 파일에 shell multiline 용 "\"가 섞인 경우 자동 제거
  if (normalized.endsWith('\\')) {
    normalized = normalized.slice(0, -1).trim()
  }
  return stripWrapper(normalized)
}

const loadEnvFiles = () => {
  for (const fileName of ENV_FILES) {
    const fullPath = path.join(process.cwd(), fileName)
    if (!fs.existsSync(fullPath)) continue

    const raw = fs.readFileSync(fullPath, 'utf8')
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx <= 0) continue

      const key = trimmed.slice(0, eqIdx).trim()
      const value = normalizeEnvValue(trimmed.slice(eqIdx + 1))
      if (!process.env[key]) {
        process.env[key] = value
      }
    }
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const isDuplicateUserError = (message) => {
  return /(already|registered|exists|duplicate)/i.test(message)
}

const waitForUserProfileId = async (supabase, email) => {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (error) {
      throw new Error(`public.users 조회 실패: ${error.message}`)
    }

    if (data?.id) return data.id
    await sleep(300)
  }

  return null
}

const main = async () => {
  loadEnvFiles()

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const adminEmail = stripWrapper(process.env.ADMIN_EMAIL || '')
  const adminPassword = stripWrapper(process.env.ADMIN_PASSWORD || '')
  const adminName = stripWrapper(process.env.ADMIN_NAME || '관리자')
  const adminStudentId = stripWrapper(process.env.ADMIN_STUDENT_ID || 'ADMIN0000')
  const adminMajor = stripWrapper(process.env.ADMIN_MAJOR || '운영')

  if (!supabaseUrl || !serviceRoleKey || !adminEmail || !adminPassword) {
    console.error('필수 환경변수가 누락되었습니다.')
    console.error('필수: SUPABASE_URL(or VITE_SUPABASE_URL), SUPABASE_SERVICE_ROLE_KEY, ADMIN_EMAIL, ADMIN_PASSWORD')
    process.exit(1)
  }

  if (adminPassword.length < 6) {
    console.error('ADMIN_PASSWORD는 6자 이상이어야 합니다.')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  let authUserId = null
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email: adminEmail,
    password: adminPassword,
    email_confirm: true,
    user_metadata: {
      name: adminName,
      student_id: adminStudentId,
      sid: adminStudentId,
      major: adminMajor,
    },
  })

  if (createError) {
    if (!isDuplicateUserError(createError.message)) {
      throw new Error(`auth 관리자 계정 생성 실패: ${createError.message}`)
    }
    console.log('이미 존재하는 이메일입니다. 기존 계정을 관리자 권한으로 승격합니다.')
  } else {
    authUserId = createData.user?.id ?? null
    console.log(`auth 계정 생성 완료: ${adminEmail}`)
  }

  if (!authUserId) {
    authUserId = await waitForUserProfileId(supabase, adminEmail)
  }

  if (!authUserId) {
    throw new Error(
      '관리자 계정의 사용자 ID를 찾지 못했습니다. auth.users -> public.users 동기화 트리거 상태를 확인해주세요.',
    )
  }

  const { error: upsertError } = await supabase.from('users').upsert(
    {
      id: authUserId,
      email: adminEmail,
      name: adminName,
      student_id: adminStudentId,
      major: adminMajor,
      role: 'admin',
    },
    {
      onConflict: 'id',
    },
  )

  if (upsertError) {
    throw new Error(`public.users 관리자 승격 실패: ${upsertError.message}`)
  }

  console.log('관리자 계정 준비 완료')
  console.log(`email=${adminEmail}`)
  console.log('role=admin')
}

main().catch((error) => {
  console.error(error.message || '관리자 계정 준비 중 오류가 발생했습니다.')
  process.exit(1)
})
