<template>
  <div class="home-page">
    <div class="home-shell">
      <section v-if="isAdmin" class="admin-banner">
        <div class="admin-text">
          <p class="admin-label">ADMIN MODE</p>
          <h2>관리자 대시보드</h2>
          <p class="admin-desc">토론 목록 페이지에서 새 토론을 생성·수정·삭제할 수 있습니다.</p>
        </div>
        <div class="admin-actions">
          <router-link to="/record" class="admin-btn primary">토론 목록 보기</router-link>
          <router-link to="/record/manage" class="admin-btn">토론 관리</router-link>
        </div>
      </section>

      <section class="hero">
        <div class="hero-glow" />
        <div class="hero-text">
          <span class="hero-badge">
            <span class="dot" />
            SOONGSIL DEBATE CLUB
          </span>
          <h1 class="hero-title">
            토론으로 닿는<br />
            <span class="hero-accent">만장일치</span>의 순간
          </h1>
          <p class="hero-sub">
            생각을 나누고, 근거를 다듬고, 결론에 이르는 모든 과정을 한 곳에서. 타이머·예약·기록까지
            토론에 필요한 도구를 모았습니다.
          </p>
          <div class="hero-actions">
            <router-link to="/reservation" class="btn btn-primary">토론 예약하기 →</router-link>
            <router-link to="/record" class="btn btn-secondary">토론 목록 보기</router-link>
          </div>
          <div class="hero-meta">
            <span class="meta-label">COMMUNITY</span>
            <span class="meta-divider" />
            <a
              class="meta-link"
              href="https://cafe.naver.com/soongsildebate"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img :src="naverCafeLogo" alt="" />
              네이버 카페 →
            </a>
          </div>
        </div>
        <div class="hero-image">
          <div class="logo-card">
            <img :src="heroImage" alt="만장일치" />
          </div>
        </div>
      </section>

      <section class="features">
        <router-link
          v-for="feature in features"
          :key="feature.title"
          :to="feature.to"
          class="feature-card"
          @click="feature.onClick?.($event)"
        >
          <div class="feature-icon">{{ feature.icon }}</div>
          <div class="feature-body">
            <div class="feature-title">{{ feature.title }}</div>
            <div class="feature-desc">{{ feature.desc }}</div>
          </div>
          <span class="feature-arrow-mobile">→</span>
          <div class="feature-link-row">{{ feature.link }} →</div>
        </router-link>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import heroImage from '@/assets/logo.jpeg'
import naverCafeLogo from '@/assets/naver_cafe.webp'
import { useAuth } from '@/lib/auth'
import { warmBackend } from '@/lib/backendWarmup'

const router = useRouter()
const { isAdmin } = useAuth()

onMounted(() => {
  void warmBackend()
})

function goToTimerReset(e: Event) {
  e.preventDefault()
  const ts = Date.now().toString()
  router.push({ path: '/timer', query: { reset: '1', ts } })
}

type Feature = {
  icon: string
  title: string
  desc: string
  link: string
  to: string
  onClick?: (e: Event) => void
}

const features: Feature[] = [
  {
    icon: '⏱',
    title: '토론 타이머',
    desc: 'SSU·CEDA·자유토론 모드를 모두 지원하는 정밀 타이머',
    link: '타이머 바로가기',
    to: '/timer',
    onClick: goToTimerReset,
  },
  {
    icon: '📅',
    title: '회의실 예약',
    desc: '시간대별로 빈 슬롯을 한눈에. 클릭 한 번으로 예약',
    link: '예약 바로가기',
    to: '/reservation',
  },
  {
    icon: '🏆',
    title: '이벤트 대회',
    desc: '조 편성부터 경기 일정, 실시간 순위와 결과까지 한눈에',
    link: '대회 현황 보기',
    to: '/events',
  },
  {
    icon: '📚',
    title: '토론 기록',
    desc: '주제, 참가자, 결과까지. 지난 토론을 다시 펼쳐보세요',
    link: '목록 바로가기',
    to: '/record',
  },
]
</script>

