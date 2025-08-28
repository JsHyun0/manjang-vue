import { ref, computed } from 'vue'

export interface DebateRecord {
  id: string
  title: string
  category: string
  date: Date
  summary: string
  keyPoints: string[]
  conclusion: string
  participants: number
  participantNames: string[]
}

export const categories = ['정치', '사회', '경제', '문화', '기타']
export const sortOptions = [
  { value: 'date-desc', label: '최신순' },
  { value: 'date-asc', label: '오래된순' },
  { value: 'participants-desc', label: '참가자 많은순' },
  { value: 'title', label: '제목순' }
]

export const sampleRecords: DebateRecord[] = [
  {
    id: '1',
    title: '인공지능의 윤리적 문제점',
    category: '기타',
    date: new Date('2024-01-15'),
    summary: 'AI 기술 발전에 따른 윤리적 고려사항과 규제 방안에 대해 토론',
    keyPoints: [
      'AI의 편향성 문제와 해결방안',
      '개인정보 보호와 프라이버시',
      '일자리 대체 문제',
      '의사결정의 투명성'
    ],
    conclusion: 'AI 기술 발전과 동시에 명확한 윤리 가이드라인 수립이 필요하다는 결론',
    participants: 8,
    participantNames: ['김철수', '이영희', '박민수', '정수진', '최동호', '한지민', '오세훈', '윤미래']
  },
  {
    id: '2',
    title: '기본소득제도 도입 찬반',
    category: '경제',
    date: new Date('2024-01-20'),
    summary: '국가 기본소득제도 도입의 필요성과 부작용에 대한 찬반 토론',
    keyPoints: [
      '빈곤 해결과 사회 안전망 강화',
      '노동 의욕 저하 우려',
      '재정 부담과 세금 문제',
      '사회 구조적 변화 필요성'
    ],
    conclusion: '단계적 시범 운영을 통해 효과를 검증한 후 도입 여부 결정',
    participants: 6,
    participantNames: ['김재현', '이소영', '박준호', '최혜진', '정민석', '한예슬']
  },
  {
    id: '3',
    title: '환경보호와 경제성장의 조화',
    category: '사회',
    date: new Date('2024-01-25'),
    summary: '지속가능한 발전을 위한 환경보호와 경제성장의 균형점 모색',
    keyPoints: [
      '탄소중립 정책의 경제적 영향',
      '그린뉴딜과 새로운 일자리 창출',
      '기업의 환경 책임과 비용',
      '국제 경쟁력과 환경 규제'
    ],
    conclusion: '혁신 기술을 통한 친환경 경제 모델로의 전환이 필요',
    participants: 10,
    participantNames: ['이현지', '김동민', '박서연', '정우진', '최아영', '한민수', '오지은', '윤성호', '강미정', '남준우']
  }
]

export const useRecordFilters = (records: DebateRecord[]) => {
  const searchQuery = ref('')
  const selectedCategory = ref('')
  const sortBy = ref('date-desc')

  const filteredRecords = computed(() => {
    let filtered = [...records]

    // 검색 필터
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(record => 
        record.title.toLowerCase().includes(query) ||
        record.summary.toLowerCase().includes(query) ||
        record.participantNames.some(name => name.toLowerCase().includes(query))
      )
    }

    // 카테고리 필터
    if (selectedCategory.value) {
      filtered = filtered.filter(record => record.category === selectedCategory.value)
    }

    // 정렬
    filtered.sort((a, b) => {
      switch (sortBy.value) {
        case 'date-desc':
          return b.date.getTime() - a.date.getTime()
        case 'date-asc':
          return a.date.getTime() - b.date.getTime()
        case 'participants-desc':
          return b.participants - a.participants
        case 'title':
          return a.title.localeCompare(b.title)
        default:
          return 0
      }
    })

    return filtered
  })

  const handleSearch = () => {
    // 검색 시 실행할 로직 (예: 페이지 리셋)
  }

  return {
    searchQuery,
    selectedCategory,
    sortBy,
    filteredRecords,
    handleSearch
  }
}

export const formatDate = (date: Date): string => {
  return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`
}

export const parseKeyPoints = (text: string): string[] => {
  return text.split('\n').filter(point => point.trim())
}

export const parseParticipants = (text: string): string[] => {
  return text.split(',').map(name => name.trim()).filter(name => name)
} 