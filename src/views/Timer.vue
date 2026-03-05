<template>
  <div class="timer-page">
    <div class="timer-container">
      <!-- 모드 선택 화면 -->
      <div v-if="stage === 'select'" class="mode-select">
        <div class="stage-title-wrap">
          <p class="stage-kicker">Timer Studio</p>
          <h2 class="select-title">타이머를 선택하세요</h2>
          <p class="select-subtitle">
            16:9 화면 발표 환경에 최적화된 토론 타이머입니다.
            <br />
            토론 유형을 선택하면 단계별 시간을 세부 조정할 수 있습니다.
          </p>
        </div>
        <div class="mode-card-grid">
          <button class="mode-card free" @click="handleSelectMode('free')">
            <div class="mode-card-head">
              <div class="mode-card-title">자유토론</div>
              <span class="mode-chip">CEDA</span>
            </div>
            <div class="mode-card-desc">주요 발언 후 자유 토론 단계에서 듀얼 타이머를 사용합니다.</div>
            <ul class="mode-features">
              <li>단계별 시간 커스텀</li>
              <li>자유토론 듀얼 전환</li>
              <li>대회형 진행에 적합</li>
            </ul>
          </button>
          <button class="mode-card ssu" @click="handleSelectMode('ssu')">
            <div class="mode-card-head">
              <div class="mode-card-title">SSU토론</div>
              <span class="mode-chip">SSU</span>
            </div>
            <div class="mode-card-desc">10단계 진행형 구조와 발언자/작전타임 카운터를 제공합니다.</div>
            <ul class="mode-features">
              <li>발언자 하이라이트</li>
              <li>보충질의/작전타임</li>
              <li>대규모 발표에 최적화</li>
            </ul>
          </button>
        </div>
      </div>

      <!-- 준비(설정) 화면 -->
      <div v-else-if="stage === 'prepare'" class="prepare-container">
        <div class="prepare-header">
          <div>
            <h2 class="select-title">준비 단계 - 시간 설정</h2>
            <p class="prepare-desc">각 단계의 시간을 분/초 단위로 조정한 뒤 시작하세요.</p>
          </div>
          <div class="prepare-meta">
            <span class="prepare-chip">{{ selectedMode === 'free' ? '자유토론' : 'SSU토론' }}</span>
            <span class="prepare-chip">{{ preparePhases.length }}개 단계</span>
          </div>
        </div>

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

        <!-- SSU 전용: 토론자 입력 옵션 -->
        <div v-if="selectedMode === 'ssu'" class="debater-input-option">
          <label class="debater-input-checkbox">
            <input type="checkbox" v-model="enableDebaterInput" />
            토론자 입력
          </label>

          <div v-if="enableDebaterInput" class="debater-inputs">
            <!-- 긍정: 상단, 2열 -->
            <div class="debater-side">
              <h4>긍정</h4>
              <div class="debater-input-row">
                <input
                  v-for="idx in 3"
                  :key="`pos-name-${idx}`"
                  class="debater-name-input"
                  type="text"
                  v-model="debaterNames.positive[idx - 1]"
                  :placeholder="`토론자 ${idx}`"
                />
              </div>
            </div>

            <!-- 부정: 하단, 2열 -->
            <div class="debater-side">
              <h4>부정</h4>
              <div class="debater-input-row">
                <input
                  v-for="idx in 3"
                  :key="`neg-name-${idx}`"
                  class="debater-name-input"
                  type="text"
                  v-model="debaterNames.negative[idx - 1]"
                  :placeholder="`토론자 ${idx}`"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="prepare-actions">
          <button class="control-btn back" @click="backToSelection">뒤로</button>
          <button class="control-btn start" @click="startDebate">시작</button>
        </div>
      </div>

      <!-- 공통 단계 상단바 (SSU/자유 공용) -->
      <div v-if="stage === 'run'" class="step-topbar">
        <div
          class="step-buttons"
          :style="{ gridTemplateColumns: `repeat(${activeSteps.length}, 1fr)` }"
        >
          <button
            v-for="(step, i) in activeSteps"
            :key="`topbar-step-${i}`"
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
      <div
        v-if="stage === 'run'"
        class="timer-main"
        :class="{
          'ssu-mode': isSsuMode,
          'free-dual': isFreeMode && isDualPhase,
        }"
      >
        <div v-if="showDebateTopicGlobal" class="debate-topic-global">
          {{ debateTopic }}
        </div>
        <div v-if="showDebateTopicBar" class="debate-topic-bar">
          {{ debateTopic }}
        </div>
        <!-- 왼쪽 토론자들 (SSU 모드에서만 표시) -->
        <div v-if="isSsuMode" class="debaters-left">
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
                <span class="debater-label">{{ getDebaterLabel('positive', i) }}</span>
              </div>
            </div>

            <!-- 사용 횟수 표시 -->
            <div class="usage-counters">
              <!-- 보충질의 -->
              <div class="counter-item">
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
                  <div class="counter-arrows">
                    <button class="arrow-btn up" @click.stop="incrementSupplement('positive')">▲</button>
                    <button class="arrow-btn down" @click.stop="decrementSupplement('positive')">▼</button>
                  </div>
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

        <!-- 가운데 타이머 (자유토론의 '자유 토론' 단계가 아닌 경우 표시) -->
        <div v-if="showCenterTimer" class="timer-display">
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
                      : currentStepInfo?.title
                }}
              </div>
            </div>
          </div>

          <!-- 타이머 컨트롤 -->
          <div class="timer-controls">
            <div class="control-row main">
              <!-- 단계 버튼: SSU/자유(CEDA) 모두 표시. 자유토론의 '자유 토론' 단계에서는 숨김 -->
              <button
                v-if="showStepButtons"
                class="control-btn step-btn"
                @click="previousStep"
                :disabled="currentStep === 0"
              >
                ← 이전
              </button>

              <button
                v-if="showCenterTimer"
                class="control-btn play-pause"
                @click="toggleTimer"
                :disabled="isSupplementTime"
              >
                <i class="icon">{{ isRunning ? '⏸️' : '▶️' }}</i>
                {{ isRunning ? '일시정지' : '시작' }}
              </button>

              <!-- 단계 버튼: SSU/자유(CEDA) 모두 표시. 자유토론의 '자유 토론' 단계에서는 숨김 -->
              <button
                v-if="showStepButtons"
                class="control-btn step-btn"
                @click="nextStep"
                :disabled="
                  currentStep === (timerType === 'ssu' ? ssuSteps.length - 1 : cedaSteps.length - 1)
                "
              >
                다음 →
              </button>
            </div>
              <div
                class="control-row secondary"
                v-if="timerType === 'ssu' && showCenterTimer && !isSupplementTime && !isStrategyTime"
              >
                <button
                  class="control-btn question"
                  @click="handleStartSupplement"
                  :disabled="!isRunning || isIntroCrossExamStep"
                >
                  보충질의
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

        <!-- 자유토론 '자유 토론' 단계: 듀얼 사각형 타이머 -->
        <div v-else class="dual-timers">
          <div
            class="rect-timer positive"
            :class="{ active: isDualPositiveRunning }"
            @click="toggleDualTimer('positive')"
          >
            <div class="rect-title">긍정</div>
            <div class="rect-time">{{ formatTime(dualPositiveTime) }}</div>
            <div class="sub-timer" :class="{ warning: dualPositiveSubRemaining <= 10 }">
              <!-- <span class="sub-label">연속 발언 제한</span> -->
              <span class="sub-time">{{ formatTime(dualPositiveSubRemaining) }}</span>
            </div>
            <div class="rect-controls">
              <button class="control-btn play-pause" @click.stop="toggleDualTimer('positive')">
                <i class="icon">{{ isDualPositiveRunning ? '⏸️' : '▶️' }}</i>
                {{ isDualPositiveRunning ? '일시정지' : '시작' }}
              </button>
              <button class="control-btn edit" @click.stop="openAdjustModal('positive')">
                수정
              </button>
            </div>
          </div>
          <div
            class="rect-timer negative"
            :class="{ active: isDualNegativeRunning }"
            @click="toggleDualTimer('negative')"
          >
            <div class="rect-title">부정</div>
            <div class="rect-time">{{ formatTime(dualNegativeTime) }}</div>
            <div class="sub-timer" :class="{ warning: dualNegativeSubRemaining <= 10 }">
              <!-- <span class="sub-label">연속 발언 제한</span> -->
              <span class="sub-time">{{ formatTime(dualNegativeSubRemaining) }}</span>
            </div>
            <div class="rect-controls">
              <button class="control-btn play-pause" @click.stop="toggleDualTimer('negative')">
                <i class="icon">{{ isDualNegativeRunning ? '⏸️' : '▶️' }}</i>
                {{ isDualNegativeRunning ? '일시정지' : '시작' }}
              </button>
              <button class="control-btn edit" @click.stop="openAdjustModal('negative')">
                수정
              </button>
            </div>
          </div>
        </div>

        <!-- 시간 수정 팝업 -->
        <div v-if="showAdjustModal" class="adjust-modal-backdrop" @click="closeAdjustModal">
          <div class="adjust-modal" @click.stop>
            <div class="adjust-title">시간 수정</div>
            <div class="adjust-actions">
              <button class="control-btn edit" @click="adjustDualTime(5)">+5초</button>
              <button class="control-btn edit" @click="adjustDualTime(-5)">-5초</button>
            </div>
            <button class="control-btn step-btn" @click="closeAdjustModal">닫기</button>
          </div>
        </div>

        <!-- 오른쪽 토론자들 (SSU 모드에서만 표시) -->
        <div v-if="isSsuMode" class="debaters-right">
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
                <span class="debater-label">{{ getDebaterLabel('negative', i) }}</span>
              </div>
            </div>

            <!-- 사용 횟수 표시 -->
            <div class="usage-counters">
              <!-- 보충질의 -->
              <div class="counter-item">
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
                  <div class="counter-arrows">
                    <button class="arrow-btn up" @click.stop="incrementSupplement('negative')">▲</button>
                    <button class="arrow-btn down" @click.stop="decrementSupplement('negative')">▼</button>
                  </div>
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
import { ref, reactive, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useSSUTimer, defaultCEDASteps } from '@/lib/timer'
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

  // 계산된 값
  currentStepInfo,
  ssuSteps,
  activeSpeakers,
  cedaSteps,
  activeSteps,
  isCedaFreeDebateStep,

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
  setCEDAStepDurations,
  supplementRemaining,
  thirtySecondCueActive,
  // 듀얼 타이머
  dualPositiveTime,
  dualNegativeTime,
  isDualPositiveRunning,
  isDualNegativeRunning,
  dualPositiveSubRemaining,
  dualNegativeSubRemaining,
  toggleDualTimer,
  resetDualTimer,
} = useSSUTimer()

