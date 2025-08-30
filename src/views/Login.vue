<template>
  <div class="login">
    <div class="login-container">
      <div class="login-header">
        <h2>로그인 / 회원가입</h2>
        <p>만장토론 클럽은 네이버 계정으로 로그인합니다</p>
      </div>

      <div v-if="!isOnboarding" class="social-section">
        <a class="naver-login-cta" :href="API_BASE + '/naver'" aria-label="네이버로 로그인">
          <img src="@/assets/btnG_완성형.png" alt="Naver Login" />
        </a>
        <p class="help-text">버튼을 클릭하면 네이버 로그인 페이지로 이동합니다.</p>
      </div>

      <div v-else class="onboarding">
        <h3>추가 정보 입력</h3>
        <p class="help-text">처음 오신 것 같아요. sID를 입력해 가입을 완료해주세요.</p>
        <form @submit.prevent="submitSID" class="onboarding-form">
          <div class="form-group">
            <label for="sid">sID</label>
            <input id="sid" v-model="sid" placeholder="예: s123456" required />
          </div>
          <button class="submit-btn" type="submit" :disabled="submitting">
            {{ submitting ? '처리 중...' : '가입 완료' }}
          </button>
        </form>
      </div>

      <div class="back-home">
        <router-link to="/home" class="back-btn">홈으로 돌아가기</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const isOnboarding = ref(false)
const name = ref('')
const email = ref('')
const sid = ref('')
const submitting = ref(false)
const API_BASE = import.meta.env.VITE_API_BASE

onMounted(() => {
  const onboarding = route.query.onboarding === '1'
  const qName = typeof route.query.name === 'string' ? route.query.name : ''
  const qEmail = typeof route.query.email === 'string' ? route.query.email : ''
  if (onboarding && qEmail) {
    isOnboarding.value = true
    name.value = qName
    email.value = qEmail
  }
})

async function submitSID() {
  if (!sid.value || !email.value) return
  submitting.value = true
  try {
    const res = await fetch(import.meta.env.VITE_API_URL+'/naver/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, name: name.value, sid: sid.value })
    })
    const data = await res.json()
    if (data?.redirect) {
      window.location.href = data.redirect
      return
    }
    // 실패 시 기본 홈 이동
    router.push('/home')
  } catch (e) {
    alert('가입 처리 중 오류가 발생했습니다.')
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

.social-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 2rem;
}

.form-group {
  margin-bottom: 1.5rem;
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

.naver-login-cta img {
  display: block;
  width: 100%;
  max-width: 360px;
  height: auto;
}

.help-text {
  color: #666;
  font-size: 0.9rem;
  margin: 0;
}

.onboarding h3 {
  color: var(--primary-blue);
  margin-top: 0;
}

.onboarding-form {
  margin-top: 1rem;
}

/* 폼/토글 UI 제거됨 */

.switch-mode p {
  color: #666;
  margin: 0;
}

.switch-btn {
  background: none;
  border: none;
  color: var(--primary-blue);
  cursor: pointer;
  font-weight: 500;
  text-decoration: underline;
  margin-left: 0.5rem;
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