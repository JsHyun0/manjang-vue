<template>
  <div class="timer-page">
    <div class="timer-container">
      <!-- 모드 선택 화면 -->
      <div v-if="stage === 'select'" class="mode-select">
        <h2 class="select-title">타이머를 선택하세요</h2>
        <div class="mode-card-grid">
          <button class="mode-card free" @click="handleSelectMode('free')">
            <div class="mode-card-title">자유토론</div>
            <div class="mode-card-desc">10분 기본 타이머</div>
          </button>
          <button class="mode-card ssu" @click="handleSelectMode('ssu')">
            <div class="mode-card-title">SSU토론</div>
            <div class="mode-card-desc">10단계 진행형 타이머</div>
          </button>
        </div>
      </div>

      <!-- 준비(설정) 화면 -->
      <div v-else-if="stage === 'prepare'" class="prepare-container">
        <h2 class="select-title">준비 단계 - 시간 설정</h2>
        <p class="prepare-desc">각 단계의 시간을 분/초 단위로 조정하세요.</p>

        <div class="topic-input">
          <label for="debate-topic" class="topic-label">논제</label>
          <input
            id="debate-topic"
            class="topic-text-input"
            type="text"
            v-model="debateTopic"
            placeholder="논제를 입력하세요"
          />
        </div>

        <TimerSettings :phases="preparePhases" @update-phase="updatePhaseDuration" />

        <div class="prepare-actions">
          <button class="control-btn back" @click="backToSelection">뒤로</button>
          <button class="control-btn start" @click="startDebate">시작</button>
        </div>
      </div>

      <!-- SSU 단계 상단바 -->
      <div v-if="stage === 'run' && timerType === 'ssu'" class="step-topbar">
        <div class="step-buttons">
          <button
            v-for="(step, i) in ssuSteps"
            :key="`step-${i}`"
            class="step-dot"
            :class="{ active: i === currentStep }"
            :title="step.title"
            @click="goToStep(i)"
          >
            {{ i + 1 }}.{{ step.title }}
          </button>
        </div>
      </div>

      <!-- 메인 타이머 영역 -->
      <div v-if="stage === 'run'" class="timer-main" :class="{ 'ssu-mode': timerType === 'ssu' }">
        <div v-if="debateTopic" class="debate-topic-global">{{ debateTopic }}</div>
        <!-- 왼쪽 토론자들 (SSU 모드에서만 표시) -->
        <div v-if="timerType === 'ssu'" class="debaters-left">
          <div class="debater-group">
            <h3>긍정</h3>
            <div class="debater-icons">
              <div
                v-for="i in 3"
                :key="`left-${i}`"
                class="debater-icon"
                :class="{ highlight: activeSpeakers.positive === i }"
              >
                <div class="avatar">
                  <svg class="avatar-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4.2 4.2-6.5 8-6.5s8 2.3 8 6.5" />
                  </svg>
                </div>
                <span class="debater-label">토론자 {{ i }}</span>
              </div>
            </div>

            <!-- 사용 횟수 표시 -->
            <div class="usage-counters">
              <!-- 보충질의 -->
              <div class="counter-item" @click="handleSupplementCounterClick('positive')">
                <h4>보충질의</h4>
                <div class="counter-display">
                  <div class="counter-dots">
                    <span
                      v-for="n in 3"
                      :key="`pos-supp-${n}`"
                      class="dot"
                      :class="{ active: n <= usageCounters.positive.supplementaryQuestion }"
                    ></span>
                  </div>
                  <span class="counter-text"
                    >{{ usageCounters.positive.supplementaryQuestion }}/3</span
                  >
                </div>
              </div>

              <!-- 작전타임 -->
              <div class="counter-item" @click="handleStrategyCounterClick('positive')">
                <h4>작전타임</h4>
                <div class="counter-display">
                  <div class="counter-dots">
                    <span
                      v-for="n in 2"
                      :key="`pos-strat-${n}`"
                      class="dot"
                      :class="{ active: n <= usageCounters.positive.strategyTime }"
                    ></span>
                  </div>
                  <span class="counter-text">{{ usageCounters.positive.strategyTime }}/2</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 가운데 타이머 -->
        <div class="timer-display">
          <div class="timer-circle" :class="{ 'cue-30s': thirtySecondCueActive }">
            <div v-if="isSupplementTime" class="supplement-overlay">
              <div class="supplement-box">
                <div class="supplement-label">보충질의</div>
                <div class="supplement-time">{{ formatTime(supplementRemaining) }}</div>
              </div>
            </div>
            <!-- 원형 프로그레스 배경 -->
            <div class="progress-ring">
              <svg class="progress-svg" viewBox="0 0 300 300">
                <circle
                  class="progress-ring-background"
                  stroke="#e9ecef"
                  stroke-width="4"
                  fill="transparent"
                  r="148"
                  cx="150"
                  cy="150"
                />
                <circle
                  class="progress-ring-progress"
                  stroke="url(#gradient)"
                  stroke-width="4"
                  fill="transparent"
                  r="148"
                  cx="150"
                  cy="150"
                  :stroke-dasharray="circumference"
                  :stroke-dashoffset="progressOffset"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" style="stop-color: #4a90e2; stop-opacity: 1" />
                    <stop offset="100%" style="stop-color: #357abd; stop-opacity: 1" />
                  </linearGradient>
                </defs>
              </svg>
            </div>

            <div class="timer-content">
              <div class="time-text">
                {{ formatTime(currentTime) }}
              </div>
              <div class="timer-label">
                {{
                  isSupplementTime
                    ? '보충질의'
                    : isStrategyTime
                      ? '작전타임'
                      : timerType === 'ssu'
                        ? currentStepInfo?.title
                        : '자유 토론'
                }}
              </div>
            </div>
          </div>

          <!-- 타이머 컨트롤 -->
          <div class="timer-controls">
            <div class="control-row main">
              <!-- SSU 모드일 때만 이전/다음 단계 버튼 표시 -->
              <button
                v-if="timerType === 'ssu' && !isStrategyTime && !isSupplementTime"
                class="control-btn step-btn"
                @click="previousStep"
                :disabled="currentStep === 0"
              >
                ← 이전
              </button>

              <button class="control-btn play-pause" @click="toggleTimer" :disabled="isSupplementTime">
                <i class="icon">{{ isRunning ? '⏸️' : '▶️' }}</i>
                {{ isRunning ? '일시정지' : '시작' }}
              </button>

              <!-- SSU 모드일 때만 이전/다음 단계 버튼 표시 -->
              <button
                v-if="timerType === 'ssu' && !isStrategyTime && !isSupplementTime"
                class="control-btn step-btn"
                @click="nextStep"
                :disabled="currentStep === ssuSteps.length - 1"
              >
                다음 →
              </button>
            </div>

            <div class="control-row secondary" v-if="timerType === 'ssu' && isStrategyTime">
              <button class="control-btn strategy" @click="cancelStrategyTime()">
                <i class="icon">↩️</i>
                돌아가기
              </button>
            </div>
            <div class="control-row secondary" v-if="timerType === 'ssu' && isSupplementTime">
              <button class="control-btn question" @click="cancelSupplementTime()">
                <i class="icon">↩️</i>
                돌아가기
              </button>
            </div>
          </div>
        </div>

        <!-- 오른쪽 토론자들 (SSU 모드에서만 표시) -->
        <div v-if="timerType === 'ssu'" class="debaters-right">
          <div class="debater-group">
            <h3>부정</h3>
            <div class="debater-icons">
              <div
                v-for="i in 3"
                :key="`right-${i}`"
                class="debater-icon"
                :class="{ highlight: activeSpeakers.negative === i }"
              >
                <div class="avatar">
                  <svg class="avatar-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                    <circle cx="12" cy="8" r="4" />
                    <path d="M4 20c0-4.2 4.2-6.5 8-6.5s8 2.3 8 6.5" />
                  </svg>
                </div>
                <span class="debater-label">토론자 {{ i }}</span>
              </div>
            </div>

            <!-- 사용 횟수 표시 -->
            <div class="usage-counters">
              <!-- 보충질의 -->
              <div class="counter-item" @click="handleSupplementCounterClick('negative')">
                <h4>보충질의</h4>
                <div class="counter-display">
                  <div class="counter-dots">
                    <span
                      v-for="n in 3"
                      :key="`neg-supp-${n}`"
                      class="dot"
                      :class="{ active: n <= usageCounters.negative.supplementaryQuestion }"
                    ></span>
                  </div>
                  <span class="counter-text"
                    >{{ usageCounters.negative.supplementaryQuestion }}/3</span
                  >
                </div>
              </div>

              <!-- 작전타임 -->
              <div class="counter-item" @click="handleStrategyCounterClick('negative')">
                <h4>작전타임</h4>
                <div class="counter-display">
                  <div class="counter-dots">
                    <span
                      v-for="n in 2"
                      :key="`neg-strat-${n}`"
                      class="dot"
                      :class="{ active: n <= usageCounters.negative.strategyTime }"
                    ></span>
                  </div>
                  <span class="counter-text">{{ usageCounters.negative.strategyTime }}/2</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- 하단 고정 종료 바 -->
      <div v-if="stage === 'run'" class="bottom-bar">
        <button class="finish-btn" @click="endDebate">토론 종료</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSSUTimer } from '@/lib/timer'
