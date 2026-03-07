<template>
  <div class="manage-page">
    <section v-if="!isAuthReady" class="state-card">
      <h2>권한 확인 중</h2>
      <p>잠시만 기다려주세요.</p>
    </section>

    <section v-else-if="!isAdmin" class="state-card denied">
      <h2>접근 권한이 없습니다</h2>
      <p>관리자 계정으로 로그인한 경우에만 토론 관리 페이지를 사용할 수 있습니다.</p>
      <router-link class="go-link" to="/record">토론 목록으로 이동</router-link>
    </section>

    <template v-else>
      <section class="head">
        <div>
          <p class="eyebrow">Admin Workspace</p>
          <h1>토론 관리</h1>
          <p>새 토론 생성, 기존 토론 수정/삭제를 수행할 수 있습니다.</p>
        </div>
        <div class="head-actions">
          <button type="button" class="btn ghost" :disabled="loading" @click="loadDebates">새로고침</button>
          <router-link class="btn ghost" to="/record">토론 목록</router-link>
        </div>
      </section>

      <section class="editor">
        <h2>{{ editingId ? '토론 수정' : '새 토론 생성' }}</h2>
        <form class="form" @submit.prevent="submitForm">
          <label>
            <span>논제</span>
            <input v-model="form.topic" type="text" placeholder="토론 논제를 입력하세요" required />
          </label>

          <div class="row">
            <label>
              <span>토론 날짜</span>
              <input v-model="form.date" type="date" required />
            </label>
            <label>
              <span>토론 유형</span>
              <select v-model="form.debateType">
                <option value="자유토론">자유토론</option>
                <option value="SSU토론">SSU토론</option>
              </select>
            </label>
          </div>

          <label>
            <span>영상 URL (선택)</span>
            <input
              v-model="form.videoUrl"
              type="text"
              placeholder="https://www.youtube.com/watch?v=..."
              autocomplete="off"
            />
          </label>

          <div class="participant-editor">
            <div class="participant-head">
              <strong>토론 참가자</strong>
              <span>찬성/반대 진영을 나눠서 등록하세요.</span>
            </div>

            <div class="side-panels">
              <section v-for="side in participantSides" :key="side.key" class="side-panel" :class="side.key">
                <div class="side-title">
                  <h3>{{ side.label }}</h3>
                  <span>{{ form.participantsBySide[side.key].length }}명</span>
                </div>

                <div class="add-row">
                  <input
                    v-model="participantQuery[side.key]"
                    type="text"
                    :placeholder="side.placeholder"
                    autocomplete="off"
                    @input="onParticipantQueryChange(side.key)"
                    @keydown.enter.prevent="addManualParticipant(side.key)"
                  />
                  <button
                    type="button"
                    class="btn ghost add-direct"
                    :disabled="!participantQuery[side.key].trim()"
                    @click="addManualParticipant(side.key)"
                  >
                    직접 추가
                  </button>
                </div>

                <p class="helper">회원 DB에서 이름 검색 후 선택하거나, 후보가 없으면 직접 추가하세요.</p>

                <div v-if="participantQuery[side.key].trim()" class="candidate-box">
                  <p v-if="candidateLoading[side.key]" class="candidate-state">검색 중...</p>
                  <p v-else-if="candidateError[side.key]" class="candidate-state error">{{ candidateError[side.key] }}</p>
                  <ul v-else-if="candidateItems[side.key].length > 0" class="candidate-list">
                    <li v-for="candidate in candidateItems[side.key]" :key="candidate.id">
                      <button
                        type="button"
                        class="candidate-item"
                        :title="candidateTooltip(candidate)"
                        @click="addCandidateParticipant(side.key, candidate)"
                      >
                        <strong>{{ candidate.name }}</strong>
                        <span>{{ candidate.studentId || '학번 미입력' }} · {{ candidate.major || '학과 미입력' }}</span>
                      </button>
                    </li>
                  </ul>
                  <p v-else class="candidate-state">검색 결과가 없습니다. 그대로 직접 추가할 수 있습니다.</p>
                </div>

                <div class="added-list">
                  <p v-if="form.participantsBySide[side.key].length === 0" class="empty-added">아직 등록된 참가자가 없습니다.</p>
                  <div v-else class="added-chips">
                    <div
                      v-for="(participant, index) in form.participantsBySide[side.key]"
                      :key="participantChipKey(side.key, participant, index)"
                      class="added-chip"
                      :title="participantTooltip(participant)"
                    >
                      <span>{{ participant.name }}</span>
                      <small v-if="participant.userId">회원</small>
                      <button type="button" @click="removeParticipant(side.key, index)">×</button>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <label>
            <span>메모 (선택)</span>
            <textarea
              v-model="form.notes"
              rows="3"
              placeholder="토론 준비사항이나 비고를 입력하세요"
            />
          </label>

          <div class="form-actions">
            <button type="button" class="btn ghost" :disabled="submitting" @click="resetForm">초기화</button>
            <button type="submit" class="btn primary" :disabled="submitting">
              {{ submitting ? '저장 중...' : editingId ? '수정 저장' : '토론 생성' }}
            </button>
          </div>
        </form>
      </section>

      <section class="list">
        <div class="list-head">
          <h2>토론 목록</h2>
          <span>{{ debates.length }}건</span>
        </div>

        <p v-if="loading" class="state-line">목록을 불러오는 중입니다.</p>
        <p v-else-if="loadError" class="state-line error">{{ loadError }}</p>
        <p v-else-if="debates.length === 0" class="state-line">등록된 토론이 없습니다.</p>

        <div v-else class="cards">
          <article v-for="debate in debates" :key="debate.id" class="card">
            <div class="card-head">
              <div class="chips">
                <span class="chip type" :class="debate.debateType === 'SSU토론' ? 'ssu' : 'free'">
                  {{ debate.debateType }}
                </span>
                <span class="chip status" :class="debateStatus(debate.date)">
                  {{ debateStatus(debate.date) === 'upcoming' ? '예정' : '완료' }}
                </span>
              </div>
              <time>{{ formatDate(debate.date) }}</time>
            </div>

            <h3>{{ debate.topic }}</h3>
            <p class="meta">
              참가자 {{ debate.participants.length }}명 · 찬성 {{ debate.participantsBySide.pro.length }}명 · 반대
              {{ debate.participantsBySide.con.length }}명
            </p>

            <div class="side-preview">
              <div class="side-preview-row">
                <span class="side-badge pro">찬성</span>
                <div class="participants">
                  <span v-for="name in previewParticipantsBySide(debate, 'pro')" :key="`${debate.id}-pro-${name}`">
                    {{ name }}
                  </span>
                  <span v-if="overflowParticipantsBySide(debate, 'pro') > 0" class="more">
                    +{{ overflowParticipantsBySide(debate, 'pro') }}
                  </span>
                </div>
              </div>

              <div class="side-preview-row">
                <span class="side-badge con">반대</span>
                <div class="participants">
                  <span v-for="name in previewParticipantsBySide(debate, 'con')" :key="`${debate.id}-con-${name}`">
                    {{ name }}
                  </span>
                  <span v-if="overflowParticipantsBySide(debate, 'con') > 0" class="more">
                    +{{ overflowParticipantsBySide(debate, 'con') }}
                  </span>
                </div>
              </div>
            </div>

            <p v-if="debate.notes" class="notes">{{ debate.notes }}</p>

            <div class="card-actions">
              <button type="button" class="btn ghost" @click="startEdit(debate)">수정</button>
              <button type="button" class="btn danger" @click="removeDebate(debate.id)">삭제</button>
            </div>
          </article>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  createDebateItem,
  deleteDebateItem,
  listDebateAdminItems,
  searchMemberCandidatesByName,
  type DebateAdminItem,
  type DebateParticipantsBySide,
  type DebateSide,
  type DebateSideMap,
  type DebateType,
  type MemberSearchCandidate,
  updateDebateItem,
} from '@/lib/debates'
import { useAuth } from '@/lib/auth'

