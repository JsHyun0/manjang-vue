<template>
  <div class="debate-page">
    <header class="page-heading">
      <h1>토론 목록</h1>
      <p>예정된 토론과 지난 토론 기록을 확인하세요.</p>
    </header>

    <section class="control-panel">
      <label class="search-box">
        <span class="search-label">검색</span>
        <div class="search-input-wrap">
          <span class="search-icon" aria-hidden="true">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="논제 또는 참가자 검색"
            autocomplete="off"
          />
        </div>
      </label>

      <div class="filter-tabs">
        <button
          type="button"
          class="tab-btn"
          :class="{ active: statusFilter === 'all' }"
          @click="statusFilter = 'all'"
        >
          전체
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: statusFilter === 'upcoming' }"
          @click="statusFilter = 'upcoming'"
        >
          예정
        </button>
        <button
          type="button"
          class="tab-btn"
          :class="{ active: statusFilter === 'completed' }"
          @click="statusFilter = 'completed'"
        >
          완료
        </button>
      </div>

      <label class="sort-box">
        <span>정렬</span>
        <select v-model="sortBy">
          <option value="date-asc">날짜 오름차순</option>
          <option value="date-desc">날짜 내림차순</option>
        </select>
      </label>

      <div v-if="isAdmin" class="manage-box">
        <button type="button" class="manage-btn" @click="goToCreatePage">토론 등록</button>
      </div>
    </section>

    <section v-if="loading" class="loading-state">
      <h2>토론 목록을 불러오는 중입니다</h2>
      <p>잠시만 기다려주세요.</p>
    </section>

    <section v-else-if="loadError" class="error-state">
      <h2>토론 목록을 불러오지 못했습니다</h2>
      <p>{{ loadError }}</p>
      <button type="button" class="retry-btn" @click="loadDebates">다시 불러오기</button>
    </section>

    <section v-else-if="!hasAnyResult" class="empty-state">
      <h2>조건에 맞는 토론이 없습니다</h2>
      <p>검색어 또는 필터를 조정해 다시 확인해보세요.</p>
    </section>

    <template v-else>
      <section v-if="statusFilter === 'all'" class="list-section">
        <div class="section-head">
          <h2>예정된 토론</h2>
          <span>{{ upcomingDebates.length }}건</span>
        </div>
        <div v-if="upcomingDebates.length > 0" class="debate-grid">
          <article
            v-for="debate in upcomingDebates"
            :key="debate.id"
            class="debate-card upcoming"
          >
            <div class="card-top">
              <div class="card-badges">
                <span class="status-chip upcoming">예정</span>
                <span class="type-chip" :class="debateTypeClass(debate.debateType)">
                  {{ debate.debateType }}
                </span>
              </div>
              <time>{{ formatDate(debate.date) }}</time>
            </div>
            <h3>{{ debate.topic }}</h3>
            <p class="card-meta">
              {{ dateDistanceLabel(debate.date) }} · 찬성 {{ debate.participantsBySide.pro.length }}명 · 반대
              {{ debate.participantsBySide.con.length }}명
            </p>
            <div class="side-participants">
              <div class="side-row">
                <span class="side-pill pro">찬성</span>
                <div class="participants">
                  <span v-for="name in participantPreviewBySide(debate, 'pro')" :key="`${debate.id}-pro-${name}`">
                    {{ name }}
                  </span>
                  <span v-if="participantOverflowBySide(debate, 'pro') > 0" class="overflow">
                    +{{ participantOverflowBySide(debate, 'pro') }}
                  </span>
                </div>
              </div>
              <div class="side-row">
                <span class="side-pill con">반대</span>
                <div class="participants">
                  <span v-for="name in participantPreviewBySide(debate, 'con')" :key="`${debate.id}-con-${name}`">
                    {{ name }}
                  </span>
                  <span v-if="participantOverflowBySide(debate, 'con') > 0" class="overflow">
                    +{{ participantOverflowBySide(debate, 'con') }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="debate.videoUrl || isAdmin" class="card-footer">
              <a
                v-if="debate.videoUrl"
                class="video-link-btn"
                :href="debate.videoUrl"
                target="_blank"
                rel="noopener noreferrer"
                title="토론 영상 열기"
                aria-label="토론 영상 열기"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M14 3h7v7" />
                  <path d="M10 14 21 3" />
                  <path d="M21 14v5a2 2 0 0 1-2 2h-5" />
                  <path d="M10 3H5a2 2 0 0 0-2 2v5" />
                  <path d="M3 21 14 10" />
                </svg>
              </a>

              <div v-if="isAdmin" class="card-actions">
                <button type="button" class="card-action-btn ghost" @click="goToEditPage(debate.id)">
                  수정
                </button>
                <button
                  type="button"
                  class="card-action-btn danger"
                  :disabled="deletingId === debate.id"
                  @click="removeDebate(debate.id)"
                >
                  {{ deletingId === debate.id ? '삭제 중...' : '삭제' }}
                </button>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="section-empty">예정된 토론이 없습니다.</p>
      </section>

      <section v-if="statusFilter === 'all'" class="list-section">
        <div class="section-head">
          <h2>지난 토론</h2>
          <span>{{ completedDebates.length }}건</span>
        </div>
        <div v-if="completedDebates.length > 0" class="debate-grid">
          <article
            v-for="debate in completedDebates"
            :key="debate.id"
            class="debate-card completed"
          >
            <div class="card-top">
              <div class="card-badges">
                <span class="status-chip completed">완료</span>
                <span class="type-chip" :class="debateTypeClass(debate.debateType)">
                  {{ debate.debateType }}
                </span>
              </div>
              <time>{{ formatDate(debate.date) }}</time>
            </div>
            <h3>{{ debate.topic }}</h3>
            <p class="card-meta">
              {{ dateDistanceLabel(debate.date) }} · 찬성 {{ debate.participantsBySide.pro.length }}명 · 반대
              {{ debate.participantsBySide.con.length }}명
            </p>
            <div class="side-participants">
              <div class="side-row">
                <span class="side-pill pro">찬성</span>
                <div class="participants">
                  <span v-for="name in participantPreviewBySide(debate, 'pro')" :key="`${debate.id}-pro-${name}`">
                    {{ name }}
                  </span>
                  <span v-if="participantOverflowBySide(debate, 'pro') > 0" class="overflow">
                    +{{ participantOverflowBySide(debate, 'pro') }}
                  </span>
                </div>
              </div>
              <div class="side-row">
                <span class="side-pill con">반대</span>
                <div class="participants">
                  <span v-for="name in participantPreviewBySide(debate, 'con')" :key="`${debate.id}-con-${name}`">
                    {{ name }}
                  </span>
                  <span v-if="participantOverflowBySide(debate, 'con') > 0" class="overflow">
                    +{{ participantOverflowBySide(debate, 'con') }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="debate.videoUrl || isAdmin" class="card-footer">
              <a
                v-if="debate.videoUrl"
                class="video-link-btn"
                :href="debate.videoUrl"
                target="_blank"
                rel="noopener noreferrer"
                title="토론 영상 열기"
                aria-label="토론 영상 열기"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M14 3h7v7" />
                  <path d="M10 14 21 3" />
                  <path d="M21 14v5a2 2 0 0 1-2 2h-5" />
                  <path d="M10 3H5a2 2 0 0 0-2 2v5" />
                  <path d="M3 21 14 10" />
                </svg>
              </a>

              <div v-if="isAdmin" class="card-actions">
                <button type="button" class="card-action-btn ghost" @click="goToEditPage(debate.id)">
                  수정
                </button>
                <button
                  type="button"
                  class="card-action-btn danger"
                  :disabled="deletingId === debate.id"
                  @click="removeDebate(debate.id)"
                >
                  {{ deletingId === debate.id ? '삭제 중...' : '삭제' }}
                </button>
              </div>
            </div>
          </article>
        </div>
        <p v-else class="section-empty">지난 토론이 없습니다.</p>
      </section>

      <section v-if="statusFilter !== 'all'" class="list-section">
        <div class="section-head">
          <h2>{{ statusFilter === 'upcoming' ? '예정된 토론' : '지난 토론' }}</h2>
          <span>{{ singleSectionDebates.length }}건</span>
        </div>

        <div class="debate-grid">
          <article
            v-for="debate in singleSectionDebates"
            :key="debate.id"
            class="debate-card"
            :class="debate.status"
          >
            <div class="card-top">
              <div class="card-badges">
                <span class="status-chip" :class="debate.status">
                  {{ debate.status === 'upcoming' ? '예정' : '완료' }}
                </span>
                <span class="type-chip" :class="debateTypeClass(debate.debateType)">
                  {{ debate.debateType }}
                </span>
              </div>
              <time>{{ formatDate(debate.date) }}</time>
            </div>
            <h3>{{ debate.topic }}</h3>
            <p class="card-meta">
              {{ dateDistanceLabel(debate.date) }} · 찬성 {{ debate.participantsBySide.pro.length }}명 · 반대
              {{ debate.participantsBySide.con.length }}명
            </p>
            <div class="side-participants">
              <div class="side-row">
                <span class="side-pill pro">찬성</span>
                <div class="participants">
                  <span v-for="name in participantPreviewBySide(debate, 'pro')" :key="`${debate.id}-pro-${name}`">
                    {{ name }}
                  </span>
                  <span v-if="participantOverflowBySide(debate, 'pro') > 0" class="overflow">
                    +{{ participantOverflowBySide(debate, 'pro') }}
                  </span>
                </div>
              </div>
              <div class="side-row">
                <span class="side-pill con">반대</span>
                <div class="participants">
                  <span v-for="name in participantPreviewBySide(debate, 'con')" :key="`${debate.id}-con-${name}`">
                    {{ name }}
                  </span>
                  <span v-if="participantOverflowBySide(debate, 'con') > 0" class="overflow">
                    +{{ participantOverflowBySide(debate, 'con') }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="debate.videoUrl || isAdmin" class="card-footer">
              <a
                v-if="debate.videoUrl"
                class="video-link-btn"
                :href="debate.videoUrl"
                target="_blank"
                rel="noopener noreferrer"
                title="토론 영상 열기"
                aria-label="토론 영상 열기"
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M14 3h7v7" />
                  <path d="M10 14 21 3" />
                  <path d="M21 14v5a2 2 0 0 1-2 2h-5" />
                  <path d="M10 3H5a2 2 0 0 0-2 2v5" />
                  <path d="M3 21 14 10" />
                </svg>
              </a>

              <div v-if="isAdmin" class="card-actions">
                <button type="button" class="card-action-btn ghost" @click="goToEditPage(debate.id)">
                  수정
                </button>
                <button
                  type="button"
                  class="card-action-btn danger"
                  :disabled="deletingId === debate.id"
                  @click="removeDebate(debate.id)"
                >
                  {{ deletingId === debate.id ? '삭제 중...' : '삭제' }}
                </button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { deleteDebateItem, listDebateItems, type DebateListItem, type DebateSide } from '@/lib/debates'
import { useAuth } from '@/lib/auth'

type DebateStatus = 'upcoming' | 'completed'
type DebateListVM = DebateListItem & { status: DebateStatus }

const router = useRouter()
const { isAdmin } = useAuth()

const parseYmd = (ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const today = new Date()
today.setHours(0, 0, 0, 0)

const toStatus = (ymd: string): DebateStatus => (parseYmd(ymd) >= today ? 'upcoming' : 'completed')

const debates = ref<DebateListVM[]>([])
const loading = ref(true)
const loadError = ref('')
const deletingId = ref<string | null>(null)

const searchQuery = ref('')
const statusFilter = ref<'all' | DebateStatus>('all')
const sortBy = ref<'date-asc' | 'date-desc'>('date-asc')

const loadDebates = async () => {
  loading.value = true
  loadError.value = ''
  try {
    const items = await listDebateItems()
    debates.value = items.map((item) => ({
      ...item,
      status: toStatus(item.date),
    }))
  } catch (error: any) {
    loadError.value = error?.message || '데이터 조회 중 오류가 발생했습니다.'
    debates.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  void loadDebates()
})

const goToCreatePage = () => {
  router.push('/record/manage')
}

const goToEditPage = (id: string) => {
  router.push({ path: '/record/manage', query: { edit: id } })
}

const removeDebate = async (id: string) => {
  if (!isAdmin.value) return
  if (!confirm('이 토론을 삭제하시겠습니까?')) return
  deletingId.value = id
  try {
    await deleteDebateItem(id)
    await loadDebates()
  } catch (error: any) {
    alert(error?.message || '삭제 중 오류가 발생했습니다.')
  } finally {
    deletingId.value = null
  }
}

const queryFiltered = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return debates.value
  return debates.value.filter((debate) => {
    const inTopic = debate.topic.toLowerCase().includes(query)
    const inParticipants = debate.participants.some((name) => name.toLowerCase().includes(query))
    const inType = debate.debateType.toLowerCase().includes(query)
    return inTopic || inParticipants || inType
  })
})

const statusFiltered = computed(() => {
  if (statusFilter.value === 'all') return queryFiltered.value
  return queryFiltered.value.filter((debate) => debate.status === statusFilter.value)
})

const sortedDebates = computed(() => {
  const copy = [...statusFiltered.value]
  copy.sort((a, b) => {
    const at = parseYmd(a.date).getTime()
    const bt = parseYmd(b.date).getTime()
    return sortBy.value === 'date-asc' ? at - bt : bt - at
  })
  return copy
})

const upcomingDebates = computed(() => sortedDebates.value.filter((debate) => debate.status === 'upcoming'))
const completedDebates = computed(() => sortedDebates.value.filter((debate) => debate.status === 'completed'))
const singleSectionDebates = computed(() => sortedDebates.value)
const hasAnyResult = computed(() => sortedDebates.value.length > 0)

const formatDate = (ymd: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(parseYmd(ymd))
}

const dateDistanceLabel = (ymd: string): string => {
  const diffMs = parseYmd(ymd).getTime() - today.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return '오늘'
  if (diffDays > 0) return `D-${diffDays}`
  return `${Math.abs(diffDays)}일 전`
}

const participantPreviewBySide = (debate: DebateListItem, side: DebateSide): string[] => {
  const names = debate.participantsBySide[side]
  return names.length > 0 ? names.slice(0, 4) : ['미정']
}

const participantOverflowBySide = (debate: DebateListItem, side: DebateSide): number =>
  Math.max(0, debate.participantsBySide[side].length - 4)

const debateTypeClass = (debateType: DebateListItem['debateType']): 'free' | 'ssu' =>
  debateType === 'SSU토론' ? 'ssu' : 'free'
</script>

<style scoped>
.debate-page {
  min-height: calc(100vh - 80px);
  padding: 44px 32px 56px;
  background: #f6f8fc;
  max-width: 1600px;
  margin: 0 auto;
}

.page-heading {
  margin-bottom: 24px;
}

.page-heading h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #0f1b2d;
  letter-spacing: -0.02em;
}

.page-heading p {
  margin: 6px 0 0;
  font-size: 14.5px;
  color: #5b6473;
}

.control-panel {
  border-radius: 14px;
  border: 1px solid rgba(15, 27, 45, 0.07);
  background: #ffffff;
  padding: 16px 20px;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 18px;
}

.search-box {
  flex: 1;
  min-width: 260px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.sort-box,
.manage-box {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.search-label,
.sort-box span {
  color: #5b6473;
  font-size: 11.5px;
  font-weight: 600;
}

.search-input-wrap {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: #5b6473;
  pointer-events: none;
}

.search-box input {
  width: 100%;
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(15, 27, 45, 0.07);
  background: #fafbfd;
  padding: 0 12px 0 34px;
  font-size: 13.5px;
  color: #0f1b2d;
  box-sizing: border-box;
  outline: none;
}

.sort-box select {
  height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(15, 27, 45, 0.07);
  background: #fafbfd;
  padding: 0 12px;
  font-size: 13.5px;
  color: #0f1b2d;
  appearance: none;
}

.manage-btn {
  height: 40px;
  border: 1px solid rgba(45, 108, 223, 0.2);
  border-radius: 10px;
  background: #eef4fe;
  color: #2d6cdf;
  font-weight: 700;
  font-size: 13.5px;
  padding: 0 14px;
  cursor: pointer;
}

.manage-btn:hover {
  background: #e0ebfd;
}

.search-box input:focus,
.sort-box select:focus {
  outline: none;
  border-color: rgba(45, 108, 223, 0.55);
  box-shadow: 0 0 0 3px rgba(45, 108, 223, 0.12);
}

.filter-tabs {
  display: inline-flex;
  border-radius: 10px;
  padding: 3px;
  background: #edf2f8;
  gap: 2px;
}

.tab-btn {
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #5b6473;
  padding: 6px 13px;
  font-weight: 500;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.tab-btn.active {
  background: #2d6cdf;
  color: #fff;
  font-weight: 700;
  box-shadow: 0 3px 8px -3px rgba(45, 108, 223, 0.4);
}

.loading-state,
.error-state,
.empty-state {
  border-radius: 14px;
  border: 1px dashed rgba(15, 27, 45, 0.12);
  background: #ffffff;
  padding: 36px;
  text-align: center;
  color: #5b6473;
}

.loading-state h2,
.error-state h2,
.empty-state h2 {
  margin: 0;
  color: #0f1b2d;
  font-size: 18px;
}

.loading-state p,
.error-state p,
.empty-state p {
  margin: 8px 0 0;
}

.retry-btn {
  margin-top: 16px;
  border: none;
  border-radius: 10px;
  height: 40px;
  padding: 0 16px;
  background: #2d6cdf;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.retry-btn:hover {
  background: #1d57c4;
}

.list-section {
  margin-bottom: 28px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 14px;
}

.section-head h2 {
  margin: 0;
  color: #0f1b2d;
  font-size: 17px;
  font-weight: 700;
}

.section-head span {
  color: #5b6473;
  font-size: 13px;
}

.section-empty {
  margin: 0;
  border-radius: 12px;
  border: 1px dashed rgba(15, 27, 45, 0.12);
  background: #ffffff;
  color: #5b6473;
  padding: 18px;
  font-size: 13.5px;
}

.debate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 14px;
}

.debate-card {
  border-radius: 14px;
  border: 1px solid rgba(15, 27, 45, 0.07);
  background: #ffffff;
  box-shadow:
    0 1px 0 rgba(15, 27, 45, 0.03),
    0 8px 20px -12px rgba(45, 108, 223, 0.18);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease,
    border-color 0.15s ease;
}

.debate-card:hover {
  transform: translateY(-2px);
  border-color: rgba(45, 108, 223, 0.22);
  box-shadow: 0 12px 28px -12px rgba(45, 108, 223, 0.22);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.card-badges {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex-wrap: wrap;
}

.card-top time {
  color: #5b6473;
  font-size: 12px;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-chip {
  height: 22px;
  border-radius: 999px;
  padding: 0 9px;
  font-size: 11.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-chip.upcoming {
  color: #2d6cdf;
  background: #eef4fe;
  border: 1px solid rgba(45, 108, 223, 0.11);
}

.status-chip.completed {
  color: #5b6473;
  background: #edf0f5;
  border: 1px solid rgba(15, 27, 45, 0.1);
}

.type-chip {
  height: 22px;
  border-radius: 999px;
  padding: 0 9px;
  font-size: 11.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  border: 1px solid transparent;
  white-space: nowrap;
  flex-shrink: 0;
}

.type-chip.free {
  color: #924e12;
  background: #fef3e7;
  border-color: #eec89a;
}

.type-chip.ssu {
  color: #186149;
  background: #e7f7ee;
  border-color: #b4e1cd;
}

.debate-card h3 {
  margin: 0;
  color: #0f1b2d;
  line-height: 1.4;
  font-size: 15.5px;
  font-weight: 700;
}

.card-meta {
  margin: 0;
  color: #5b6473;
  font-size: 13px;
}

.participants {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  align-items: center;
}

.participants span {
  border-radius: 999px;
  padding: 2px 9px;
  font-size: 12px;
  border: 1px solid rgba(15, 27, 45, 0.09);
  color: #0f1b2d;
  background: #f4f7fc;
}

.participants .overflow {
  background: transparent;
  border-color: transparent;
  color: #5b6473;
  padding: 2px 4px;
}

.side-participants {
  display: grid;
  gap: 6px;
}

.side-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}

.side-pill {
  height: 20px;
  border-radius: 999px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.side-pill.pro {
  color: #1f5b95;
  background: #e6f0ff;
  border: 1px solid #bed3ee;
}

.side-pill.con {
  color: #8f3d3d;
  background: #ffecec;
  border: 1px solid #f0c9c9;
}

.card-footer {
  margin-top: auto;
  padding-top: 10px;
  border-top: 1px solid rgba(15, 27, 45, 0.07);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.video-link-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(45, 108, 223, 0.18);
  background: #eef4fe;
  color: #2d6cdf;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}

.video-link-btn:hover {
  background: #e0ebfd;
}

.video-link-btn svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.card-actions {
  display: flex;
  margin-left: auto;
  gap: 8px;
}

.card-action-btn {
  height: 32px;
  border-radius: 8px;
  border: 1px solid rgba(15, 27, 45, 0.07);
  background: #fff;
  color: #0f1b2d;
  font-size: 12.5px;
  font-weight: 600;
  padding: 0 12px;
  cursor: pointer;
  transition: border-color 0.12s ease;
}

.card-action-btn.ghost:hover {
  border-color: rgba(45, 108, 223, 0.4);
  color: #2d6cdf;
}

.card-action-btn.danger {
  border-color: rgba(225, 29, 72, 0.2);
  background: #fff;
  color: #be123c;
}

.card-action-btn.danger:hover {
  background: #fff5f5;
}

.card-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .debate-page {
    padding: 24px 16px 36px;
  }

  .page-heading h1 {
    font-size: 22px;
  }

  .page-heading p {
    font-size: 13px;
  }

  .control-panel {
    flex-direction: column;
    align-items: stretch;
    padding: 14px 16px;
    gap: 10px;
  }

  .search-box {
    min-width: 0;
  }

  .filter-tabs {
    align-self: flex-start;
  }

  .debate-grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .debate-card {
    padding: 16px;
  }

  .debate-card h3 {
    font-size: 14.5px;
  }
}
</style>