// 원형 프로그레스 계산 (컨테이너 300px, stroke 4px → r = 150 - 2 = 148)
const circumference = 2 * Math.PI * 148

const progressOffset = computed(() => {
  let maxTime = 600
  if (isStrategyTime.value) {
    maxTime = 60
  } else if (currentStepInfo.value) {
    maxTime = currentStepInfo.value.duration
  }
  const progress = Math.max(0, Math.min(1, currentTime.value / maxTime))
  return circumference * (1 - progress)
})

// 화면 단계 관리
const stage = ref<'select' | 'prepare' | 'run'>('select')
const selectedMode = ref<null | 'free' | 'ssu'>(null)

type PreparePhase = { name: string; duration: number } // duration in seconds
const preparePhases = ref<PreparePhase[]>([])
// 각 실제 단계가 어떤 그룹(양측 통합 단계)에 속하는지 보관
const prepareStepGroups = ref<string[]>([])

// 논제 입력
const debateTopic = ref<string>('')

// 토론자 입력 옵션 및 이름 상태 (기본 비활성)
const enableDebaterInput = ref<boolean>(false)
const debaterNames = reactive<{ positive: string[]; negative: string[] }>({
  positive: ['', '', ''],
  negative: ['', '', ''],
})

function getDebaterLabel(side: 'positive' | 'negative', index1Based: number): string {
  const arr = debaterNames[side]
  const name = arr[index1Based - 1]?.trim()
  if (!enableDebaterInput.value || !name) return `토론자 ${index1Based}`
  return name
}