import TimerSettings from '@/components/TimerSettings.vue'

// 타이머 훅 사용
const {
  // 상태
  timerType,
  currentTime,
  isRunning,
  isStrategyTime,
  isSupplementTime,
  currentStep,
  usageCounters,
  freeDurationSeconds,

  // 계산된 값
  currentStepInfo,
  ssuSteps,
  activeSpeakers,

  // 메서드
  toggleTimer,
  resetTimer,
  selectTimerType,
  returnToSelection,
  startStrategyTime,
  endStrategyTime,
  cancelStrategyTime,
  startSupplementTime,
  cancelSupplementTime,
  previousStep,
  nextStep,
  goToStep,
  toggleUsage,
  formatTime,
  setSSUStepDurations,
  setFreeDuration,
  supplementRemaining,
  thirtySecondCueActive,
} = useSSUTimer()

// 원형 프로그레스 계산 (컨테이너 300px, stroke 4px → r = 150 - 2 = 148)
const circumference = 2 * Math.PI * 148

const progressOffset = computed(() => {
  let maxTime = freeDurationSeconds.value // 자유토론 설정값

  if (isStrategyTime.value) {
    maxTime = 60 // 작전타임 1분
  } else if (timerType.value === 'ssu' && currentStepInfo.value) {
    maxTime = currentStepInfo.value.duration
  }

  const progress = currentTime.value / maxTime
  return circumference * (1 - progress)
})

