import { ref, computed } from 'vue'

export interface CalendarDay {
  date: Date
  day: number
  isCurrentMonth: boolean
}

export const weekdays = ['일', '월', '화', '수', '목', '금', '토']

// 날짜 포맷팅 함수를 독립적으로 export
export const formatDate = (date: Date): string => {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
}

export const useCalendar = () => {
  const currentDate = new Date()
  const currentYear = ref(currentDate.getFullYear())
  const currentMonth = ref(currentDate.getMonth())

  const calendarDays = computed((): CalendarDay[] => {
    const firstDay = new Date(currentYear.value, currentMonth.value, 1)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    const days: CalendarDay[] = []
    const current = new Date(startDate)
    
    for (let i = 0; i < 42; i++) {
      days.push({
        date: new Date(current),
        day: current.getDate(),
        isCurrentMonth: current.getMonth() === currentMonth.value
      })
      current.setDate(current.getDate() + 1)
    }
    
    return days
  })

  const changeMonth = (delta: number) => {
    const newMonth = currentMonth.value + delta
    if (newMonth < 0) {
      currentYear.value--
      currentMonth.value = 11
    } else if (newMonth > 11) {
      currentYear.value++
      currentMonth.value = 0
    } else {
      currentMonth.value = newMonth
    }
  }

  const isToday = (date: Date): boolean => {
    return date.toDateString() === new Date().toDateString()
  }

  // 위에서 export한 formatDate 함수를 사용

  const isPastDate = (date: Date): boolean => {
    return date < new Date(new Date().setHours(0, 0, 0, 0))
  }

  return {
    currentYear,
    currentMonth,
    calendarDays,
    changeMonth,
    isToday,
    formatDate,
    isPastDate
  }
} 