// === 뷰 전용 컴퓨티드 (조건 단순화) ===
const isSsuMode = computed(() => timerType.value === 'ssu')
const isFreeMode = computed(() => timerType.value === 'free')
const isDualPhase = computed(() => isCedaFreeDebateStep.value)
const showCenterTimer = computed(() => !(isFreeMode.value && isDualPhase.value))
const showDebateTopicGlobal = computed(() => !!debateTopic.value && !isFreeMode.value)
const showDebateTopicBar = computed(() => !!debateTopic.value && isFreeMode.value)
const showStepButtons = computed(
  () =>
    (isSsuMode.value || isFreeMode.value) &&
    !isStrategyTime.value &&
    !isSupplementTime.value &&
    showCenterTimer.value,
)

// SSU 'NN 교차조사' 단계에서는 보충질의 버튼 비활성화
const isIntroCrossExamStep = computed(() => {
  if (timerType.value !== 'ssu') return false
  const title = currentStepInfo.value?.title || ''
  return title.includes('교차조사')
})

// 듀얼 타이머 시간 수정 팝업 상태 및 로직
const showAdjustModal = ref(false)
const adjustTargetSide = ref<null | 'positive' | 'negative'>(null)

const openAdjustModal = (side: 'positive' | 'negative') => {
  adjustTargetSide.value = side
  showAdjustModal.value = true
}

const closeAdjustModal = () => {
  showAdjustModal.value = false
  adjustTargetSide.value = null
}

const adjustDualTime = (deltaSeconds: number) => {
  if (!isCedaFreeDebateStep.value) return
  const side = adjustTargetSide.value
  if (!side) return
  const isPos = side === 'positive'
  const timeRef = isPos ? dualPositiveTime : dualNegativeTime
  const isRunningSide = isPos ? isDualPositiveRunning.value : isDualNegativeRunning.value
  const maxStep = currentStepInfo.value?.duration ?? 0
  let next = timeRef.value + deltaSeconds
  next = Math.max(0, Math.min(maxStep, next))
  // 시간이 0이 되면 즉시 해당 측을 정지시켜 음수 표시 방지
  if (next === 0 && isRunningSide) {
    toggleDualTimer(side)
  }
  timeRef.value = next
  closeAdjustModal()
}

