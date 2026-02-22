import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { initAuth } from './lib/auth'

const bootstrap = async () => {
  await initAuth()
  createApp(App).use(router).mount('#app')
}

void bootstrap()
