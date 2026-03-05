<template>
  <div class="debate-page">
    <section class="control-panel">
      <label class="search-box">
        <span class="search-label">검색</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="논제 또는 참가자 이름으로 검색"
          autocomplete="off"
        />
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
  --surface: #f7fbff;
  --surface-strong: #edf5ff;
  --line: rgba(77, 141, 219, 0.2);
  --text-strong: #0f2744;
  --text-subtle: #48607c;
  --accent: #2f6fb4;
  --accent-soft: #d7e7fb;
  min-height: 100vh;
  padding: 2rem;
  background:
    radial-gradient(circle at 0% 0%, rgba(86, 144, 216, 0.18), transparent 40%),
    radial-gradient(circle at 100% 100%, rgba(86, 144, 216, 0.14), transparent 34%),
    linear-gradient(160deg, #f5f9ff 0%, #f8fcff 55%, #eef5ff 100%);
}

.control-panel {
  max-width: 1100px;
  margin: 0 auto 1rem;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: #fffffff0;
  padding: 0.9rem;
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto auto;
  gap: 0.75rem;
  align-items: end;
}

.search-box,
.sort-box,
.manage-box {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.search-label,
.sort-box span {
  color: #4f6d8e;
  font-size: 0.8rem;
  font-weight: 700;
}

.manage-box {
  justify-content: flex-end;
}

.search-box input,
.sort-box select {
  height: 42px;
  border-radius: 10px;
  border: 1px solid #d2e3f8;
  background: #fafdff;
  padding: 0 0.75rem;
  font-size: 0.95rem;
}

.manage-btn {
  height: 42px;
  border: 1px solid #b9d4f1;
  border-radius: 10px;
  background: linear-gradient(135deg, #eff6ff, #e1edff);
  color: #274d78;
  font-weight: 700;
  cursor: pointer;
}

.manage-btn:hover {
  filter: brightness(0.98);
}

.search-box input:focus,
.sort-box select:focus {
  outline: none;
  border-color: #7ca8db;
  box-shadow: 0 0 0 3px rgba(76, 137, 213, 0.15);
}

.filter-tabs {
  display: inline-flex;
  border-radius: 12px;
  padding: 0.25rem;
  background: var(--surface-strong);
  border: 1px solid var(--line);
  gap: 0.25rem;
}

.tab-btn {
  border: none;
  border-radius: 9px;
  background: transparent;
  color: #4d6788;
  padding: 0.55rem 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.tab-btn.active {
  background: var(--accent);
  color: #fff;
  box-shadow: 0 4px 10px rgba(47, 111, 180, 0.32);
}

.loading-state,
.error-state,
.empty-state {
  max-width: 1100px;
  margin: 0 auto;
  border-radius: 14px;
  border: 1px dashed #b7cfec;
  background: #ffffffd9;
  padding: 2.2rem;
  text-align: center;
  color: #4d6481;
}

.loading-state h2,
.error-state h2,
.empty-state h2 {
  margin: 0;
  color: #26486f;
  font-size: 1.2rem;
}

.loading-state p,
.error-state p,
.empty-state p {
  margin: 0.55rem 0 0;
}

.retry-btn {
  margin-top: 1rem;
  border: none;
  border-radius: 10px;
  height: 40px;
  padding: 0 1rem;
  background: var(--accent);
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.retry-btn:hover {
  filter: brightness(1.05);
}

.list-section {
  max-width: 1100px;
  margin: 0 auto 1.2rem;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 0.8rem;
}

.section-head h2 {
  margin: 0;
  color: #17395f;
  font-size: 1.15rem;
}

.section-head span {
  color: #5b7594;
  font-size: 0.9rem;
}

.section-empty {
  margin: 0;
  border-radius: 12px;
  border: 1px dashed #c2d8f2;
  background: #ffffffcf;
  color: #5f7691;
  padding: 1.2rem;
}

.debate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.8rem;
}

.debate-card {
  border-radius: 14px;
  border: 1px solid var(--line);
  background: #fff;
  box-shadow: 0 8px 22px rgba(30, 73, 119, 0.08);
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  transition:
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.debate-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(30, 73, 119, 0.14);
}

.debate-card.upcoming {
  background: linear-gradient(155deg, #ffffff 0%, #f5fbff 100%);
}

.debate-card.completed {
  background: linear-gradient(155deg, #ffffff 0%, #f8faff 100%);
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
  gap: 0.35rem;
  flex-wrap: nowrap;
}

.card-top time {
  color: #5a7290;
  font-size: 0.82rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-chip {
  height: 24px;
  border-radius: 999px;
  padding: 0 0.65rem;
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-chip.upcoming {
  color: #0f5a9d;
  background: var(--accent-soft);
  border: 1px solid #aac7ec;
}

.status-chip.completed {
  color: #5c6775;
  background: #edf0f4;
  border: 1px solid #d6dce5;
}

.type-chip {
  height: 24px;
  border-radius: 999px;
  padding: 0 0.65rem;
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  border: 1px solid transparent;
  white-space: nowrap;
  flex-shrink: 0;
}

.type-chip.free {
  color: #1e5a95;
  background: #e8f2ff;
  border-color: #b9d2ef;
}

.type-chip.ssu {
  color: #186149;
  background: #e7f8ef;
  border-color: #b4e1cd;
}

.debate-card h3 {
  margin: 0;
  color: #1b3f68;
  line-height: 1.45;
  font-size: 1rem;
}

.card-meta {
  margin: 0;
  color: #5e7592;
  font-size: 0.87rem;
}

.participants {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.participants span {
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  font-size: 0.78rem;
  border: 1px solid #d5e5f8;
  color: #335577;
  background: #f4f9ff;
}

.participants .overflow {
  background: #eef2f8;
  border-color: #d8e0eb;
  color: #56657a;
}

.side-participants {
  display: grid;
  gap: 0.35rem;
}

.side-row {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 0.4rem;
}

.side-pill {
  height: 22px;
  border-radius: 999px;
  padding: 0 0.55rem;
  font-size: 0.72rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
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

.card-actions {
  margin-top: 0.25rem;
  padding-top: 0.65rem;
  border-top: 1px solid #e2ecf9;
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
}

.card-action-btn {
  height: 32px;
  border-radius: 8px;
  border: 1px solid #c7dbf3;
  background: #f5faff;
  color: #2f5b89;
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0 0.7rem;
  cursor: pointer;
}

.card-action-btn.ghost:hover {
  background: #edf5ff;
}

.card-action-btn.danger {
  border-color: #efcdcd;
  background: #fff5f5;
  color: #8f3a3a;
}

.card-action-btn.danger:hover {
  background: #ffecec;
}

.card-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .debate-page {
    padding: 1rem;
  }

  .control-panel {
    grid-template-columns: 1fr;
  }
}
</style>