const handleSelectMode = (mode: 'free' | 'ssu') => {
  selectedMode.value = mode
  const sourceSteps =
    mode === 'free'
      ? defaultCEDASteps.map((s) => ({ title: s.title, duration: s.duration }))
      : ssuSteps.value.map((s) => ({ title: s.title, duration: s.duration }))

  // 단계명 정규화: '긍정 ', '부정 ' 접두어 제거하여 양측 동일 단계로 그룹화
  const normalizeStepTitle = (title: string) => title.replace(/^긍정\s+|^부정\s+/, '').trim()

  const seen = new Set<string>()
  const grouped: PreparePhase[] = []
  const groupsPerStep: string[] = []
  for (const step of sourceSteps) {
    const norm = normalizeStepTitle(step.title)
    groupsPerStep.push(norm)
    if (!seen.has(norm)) {
      seen.add(norm)
      grouped.push({ name: norm, duration: Math.max(1, step.duration) })
    }
  }
  preparePhases.value = grouped
  prepareStepGroups.value = groupsPerStep
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
  // 그룹(양측 통합 단계) → 전체 단계로 확장 적용
  const groupDurationMap: Record<string, number> = {}
  preparePhases.value.forEach((p) => {
    groupDurationMap[p.name] = Math.max(1, p.duration)
  })

  if (selectedMode.value === 'free') {
    // CEDA 전체 단계 수에 맞게 그룹 시간을 펼쳐서 적용
    const durationsSeconds = prepareStepGroups.value.map((g) => groupDurationMap[g] ?? 60)
    setCEDAStepDurations(durationsSeconds)
    selectTimerType('free')
  } else {
    const durationsSeconds = prepareStepGroups.value.map((g) => groupDurationMap[g] ?? 60)
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

// 보충질의 카운터 증감
const incrementSupplement = (side: 'positive' | 'negative') => {
  const current = usageCounters[side].supplementaryQuestion
  usageCounters[side].supplementaryQuestion = Math.min(3, current + 1)
}
const decrementSupplement = (side: 'positive' | 'negative') => {
  const current = usageCounters[side].supplementaryQuestion
  usageCounters[side].supplementaryQuestion = Math.max(0, current - 1)
}

// 보충질의 시작 버튼
const handleStartSupplement = () => {
  if (timerType.value !== 'ssu') return
  if (!isRunning.value) return
  if (isIntroCrossExamStep.value) return
  if (isStrategyTime.value || isSupplementTime.value) return
  startSupplementTime()
}

// ====== 키보드 조작: 듀얼 타이머에서 좌/우 화살표로 발언 전환 ======
const handleKeydown = (e: KeyboardEvent) => {
  // 실행 단계가 아니거나 듀얼 단계가 아니면 무시
  if (stage.value !== 'run' || !isCedaFreeDebateStep.value) return
  // 입력 포커스가 입력창일 경우 방해하지 않음
  const target = e.target as HTMLElement | null
  if (target && ['INPUT', 'TEXTAREA'].includes(target.tagName)) return

  if (e.key === 'ArrowLeft') {
    e.preventDefault()
    // 긍정측이 이미 진행 중이면 유지, 아니면 시작(반대측은 자동 일시정지)
    if (!isDualPositiveRunning.value) toggleDualTimer('positive')
  } else if (e.key === 'ArrowRight') {
    e.preventDefault()
    // 부정측이 이미 진행 중이면 유지, 아니면 시작(반대측은 자동 일시정지)
    if (!isDualNegativeRunning.value) toggleDualTimer('negative')
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
})

// === 상단바에서 타이머 버튼 재클릭 시 강제 랜딩 이동 처리 ===
const route = useRoute()
const router = useRouter()
const handleResetFromQuery = () => {
  const reset = route.query.reset
  if (reset === '1') {
    selectedMode.value = null
    stage.value = 'select'
    returnToSelection()
    // 쿼리 정리 (같은 페이지 내 반복 클릭 시 깔끔하게 유지)
    router.replace({ path: '/timer' })
  }
}

// 동일 라우트 내 재클릭을 위해 timestamp 쿼리를 트리거로 사용
watch(
  () => route.query.ts,
  () => handleResetFromQuery(),
  { immediate: true },
)
</script>

<style scoped>
.timer-page {
  --timer-bg-1: #f5f9ff;
  --timer-bg-2: #edf3ff;
  --timer-surface: #ffffff;
  --timer-surface-muted: #f7faff;
  --timer-border: #d9e6fb;
  --timer-border-strong: #b5cdef;
  --timer-text: #0f2947;
  --timer-subtext: #466387;
  --timer-accent: #1f5fa7;
  --timer-accent-2: #0e8577;
  --timer-danger: #d14343;
}

.timer-page {
  min-height: 100vh;
  background:
    radial-gradient(circle at 0% 0%, rgba(67, 123, 201, 0.17), transparent 34%),
    radial-gradient(circle at 100% 100%, rgba(40, 142, 127, 0.12), transparent 30%),
    linear-gradient(155deg, var(--timer-bg-1), var(--timer-bg-2));
  display: flex;
  align-items: stretch;
  justify-content: center;
  overflow-x: hidden;
}

.timer-container {
  width: 100%;
  max-width: 1920px;
  padding: 0.9rem 1.1rem 0;
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

.stage-title-wrap {
  text-align: center;
  margin-bottom: 0.4rem;
}

.stage-kicker {
  margin: 0 0 0.45rem;
  color: #4573a6;
  letter-spacing: 0.08em;
  font-size: 0.84rem;
  font-weight: 700;
  text-transform: uppercase;
}

.select-title {
  margin: 0;
  color: var(--timer-text);
  font-size: clamp(1.7rem, 2.2vw, 2.3rem);
  font-weight: 900;
  letter-spacing: -0.01em;
}

.select-subtitle {
  margin: 0.8rem 0 0;
  color: var(--timer-subtext);
  line-height: 1.58;
  font-size: clamp(0.96rem, 1.1vw, 1.13rem);
}

.mode-select {
  max-width: 1240px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1.15rem;
  padding-top: min(8vh, 5.2rem);
}

.mode-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: clamp(0.8rem, 2vw, 1.3rem);
}

.mode-card {
  border: 1px solid var(--timer-border);
  background: linear-gradient(150deg, #fff, #f8fbff);
  border-radius: 20px;
  padding: 1.25rem 1.25rem 1.1rem;
  cursor: pointer;
  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease,
    border-color 0.18s ease;
  text-align: left;
  box-shadow: 0 10px 26px rgba(25, 86, 160, 0.08);
}

.mode-card.free {
  border-top: 4px solid #2f6eb6;
}

.mode-card.ssu {
  border-top: 4px solid #19897f;
}

.mode-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 34px rgba(22, 76, 139, 0.16);
  border-color: var(--timer-border-strong);
}

.mode-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.6rem;
}

.mode-card-title {
  font-size: clamp(1.2rem, 1.5vw, 1.45rem);
  font-weight: 900;
  color: #0f2a4a;
}

.mode-chip {
  height: 24px;
  border-radius: 999px;
  padding: 0 0.55rem;
  background: #e8f1ff;
  color: #2a5f9d;
  font-size: 0.74rem;
  font-weight: 800;
  border: 1px solid #bfd5f1;
  display: inline-flex;
  align-items: center;
}

.mode-card.ssu .mode-chip {
  background: #e9f8f4;
  color: #18645b;
  border-color: #bde3d9;
}

.mode-card-desc {
  margin-top: 0.55rem;
  color: #4d6786;
  font-size: 0.97rem;
  line-height: 1.5;
}

.mode-features {
  margin: 0.8rem 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.38rem;
}

.mode-features li {
  color: #446482;
  font-size: 0.89rem;
  line-height: 1.35;
}

.mode-features li::before {
  content: '•';
  margin-right: 0.45rem;
  color: #2e71bd;
}

.prepare-container {
  width: min(1560px, 100%);
  margin: 0 auto;
  background: linear-gradient(145deg, #ffffff, #f7fbff);
  border: 1px solid var(--timer-border);
  border-radius: 20px;
  box-shadow: 0 14px 34px rgba(23, 90, 161, 0.1);
  padding: clamp(1rem, 2.5vw, 1.6rem);
}

.prepare-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.9rem;
}

.prepare-desc {
  margin: 0.55rem 0 0;
  color: #4a6686;
  font-size: 1rem;
}

.prepare-meta {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.prepare-chip {
  height: 30px;
  border-radius: 999px;
  padding: 0 0.8rem;
  display: inline-flex;
  align-items: center;
  background: #e8f2ff;
  border: 1px solid #bfd5f1;
  color: #2b619f;
  font-size: 0.83rem;
  font-weight: 800;
  white-space: nowrap;
}

.topic-input {
  margin: 1rem 0 0.4rem;
  display: grid;
  gap: 0.42rem;
}

.topic-label {
  color: #31547c;
  font-weight: 800;
  font-size: 0.88rem;
}

.topic-text-input {
  height: 48px;
  padding: 0 0.8rem;
  border: 1px solid #cadcf4;
  border-radius: 12px;
  background: #fafdff;
  font-size: 1rem;
}

.topic-text-input:focus {
  outline: none;
  border-color: #74a3da;
  box-shadow: 0 0 0 3px rgba(79, 140, 211, 0.18);
}

.debater-input-option {
  margin-top: 1rem;
  border: 1px solid #d2e3f7;
  border-radius: 14px;
  background: #f8fbff;
  padding: 0.95rem;
}

.debater-input-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 800;
  color: #335b84;
}

.debater-inputs {
  margin-top: 0.9rem;
  display: grid;
  gap: 0.85rem;
}

.debater-side h4 {
  margin: 0 0 0.45rem;
  color: #2d5e9a;
  font-size: 0.94rem;
}

.debater-input-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
}

