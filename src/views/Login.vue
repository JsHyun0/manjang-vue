<template>
  <div class="login">
    <div class="login-container">
      <div class="login-header">
        <h2>로그인 / 회원가입</h2>
      </div>

      <div class="mode-switch">
        <button
          type="button"
          class="mode-btn"
          :class="{ active: mode === 'signin' }"
          @click="changeMode('signin')"
        >
          로그인
        </button>
        <button
          type="button"
          class="mode-btn"
          :class="{ active: mode === 'signup' }"
          @click="changeMode('signup')"
        >
          회원가입
        </button>
      </div>

      <form @submit.prevent="submitAuth" class="auth-form">
        <div v-if="mode === 'signup'" class="form-group">
          <label for="name">이름</label>
          <input id="name" v-model="name" autocomplete="name" placeholder="예: 홍길동" required />
        </div>

        <div v-if="mode === 'signup'" class="form-group">
          <label for="student-id">학번</label>
          <input
            id="student-id"
            v-model="studentId"
            autocomplete="off"
            placeholder="예: 20241234"
            required
          />
        </div>

        <div v-if="mode === 'signup'" class="form-group">
          <label for="major">학과</label>
          <input
            id="major"
            v-model="major"
            autocomplete="organization"
            placeholder="예: 컴퓨터공학과"
            required
          />
        </div>

        <div class="form-group">
          <label for="email">이메일</label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            placeholder="name@example.com"
            required
          />
        </div>

        <div class="form-group">
          <label for="password">비밀번호</label>
          <input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            placeholder="6자 이상 입력"
            minlength="6"
            required
          />
        </div>

        <div v-if="mode === 'signin'" class="forgot-wrap">
          <button type="button" class="forgot-btn" @click="showResetPanel = !showResetPanel">
            {{ showResetPanel ? '닫기' : '비밀번호를 잊으셨나요?' }}
          </button>
          <div v-if="showResetPanel" class="forgot-panel">
            <p>입력한 이메일로 비밀번호 재설정 링크를 발송합니다.</p>
            <button
              type="button"
              class="forgot-send-btn"
              :disabled="sendingReset"
              @click="submitPasswordReset"
            >
              {{ sendingReset ? '발송 중...' : '재설정 메일 보내기' }}
            </button>
          </div>
        </div>

        <button class="submit-btn" type="submit" :disabled="submitting">
          {{ submitting ? '처리 중...' : submitButtonText }}
        </button>
      </form>

      <p v-if="noticeMessage" class="notice-text">{{ noticeMessage }}</p>
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <p class="help-text">
        회원가입 시 인증 메일이 발송되며, 메일 인증 완료 후 로그인할 수 있습니다.
        관리자 계정은 동일한 로그인 화면에서 자동 인식됩니다.
      </p>

      <div class="back-home">
        <router-link to="/home" class="back-btn">홈으로 돌아가기</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sendPasswordResetEmail, signInWithEmail, signUpWithEmail, useAuth } from '@/lib/auth'

const router = useRouter()
const route = useRoute()
const { isLoggedIn } = useAuth()
const mode = ref<'signin' | 'signup'>('signin')
const name = ref('')
const studentId = ref('')
const major = ref('')
const email = ref('')
const password = ref('')
const showResetPanel = ref(false)
const sendingReset = ref(false)
const submitting = ref(false)
const noticeMessage = ref('')
const errorMessage = ref('')

const submitButtonText = computed(() => {
  if (mode.value === 'signup') return '회원가입'
  return '로그인'
})

onMounted(() => {
  if (route.query.reset === 'done') {
    noticeMessage.value = '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.'
  }
  if (isLoggedIn.value) {
    router.replace('/home')
  }
})

function changeMode(nextMode: 'signin' | 'signup') {
  mode.value = nextMode
  showResetPanel.value = false
  noticeMessage.value = ''
  errorMessage.value = ''
}

function toFriendlyError(message: string): string {
  if (!message) return '인증 처리 중 오류가 발생했습니다.'
  if (/invalid login credentials/i.test(message)) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
  if (/email not confirmed/i.test(message)) {
    return '이메일 인증 완료 후 로그인해주세요.'
  }
  if (/user already registered/i.test(message)) {
    return '이미 가입된 이메일입니다. 로그인으로 진행해주세요.'
  }
  if (/password should be at least/i.test(message)) {
    return '비밀번호는 최소 6자 이상이어야 합니다.'
  }
  if (/security purposes/i.test(message) || /rate limit/i.test(message)) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  }
  return message
}

