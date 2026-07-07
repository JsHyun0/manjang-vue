<template>
  <div class="change-password">
    <div class="panel">
      <div class="panel-header">
        <h2>비밀번호 변경</h2>
        <p v-if="mustChangePassword" class="force-note">
          현재 초기 비밀번호(학번)를 사용 중입니다. 계속하려면 새 비밀번호를 설정해주세요.
        </p>
        <p v-else>새 비밀번호를 설정합니다.</p>
      </div>

      <form class="form" @submit.prevent="submit">
        <div class="form-group">
          <label for="new-password">새 비밀번호</label>
          <input
            id="new-password"
            v-model="newPassword"
            type="password"
            autocomplete="new-password"
            placeholder="6자 이상 입력"
            minlength="6"
            required
          />
        </div>

        <div class="form-group">
          <label for="confirm-password">새 비밀번호 확인</label>
          <input
            id="confirm-password"
            v-model="confirmPassword"
            type="password"
            autocomplete="new-password"
            placeholder="한 번 더 입력"
            minlength="6"
            required
          />
        </div>

        <button class="submit-btn" type="submit" :disabled="submitting">
          {{ submitting ? '변경 중...' : '비밀번호 변경' }}
        </button>
      </form>

      <p v-if="errorMessage" class="error-text">{{ errorMessage }}</p>

      <div v-if="!mustChangePassword" class="back-row">
        <router-link to="/mypage" class="back-btn">마이페이지로 돌아가기</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { markPasswordChanged, useAuth } from '@/lib/auth'
import { changeMyPassword } from '@/lib/members'

const router = useRouter()
const { isLoggedIn, mustChangePassword, userStudentId } = useAuth()

const newPassword = ref('')
const confirmPassword = ref('')
const submitting = ref(false)
const errorMessage = ref('')

onMounted(() => {
  if (!isLoggedIn.value) {
    router.replace('/login')
  }
})

async function submit() {
  errorMessage.value = ''

  const cleanPassword = newPassword.value.trim()
  if (cleanPassword.length < 6) {
    errorMessage.value = '비밀번호는 최소 6자 이상이어야 합니다.'
    return
  }
  if (cleanPassword !== confirmPassword.value.trim()) {
    errorMessage.value = '비밀번호 확인이 일치하지 않습니다.'
    return
  }
  if (userStudentId.value && cleanPassword === userStudentId.value) {
    errorMessage.value = '초기 비밀번호(학번)와 다른 비밀번호를 사용해주세요.'
    return
  }

  submitting.value = true
  try {
    await changeMyPassword(cleanPassword)
    markPasswordChanged()
    router.push('/home')
  } catch (error: any) {
    errorMessage.value = error?.message || '비밀번호 변경에 실패했습니다.'
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.change-password {
  min-height: calc(100vh - 80px);
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f6f8fc;
  padding: 2rem;
}

.panel {
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(15, 27, 45, 0.07);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.06);
  padding: 2.5rem;
  width: 100%;
  max-width: 420px;
}

.panel-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.panel-header h2 {
  margin: 0 0 0.5rem;
  color: var(--primary-blue, #2d6cdf);
  font-size: 1.6rem;
}

.panel-header p {
  margin: 0;
  color: #666;
  font-size: 0.92rem;
}

.force-note {
  color: #b45309 !important;
  background: #fef7e7;
  border: 1px solid #f2dfae;
  border-radius: 10px;
  padding: 0.6rem 0.8rem;
}

.form {
  margin-bottom: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--primary-blue, #2d6cdf);
  font-weight: 500;
}

.form-group input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e1e1;
  border-radius: 8px;
  font-size: 1rem;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: var(--primary-blue, #2d6cdf);
}

.submit-btn {
  width: 100%;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1rem;
  background: var(--primary-blue, #2d6cdf);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.submit-btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.error-text {
  color: #b91c1c;
  font-size: 0.9rem;
  margin: 0 0 0.5rem;
}

.back-row {
  text-align: center;
}

.back-btn {
  color: var(--primary-blue, #2d6cdf);
  text-decoration: none;
  font-size: 0.9rem;
}

.back-btn:hover {
  text-decoration: underline;
}
</style>