.debater-name-input {
  height: 40px;
  border: 1px solid #cadcf4;
  border-radius: 10px;
  padding: 0 0.65rem;
  font-size: 0.9rem;
}

.prepare-actions {
  margin-top: 1rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.55rem;
}

.prepare-actions .back {
  background: #4f637b;
  color: #fff;
}

.prepare-actions .start {
  background: linear-gradient(135deg, #1c8b67, #1f6f9f);
  color: #fff;
}

.step-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  padding: 0.62rem 1rem;
  display: flex;
  justify-content: center;
  backdrop-filter: blur(8px);
  background: rgba(16, 39, 68, 0.84);
  border-bottom: 1px solid rgba(180, 207, 242, 0.2);
}

.step-buttons {
  display: inline-grid;
  gap: 0.35rem;
  width: min(1780px, calc(100vw - 2rem));
}

.step-dot {
  appearance: none;
  border: 1px solid rgba(196, 216, 244, 0.36);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(235, 243, 255, 0.88);
  border-radius: 11px;
  font-weight: 700;
  font-size: clamp(0.8rem, 1vw, 1rem);
  padding: 0.44rem 0.3rem;
  cursor: pointer;
  transition: all 0.16s ease;
}

.step-dot:hover {
  background: rgba(255, 255, 255, 0.18);
}

