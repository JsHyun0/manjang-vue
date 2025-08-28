import { ref, reactive, computed, onUnmounted } from 'vue'

export interface SSUStep {
  title: string
  duration: number // 초 단위
}

interface CEDAStep {
  title: string
  duration: number // 초 단위
}

export interface UsageCounters {
  positive: {
    supplementaryQuestion: number
    strategyTime: number
  }
  negative: {
    supplementaryQuestion: number
    strategyTime: number
  }
}

export type DebateSide = 'positive' | 'negative'

// 단일 발언자 모델은 더 이상 사용하지 않습니다. (ActiveSpeakers로 통합)

export interface ActiveSpeakers {
  positive: number | null
  negative: number | null
}

// 기본 SSU 단계 정의 (불변 기본값)
export const defaultSSUSteps: SSUStep[] = [
  { title: '긍정 입론', duration: 180 }, // 3분
  { title: '부정 입론 교차조사', duration: 150 }, // 2분 30초
  { title: '부정 입론', duration: 180 }, // 3분
  { title: '긍정 입론 교차조사', duration: 150 }, // 2분 30초
  { title: '긍정 반박', duration: 180 }, // 3분
  { title: '부정 반박 교차조사', duration: 120 }, // 2분
  { title: '부정 반박', duration: 180 }, // 3분
  { title: '긍정 반박 교차조사', duration: 150 }, // 2분 30초
  { title: '긍정 최종발언', duration: 150 }, // 2분 30초
  { title: '부정 최종발언', duration: 150 }, // 2분 30초
]

// 공용 시간 포맷터 (MM:SS)
export const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
}