// 화면 단계 관리
const stage = ref<'select' | 'prepare' | 'run'>('select')
const selectedMode = ref<null | 'free' | 'ssu'>(null)

type PreparePhase = { name: string; duration: number } // duration in seconds
const preparePhases = ref<PreparePhase[]>([])

// 논제 입력
const debateTopic = ref<string>('')

const handleSelectMode = (mode: 'free' | 'ssu') => {
  selectedMode.value = mode
  if (mode === 'free') {
    preparePhases.value = [{ name: '자유토론', duration: Math.max(1, freeDurationSeconds.value) }]
  } else {
    preparePhases.value = ssuSteps.value.map((step) => ({
      name: step.title,
      duration: Math.max(1, step.duration),
    }))
  }
  stage.value = 'prepare'
}

const updatePhaseDuration = (index: number, durationSeconds: number) => {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) return
  if (index < 0 || index >= preparePhases.value.length) return
  const phases = [...preparePhases.value]
  phases[index] = { ...phases[index], duration: Math.floor(durationSeconds) }
  preparePhases.value = phases
}

const startDebate = () => {
  if (!selectedMode.value) return
  if (selectedMode.value === 'free') {
    const seconds = Math.max(1, preparePhases.value[0]?.duration || 600)
    setFreeDuration(seconds)
    selectTimerType('free')
  } else {
    const durationsSeconds = preparePhases.value.map((p) => Math.max(1, p.duration))
    setSSUStepDurations(durationsSeconds)
    selectTimerType('ssu')
  }
  stage.value = 'run'
}

const backToSelection = () => {
  selectedMode.value = null
  stage.value = 'select'
  returnToSelection()
}

const endDebate = () => {
  if (confirm('토론을 종료하시겠습니까?')) {
    selectedMode.value = null
    stage.value = 'select'
    returnToSelection()
  }
}

// 작전타임: 카운터 아이템 클릭 시 시작(이미 진행 중이면 무시)
const handleStrategyCounterClick = (side: 'positive' | 'negative') => {
  // 일반 타이머가 진행 중이면 진입 금지
  if (isRunning.value && !isStrategyTime.value) return
  if (isStrategyTime.value) return
  toggleUsage(side, 'strategyTime')
  startStrategyTime(side)
}