.step-dot.active {
  background: #f8fbff;
  color: #0f3159;
  border-color: #f8fbff;
}

.timer-main {
  position: relative;
  width: 100%;
  padding: 2.4rem 0.45rem 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.timer-main.ssu-mode {
  --debater-width: clamp(280px, 18.5vw, 370px);
  display: grid;
  grid-template-columns: var(--debater-width) minmax(620px, 1fr) var(--debater-width);
  gap: clamp(0.7rem, 1.2vw, 1.4rem);
  align-items: stretch;
}

.timer-main:not(.ssu-mode) {
  flex-direction: column;
  align-items: stretch;
}

.timer-main.free-dual {
  align-items: stretch;
  justify-content: flex-start;
}

.timer-main.ssu-mode .debate-topic-global {
  left: calc(var(--debater-width) + 1rem);
  right: calc(var(--debater-width) + 1rem);
}

.debate-topic-global {
  position: absolute;
  top: 0.35rem;
  left: 0;
  right: 0;
  text-align: center;
  font-weight: 900;
  color: #173b63;
  line-height: 1.24;
  font-size: clamp(1.6rem, 2.8vw, 2.95rem);
  letter-spacing: -0.015em;
  padding: 0 1rem;
  pointer-events: none;
}

.debate-topic-bar {
  margin: 0 auto 0.9rem;
  width: min(980px, 100%);
  text-align: center;
  font-weight: 900;
  color: #163b62;
  font-size: clamp(1.2rem, 1.9vw, 2rem);
  line-height: 1.3;
  padding: 0.68rem 0.8rem;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--timer-border);
  border-radius: 14px;
}

.debaters-left,
.debaters-right {
  border: 1px solid var(--timer-border);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.86);
  box-shadow: 0 10px 22px rgba(27, 90, 161, 0.08);
  padding: 0.8rem;
}

.debater-group h3 {
  margin: 0 0 0.72rem;
  text-align: center;
  color: #24588f;
  font-size: clamp(1.05rem, 1.2vw, 1.45rem);
  font-weight: 900;
}

.debater-icons {
  display: grid;
  gap: 0.92rem;
  justify-items: center;
}

.debater-icon {
  display: grid;
  justify-items: center;
  gap: 0.34rem;
}

