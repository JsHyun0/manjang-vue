import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { useAuth } from './lib/auth'

// 앱 생성 전에 로그인 성공 리다이렉트 쿼리를 파싱해 저장
const url = new URL(window.location.href)
const loginSuccess = url.searchParams.get('login') === 'success'
const name = url.searchParams.get('name')
const email = url.searchParams.get('email')

// 온보딩 후 완료 리다이렉트일 때만 저장
if (loginSuccess && name && email) {
  const { setUser } = useAuth()
  setUser({ name, email })
  // URL 정리 (쿼리 제거)
  const cleanUrl = url.origin + url.pathname
  window.history.replaceState({}, '', cleanUrl)
}

createApp(App).use(router).mount('#app')
