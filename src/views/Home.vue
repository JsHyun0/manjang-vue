<template>
  <div class="home">
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
  </div>
</template>

<script setup lang="ts">
import heroImage from '@/assets/logo.svg'
import naverCafeLogo from '@/assets/naver_cafe.webp'
</script>

<style scoped>
.home {
  min-height: 100vh;
  padding: 2rem;
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
</style>