.avatar {
  width: clamp(70px, 5.6vw, 102px);
  height: clamp(70px, 5.6vw, 102px);
  border-radius: 50%;
  background: linear-gradient(135deg, #2f72b7, #1f5fa7);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 18px rgba(47, 114, 183, 0.28);
}

.avatar-icon {
  width: 56%;
  height: 56%;
  fill: rgba(255, 255, 255, 0.95);
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 1.4;
}

.debater-icon.highlight .avatar {
  outline: 4px solid #f4b63e;
  box-shadow:
    0 0 0 8px rgba(244, 182, 62, 0.2),
    0 10px 22px rgba(236, 163, 19, 0.36);
}

.debater-label {
  color: #274f7d;
  font-size: clamp(0.95rem, 1vw, 1.2rem);
  font-weight: 800;
}

.debater-icon.highlight .debater-label {
  color: #cf7c00;
}

.usage-counters {
  margin-top: 0.82rem;
  border: 1px solid #d6e5f8;
  border-radius: 10px;
  background: #f9fcff;
  padding: 0.5rem;
  display: grid;
  gap: 0.46rem;
}

.counter-item {
  border-radius: 8px;
  padding: 0.34rem;
  display: grid;
  justify-items: center;
  gap: 0.34rem;
  cursor: pointer;
}

.counter-item:hover {
  background: rgba(52, 117, 190, 0.08);
}

.counter-item h4 {
  margin: 0;
  color: #2b5c93;
  font-size: 0.9rem;
  font-weight: 800;
}

.counter-display {
  display: flex;
  align-items: center;
  gap: 0.34rem;
}

.counter-dots {
  display: flex;
  gap: 0.32rem;
}

.dot {
  width: 15px;
  height: 15px;
  border-radius: 50%;
  background: #d5e0ed;
  border: 2px solid #c0d0e3;
}

.dot.active {
  background: #3a79bc;
  border-color: #3a79bc;
}

.counter-text {
  border-radius: 6px;
  padding: 0.12rem 0.33rem;
  background: #edf4fb;
  color: #355b84;
  font-size: 0.79rem;
  font-weight: 800;
}

.counter-arrows {
  display: grid;
  gap: 2px;
}

.arrow-btn {
  border: 1px solid #c6d8ef;
  background: #fff;
  color: #284f7b;
  border-radius: 4px;
  padding: 0.04rem 0.22rem;
  cursor: pointer;
  font-size: 0.66rem;
}

.timer-display {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 1.1rem;
}

.timer-circle {
  width: clamp(430px, 36vw, 640px);
  height: clamp(430px, 36vw, 640px);
  border-radius: 50%;
  background: #fff;
  border: 1px solid #d4e3f9;
  box-shadow: 0 24px 48px rgba(30, 93, 165, 0.2);
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.timer-circle.cue-30s {
  animation: cuePulse 0.62s ease-in-out 0s 3;
  box-shadow:
    0 0 0 7px rgba(245, 158, 11, 0.32),
    0 24px 48px rgba(245, 158, 11, 0.24);
}

@keyframes cuePulse {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.03);
  }
  100% {
    transform: scale(1);
  }
}

.progress-ring {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.progress-svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg) scaleY(-1);
}

.progress-ring-background {
  stroke: #e8eef7;
  stroke-width: 8;
}

.progress-ring-progress {
  stroke-width: 8;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.85s ease;
}

.timer-content {
  z-index: 2;
  display: grid;
  justify-items: center;
}

.time-text {
  color: #14497f;
  font-size: clamp(5rem, 8vw, 8.8rem);
  font-weight: 900;
  line-height: 0.95;
  letter-spacing: -0.02em;
  text-shadow: 0 5px 14px rgba(20, 73, 127, 0.13);
}

.timer-label {
  margin-top: 0.6rem;
  max-width: min(540px, 80vw);
  color: #3f6187;
  font-size: clamp(1.25rem, 2vw, 2.2rem);
  font-weight: 800;
  text-align: center;
  line-height: 1.28;
}

.supplement-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  background: rgba(12, 22, 39, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
}

.supplement-box {
  border: 3px solid #71a6de;
  border-radius: 20px;
  padding: 1.1rem 1.5rem;
  text-align: center;
  background: #fff;
  box-shadow: 0 16px 42px rgba(0, 0, 0, 0.36);
}

.supplement-label {
  color: #225b98;
  font-size: 1.16rem;
  font-weight: 900;
}

.supplement-time {
  margin-top: 0.2rem;
  color: #0f3259;
  font-size: clamp(2.4rem, 3.5vw, 3.8rem);
  font-weight: 900;
}