<style scoped>
.home-page {
  background: #f6f8fc;
  min-height: 100%;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.home-shell {
  flex: 1;
  width: 100%;
  max-width: 1140px;
  margin: 0 auto;
  padding: 44px 32px 56px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.admin-banner {
  border-radius: 16px;
  border: 1px solid rgba(31, 139, 90, 0.2);
  background: linear-gradient(135deg, #e7f7ee, #f6fcf9);
  padding: 18px 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.admin-label {
  margin: 0;
  font-size: 11px;
  letter-spacing: 0.08em;
  color: #166347;
  font-weight: 700;
}

.admin-text h2 {
  margin: 4px 0 2px;
  color: #0f3d2c;
  font-size: 18px;
  font-weight: 700;
}

.admin-desc {
  margin: 0;
  color: #2f6f56;
  font-size: 13.5px;
}

.admin-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.admin-btn {
  text-decoration: none;
  border-radius: 10px;
  padding: 9px 14px;
  border: 1px solid #b4e1cd;
  color: #14553d;
  background: #fff;
  font-weight: 700;
  font-size: 13px;
  white-space: nowrap;
}

.admin-btn.primary {
  background: #1f8b5a;
  border-color: #1f8b5a;
  color: #fff;
}

.hero {
  position: relative;
  overflow: hidden;
  background: #ffffff;
  border-radius: 20px;
  border: 1px solid rgba(45, 108, 223, 0.11);
  box-shadow:
    0 1px 0 rgba(15, 27, 45, 0.04),
    0 20px 40px -28px rgba(45, 108, 223, 0.22);
  padding: 52px;
  display: grid;
  grid-template-columns: 1.15fr 0.85fr;
  gap: 48px;
  align-items: center;
}

.hero-glow {
  position: absolute;
  right: -120px;
  top: -120px;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  background: radial-gradient(circle, #e6f0ff 0%, transparent 68%);
  pointer-events: none;
}

.hero-text {
  position: relative;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 12px;
  background: #eef4fe;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: #2d6cdf;
  letter-spacing: 0.03em;
  margin-bottom: 22px;
}

.hero-badge .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2d6cdf;
}

.hero-title {
  font-size: 52px;
  line-height: 1.08;
  margin: 0;
  color: #0f1b2d;
  font-weight: 800;
  letter-spacing: -0.025em;
}

.hero-accent {
  color: #2d6cdf;
}

.hero-sub {
  margin-top: 18px;
  font-size: 16.5px;
  line-height: 1.65;
  color: #5b6473;
  max-width: 460px;
}

.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 28px;
  align-items: center;
  flex-wrap: wrap;
}

.btn {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 13px 22px;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  border: 1px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}

.btn-primary {
  background: #2d6cdf;
  color: #fff;
  box-shadow: 0 6px 16px -6px rgba(45, 108, 223, 0.5);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px -6px rgba(45, 108, 223, 0.55);
}

.btn-secondary {
  background: #fff;
  color: #0f1b2d;
  border-color: rgba(15, 27, 45, 0.07);
}

.btn-secondary:hover {
  border-color: rgba(15, 27, 45, 0.18);
}

.hero-meta {
  margin-top: 22px;
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.meta-label {
  font-size: 11.5px;
  color: #5b6473;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.meta-divider {
  width: 1px;
  height: 12px;
  background: rgba(15, 27, 45, 0.07);
}

.meta-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  color: #0f1b2d;
  font-weight: 500;
  text-decoration: none;
}

.meta-link img {
  width: 17px;
  height: 17px;
  border-radius: 4px;
}

.hero-image {
  display: grid;
  place-items: center;
  position: relative;
}

.logo-card {
  width: 264px;
  height: 264px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid rgba(45, 108, 223, 0.11);
  padding: 26px;
  box-shadow: 0 28px 56px -28px rgba(45, 108, 223, 0.32);
  display: grid;
  place-items: center;
}

.logo-card img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 12px;
}

.features {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}

.feature-card {
  background: #fff;
  border-radius: 14px;
  border: 1px solid rgba(15, 27, 45, 0.07);
  padding: 24px;
  text-decoration: none;
  color: inherit;
  display: block;
  transition:
    transform 0.12s ease,
    border-color 0.12s ease,
    box-shadow 0.12s ease;
}

.feature-card:hover {
  transform: translateY(-2px);
  border-color: rgba(45, 108, 223, 0.22);
  box-shadow: 0 8px 20px -12px rgba(45, 108, 223, 0.18);
}

.feature-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: #eef4fe;
  display: grid;
  place-items: center;
  font-size: 18px;
  margin-bottom: 14px;
  flex-shrink: 0;
}

.feature-title {
  font-size: 15.5px;
  font-weight: 700;
  color: #0f1b2d;
  margin-bottom: 6px;
}

.feature-desc {
  font-size: 13.5px;
  color: #5b6473;
  line-height: 1.55;
}

.feature-arrow-mobile {
  display: none;
}

.feature-link-row {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid rgba(15, 27, 45, 0.07);
  font-size: 12.5px;
  color: #2d6cdf;
  font-weight: 600;
}

@media (max-width: 860px) {
  .hero {
    padding: 28px 24px;
    grid-template-columns: 1fr;
    gap: 20px;
  }

  .hero-title {
    font-size: 32px;
  }

  .hero-sub {
    font-size: 14.5px;
    margin-top: 14px;
  }

  .hero-actions {
    flex-direction: column;
    gap: 10px;
    margin-top: 22px;
  }

  .hero-actions .btn {
    width: 100%;
    padding: 15px;
    font-size: 15px;
  }

  .hero-image {
    margin-top: 4px;
  }

  .logo-card {
    width: 140px;
    height: 140px;
    border-radius: 18px;
    padding: 16px;
    box-shadow: 0 18px 36px -18px rgba(45, 108, 223, 0.32);
  }

  .features {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .feature-card {
    padding: 16px 18px;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .feature-icon {
    width: 42px;
    height: 42px;
    margin-bottom: 0;
    font-size: 19px;
  }

  .feature-body {
    flex: 1;
    min-width: 0;
  }

  .feature-title {
    font-size: 15px;
    margin-bottom: 3px;
  }

  .feature-desc {
    font-size: 12.5px;
    line-height: 1.45;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .feature-arrow-mobile {
    display: block;
    color: #2d6cdf;
    font-size: 18px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .feature-link-row {
    display: none;
  }
}

@media (max-width: 640px) {
  .home-shell {
    padding: 20px 16px 36px;
    gap: 14px;
  }

  .admin-banner {
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-actions {
    width: 100%;
    flex-direction: column;
  }

  .admin-btn {
    width: 100%;
    text-align: center;
  }
}
</style>
