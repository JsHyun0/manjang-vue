<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signOutAuth, useAuth } from './lib/auth'
const router = useRouter()
const { isLoggedIn, userName, isAdmin } = useAuth()

const menuOpen = ref(false)
const mobileMenuOpen = ref(false)

function displayName(name: string): string {
  if (!name) return '로그인/가입'
  return name.length > 12 ? name.slice(0, 12) + '…' : name
}

async function onLogout() {
  try {
    await signOutAuth()
    menuOpen.value = false
    mobileMenuOpen.value = false
    router.push('/home')
  } catch (_error) {
    alert('로그아웃 중 오류가 발생했습니다.')
  }
}

function goToTimerReset() {
  const ts = Date.now().toString()
  const location = { path: '/timer', query: { reset: '1', ts } }
  const current = router.currentRoute.value
  if (current.path === '/timer') {
    router.replace(location)
  } else {
    router.push(location)
  }
  mobileMenuOpen.value = false
}

function goToDebateManage() {
  menuOpen.value = false
  mobileMenuOpen.value = false
  router.push('/record/manage')
}

function closeMobileMenu() {
  mobileMenuOpen.value = false
}
</script>

<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-container">
        <router-link to="/home" class="nav-logo">
          <span class="logo-text">만장일치</span>
        </router-link>

        <div class="nav-menu desktop-only">
          <router-link to="/timer" class="nav-link" @click.prevent="goToTimerReset"
            >타이머</router-link
          >
          <router-link to="/reservation" class="nav-link">예약</router-link>
          <router-link to="/record" class="nav-link">토론 목록</router-link>

          <router-link v-if="!isLoggedIn" to="/login" class="login-pill">로그인</router-link>

          <div v-else class="nav-user">
            <button type="button" class="user-pill" @click="menuOpen = !menuOpen">
              <span>{{ displayName(userName) }}</span>
              <span v-if="isAdmin" class="admin-badge">관리자</span>
            </button>
            <div v-if="menuOpen" class="user-dropdown">
              <button v-if="isAdmin" type="button" class="dropdown-item" @click="goToDebateManage">
                토론 관리
              </button>
              <button type="button" class="dropdown-item" @click="onLogout">로그아웃</button>
            </div>
          </div>
        </div>

        <button
          class="mobile-toggle mobile-only"
          type="button"
          aria-label="메뉴 열기"
          @click="mobileMenuOpen = !mobileMenuOpen"
        >
          <span class="bar" />
          <span class="bar" />
          <span class="bar" />
        </button>

        <div v-if="mobileMenuOpen" class="mobile-menu mobile-only">
          <router-link to="/timer" class="mobile-link" @click.prevent="goToTimerReset"
            >타이머</router-link
          >
          <router-link to="/reservation" class="mobile-link" @click="closeMobileMenu"
            >예약</router-link
          >
          <router-link to="/record" class="mobile-link" @click="closeMobileMenu"
            >토론 목록</router-link
          >
          <div class="mobile-divider" />
          <router-link
            v-if="!isLoggedIn"
            to="/login"
            class="mobile-link mobile-login"
            @click="closeMobileMenu"
            >로그인 / 가입</router-link
          >
          <template v-else>
            <div class="mobile-user-row">
              {{ displayName(userName) }}
              <span v-if="isAdmin" class="admin-badge">관리자</span>
            </div>
            <button v-if="isAdmin" type="button" class="mobile-link" @click="goToDebateManage">
              토론 관리
            </button>
            <button type="button" class="mobile-link" @click="onLogout">로그아웃</button>
          </template>
        </div>
      </div>
    </nav>

    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.navbar {
  background: #ffffff;
  border-bottom: 1px solid rgba(15, 27, 45, 0.07);
  position: static;
  z-index: 100;
}

.nav-container {
  max-width: 1140px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 14px 32px;
  position: relative;
}

.nav-logo {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
}

.logo-text {
  font-weight: 700;
  font-size: 17px;
  color: #0f1b2d;
  letter-spacing: -0.015em;
}

