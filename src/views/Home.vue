<template>
  <div class="home">
    <section v-if="isAdmin" class="admin-hero">
      <div class="admin-head">
        <p class="admin-label">ADMIN MODE</p>
        <h2>관리자 대시보드</h2>
        <p>토론 목록에서 새 토론 생성/수정/삭제를 수행할 수 있습니다.</p>
      </div>
      <div class="admin-actions">
        <router-link to="/record" class="admin-btn primary">토론 목록 보기</router-link>
        <router-link to="/record/manage" class="admin-btn">토론 관리 페이지</router-link>
      </div>
    </section>

    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">만장일치</h1>
        <p class="hero-subtitle">
          토론을 통해 성장하는 공간. 함께 생각을 나누고 결론에 이르는 과정을 경험해보세요.
        </p>
        <div class="sns-links">
          <a
            class="sns-button"
            href="https://cafe.naver.com/soongsildebate"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="네이버 카페 바로가기"
          >
            <img :src="naverCafeLogo" alt="네이버 카페" />
          </a>
        </div>
      </div>
      <div class="hero-image">
        <img :src="heroImage" alt="만장일치 로고" />
      </div>
    </section>

    <footer class="contact-footer">
      <div class="contact-left">개발자 연락처</div>
      <div class="contact-right">이메일: hyunjiseung0x@gmail.com</div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import heroImage from '@/assets/logo.jpeg'
import naverCafeLogo from '@/assets/naver_cafe.webp'
import { useAuth } from '@/lib/auth'

const { isAdmin } = useAuth()
</script>

<style scoped>
.home {
  min-height: 100%;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.admin-hero {
  max-width: 1000px;
  margin: 0 auto 1rem;
  border-radius: 14px;
  border: 1px solid rgba(39, 130, 93, 0.25);
  background: linear-gradient(135deg, #e8f8ef, #f6fcf9);
  padding: 1.1rem 1.2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
}

.admin-label {
  margin: 0;
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  color: #19664a;
  font-weight: 700;
}

.admin-head h2 {
  margin: 0.2rem 0;
  color: #14553d;
}

.admin-head p {
  margin: 0;
  color: #2f6f56;
}

.admin-actions {
  display: flex;
  gap: 0.5rem;
}

.admin-btn {
  text-decoration: none;
  border-radius: 10px;
  padding: 0.6rem 0.85rem;
  border: 1px solid #a8d8c1;
  color: #14553d;
  background: #fff;
  font-weight: 700;
  font-size: 0.9rem;
}

.admin-btn.primary {
  background: #1d7f5a;
  border-color: #1d7f5a;
  color: #fff;
}

.hero {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  align-items: center;
  gap: 2rem;
  max-width: 1000px;
  margin: 0 auto 3rem;
  padding: 2rem;
  background: linear-gradient(180deg, var(--light-blue), #fff 60%);
  border-radius: 16px;
  box-shadow: 0 6px 20px rgba(74, 144, 226, 0.15);
  border: 1px solid rgba(74, 144, 226, 0.15);
}

.hero-title {
  font-size: 3rem;
  color: var(--primary-blue);
  margin-bottom: 1rem;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: #555;
  line-height: 1.8;
}

.sns-links {
  margin-top: 1.25rem;
  display: flex;
  gap: 0.75rem;
}

.sns-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fff;
  border: 1px solid rgba(74, 144, 226, 0.2);
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.15);
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease,
    border-color 0.12s ease;
}

.sns-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(74, 144, 226, 0.22);
  border-color: rgba(74, 144, 226, 0.35);
}

.sns-button img {
  width: 22px;
  height: 22px;
}

.hero-image {
  display: flex;
  justify-content: center;
}

.hero-image img {
  width: 220px;
  height: 220px;
  padding: 1.25rem;
  background: #fff;
  border-radius: 16px;
  border: 1px solid rgba(74, 144, 226, 0.2);
  box-shadow: 0 8px 24px rgba(74, 144, 226, 0.2);
}

@media (max-width: 860px) {
  .hero {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-image img {
    width: 160px;
    height: 160px;
  }
}

/* ----- 연락처 푸터 영역 ----- */
.contact-footer {
  /* 화면 가로 전체를 차지 */
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  padding: 1.25rem 1.5rem;
  border-top: 1px solid rgba(74, 144, 226, 0.2);
  color: #4b5563;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: auto;
}

.contact-left {
  font-size: 0.95rem;
}

.contact-right {
  display: flex;
  gap: 0.75rem;
}

.contact-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: var(--light-blue);
  color: var(--primary-blue);
  border: 1px solid rgba(74, 144, 226, 0.25);
  font-size: 0.85rem;
}

.contact-chip a {
  color: inherit;
  text-decoration: none;
}

@media (max-width: 640px) {
  .admin-hero {
    flex-direction: column;
    align-items: flex-start;
  }

  .admin-actions {
    width: 100%;
    flex-direction: column;
  }

  .contact-footer {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
