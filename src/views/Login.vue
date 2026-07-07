<template>
  <div class="login">
    <div class="login-container">
      <div class="login-header">
        <h2>로그인</h2>
        <p>이름과 학번으로 로그인하세요</p>
      </div>

      <form @submit.prevent="submitAuth" class="auth-form">
        <div class="form-group">
          <label for="name">이름</label>
          <input id="name" v-model="name" autocomplete="name" placeholder="예: 홍길동" required />
        </div>

        <div class="form-group">
          <label for="student-id">학번</label>
          <input
            id="student-id"
            v-model="studentId"
            autocomplete="username"
            inputmode="numeric"
            placeholder="예: 20241234"
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
            placeholder="최초 로그인 시 학번을 입력하세요"
            minlength="6"
            required
          />
        </div>

        <button class="submit-btn" type="submit" :disabled="submitting">
          {{ submitting ? '처리 중...' : '로그인' }}
        </button>
      </form>

      <p v-if="noticeMessage" class="notice-text">{{ noticeMessage }}</p>
      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>
      <p class="help-text">
        회원 계정은 동아리 회원 명단에서 자동으로 등록됩니다. 최초 비밀번호는 본인 학번이며, 첫
        로그인 후 반드시 새 비밀번호로 변경해야 합니다. 로그인에 문제가 있으면 관리자에게
        문의해주세요.
      </p>

      <div class="back-home">
        <router-link to="/home" class="back-btn">홈으로 돌아가기</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { signInWithNameAndStudentId, useAuth } from '@/lib/auth'

const router = useRouter()
const route = useRoute()
const { isLoggedIn } = useAuth()
const name = ref('')
const studentId = ref('')
const password = ref('')
const submitting = ref(false)
const noticeMessage = ref('')
const errorMessage = ref('')

onMounted(() => {
  if (route.query.reset === 'done') {
    noticeMessage.value = '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.'
  }
  if (isLoggedIn.value) {
    router.replace('/home')
  }
})

function toFriendlyError(message: string): string {
  if (!message) return '로그인 처리 중 오류가 발생했습니다.'
  if (/invalid login credentials/i.test(message)) {
    return '비밀번호가 올바르지 않습니다. 최초 로그인이라면 학번을 비밀번호로 입력해주세요.'
  }
  if (/email not confirmed/i.test(message)) {
    return '계정 상태에 문제가 있습니다. 관리자에게 문의해주세요.'
  }
  if (/security purposes/i.test(message) || /rate limit/i.test(message)) {
    return '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  }
  return message
}

async function submitAuth() {
  noticeMessage.value = ''
  errorMessage.value = ''

  submitting.value = true
  try {
    const user = await signInWithNameAndStudentId(name.value, studentId.value, password.value)
    if (user?.mustChangePassword) {
      router.push('/change-password')
    } else {
      router.push('/home')
    }
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