// 보충질의: 본 타이머 재생 중일 때만 진입, 다른 오버레이 타이머와 상호 배제
const handleSupplementCounterClick = (side: 'positive' | 'negative') => {
  if (timerType.value !== 'ssu') return
  if (!isRunning.value) return
  if (isStrategyTime.value || isSupplementTime.value) return
  toggleUsage(side, 'supplementaryQuestion')
  startSupplementTime(side)
}
</script>

<style scoped>
.timer-page {
  min-height: 100vh;
  background: white;
  display: flex;
  align-items: stretch;
  justify-content: center;
  overflow-x: hidden;
  overflow-y: auto;
}

.timer-container {
  width: 100%;
  max-width: 1600px;
  padding: 1rem 2rem;
  display: grid;
  grid-template-rows: auto 1fr auto; /* 상단바 / 메인 / 하단바 */
  min-height: 100vh;
}

/* 상단 단계 바 */
.step-topbar {
  position: sticky;
  top: 0;
  z-index: 5;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  /* 컨테이너 폭 제약을 벗어나 전체 화면 폭으로 노출 */
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  padding: 0.6rem 1rem;
}

/* 모드 선택 스타일 */
.mode-select {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding-top: 4rem;
}

.select-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: #1f2937;
}

.mode-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(220px, 1fr));
  gap: 1rem;
}

.mode-card {
  border: 2px solid #e5e7eb;
  background: white;
  border-radius: 16px;
  padding: 1.2rem 1.4rem;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
}

.mode-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
  border-color: var(--primary-blue);
}

.mode-card-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #111827;
  margin-bottom: 0.25rem;
}

.mode-card-desc {
  color: #6b7280;
  font-size: 0.95rem;
}

/* 준비 화면 */
.prepare-container {
  max-width: 960px;
  margin: 0 auto;
}

.topic-input {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 1rem 0 1.2rem;
}

.topic-label {
  font-weight: 700;
  color: #374151;
}

.topic-text-input {
  padding: 0.6rem 0.8rem;
  border: 2px solid #e5e7eb;
  border-radius: 10px;
  font-size: 0.95rem;
}

.topic-text-input:focus {
  outline: none;
  border-color: var(--primary-blue);
  box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.15);
}

.prepare-desc {
  color: #6b7280;
  margin-top: -0.25rem;
  margin-bottom: 1.25rem;
}

.prepare-actions {
  margin-top: 1.5rem;
  display: flex;
  gap: 0.8rem;
  justify-content: flex-end;
}

.prepare-actions .back {
  background: #6b7280;
  color: white;
}

.prepare-actions .start {
  background: #28a745;
  color: white;
}

/* 상단 헤더라인 */
.top-header {
  margin-bottom: 0.8rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e1e1e1;
}

/* 타이머 종류 선택 */
.timer-type-selector {
  display: flex;
  justify-content: flex-start;
  gap: 0.5rem;
}

.type-btn {
  padding: 0.8rem 1.5rem;
  border: 2px solid #e1e1e1;
  background: white;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  min-width: 100px;
  color: #333;
}

.type-btn:hover {
  border-color: var(--primary-blue);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(74, 144, 226, 0.2);
}

.type-btn.active {
  background: var(--primary-blue);
  color: white;
  border-color: var(--primary-blue);
}

/* 메인 타이머 영역 */
.timer-main {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3.5rem 0 4.5rem; /* 상단 논제 공간 + 하단바 여백 확보 */
  position: relative;
}

.timer-main.ssu-mode {
  justify-content: space-between;
  /* 좌/우 토론자 영역 고정폭 변수 (중앙 논제와 동기화) */
  --debater-width: 300px;
}

/* 전역(가운데 상단) 논제 표시 */
.debate-topic-global {
  position: absolute;
  top: 4rem;
  left: 0;
  right: 0;
  text-align: center;
  font-weight: 800;
  color: #1f2937;
  line-height: 1.25;
  font-size: 2rem;
  word-break: keep-all;
  pointer-events: none;
}

/* SSU 모드에서는 좌/우 아이콘 영역(220px) 사이만 차지 */
.timer-main.ssu-mode .debate-topic-global {
  left: var(--debater-width, 220px);
  right: var(--debater-width, 220px);
}

/* 토론자 그룹 */
.debaters-left,
.debaters-right {
  flex: 0 0 var(--debater-width, 220px);
  max-width: var(--debater-width, 220px);
}

.debater-group h3 {
  text-align: center;
  color: var(--primary-blue);
  margin-bottom: 1.2rem;
  font-size: 1.6rem;
  font-weight: 600;
}

.debater-icons {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  align-items: center;
}