.nav-menu {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: nowrap;
}

.nav-link {
  position: relative;
  padding: 9px 14px;
  font-size: 14px;
  font-weight: 500;
  color: #5b6473;
  border-radius: 8px;
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s ease;
}

.nav-link:hover {
  color: #0f1b2d;
}

.nav-link.router-link-active {
  color: #0f1b2d;
  font-weight: 600;
}

.nav-link.router-link-active::after {
  content: '';
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 2px;
  height: 2px;
  background: #2d6cdf;
  border-radius: 2px;
}

.login-pill {
  margin-left: 8px;
  padding: 8px 16px;
  font-size: 13.5px;
  font-weight: 600;
  color: #0f1b2d;
  background: #ffffff;
  border: 1px solid rgba(15, 27, 45, 0.07);
  border-radius: 999px;
  text-decoration: none;
  white-space: nowrap;
  transition: border-color 0.15s ease;
}

.login-pill:hover {
  border-color: rgba(15, 27, 45, 0.18);
}

.nav-user {
  position: relative;
  margin-left: 8px;
}

.user-pill {
  background: #eef4fe;
  border: 1px solid rgba(45, 108, 223, 0.11);
  color: #2d6cdf;
  border-radius: 999px;
  padding: 7px 14px;
  font-size: 13.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
}

.admin-badge {
  display: inline-flex;
  align-items: center;
  height: 18px;
  padding: 0 6px;
  border-radius: 999px;
  background: #e7f7ee;
  border: 1px solid #b4e1cd;
  color: #166347;
  font-size: 10.5px;
  font-weight: 700;
}

.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  background: #fff;
  border: 1px solid rgba(15, 27, 45, 0.07);
  border-radius: 10px;
  box-shadow: 0 12px 28px -10px rgba(15, 27, 45, 0.18);
  padding: 6px;
  min-width: 160px;
  z-index: 1000;
}

.dropdown-item {
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 9px 12px;
  border-radius: 7px;
  cursor: pointer;
  color: #0f1b2d;
  font-size: 13.5px;
  font-weight: 500;
}

.dropdown-item:hover {
  background: #eef4fe;
  color: #2d6cdf;
}

.mobile-toggle {
  width: 36px;
  height: 36px;
  border-radius: 9px;
  border: 1px solid rgba(15, 27, 45, 0.07);
  background: #fff;
  display: none;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 3px;
  padding: 0;
  cursor: pointer;
}

.mobile-toggle .bar {
  width: 16px;
  height: 1.6px;
  background: #0f1b2d;
  border-radius: 1px;
}

.mobile-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 14px;
  left: 14px;
  background: #fff;
  border-radius: 12px;
  border: 1px solid rgba(15, 27, 45, 0.07);
  box-shadow: 0 12px 28px -10px rgba(15, 27, 45, 0.18);
  padding: 8px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mobile-link {
  padding: 11px 14px;
  font-size: 14.5px;
  font-weight: 500;
  color: #0f1b2d;
  border-radius: 8px;
  text-decoration: none;
  background: transparent;
  border: none;
  text-align: left;
  cursor: pointer;
  font-family: inherit;
}

.mobile-link:hover,
.mobile-link.router-link-active {
  background: #eef4fe;
  color: #2d6cdf;
  font-weight: 600;
}

.mobile-link.mobile-login {
  color: #2d6cdf;
  font-weight: 600;
}

.mobile-divider {
  height: 1px;
  background: rgba(15, 27, 45, 0.07);
  margin: 4px 6px;
}

.mobile-user-row {
  padding: 11px 14px;
  font-size: 13px;
  color: #5b6473;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.main-content {
  min-height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
}

.desktop-only {
  display: flex;
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .nav-container {
    padding: 14px 18px;
  }

  .desktop-only {
    display: none;
  }

  .mobile-only {
    display: flex;
  }

  .mobile-toggle {
    display: grid;
    place-items: center;
  }
}
</style>