async function submitPasswordReset() {
  noticeMessage.value = ''
  errorMessage.value = ''

  if (!email.value.trim()) {
    errorMessage.value = '비밀번호 재설정 메일을 받을 이메일을 입력해주세요.'
    return
  }

  sendingReset.value = true
  try {
    await sendPasswordResetEmail(email.value.trim())
    noticeMessage.value = '비밀번호 재설정 메일을 보냈습니다. 메일의 링크를 눌러 비밀번호를 변경해주세요.'
    showResetPanel.value = false
    password.value = ''
  } catch (error: any) {
    errorMessage.value = toFriendlyError(error?.message ?? '')
  } finally {
    sendingReset.value = false
  }
}

async function submitAuth() {
  noticeMessage.value = ''
  errorMessage.value = ''

  submitting.value = true
  try {
    if (!email.value.trim() || !password.value) {
      errorMessage.value = '이메일과 비밀번호를 입력해주세요.'
      return
    }

    if (mode.value === 'signup') {
      const needsVerification = await signUpWithEmail(
        email.value.trim(),
        password.value,
        {
          name: name.value,
          studentId: studentId.value,
          major: major.value,
        },
      )
      if (needsVerification) {
        noticeMessage.value = '회원가입 완료: 인증 메일을 확인한 뒤 로그인해주세요.'
        mode.value = 'signin'
        password.value = ''
      } else {
        router.push('/home')
      }
      return
    }

    await signInWithEmail(email.value.trim(), password.value)
    router.push('/home')
  } catch (error: any) {
    errorMessage.value = toFriendlyError(error?.message ?? '')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.login {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary-blue), var(--secondary-blue));
  padding: 2rem;
}

.login-container {
  background: white;
  border-radius: 16px;
  padding: 3rem;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header h2 {
  color: var(--primary-blue);
  margin-bottom: 0.5rem;
  font-size: 2rem;
}

.login-header p {
  color: #666;
  margin: 0;
}

.mode-switch {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.mode-btn {
  flex: 1;
  border: 1px solid #d1d5db;
  background: #fff;
  color: #4b5563;
  border-radius: 8px;
  padding: 0.65rem 0.75rem;
  cursor: pointer;
}

.mode-btn.active {
  background: var(--primary-blue);
  border-color: var(--primary-blue);
  color: #fff;
}

.auth-form {
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--primary-blue);
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e1e1;
  border-radius: 8px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-blue);
}

.submit-btn {
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: var(--primary-blue);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.forgot-wrap {
  margin: -0.25rem 0 1rem;
}

.forgot-btn {
  border: none;
  background: transparent;
  color: #1f5ec8;
  font-size: 0.88rem;
  padding: 0;
  cursor: pointer;
}

.forgot-btn:hover {
  text-decoration: underline;
}

.forgot-panel {
  margin-top: 0.65rem;
  padding: 0.75rem;
  border: 1px solid #d8e3f7;
  background: #f8fbff;
  border-radius: 10px;
}

.forgot-panel p {
  margin: 0 0 0.55rem;
  color: #3d4f72;
  font-size: 0.85rem;
}

.forgot-send-btn {
  border: 1px solid #9ab7eb;
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
  background: #fff;
  color: #144a9e;
  font-size: 0.86rem;
  font-weight: 600;
  cursor: pointer;
}

.forgot-send-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.help-text {
  color: #666;
  font-size: 0.9rem;
  margin: 0 0 1rem;
}

.notice-text {
  color: #0f766e;
  font-size: 0.9rem;
  margin: 0 0 0.5rem;
}

.error-text {
  color: #b91c1c;
  font-size: 0.9rem;
  margin: 0 0 0.5rem;
}

.back-home {
  text-align: center;
}

.back-btn {
  color: var(--primary-blue);
  text-decoration: none;
  font-size: 0.9rem;
}

.back-btn:hover {
  text-decoration: underline;
}
</style> 
