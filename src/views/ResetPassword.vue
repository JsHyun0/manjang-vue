<template>
  <div class="reset-page">
    <section class="reset-card">
      <header class="reset-head">
        <p class="kicker">Account Recovery</p>
        <h1>비밀번호 재설정</h1>
      </header>

      <div v-if="checking" class="state-line">복구 링크를 확인하는 중입니다...</div>

      <template v-else-if="canReset">
        <form class="reset-form" @submit.prevent="submitReset">
          <label>
            <span>새 비밀번호</span>
            <input
              v-model="newPassword"
              type="password"
              minlength="6"
              autocomplete="new-password"
              placeholder="6자 이상 입력"
              required
            />
          </label>

          <label>
            <span>새 비밀번호 확인</span>
            <input
              v-model="confirmPassword"
              type="password"
              minlength="6"
              autocomplete="new-password"
              placeholder="비밀번호를 다시 입력"
              required
            />
          </label>

          <button class="submit-btn" type="submit" :disabled="submitting">
            {{ submitting ? '변경 중...' : '비밀번호 변경' }}
          </button>
        </form>
      </template>

      <template v-else>
        <div class="state-line error">
          유효한 복구 세션이 없습니다. 비밀번호 찾기에서 재설정 메일을 다시 요청해주세요.
        </div>
      </template>

      <p v-if="noticeMessage" class="notice">{{ noticeMessage }}</p>
      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <router-link class="back-link" to="/login">로그인 페이지로 이동</router-link>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { signOutAuth, updatePasswordWithRecovery } from '@/lib/auth'
import { supabase } from '@/lib/supabaseClient'

const router = useRouter()

const checking = ref(true)
const canReset = ref(false)
const submitting = ref(false)
const newPassword = ref('')
const confirmPassword = ref('')
const noticeMessage = ref('')
const errorMessage = ref('')

const readSession = async () => {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

const verifyRecoveryTokenFromQuery = async () => {
  const search = new URLSearchParams(window.location.search)
  const type = search.get('type')
  const tokenHash = search.get('token_hash')
  if (type !== 'recovery' || !tokenHash) return

  const { error } = await supabase.auth.verifyOtp({
    type: 'recovery',
    token_hash: tokenHash,
  })
  if (error) throw error
}

const hasRecoveryHintInUrl = () => {
  const query = new URLSearchParams(window.location.search)
  if (query.get('type') === 'recovery') return true
  const hashRaw = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.hash
  const hash = new URLSearchParams(hashRaw)
  return hash.get('type') === 'recovery'
}

const resolveRecoveryState = async () => {
  checking.value = true
  errorMessage.value = ''
  noticeMessage.value = ''

  try {
    await verifyRecoveryTokenFromQuery()
    let session = await readSession()

    // hash 기반 recovery 토큰 처리 타이밍을 위해 1회 재시도
    if (!session && hasRecoveryHintInUrl()) {
      await new Promise((resolve) => setTimeout(resolve, 250))
      session = await readSession()
    }

    canReset.value = !!session

    if (session) {
      window.history.replaceState({}, document.title, '/reset-password')
    }
  } catch (error: any) {
    canReset.value = false
    errorMessage.value = error?.message || '복구 링크 확인 중 오류가 발생했습니다.'
  } finally {
    checking.value = false
  }
}

const toFriendlyError = (message: string): string => {
  if (!message) return '비밀번호 재설정 중 오류가 발생했습니다.'
  if (/expired|invalid/i.test(message)) return '복구 링크가 만료되었거나 유효하지 않습니다.'
  if (/same password/i.test(message)) return '기존과 다른 비밀번호를 입력해주세요.'
  if (/password should be at least/i.test(message)) return '비밀번호는 최소 6자 이상이어야 합니다.'
  return message
}

const submitReset = async () => {
  errorMessage.value = ''
  noticeMessage.value = ''

  if (!canReset.value) {
    errorMessage.value = '비밀번호를 재설정할 수 있는 세션이 없습니다.'
    return
  }
  if (!newPassword.value || !confirmPassword.value) {
    errorMessage.value = '새 비밀번호를 모두 입력해주세요.'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = '비밀번호 확인 값이 일치하지 않습니다.'
    return
  }

  submitting.value = true
  try {
    await updatePasswordWithRecovery(newPassword.value)
    await signOutAuth()
    noticeMessage.value = '비밀번호가 변경되었습니다. 새 비밀번호로 다시 로그인해주세요.'
    canReset.value = false
    setTimeout(() => {
      void router.replace('/login?reset=done')
    }, 900)
  } catch (error: any) {
    errorMessage.value = toFriendlyError(error?.message ?? '')
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  void resolveRecoveryState()
})
</script>

<style scoped>
.reset-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 2rem;
  background:
    radial-gradient(circle at 12% 0%, rgba(255, 255, 255, 0.24) 0, transparent 38%),
    linear-gradient(135deg, #0d2e6f, #123f95 58%, #1756b7 100%);
}

.reset-card {
  width: min(460px, 100%);
  background: #fff;
  border-radius: 18px;
  padding: 2.2rem;
  border: 1px solid #d6e4fb;
  box-shadow: 0 20px 56px rgba(8, 26, 61, 0.22);
}

.reset-head {
  margin-bottom: 1.2rem;
}

.kicker {
  margin: 0 0 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: #416db3;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.reset-head h1 {
  margin: 0;
  color: #0f2e67;
  font-size: 1.55rem;
}

.reset-form {
  display: grid;
  gap: 0.95rem;
}

.reset-form label {
  display: grid;
  gap: 0.45rem;
}

.reset-form label span {
  color: #17427f;
  font-weight: 700;
  font-size: 0.92rem;
}

.reset-form input {
  width: 100%;
  border: 1px solid #c8d9f8;
  background: #f9fcff;
  border-radius: 10px;
  padding: 0.78rem 0.88rem;
  font-size: 1rem;
}

.reset-form input:focus {
  outline: none;
  border-color: #3272d9;
  box-shadow: 0 0 0 3px rgba(50, 114, 217, 0.15);
}

.submit-btn {
  margin-top: 0.35rem;
  border: none;
  border-radius: 10px;
  padding: 0.82rem 1rem;
  background: linear-gradient(135deg, #1f5ec8, #11469e);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.state-line {
  margin: 0.25rem 0 0.4rem;
  font-size: 0.95rem;
  color: #1d4d96;
}

.notice {
  margin: 1rem 0 0;
  color: #0f766e;
  font-size: 0.92rem;
}

.error,
.state-line.error {
  margin: 1rem 0 0;
  color: #b91c1c;
  font-size: 0.92rem;
}

.back-link {
  display: inline-block;
  margin-top: 1.2rem;
  color: #1f5ec8;
  text-decoration: none;
  font-weight: 600;
}

.back-link:hover {
  text-decoration: underline;
}

@media (max-width: 560px) {
  .reset-page {
    padding: 1rem;
  }

  .reset-card {
    padding: 1.5rem;
    border-radius: 14px;
  }
}
</style>
