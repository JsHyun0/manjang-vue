<template>
  <div class="login">
    <div class="login-container">
      <div class="login-header">
        <h2>{{ isLogin ? '로그인' : '회원가입' }}</h2>
        <p>만장토론 클럽에 {{ isLogin ? '로그인' : '가입' }}하세요</p>
      </div>
      
      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="form-group">
          <label for="username">아이디</label>
          <input 
            type="text" 
            id="username"
            v-model="form.username"
            placeholder="아이디를 입력하세요"
            required
          />
        </div>
        
        <div class="form-group">
          <label for="password">비밀번호</label>
          <input 
            type="password" 
            id="password"
            v-model="form.password"
            placeholder="비밀번호를 입력하세요"
            required
          />
        </div>
        
        <div class="form-group" v-if="!isLogin">
          <label for="confirmPassword">비밀번호 확인</label>
          <input 
            type="password" 
            id="confirmPassword"
            v-model="form.confirmPassword"
            placeholder="비밀번호를 다시 입력하세요"
            required
          />
        </div>
        
        <button type="submit" class="submit-btn">
          {{ isLogin ? '로그인' : '회원가입' }}
        </button>
      </form>
      
      <div class="switch-mode">
        <p>
          {{ isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?' }}
          <button @click="toggleMode" class="switch-btn">
            {{ isLogin ? '회원가입' : '로그인' }}
          </button>
        </p>
      </div>
      
      <div class="back-home">
        <router-link to="/home" class="back-btn">홈으로 돌아가기</router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isLogin = ref(true)

const form = reactive({
  username: '',
  password: '',
  confirmPassword: ''
})

const toggleMode = () => {
  isLogin.value = !isLogin.value
  form.confirmPassword = ''
}

const handleSubmit = () => {
  if (!isLogin.value && form.password !== form.confirmPassword) {
    alert('비밀번호가 일치하지 않습니다.')
    return
  }
  
  // 실제 로그인/회원가입 로직은 여기에 구현
  console.log(isLogin.value ? '로그인 시도:' : '회원가입 시도:', form)
  alert(`${isLogin.value ? '로그인' : '회원가입'} 요청이 완료되었습니다.`)
  
  // 성공 시 홈으로 이동
  router.push('/home')
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

.login-form {
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

.submit-btn {
  width: 100%;
  padding: 0.75rem;
  background: var(--primary-blue);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.submit-btn:hover {
  background: var(--secondary-blue);
}

.switch-mode {
  text-align: center;
  margin-bottom: 1rem;
}

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