const participantSides: Array<{ key: DebateSide; label: string; placeholder: string }> = [
  { key: 'pro', label: '찬성 측', placeholder: '찬성 측 참가자 이름 검색 또는 직접 입력' },
  { key: 'con', label: '반대 측', placeholder: '반대 측 참가자 이름 검색 또는 직접 입력' },
]

const { isAdmin, isAuthReady } = useAuth()
const route = useRoute()

const debates = ref<DebateAdminItem[]>([])
const loading = ref(true)
const loadError = ref('')
const submitting = ref(false)
const editingId = ref<string | null>(null)

const today = new Date()
today.setHours(0, 0, 0, 0)

type FormParticipant = {
  name: string
  userId: string | null
  major: string
  studentId: string
  generation: string
}

const buildEmptyForm = () => ({
  topic: '',
  date: '',
  debateType: '자유토론' as DebateType,
  videoUrl: '',
  participantsBySide: {
    pro: [],
    con: [],
  } as DebateParticipantsBySide<FormParticipant>,
  notes: '',
})

const form = ref(buildEmptyForm())

const participantQuery = reactive<DebateSideMap<string>>({
  pro: '',
  con: '',
})

const candidateItems = reactive<DebateSideMap<MemberSearchCandidate[]>>({
  pro: [],
  con: [],
})

