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

// 보충질의: 본 타이머 재생 중일 때만 진입, 다른 오버레이 타이머와 상호 배제
const handleSupplementCounterClick = (side: 'positive' | 'negative') => {
  if (timerType.value !== 'ssu') return
  if (!isRunning.value) return
  if (isStrategyTime.value || isSupplementTime.value) return
  toggleUsage(side, 'supplementaryQuestion')
  startSupplementTime(side)
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
  max-width: 100vw;
  padding: 0.5rem 1rem;
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
  display: flex;
  justify-content: center;
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

/* 토론자 입력 옵션 */
.debater-input-option {
  margin: 3rem 0 1.2rem;
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  display: inline-block;
  width: max-content;
  max-width: 100%;
  overflow-x: auto;
}

.debater-input-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
  color: #374151;
}

.debater-inputs {
  margin-top: 0.8rem;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  width: max-content;
}

.debater-side {
  width: max-content;
}

.debater-side h4 {
  margin: 0 0 0.5rem 0;
  color: var(--primary-blue);
}

.debater-input-row {
  display: flex;
  flex-wrap: nowrap;
  gap: 0.5rem;
}

.debater-name-input {
  padding: 0.5rem 0.6rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  width: 150px;
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
  padding: 2rem 0 1rem; /* 상단 논제 공간 + 하단바 여백 확보 */
  position: relative;
}

.timer-main.ssu-mode {
  justify-content: space-between;
  /* 좌/우 토론자 영역 고정폭 변수 (중앙 논제와 동기화) */
  --debater-width: clamp(300px, 20vw, 380px);
}

/* 자유토론 듀얼 타이머 단계 전용 레이아웃 */
.timer-main.free-dual {
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  padding: 1rem 0 4.5rem;
}

/* 자유토론 일반 단계도 column 레이아웃로 고정 */
.timer-main:not(.ssu-mode) {
  flex-direction: column;
  align-items: stretch;
  justify-content: center;
  padding: 2rem 0 0.5rem;
}

/* 자유토론 듀얼 타이머 */
.dual-timers {
  display: flex;
  align-items: stretch;
  justify-content: space-between;
  gap: 1.5rem;
  width: 100%;
  max-width: none;
  height: calc(100vh - 180px); /* 상단바/논제/하단바 여백 제외 후 전체 높이 활용 */
}

/* 듀얼 단계에서는 헤더 바가 별도로 공간을 차지하므로 고정 높이를 해제 */
.timer-main.free-dual .dual-timers {
  height: auto;
  flex: 1 1 auto;
  min-height: 0;
}

/* free 일반 단계에서 원형 타이머 중앙 정렬 및 여백 */
.timer-main:not(.ssu-mode) .timer-display {
  margin: 0 auto;
  padding-top: 0.5rem;
  flex: 0 0 auto;
}

.rect-timer {
  flex: 1 1 0;
  min-width: 280px;
  max-width: none;
  background: #ffffff;
  border: 2px solid #e5e7eb;
  border-radius: 16px;
  padding: 1.6rem 1.6rem 1.2rem;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    border-color 0.2s ease;
}

.rect-timer.positive {
  border-color: var(--primary-blue);
}

.rect-timer.negative {
  border-color: #ef4444;
}

/* 듀얼 타이머 활성 강조 효과 */
.rect-timer.active {
  transform: translateY(-2px) scale(1.01);
  box-shadow:
    0 16px 36px rgba(0, 0, 0, 0.12),
    0 0 0 4px rgba(74, 144, 226, 0.08);
}
.rect-timer.positive.active {
  border-color: var(--primary-blue);
  box-shadow:
    0 16px 36px rgba(74, 144, 226, 0.22),
    0 0 0 4px rgba(74, 144, 226, 0.15);
}
.rect-timer.negative.active {
  border-color: #ef4444;
  box-shadow:
    0 16px 36px rgba(239, 68, 68, 0.22),
    0 0 0 4px rgba(239, 68, 68, 0.15);
}

@keyframes activePulse {
  0% {
    transform: translateY(-2px) scale(1.01);
  }
  50% {
    transform: translateY(-1px) scale(1.02);
  }
  100% {
    transform: translateY(-2px) scale(1.01);
  }
}
.rect-timer.active .rect-title,
.rect-timer.active .rect-time {
  animation: activePulse 1.2s ease-in-out infinite;
}