export const useSSUTimer = () => {
  // 기본 상태
  const timerType = ref<'none' | 'free' | 'ssu'>('none')
  const currentTime = ref(600) // 자유토론 기본 10분 (초)
  const isRunning = ref(false)
  const isStrategyTime = ref(false)
  const isSupplementTime = ref(false)
  const lastStrategySide = ref<DebateSide | null>(null)
  const preStrategyTime = ref<number | null>(null)
  const lastSupplementSide = ref<DebateSide | null>(null)
  const preSupplementTime = ref<number | null>(null)
  const wasRunningBeforeSupplement = ref(false)
  // 30초 알림 상태
  const thirtySecondCueActive = ref(false)
  const hasThirtySecondCuePlayedForStep = ref(false)

  // SSU 관련 상태
  const currentStep = ref(0)
  const strategyTimeDuration = 60 // 1분
  const supplementTimeDuration = 60 // 보충질의 1분

  // SSU 단계 목록(반응형, 사용자 커스텀 반영)
  const steps = ref<SSUStep[]>(defaultSSUSteps.map((s) => ({ ...s })))

  // 자유토론 커스텀 시간(초)
  const freeDurationSeconds = ref(600)

  // 사용 횟수 관리
  const usageCounters = reactive<UsageCounters>({
    positive: {
      supplementaryQuestion: 0,
      strategyTime: 0,
    },
    negative: {
      supplementaryQuestion: 0,
      strategyTime: 0,
    },
  })

  let timerInterval: number | null = null
  let supplementInterval: number | null = null
  const supplementRemaining = ref(0)
  let thirtyCueTimeout: number | null = null

  const clearThirtySecondCue = () => {
    if (thirtyCueTimeout) {
      clearTimeout(thirtyCueTimeout)
      thirtyCueTimeout = null
    }
    thirtySecondCueActive.value = false
  }

  const resetThirtySecondCue = () => {
    clearThirtySecondCue()
    hasThirtySecondCuePlayedForStep.value = false
  }

  const playBeep = () => {
    if (typeof window === 'undefined') return
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
      if (!AudioCtx) return
      const ctx = new AudioCtx()
      const gain = ctx.createGain()
      gain.connect(ctx.destination)
      gain.gain.value = 0.0001

      const beep = (frequency: number, startTime: number, duration: number, peakGain = 0.3) => {
        const osc = ctx.createOscillator()
        osc.type = 'square'
        osc.frequency.setValueAtTime(frequency, startTime)
        osc.connect(gain)
        // 볼륨 ADSR 비슷하게
        gain.gain.setValueAtTime(0.0001, startTime)
        gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration)
        osc.start(startTime)
        osc.stop(startTime + duration + 0.02)
        osc.onended = () => {
          // no-op; 전체가 끝난 뒤 close
        }
      }

      const now = ctx.currentTime
      // 더 확실한 2톤: 높은 → 낮은
      beep(1200, now, 0.18, 0.35)
      beep(800, now + 0.2, 0.22, 0.35)

      // 컨텍스트 종료 예약
      const closeAt = now + 0.5
      const interval = setInterval(() => {
        if (ctx.currentTime >= closeAt) {
          clearInterval(interval)
          try { ctx.close() } catch {}
        }
      }, 50)
    } catch {}
  }

  const triggerThirtySecondCue = () => {
    if (hasThirtySecondCuePlayedForStep.value) return
    hasThirtySecondCuePlayedForStep.value = true
    thirtySecondCueActive.value = true
    if (thirtyCueTimeout) {
      clearTimeout(thirtyCueTimeout)
      thirtyCueTimeout = null
    }
    thirtyCueTimeout = setTimeout(() => {
      thirtySecondCueActive.value = false
      thirtyCueTimeout = null
    }, 1500)
    playBeep()
  }

  // 현재 단계 정보
  const currentStepInfo = computed(() => {
    if (timerType.value === 'ssu') {
      return steps.value[currentStep.value] || null
    }
    return null
  })

  // 현재 단계에서 발언권이 있는 토론자 계산
  // const activeSpeaker = computed<ActiveSpeaker>(() => {
  //   if (timerType.value !== 'ssu' || isStrategyTime.value) {
  //     return { side: null, speakerIndex: null }
  //   }
  //   const title = currentStepInfo.value?.title || ''
  //   const side: DebateSide | null = title.includes('긍정')
  //     ? 'positive'
  //     : title.includes('부정')
  //       ? 'negative'
  //       : null

  //   let speakerIndex = 1
  //   if (title.includes('교차조사')) {
  //     if (title.includes('입론'))
  //       speakerIndex = 3 // 교차조사의 경우 3번 -> 1번
  //     else if (title.includes('반박')) speakerIndex = 1 // 교차조사의 경우 1번 -> 2번
  //   } else {
  //     if (title.includes('반박')) speakerIndex = 2
  //     else if (title.includes('최종')) speakerIndex = 3
  //     else if (title.includes('입론')) speakerIndex = 1
  //   }

  //   return { side, speakerIndex }
  // })

  // 교차조사 동시 하이라이트 지원 버전
  const activeSpeakers = computed<ActiveSpeakers>(() => {
    if (timerType.value !== 'ssu' || isStrategyTime.value) {
      return { positive: null, negative: null }
    }
    const title = currentStepInfo.value?.title || ''
    const isPositiveStep = title.includes('긍정')
    const isNegativeStep = title.includes('부정')

    // 교차조사 규칙
    // - 입론 교차조사: 질문자 3번, 답변자 1번
    // - 반박 교차조사: 질문자 1번, 답변자 2번
    if (title.includes('교차조사')) {
      if (title.includes('입론')) {
        return {
          positive: isPositiveStep ? 3 : 1,
          negative: isNegativeStep ? 3 : 1,
        }
      }
      if (title.includes('반박')) {
        return {
          positive: isPositiveStep ? 1 : 2,
          negative: isNegativeStep ? 1 : 2,
        }
      }
    }

    // 일반 단계(단일 하이라이트)
    let index = 1
    if (title.includes('반박')) index = 2
    else if (title.includes('최종')) index = 3
    else if (title.includes('입론')) index = 1

    return {
      positive: isPositiveStep ? index : null,
      negative: isNegativeStep ? index : null,
    }
  })

  // 타이머 시작/일시정지
  const toggleTimer = () => {
    if (isRunning.value) {
      pauseTimer()
    } else {
      startTimer()
    }
  }

  // 타이머 시작
  const startTimer = () => {
    if (!isRunning.value && currentTime.value > 0) {
      isRunning.value = true
      timerInterval = setInterval(() => {
        currentTime.value--
        // 30초 알림 (SSU 단계에서만, 작전/보충 제외)
        if (
          timerType.value === 'ssu' &&
          !isStrategyTime.value &&
          !isSupplementTime.value &&
          currentTime.value === 30
        ) {
          triggerThirtySecondCue()
        }
        if (currentTime.value <= 0) {
          // 시간이 끝나면 상태에 따라 처리
          if (isStrategyTime.value) {
            endStrategyTime()
          } else {
            pauseTimer()
            if (typeof window !== 'undefined') {
              alert(`${currentStepInfo.value?.title || '타이머'}가 종료되었습니다!`)
            }
          }
        }
      }, 1000)
    }
  }

  // 타이머 일시정지
  const pauseTimer = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    isRunning.value = false
  }

  // 타이머 리셋
  const resetTimer = () => {
    pauseTimer()
    if (isStrategyTime.value) {
      currentTime.value = strategyTimeDuration
    } else if (timerType.value === 'ssu') {
      currentTime.value = steps.value[currentStep.value].duration
    } else {
      currentTime.value = freeDurationSeconds.value // 자유토론
    }
    resetThirtySecondCue()
  }

  // 타이머 종류 변경
  const selectTimerType = (type: 'free' | 'ssu') => {
    pauseTimer()
    timerType.value = type
    isStrategyTime.value = false

    if (type === 'ssu') {
      currentStep.value = 0
      currentTime.value = steps.value[0].duration
      resetUsageCounters()
    } else {
      currentTime.value = freeDurationSeconds.value
    }
    resetThirtySecondCue()
  }

  // 모드 선택 화면으로 복귀
  const returnToSelection = () => {
    pauseTimer()
    isStrategyTime.value = false
    isSupplementTime.value = false
    currentStep.value = 0
    currentTime.value = 600
    timerType.value = 'none'
    resetUsageCounters()
    resetThirtySecondCue()
  }

  // 작전타임 시작
  const startStrategyTime = (side?: DebateSide) => {
    pauseTimer()
    isStrategyTime.value = true
    preStrategyTime.value = currentTime.value
    currentTime.value = strategyTimeDuration
    if (side) lastStrategySide.value = side
    resetThirtySecondCue()
  }

  // 작전타임 종료 (원래 단계로 복귀)
  const endStrategyTime = () => {
    pauseTimer()
    isStrategyTime.value = false
    if (preStrategyTime.value != null) {
      currentTime.value = preStrategyTime.value
    } else if (timerType.value === 'ssu') {
      currentTime.value = steps.value[currentStep.value].duration
    } else {
      currentTime.value = freeDurationSeconds.value
    }
    preStrategyTime.value = null
    lastStrategySide.value = null
    resetThirtySecondCue()
  }

  // 보충질의 시작(오버레이로 별도 카운트다운, 본 타이머는 일시정지 유지)
  const startSupplementTime = (side?: DebateSide) => {
    // 중복 시작 방지
    if (isSupplementTime.value) return
    // 다른 오버레이 타이머 진행 중이면 무시
    if (isStrategyTime.value) return
    // 본 타이머 일시정지 및 상태 저장
    wasRunningBeforeSupplement.value = isRunning.value
    pauseTimer()
    isSupplementTime.value = true
    preSupplementTime.value = currentTime.value
    if (side) lastSupplementSide.value = side

    // 별도 카운트다운 시작
    supplementRemaining.value = supplementTimeDuration
    // 즉시 노출을 위해 currentTime을 변경하지 않음. UI는 별도 remaining을 참조
    // 내부 인터벌로 카운트다운
    if (supplementInterval) {
      clearInterval(supplementInterval)
      supplementInterval = null
    }
    supplementInterval = setInterval(() => {
      supplementRemaining.value -= 1
      if (supplementRemaining.value <= 0) {
        endSupplementTime()
      }
    }, 1000)
    // 남은 시간 reactive 노출을 위해 ref를 사용하지 않고, getter 함수를 제공할 예정이므로 별도 저장은 생략
  }

  // 보충질의 종료(원래 단계로 복귀)
  const endSupplementTime = () => {
    if (supplementInterval) {
      clearInterval(supplementInterval)
      supplementInterval = null
    }
    isSupplementTime.value = false
    supplementRemaining.value = 0
    if (preSupplementTime.value != null) {
      currentTime.value = preSupplementTime.value
    } else if (timerType.value === 'ssu') {
      currentTime.value = steps.value[currentStep.value].duration
    } else {
      currentTime.value = freeDurationSeconds.value
    }
    preSupplementTime.value = null
    lastSupplementSide.value = null
    // 보충질의 시작 전에 재생 중이었다면 자동 재시작
    if (wasRunningBeforeSupplement.value) {
      wasRunningBeforeSupplement.value = false
      startTimer()
    }
    resetThirtySecondCue()
  }

  // 보충질의 취소(사용 카운트 롤백 포함)
  const cancelSupplementTime = () => {
    if (supplementInterval) {
      clearInterval(supplementInterval)
      supplementInterval = null
    }
    isSupplementTime.value = false
    supplementRemaining.value = 0
    if (preSupplementTime.value != null) {
      currentTime.value = preSupplementTime.value
    } else if (timerType.value === 'ssu') {
      currentTime.value = steps.value[currentStep.value].duration
    } else {
      currentTime.value = freeDurationSeconds.value
    }
    if (lastSupplementSide.value) {
      const side = lastSupplementSide.value
      if (usageCounters[side].supplementaryQuestion > 0) {
        usageCounters[side].supplementaryQuestion -= 1
      }
    }
    preSupplementTime.value = null
    lastSupplementSide.value = null
    wasRunningBeforeSupplement.value = false
    resetThirtySecondCue()
  }

  // 보충질의 남은 시간 표시를 위한 상태는 supplementRemaining 이용

  // 작전타임 취소(복귀) - 사용 카운트 롤백 포함
  const cancelStrategyTime = () => {
    pauseTimer()
    isStrategyTime.value = false
    if (preStrategyTime.value != null) {
      currentTime.value = preStrategyTime.value
    } else if (timerType.value === 'ssu') {
      currentTime.value = steps.value[currentStep.value].duration
    } else {
      currentTime.value = freeDurationSeconds.value
    }
    if (lastStrategySide.value) {
      const side = lastStrategySide.value
      if (usageCounters[side].strategyTime > 0) {
        usageCounters[side].strategyTime -= 1
      }
    }
    preStrategyTime.value = null
    lastStrategySide.value = null
    resetThirtySecondCue()
  }

  // 이전 단계로 이동
  const previousStep = () => {
    if (currentStep.value > 0) {
      pauseTimer()
      currentStep.value--
      currentTime.value = steps.value[currentStep.value].duration
      isStrategyTime.value = false
      resetThirtySecondCue()
    }
  }

  // 다음 단계로 이동
  const nextStep = () => {
    if (currentStep.value < steps.value.length - 1) {
      pauseTimer()
      currentStep.value++
      currentTime.value = steps.value[currentStep.value].duration
      isStrategyTime.value = false
      resetThirtySecondCue()
    }
  }

  // 특정 단계로 이동
  const goToStep = (index: number) => {
    if (index < 0 || index >= steps.value.length) return
    pauseTimer()
    currentStep.value = index
    currentTime.value = steps.value[index].duration
    isStrategyTime.value = false
    resetThirtySecondCue()
  }

  // 사용 횟수 관리
  const resetUsageCounters = () => {
    usageCounters.positive.supplementaryQuestion = 0
    usageCounters.positive.strategyTime = 0
    usageCounters.negative.supplementaryQuestion = 0
    usageCounters.negative.strategyTime = 0
  }

  const toggleUsage = (
    side: 'positive' | 'negative',
    type: 'supplementaryQuestion' | 'strategyTime',
  ) => {
    const maxCount = type === 'supplementaryQuestion' ? 3 : 2
    const current = usageCounters[side][type]
    usageCounters[side][type] = current >= maxCount ? 0 : current + 1
  }

  // 시간 포맷팅
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  // 컴포넌트 언마운트 시 정리
  const cleanup = () => {
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    if (supplementInterval) {
      clearInterval(supplementInterval)
      supplementInterval = null
    }
    clearThirtySecondCue()
  }

  onUnmounted(cleanup)

  // ===== 사용자 커스텀 API =====
  const setSSUStepDurations = (durationsSeconds: number[]) => {
    if (!Array.isArray(durationsSeconds) || durationsSeconds.length !== steps.value.length) return
    steps.value = steps.value.map((s, i) => ({
      ...s,
      duration: Math.max(1, Math.floor(durationsSeconds[i])),
    }))
    if (timerType.value === 'ssu') {
      currentTime.value = steps.value[currentStep.value].duration
    }
  }

  const setFreeDuration = (seconds: number) => {
    const sanitized = Math.max(1, Math.floor(seconds))
    freeDurationSeconds.value = sanitized
    if (timerType.value === 'free' && !isStrategyTime.value) {
      currentTime.value = sanitized
    }
  }

  return {
    // 상태
    timerType,
    currentTime,
    isRunning,
    isStrategyTime,
    isSupplementTime,
    thirtySecondCueActive,
    currentStep,
    usageCounters,
    freeDurationSeconds,

    // 계산된 값
    currentStepInfo,
    ssuSteps: steps,
    //activeSpeaker,
    activeSpeakers,

    // 메서드
    toggleTimer,
    startTimer,
    pauseTimer,
    resetTimer,
    selectTimerType,
    returnToSelection,
    startStrategyTime,
    endStrategyTime,
    cancelStrategyTime,
    startSupplementTime,
    endSupplementTime,
    cancelSupplementTime,
    supplementRemaining,
    previousStep,
    nextStep,
    goToStep,
    toggleUsage,
    resetUsageCounters,
    formatTime,
    cleanup,
    // 커스텀 API
    setSSUStepDurations,
    setFreeDuration,
    // supplement 전용
    supplementTimeDuration,
  }
}