const candidateLoading = reactive<DebateSideMap<boolean>>({
  pro: false,
  con: false,
})

const candidateError = reactive<DebateSideMap<string>>({
  pro: '',
  con: '',
})

const candidateRequestSeq = reactive<DebateSideMap<number>>({
  pro: 0,
  con: 0,
})

const searchTimers: Partial<Record<DebateSide, ReturnType<typeof setTimeout>>> = {}

const sideLabel = (side: DebateSide): string => (side === 'pro' ? '찬성 측' : '반대 측')

const clearCandidateState = (side: DebateSide) => {
  candidateItems[side] = []
  candidateError[side] = ''
  candidateLoading[side] = false
}

const clearAllCandidateState = () => {
  clearCandidateState('pro')
  clearCandidateState('con')
  participantQuery.pro = ''
  participantQuery.con = ''
}

const participantChipKey = (side: DebateSide, participant: FormParticipant, index: number): string => {
  return `${side}-${participant.userId ?? 'manual'}-${participant.name}-${index}`
}

const participantTooltip = (participant: FormParticipant): string => {
  const major = participant.major || '미입력'
  const studentId = participant.studentId || '미입력'
  const generation = participant.generation || '미입력'
  const source = participant.userId ? '회원 DB 연결' : '직접 입력'
  return `학과: ${major} | 학번: ${studentId} | 기수: ${generation} | ${source}`
}

const candidateTooltip = (candidate: MemberSearchCandidate): string => {
  const major = candidate.major || '미입력'
  const studentId = candidate.studentId || '미입력'
  const generation = candidate.generation || '미입력'
  return `학과: ${major} | 학번: ${studentId} | 기수: ${generation}`
}

const hasParticipantUserId = (userId: string): DebateSide | null => {
  for (const side of participantSides.map((item) => item.key)) {
    if (form.value.participantsBySide[side].some((participant) => participant.userId === userId)) {
      return side
    }
  }
  return null
}

const addParticipant = (side: DebateSide, participant: FormParticipant) => {
  const name = participant.name.trim()
  if (!name) return

  if (participant.userId) {
    const existingSide = hasParticipantUserId(participant.userId)
    if (existingSide) {
      alert(`이미 ${sideLabel(existingSide)}에 등록된 회원입니다.`)
      return
    }
  } else {
    const duplicateManual = form.value.participantsBySide[side].some(
      (item) => !item.userId && item.name.trim().toLowerCase() === name.toLowerCase(),
    )
    if (duplicateManual) {
      alert('같은 이름의 직접 입력 참가자가 이미 등록되어 있습니다.')
      return
    }
  }

  form.value.participantsBySide[side].push({
    ...participant,
    name,
    userId: participant.userId || null,
    major: participant.major?.trim() || '',
    studentId: participant.studentId?.trim() || '',
    generation: participant.generation?.trim() || '',
  })
}

