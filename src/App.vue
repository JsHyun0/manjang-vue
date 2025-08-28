<script setup lang="ts">
// App 컴포넌트
</script>

<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-container">
        <router-link to="/home" class="nav-logo">
          <img alt="Logo" src="./assets/logo.svg" width="40" height="40" />
          <span>만장일치</span>
        </router-link>

        <div class="nav-menu">
          <router-link to="/timer" class="nav-link">타이머</router-link>
          <router-link to="/reservation" class="nav-link">예약</router-link>
          <router-link to="/record" class="nav-link">기록</router-link>
          <router-link to="/login" class="nav-link login-btn">로그인</router-link>
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
  background: white;
  box-shadow: 0 2px 10px rgba(74, 144, 226, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 2rem;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--primary-blue);
  font-weight: bold;
  font-size: 1.2rem;
}

.nav-menu {
  display: flex;
  gap: 2rem;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  color: #666;
  font-weight: 500;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  transition: all 0.3s ease;
  position: relative;
}

.nav-link:hover {
  color: var(--primary-blue);
  background: var(--light-blue);
}

.nav-link.router-link-active {
  color: var(--primary-blue);
  background: var(--light-blue);
}

/* 밑줄형 포커스: 너무 튀지 않도록 얇은 강조선 */
.nav-link::after {
  content: '';
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 6px;
  height: 2px;
  background: transparent;
  border-radius: 2px;
  transition: background-color 0.25s ease;
}

.nav-link:hover::after {
  background: rgba(74, 144, 226, 0.35);
}

.nav-link.router-link-active::after {
  background: var(--primary-blue);
}

.login-btn {
  background: var(--primary-blue);
  color: white !important;
  border-radius: 20px;
}

.login-btn:hover {
  background: var(--secondary-blue) !important;
  color: white !important;
}

.main-content {
  min-height: calc(100vh - 80px);
}

@media (max-width: 768px) {
  .nav-container {
    padding: 1rem;
  }

  .nav-menu {
    gap: 1rem;
  }

  .nav-link {
    padding: 0.4rem 0.8rem;
    font-size: 0.9rem;
  }
}
</style>