.rect-title {
  font-size: 1.2rem;
  font-weight: 800;
  color: #0b2239;
  margin-bottom: 0.4rem;
}

.rect-time {
  font-size: 4rem;
  font-weight: 800;
  color: #0b2239;
  text-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  margin: 0.6rem 0;
}

.sub-timer {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  background: #f9fafb;
  border: 1px dashed #e5e7eb;
  color: #4b5563;
  padding: 0.4rem 0.6rem;
  border-radius: 8px;
  margin-top: 1rem;
  margin-bottom: 2rem;
}

.sub-timer.warning {
  background: #fff7ed;
  border-color: #fdba74;
  color: #9a3412;
}

.sub-label {
  font-size: 0.85rem;
  font-weight: 700;
}

.sub-time {
  font-weight: 500;
  font-size: 2.5rem;
}

.rect-controls {
  display: flex;
  gap: 0.6rem;
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
  font-size: 2.4rem;
  word-break: keep-all;
  pointer-events: none;
}

/* 듀얼 단계 전용 논제 바 (레이아웃 분리용) */
.debate-topic-bar {
  text-align: center;
  font-weight: 800;
  color: #1f2937;
  line-height: 1.25;
  font-size: 1.6rem;
  word-break: keep-all;
  padding: 0.75rem 0.75rem;
  margin-bottom: 4rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
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
  gap: 4rem;
  align-items: center;
}

.debater-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.3rem;
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
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #4a90e2, #357abd);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
}

.avatar-icon {
  width: 54px;
  height: 54px;
  fill: rgba(255, 255, 255, 0.95);
  stroke: rgba(255, 255, 255, 0.95);
  stroke-width: 1.5;
}

.debater-label {
  font-size: 1.25rem;
  color: #444;
  font-weight: 700;
}

/* 사용 횟수 표시 */
.usage-counters {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 1rem;
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
  gap: 0.4rem;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.counter-dots {
  display: flex;
  gap: 0.4rem;
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

.dot {
  width: 18px;
  height: 18px;
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
  font-size: 0.9rem;
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
  max-width: 520px;
  margin-top: 1rem;
}

.step-buttons {
  display: inline-grid;
  justify-content: center;
  gap: 0.4rem;
  width: auto;
  /* 상단바 확장에 맞춰 버튼 영역도 더 넓게 */
  max-width: min(1800px, 100vw - 2rem);
  margin: 0 auto;
}

.step-dot {
  appearance: none;
  border: 2px solid #e1e1e1;
  background: white;
  /* color: var(--primary-blue); */
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  padding: 0.4rem 0;
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
  font-weight: 800;
}

.timer-circle {
  width: clamp(360px, 28vw, 520px);
  height: clamp(360px, 28vw, 520px);
  border-radius: 50%;
  background: white;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
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
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.04);
  }
  100% {
    transform: scale(1);
  }
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
  width: clamp(360px, 28vw, 520px);
  height: clamp(360px, 28vw, 520px);
  transform: rotate(-90deg) scaleY(-1);
}

.progress-ring-background {
  stroke: #e9ecef;
  stroke-width: 8;
}

.progress-ring-progress {
  stroke-width: 8;
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
  font-size: 6rem;
  font-weight: 700;
  color: var(--primary-blue);
  margin-bottom: 0.4rem;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.timer-label {
  font-size: 1.8rem;
  color: #555;
  font-weight: 600;
  margin-bottom: 0.2rem;
  text-align: center;
  max-width: 320px;
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
  gap: 1rem;
  justify-content: center;
  align-items: center;
}

.control-row {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  align-items: center;
  flex-wrap: wrap;
  width: 100%;
}

.control-btn {
  padding: 0.7rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
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

.control-btn.edit {
  background: #6b7280;
  color: white;
  min-width: 80px;
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
  font-size: 1.1rem;
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

  .dual-timers {
    flex-direction: column;
    align-items: stretch;
    max-width: 520px;
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

/* 시간 수정 팝업 */
.adjust-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}

.adjust-modal {
  background: #ffffff;
  border-radius: 12px;
  padding: 1rem 1.2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.8rem;
  min-width: 260px;
}

.adjust-title {
  font-weight: 800;
  color: #0b2239;
  font-size: 1.1rem;
}

.adjust-actions {
  display: flex;
  gap: 0.6rem;
}
</style>