const addManualParticipant = (side: DebateSide) => {
  const name = participantQuery[side].trim()
  if (!name) return

  addParticipant(side, {
    name,
    userId: null,
    major: '',
    studentId: '',
    generation: '',
  })

  participantQuery[side] = ''
  clearCandidateState(side)
}

const addCandidateParticipant = (side: DebateSide, candidate: MemberSearchCandidate) => {
  addParticipant(side, {
    name: candidate.name,
    userId: candidate.id,
    major: candidate.major,
    studentId: candidate.studentId,
    generation: candidate.generation,
  })

  participantQuery[side] = ''
  clearCandidateState(side)
}

const removeParticipant = (side: DebateSide, index: number) => {
  form.value.participantsBySide[side].splice(index, 1)
}

const onParticipantQueryChange = (side: DebateSide) => {
  candidateError[side] = ''

  if (searchTimers[side]) {
    clearTimeout(searchTimers[side])
    delete searchTimers[side]
  }

  const keyword = participantQuery[side].trim()
  if (!keyword) {
    clearCandidateState(side)
    return
  }

  const requestId = candidateRequestSeq[side] + 1
  candidateRequestSeq[side] = requestId

  searchTimers[side] = setTimeout(async () => {
    candidateLoading[side] = true
    candidateError[side] = ''

    try {
      const candidates = await searchMemberCandidatesByName(keyword, 8)
      if (candidateRequestSeq[side] !== requestId) return
      candidateItems[side] = candidates
    } catch (error: any) {
      if (candidateRequestSeq[side] !== requestId) return
      candidateItems[side] = []
      candidateError[side] = error?.message || '회원 검색에 실패했습니다. 직접 입력을 사용해주세요.'
    } finally {
      if (candidateRequestSeq[side] === requestId) {
        candidateLoading[side] = false
      }
    }
  }, 220)
}

const fillForm = (debate: DebateAdminItem) => {
  const nextPro = debate.participantEntries
    .filter((participant) => participant.side === 'pro')
    .map((participant) => ({
      name: participant.name,
      userId: participant.userId,
      major: participant.major,
      studentId: participant.studentId,
      generation: participant.generation,
    }))

  const nextCon = debate.participantEntries
    .filter((participant) => participant.side === 'con')
    .map((participant) => ({
      name: participant.name,
      userId: participant.userId,
      major: participant.major,
      studentId: participant.studentId,
      generation: participant.generation,
    }))

  if (nextPro.length === 0 && debate.participantsBySide.pro.length > 0) {
    for (const name of debate.participantsBySide.pro) {
      nextPro.push({ name, userId: null, major: '', studentId: '', generation: '' })
    }
  }

  if (nextCon.length === 0 && debate.participantsBySide.con.length > 0) {
    for (const name of debate.participantsBySide.con) {
      nextCon.push({ name, userId: null, major: '', studentId: '', generation: '' })
    }
  }

  form.value = {
    topic: debate.topic,
    date: debate.date,
    debateType: debate.debateType,
    videoUrl: debate.videoUrl ?? '',
    participantsBySide: {
      pro: nextPro,
      con: nextCon,
    },
    notes: debate.notes ?? '',
  }

  clearAllCandidateState()
}

const resetForm = () => {
  editingId.value = null
  form.value = buildEmptyForm()
  clearAllCandidateState()
}

const loadDebates = async () => {
  if (!isAdmin.value) return
  loading.value = true
  loadError.value = ''
  try {
    debates.value = await listDebateAdminItems()
    applyEditFromQuery()
  } catch (error: any) {
    loadError.value = error?.message || '토론 목록 조회에 실패했습니다.'
    debates.value = []
  } finally {
    loading.value = false
  }
}