.debater-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.debater-icon.highlight .avatar {
  outline: 4px solid #ffb703;
  box-shadow:
    0 0 0 8px rgba(255, 183, 3, 0.22),
    0 8px 22px rgba(255, 183, 3, 0.4);
}

.debater-icon.highlight .debater-label {
  color: #ff8f00;
  font-weight: 800;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90e2, #357abd);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
}

.avatar-icon {
  width: 38px;
  height: 38px;
  fill: rgba(255, 255, 255, 0.95);
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 1.5;
}

.debater-label {
  font-size: 1.05rem;
  color: #444;
  font-weight: 700;
}

/* 사용 횟수 표시 */
.usage-counters {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 3rem;
  padding: 0.5rem;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  border: 1px solid #e9ecef;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.counter-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.4rem;
  cursor: pointer;
  padding: 0.4rem;
  border-radius: 6px;
  transition: all 0.3s ease;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.counter-item:hover {
  background-color: rgba(74, 144, 226, 0.1);
  transform: translateY(-1px);
}

.counter-item h4 {
  font-size: 1rem;
  color: var(--primary-blue);
  margin: 0;
  font-weight: 600;
  text-align: center;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.counter-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.counter-dots {
  display: flex;
  gap: 0.6rem;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #ddd;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid #ccc;
  position: relative;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.dot::before {
  content: '';
  position: absolute;
  top: -6px;
  left: -6px;
  right: -6px;
  bottom: -6px;
  border-radius: 50%;
  background: transparent;
}

.dot:hover {
  transform: scale(1.2);
  border-color: var(--primary-blue);
}

.dot.active {
  background-color: var(--primary-blue);
  border-color: var(--primary-blue);
  box-shadow: 0 0 6px rgba(74, 144, 226, 0.5);
}

.counter-text {
  font-size: 0.7rem;
  color: #555;
  font-weight: 600;
  background: #f8f9fa;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 타이머 디스플레이 */
.timer-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 400px;
}

.step-buttons {
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 0.6rem;
  width: 100%;
  /* 상단바 확장에 맞춰 버튼 영역도 더 넓게 */
  max-width: min(1800px, 100vw - 2rem);
  margin: 0 auto;
}

.step-dot {
  appearance: none;
  border: 2px solid var(--primary-blue);
  background: white;
  color: var(--primary-blue);
  border-radius: 12px;
  font-weight: 800;
  font-size: 0.8rem;
  padding: 0.5rem 0;
  cursor: pointer;
  transition: all 0.2s ease;
}

.step-dot:hover {
  background: rgba(74, 144, 226, 0.08);
  transform: translateY(-1px);
}

.step-dot.active {
  background: var(--primary-blue);
  color: white;
}

.timer-circle {
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  box-shadow: 0 20px 40px rgba(74, 144, 226, 0.2);
  position: relative;
  overflow: hidden;
}

.timer-circle.cue-30s {
  animation: cuePulse 0.6s ease-in-out 0s 3;
  box-shadow:
    0 0 0 6px rgba(245, 158, 11, 0.35),
    0 20px 40px rgba(245, 158, 11, 0.25);
}

@keyframes cuePulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.04); }
  100% { transform: scale(1); }
}

/* 보충질의 오버레이 */
.supplement-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 3;
  display: flex;
  align-items: center;
  justify-content: center;
}

.supplement-box {
  background: rgba(255, 255, 255, 0.98);
  border: 3px solid var(--primary-blue);
  border-radius: 20px;
  padding: 1.2rem 1.6rem;
  text-align: center;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  transform: scale(1.08);
}

.supplement-label {
  color: var(--primary-blue);
  font-weight: 900;
  font-size: 1.2rem;
  margin-bottom: 0.3rem;
  letter-spacing: 0.02em;
}

.supplement-time {
  font-size: 3rem;
  font-weight: 900;
  color: #0b2239;
  font-family: 'Courier New', monospace;
  text-shadow: 0 2px 8px rgba(255, 255, 255, 0.45);
}

/* 개별 타이머 상단 텍스트는 전역 표시로 대체됨 */