.timer-controls {
  width: min(900px, 100%);
  display: grid;
  gap: 0.75rem;
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.control-btn {
  height: 50px;
  border: none;
  border-radius: 11px;
  padding: 0 1rem;
  font-size: clamp(0.88rem, 1vw, 1.08rem);
  font-weight: 800;
  letter-spacing: 0.01em;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.34rem;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    filter 0.15s ease;
}

.control-btn.play-pause {
  background: linear-gradient(135deg, #189a74, #1d6da0);
  color: #fff;
  min-width: 142px;
}

.control-btn.step-btn {
  background: #2e6eb4;
  color: #fff;
  min-width: 108px;
}

.control-btn.question {
  background: #e9a322;
  color: #fff;
  min-width: 128px;
}

.control-btn.strategy {
  background: #225c94;
  color: #fff;
  min-width: 128px;
}

.control-btn.edit {
  background: #4e5f75;
  color: #fff;
  min-width: 92px;
}

.control-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(18, 57, 98, 0.24);
}

.control-btn:disabled {
  opacity: 0.48;
  cursor: not-allowed;
}

.control-btn .icon {
  font-size: 1.08em;
}

.dual-timers {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(0.8rem, 1.2vw, 1.25rem);
}

.rect-timer {
  border: 1px solid #d7e5f8;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 18px 36px rgba(20, 67, 122, 0.14);
  padding: clamp(1rem, 2vw, 1.5rem) 1.1rem;
  display: grid;
  justify-items: center;
  align-content: center;
}

.rect-timer.positive {
  border-top: 4px solid #2f6eb6;
}

.rect-timer.negative {
  border-top: 4px solid #d94e4e;
}

.rect-timer.active {
  box-shadow:
    0 20px 42px rgba(22, 74, 133, 0.24),
    0 0 0 4px rgba(70, 132, 203, 0.12);
}

.rect-title {
  color: #234c79;
  font-size: clamp(1.2rem, 1.5vw, 1.6rem);
  font-weight: 900;
}

.rect-time {
  margin: 0.5rem 0 0.3rem;
  color: #0f3f6f;
  font-size: clamp(4.2rem, 7vw, 7.7rem);
  line-height: 0.92;
  font-weight: 900;
  letter-spacing: -0.025em;
}

.sub-timer {
  margin: 0.6rem 0 1.1rem;
  border-radius: 10px;
  border: 1px dashed #d7e1ee;
  background: #f8fbff;
  padding: 0.35rem 0.6rem;
  color: #476486;
}

.sub-timer.warning {
  border-color: #f6b761;
  color: #9f4f04;
  background: #fff5e8;
}

.sub-time {
  font-size: clamp(2rem, 3vw, 3rem);
  font-weight: 800;
}

.rect-controls {
  display: flex;
  justify-content: center;
  gap: 0.55rem;
}

.bottom-bar {
  position: sticky;
  bottom: 0;
  z-index: 8;
  width: 100vw;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  padding: 0.62rem 1rem calc(0.62rem + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
  background: rgba(15, 36, 63, 0.84);
  border-top: 1px solid rgba(200, 220, 247, 0.28);
}

.finish-btn {
  border: none;
  border-radius: 12px;
  min-width: 154px;
  height: 48px;
  padding: 0 1.2rem;
  color: #fff;
  background: linear-gradient(135deg, #d84b4b, #b83f3f);
  font-weight: 900;
  font-size: 1rem;
  cursor: pointer;
}

.finish-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(216, 75, 75, 0.34);
}

.adjust-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  background: rgba(11, 23, 40, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.adjust-modal {
  min-width: 280px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid #d9e6f8;
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.25);
  padding: 1rem;
  display: grid;
  justify-items: center;
  gap: 0.74rem;
}

.adjust-title {
  color: #164372;
  font-weight: 900;
  font-size: 1.15rem;
}

.adjust-actions {
  display: flex;
  gap: 0.5rem;
}

@media (max-width: 1360px) {
  .timer-main.ssu-mode {
    --debater-width: clamp(230px, 19vw, 300px);
  }

  .time-text {
    font-size: clamp(4.2rem, 7vw, 7.2rem);
  }
}

@media (max-width: 1080px) {
  .timer-container {
    padding: 0.55rem;
  }

  .mode-card-grid {
    grid-template-columns: 1fr;
  }

  .prepare-header {
    flex-direction: column;
  }

  .debater-input-row {
    grid-template-columns: 1fr;
  }

  .timer-main.ssu-mode {
    display: flex;
    flex-direction: column;
    gap: 0.8rem;
    padding-top: 1.6rem;
  }

  .timer-main.ssu-mode .debate-topic-global {
    position: static;
    margin-bottom: 0.3rem;
    padding: 0;
  }

  .debaters-left,
  .debaters-right {
    width: 100%;
  }

  .debater-icons {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    display: grid;
  }

  .dual-timers {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .timer-circle {
    width: min(88vw, 430px);
    height: min(88vw, 430px);
  }

  .time-text {
    font-size: clamp(3.6rem, 12vw, 5.6rem);
  }

  .timer-label {
    font-size: clamp(1rem, 4vw, 1.5rem);
  }

  .control-btn {
    min-width: 96px !important;
    height: 44px;
    font-size: 0.86rem;
  }

  .rect-time {
    font-size: clamp(3.2rem, 14vw, 5.3rem);
  }
}
</style>