const startEdit = (debate: DebateAdminItem) => {
  editingId.value = debate.id
  fillForm(debate)
}

const applyEditFromQuery = () => {
  const editId = typeof route.query.edit === 'string' ? route.query.edit : ''
  if (!editId) return
  const debate = debates.value.find((item) => item.id === editId)
  if (debate) startEdit(debate)
}

const serializeParticipants = (
  entries: FormParticipant[],
): Array<{ name: string; userId: string | null }> => {
  const out: Array<{ name: string; userId: string | null }> = []
  const uniq = new Set<string>()

  for (const entry of entries) {
    const name = entry.name.trim()
    if (!name) continue

    const userId = entry.userId?.trim() || null
    const dedupeKey = userId ? `u:${userId}` : `n:${name.toLowerCase()}`
    if (uniq.has(dedupeKey)) continue
    uniq.add(dedupeKey)

    out.push({
      name,
      userId,
    })
  }

  return out
}

const submitForm = async () => {
  if (!isAdmin.value) return

  const proCount = form.value.participantsBySide.pro.length
  const conCount = form.value.participantsBySide.con.length
  if (proCount === 0 || conCount === 0) {
    alert('찬성 측과 반대 측 참가자를 각각 1명 이상 등록해주세요.')
    return
  }

  submitting.value = true
  try {
    const payload = {
      topic: form.value.topic,
      date: form.value.date,
      debateType: form.value.debateType,
      participantsBySide: {
        pro: serializeParticipants(form.value.participantsBySide.pro),
        con: serializeParticipants(form.value.participantsBySide.con),
      },
      notes: form.value.notes,
      videoUrl: form.value.videoUrl,
    }

    if (editingId.value) {
      await updateDebateItem(editingId.value, payload)
    } else {
      await createDebateItem(payload)
    }

    await loadDebates()
    resetForm()
  } catch (error: any) {
    alert(error?.message || '저장 중 오류가 발생했습니다.')
  } finally {
    submitting.value = false
  }
}

const removeDebate = async (id: string) => {
  if (!isAdmin.value) return
  if (!confirm('이 토론을 삭제하시겠습니까?')) return
  try {
    await deleteDebateItem(id)
    if (editingId.value === id) resetForm()
    await loadDebates()
  } catch (error: any) {
    alert(error?.message || '삭제 중 오류가 발생했습니다.')
  }
}

const parseYmd = (ymd: string): Date => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

const debateStatus = (ymd: string): 'upcoming' | 'completed' => {
  return parseYmd(ymd) >= today ? 'upcoming' : 'completed'
}

const formatDate = (ymd: string): string => {
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    weekday: 'short',
  }).format(parseYmd(ymd))
}

const previewParticipantsBySide = (debate: DebateAdminItem, side: DebateSide): string[] => {
  const names = debate.participantsBySide[side]
  if (names.length === 0) return ['미정']
  return names.slice(0, 4)
}

const overflowParticipantsBySide = (debate: DebateAdminItem, side: DebateSide): number => {
  return Math.max(0, debate.participantsBySide[side].length - 4)
}

onMounted(() => {
  void loadDebates()
})

watch(
  () => route.query.edit,
  () => {
    applyEditFromQuery()
  },
)

onBeforeUnmount(() => {
  for (const side of ['pro', 'con'] as DebateSide[]) {
    if (searchTimers[side]) {
      clearTimeout(searchTimers[side])
      delete searchTimers[side]
    }
  }
})
</script>