.progress-ring {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.progress-svg {
  width: 300px;
  height: 300px;
  transform: rotate(-90deg) scaleY(-1);
}

.progress-ring-background {
  stroke: #e9ecef;
  stroke-width: 4;
}

.progress-ring-progress {
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.8s ease;
}

.timer-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.time-text {
  font-size: 4rem;
  font-weight: 700;
  color: var(--primary-blue);
  margin-bottom: 0.8rem;
  font-family: 'Courier New', monospace;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.timer-label {
  font-size: 1.4rem;
  color: #555;
  font-weight: 600;
  margin-bottom: 0.5rem;
  text-align: center;
  max-width: 240px;
  line-height: 1.3;
}

.step-indicator {
  font-size: 1rem;
  color: var(--primary-blue);
  font-weight: 700;
  background: rgba(74, 144, 226, 0.15);
  padding: 0.4rem 1rem;
  border-radius: 20px;
  border: 2px solid rgba(74, 144, 226, 0.3);
}

/* 타이머 컨트롤 */
.timer-controls {
  display: flex;
  flex-direction: column;
  gap: 2rem;
  justify-content: center;
  align-items: center;
}

.control-row {
  display: flex;
  gap: 0.8rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
}

.control-btn {
  padding: 0.8rem 1.2rem;
  border: none;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  justify-content: center;
}

.control-btn.play-pause {
  background: #28a745;
  color: white;
  min-width: 110px;
}

.control-btn.reset {
  background: #dc3545;
  color: white;
  min-width: 80px;
}

.control-btn.step-btn {
  background: var(--primary-blue);
  color: white;
  font-size: 0.8rem;
  padding: 0.6rem 1rem;
  min-width: 70px;
}

.control-btn.strategy {
  background: #007bff;
  color: white;
  min-width: 100px;
}

.control-btn.question {
  background: #f59e0b;
  color: white;
  min-width: 100px;
}

.control-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none;
}

.control-btn .icon {
  font-size: 0.9rem;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .timer-container {
    padding: 0.5rem;
  }

  .timer-main {
    min-height: calc(100vh - 180px);
  }

  .timer-main.ssu-mode {
    flex-direction: column;
    gap: 1.5rem;
  }

  .debaters-left,
  .debaters-right {
    max-width: none;
  }

  .debater-icons {
    flex-direction: row;
    justify-content: center;
    gap: 2rem;
  }

  /* 모바일에서 아바타 과도 확대 방지 */
  .avatar {
    width: 56px;
    height: 56px;
  }
  .avatar-icon {
    width: 30px;
    height: 30px;
  }

  .timer-circle {
    width: 260px;
    height: 260px;
  }

  .debate-topic {
    top: 6px;
    max-width: 85%;
    font-size: 0.85rem;
  }

  .time-text {
    font-size: 3.5rem;
  }

  .timer-label {
    font-size: 1.1rem;
    max-width: 200px;
  }

  .step-indicator {
    font-size: 0.9rem;
    padding: 0.3rem 0.8rem;
  }

  .progress-svg {
    width: 260px;
    height: 260px;
  }

  .timer-controls {
    gap: 2rem;
  }

  .control-row {
    gap: 0.5rem;
  }

  .control-btn {
    padding: 0.7rem 1rem;
    font-size: 0.8rem;
  }

  .control-btn.play-pause {
    min-width: 100px;
  }

  .control-btn.reset {
    min-width: 70px;
  }

  .control-btn.step-btn {
    min-width: 60px;
    padding: 0.5rem 0.8rem;
  }

  .control-btn.strategy {
    min-width: 80px;
  }

  .bottom-bar {
    padding-bottom: env(safe-area-inset-bottom);
  }

  /* 모바일에서 사용 횟수 표시 최적화 */
  .usage-counters {
    margin-top: 0.6rem;
    padding: 0.5rem;
    gap: 0.6rem;
  }

  .counter-item {
    padding: 0.4rem;
  }

  .counter-item h4 {
    font-size: 1rem;
  }

  .counter-display {
    gap: 0.5rem;
  }

  .dot {
    width: 12px;
    height: 12px;
  }

  .counter-text {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
  }

  /* 토론자 그룹 모바일 레이아웃 */
  .debater-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
  }

  .debater-group h3 {
    margin-bottom: 0.5rem;
  }
}

/* 하단 고정 바 */
.bottom-bar {
  position: sticky;
  left: 0;
  right: 0;
  bottom: 0;
  background: #fff;
  border-top: 1px solid #e5e7eb;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: center;
}

.finish-btn {
  background: #dc3545;
  color: white;
  border: none;
  border-radius: 10px;
  padding: 0.9rem 1.4rem;
  font-weight: 700;
  cursor: pointer;
}

.finish-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(220, 53, 69, 0.3);
}
</style>