<style scoped>
.manage-page {
  min-height: 100vh;
  padding: 1.5rem;
  background:
    radial-gradient(circle at 0% 0%, rgba(66, 142, 107, 0.16), transparent 35%),
    linear-gradient(160deg, #f5fbf8, #eef7f3);
}

.state-card {
  max-width: 860px;
  margin: 0 auto;
  border-radius: 14px;
  border: 1px dashed #bcd4c8;
  background: #fff;
  padding: 2rem;
  text-align: center;
  color: #3f5f52;
}

.state-card.denied {
  border-color: #efc7c7;
  color: #7c3a3a;
}

.go-link {
  display: inline-block;
  margin-top: 1rem;
  text-decoration: none;
  color: #1d7f5a;
  font-weight: 700;
}

.head {
  max-width: 1100px;
  margin: 0 auto 1rem;
  border-radius: 14px;
  border: 1px solid #b8d5c8;
  background: linear-gradient(140deg, #ffffff, #edf8f2);
  padding: 1rem 1.2rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.eyebrow {
  margin: 0;
  color: #2f7958;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.head h1 {
  margin: 0.3rem 0;
  color: #1e563e;
}

.head p {
  margin: 0;
  color: #4b6b5d;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.editor,
.list {
  max-width: 1100px;
  margin: 0 auto 1rem;
  border-radius: 14px;
  border: 1px solid #c0d9cd;
  background: #fff;
  padding: 1rem;
}

.editor h2,
.list h2 {
  margin: 0 0 0.8rem;
  color: #235d45;
}

.form {
  display: grid;
  gap: 0.75rem;
}

.row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

label {
  display: grid;
  gap: 0.35rem;
}

label span {
  color: #466858;
  font-size: 0.84rem;
  font-weight: 700;
}

input,
select,
textarea {
  border: 1px solid #cce0d6;
  border-radius: 10px;
  padding: 0.6rem 0.7rem;
  font-size: 0.94rem;
  background: #fafdff;
}

input:focus,
select:focus,
textarea:focus {
  outline: none;
  border-color: #7ab79a;
  box-shadow: 0 0 0 3px rgba(80, 151, 114, 0.16);
}

.participant-editor {
  border: 1px solid #d0e4d7;
  border-radius: 12px;
  background: #f9fdfb;
  padding: 0.85rem;
  display: grid;
  gap: 0.75rem;
}

.participant-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.5rem;
}

.participant-head strong {
  color: #295f48;
}

.participant-head span {
  color: #5f7d6e;
  font-size: 0.82rem;
}

.side-panels {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.side-panel {
  border: 1px solid #cce0d6;
  border-radius: 10px;
  background: #fff;
  padding: 0.75rem;
  display: grid;
  gap: 0.55rem;
}

.side-panel.pro {
  background: linear-gradient(170deg, #ffffff, #f3f8ff);
}

.side-panel.con {
  background: linear-gradient(170deg, #ffffff, #fff6f6);
}

.side-title {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.side-title h3 {
  margin: 0;
  font-size: 0.96rem;
  color: #2c5f49;
}

.side-title span {
  color: #5e7b6d;
  font-size: 0.8rem;
}

.add-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 0.45rem;
}

.add-direct {
  height: 40px;
}

.helper {
  margin: 0;
  color: #618274;
  font-size: 0.78rem;
}

.candidate-box {
  border: 1px solid #d7e7df;
  border-radius: 9px;
  background: #fefefe;
  max-height: 180px;
  overflow: auto;
}

.candidate-state {
  margin: 0;
  padding: 0.6rem 0.7rem;
  color: #5b7568;
  font-size: 0.82rem;
}

.candidate-state.error {
  color: #b02727;
}

.candidate-list {
  list-style: none;
  margin: 0;
  padding: 0.4rem;
  display: grid;
  gap: 0.3rem;
}

.candidate-item {
  width: 100%;
  border: 1px solid #d6e7dd;
  border-radius: 8px;
  background: #f8fcfa;
  padding: 0.5rem 0.55rem;
  text-align: left;
  cursor: pointer;
  display: grid;
  gap: 0.1rem;
}

.candidate-item:hover {
  border-color: #9ac5ae;
  background: #edf7f1;
}

.candidate-item strong {
  color: #2c6049;
  font-size: 0.88rem;
}

.candidate-item span {
  color: #5d7b6b;
  font-size: 0.75rem;
}

.added-list {
  border-top: 1px dashed #d5e5dc;
  padding-top: 0.5rem;
}

.empty-added {
  margin: 0;
  color: #718a7f;
  font-size: 0.82rem;
}

.added-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.added-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  border-radius: 999px;
  border: 1px solid #c8dfd2;
  background: #eef7f2;
  color: #295f48;
  padding: 0.2rem 0.35rem 0.2rem 0.55rem;
  font-size: 0.78rem;
}

.added-chip small {
  color: #6a8276;
  font-size: 0.68rem;
}

.added-chip button {
  border: none;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  background: #e2efe8;
  color: #315f4b;
  cursor: pointer;
  line-height: 1;
  padding: 0;
}

.added-chip button:hover {
  background: #d2e5db;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

.btn {
  border: none;
  border-radius: 10px;
  height: 38px;
  padding: 0 0.8rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn.ghost {
  background: #eef7f2;
  border: 1px solid #c7dfd2;
  color: #245d45;
}

.btn.primary {
  background: #1e7a57;
  color: #fff;
}

.btn.danger {
  background: #ef4444;
  color: #fff;
}

.btn:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.list-head span {
  color: #547564;
}

.state-line {
  color: #547564;
  margin: 0.4rem 0 0;
}

.state-line.error {
  color: #b42323;
}

.cards {
  margin-top: 0.8rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
}

.card {
  border: 1px solid #d2e5db;
  border-radius: 12px;
  padding: 0.9rem;
  background: linear-gradient(150deg, #fff, #f4faf7);
  box-shadow: 0 6px 14px rgba(24, 86, 59, 0.08);
}

.card-head {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
}

.chips {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.chip {
  height: 22px;
  border-radius: 999px;
  padding: 0 0.55rem;
  font-size: 0.75rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.chip.type.free {
  background: #e6f2ff;
  color: #235f96;
  border: 1px solid #bcd4ee;
}

.chip.type.ssu {
  background: #e6f8f0;
  color: #1f6a4d;
  border: 1px solid #bae0cd;
}

.chip.status.upcoming {
  background: #eef6ff;
  color: #285f97;
  border: 1px solid #c4daf0;
}

.chip.status.completed {
  background: #f0f3f6;
  color: #5b6773;
  border: 1px solid #d9e0e7;
}

.card time {
  color: #557162;
  font-size: 0.8rem;
}

.card h3 {
  margin: 0.55rem 0;
  color: #234f3d;
  line-height: 1.45;
}

.meta {
  margin: 0;
  color: #547564;
  font-size: 0.86rem;
}

.side-preview {
  margin-top: 0.55rem;
  display: grid;
  gap: 0.35rem;
}

.side-preview-row {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.4rem;
  align-items: center;
}

.side-badge {
  height: 22px;
  border-radius: 999px;
  padding: 0 0.6rem;
  display: inline-flex;
  align-items: center;
  font-size: 0.72rem;
  font-weight: 700;
}

.side-badge.pro {
  background: #e8f1ff;
  color: #255d93;
  border: 1px solid #c1d7ef;
}

.side-badge.con {
  background: #ffecec;
  color: #8f3a3a;
  border: 1px solid #f1c7c7;
}

.participants {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.participants span {
  background: #edf7f2;
  border: 1px solid #cce1d6;
  color: #2a6047;
  border-radius: 999px;
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
}

.participants .more {
  background: #f2f5f8;
  border-color: #d9e0e7;
  color: #617181;
}

.notes {
  margin: 0.55rem 0 0;
  color: #4d6859;
  font-size: 0.84rem;
  white-space: pre-wrap;
}

.card-actions {
  margin-top: 0.75rem;
  display: flex;
  justify-content: flex-end;
  gap: 0.4rem;
}

@media (max-width: 860px) {
  .side-panels {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 760px) {
  .manage-page {
    padding: 0.9rem;
  }

  .head {
    flex-direction: column;
  }

  .row {
    grid-template-columns: 1fr;
  }

  .participant-head {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
