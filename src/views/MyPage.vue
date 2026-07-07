<template>
  <div class="mypage">
    <header class="page-heading">
      <h1>마이페이지</h1>
      <p>내 정보와 토론 전적을 확인하세요.</p>
    </header>

    <section class="profile-card">
      <div class="profile-main">
        <div class="avatar">{{ userName.slice(0, 1) || '?' }}</div>
        <div class="profile-info">
          <h2>
            {{ userName }}
            <span v-if="isAdmin" class="role-badge">관리자</span>
          </h2>
          <p>{{ profileLine }}</p>
        </div>
      </div>
      <router-link to="/change-password" class="pw-btn">비밀번호 변경</router-link>
    </section>

    <section class="stats-row">
      <div class="stat-card">
        <span class="stat-label">참여 토론</span>
        <strong>{{ myDebates.length }}</strong>
      </div>
      <div class="stat-card win">
        <span class="stat-label">승리</span>
        <strong>{{ winCount }}</strong>
      </div>
      <div class="stat-card loss">
        <span class="stat-label">패배</span>
        <strong>{{ lossCount }}</strong>
      </div>
      <div class="stat-card">
        <span class="stat-label">승률</span>
        <strong>{{ winRateLabel }}</strong>
      </div>
    </section>

    <section class="debate-section">
      <div class="section-head">
        <h2>내 토론 목록</h2>
        <span>{{ myDebates.length }}건</span>
      </div>

      <p v-if="loading" class="state-line">토론 목록을 불러오는 중입니다.</p>
      <p v-else-if="loadError" class="state-line error">{{ loadError }}</p>
      <p v-else-if="myDebates.length === 0" class="state-line">
        아직 참여한 토론이 없습니다. 토론에 참여하면 이곳에 기록이 쌓입니다.
      </p>

      <ul v-else class="debate-list">
        <li v-for="debate in myDebates" :key="debate.debate_id" class="debate-row">
          <div class="row-main">
            <span class="result-chip" :class="debate.result">
              {{ resultLabel(debate.result) }}
            </span>
            <span class="side-chip" :class="debate.side">
              {{ debate.side === 'pro' ? '찬성' : '반대' }}
            </span>
            <span class="topic">{{ debate.topic }}</span>
          </div>
          <div class="row-meta">
            <span class="type">{{ debate.debate_type }}</span>
            <time>{{ formatDate(debate.date) }}</time>
          </div>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/lib/auth'
import { fetchMyDebates, type MyDebate } from '@/lib/members'

const router = useRouter()
const { isLoggedIn, isAdmin, userName, userStudentId, userMajor } = useAuth()

const myDebates = ref<MyDebate[]>([])
const loading = ref(true)
const loadError = ref('')

const profileLine = computed(() => {
  const parts = [userStudentId.value, userMajor.value].filter((v) => !!v?.trim())
  return parts.length > 0 ? parts.join(' · ') : '프로필 정보 미입력'
})

const winCount = computed(() => myDebates.value.filter((d) => d.result === 'win').length)
const lossCount = computed(() => myDebates.value.filter((d) => d.result === 'loss').length)

const winRateLabel = computed(() => {
  const decided = winCount.value + lossCount.value
  if (decided === 0) return '-'
  return `${Math.round((winCount.value / decided) * 100)}%`
})

const resultLabel = (result: MyDebate['result']): string => {
  if (result === 'win') return '승'
  if (result === 'loss') return '패'
  return '미기록'
}

const formatDate = (ymd: string): string => {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(y, m - 1, d))
}

onMounted(async () => {
  if (!isLoggedIn.value) {
    router.replace('/login')
    return
  }
  try {
    myDebates.value = await fetchMyDebates()
  } catch (error: any) {
    loadError.value = error?.message || '토론 목록 조회에 실패했습니다.'
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.mypage {
  min-height: calc(100vh - 80px);
  padding: 44px 32px 56px;
  background: #f6f8fc;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
}

.page-heading {
  margin-bottom: 24px;
}

.page-heading h1 {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: #0f1b2d;
}

.page-heading p {
  margin: 6px 0 0;
  font-size: 14.5px;
  color: #5b6473;
}

.profile-card {
  border-radius: 14px;
  border: 1px solid rgba(15, 27, 45, 0.07);
  background: #fff;
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.profile-main {
  display: flex;
  align-items: center;
  gap: 14px;
}

.avatar {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #eef4fe;
  color: #2d6cdf;
  font-weight: 800;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.profile-info h2 {
  margin: 0;
  font-size: 18px;
  color: #0f1b2d;
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-badge {
  height: 20px;
  padding: 0 8px;
  border-radius: 999px;
  background: #e7f7ee;
  border: 1px solid #b4e1cd;
  color: #166347;
  font-size: 11px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
}

.profile-info p {
  margin: 4px 0 0;
  color: #5b6473;
  font-size: 13.5px;
}

.pw-btn {
  height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  border: 1px solid rgba(45, 108, 223, 0.2);
  background: #eef4fe;
  color: #2d6cdf;
  font-weight: 700;
  font-size: 13.5px;
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}

.pw-btn:hover {
  background: #e0ebfd;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 14px;
  border: 1px solid rgba(15, 27, 45, 0.07);
  background: #fff;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stat-label {
  color: #5b6473;
  font-size: 12.5px;
  font-weight: 600;
}

.stat-card strong {
  font-size: 24px;
  color: #0f1b2d;
}

.stat-card.win strong {
  color: #1d7a57;
}

.stat-card.loss strong {
  color: #be123c;
}

.debate-section {
  border-radius: 14px;
  border: 1px solid rgba(15, 27, 45, 0.07);
  background: #fff;
  padding: 20px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 12px;
}

.section-head h2 {
  margin: 0;
  color: #0f1b2d;
  font-size: 17px;
}

.section-head span {
  color: #5b6473;
  font-size: 13px;
}

.state-line {
  margin: 8px 0 0;
  color: #5b6473;
  font-size: 13.5px;
}

.state-line.error {
  color: #b91c1c;
}

.debate-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.debate-row {
  padding: 12px 4px;
  border-bottom: 1px solid rgba(15, 27, 45, 0.06);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.debate-row:last-child {
  border-bottom: none;
}

.row-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.result-chip {
  width: 44px;
  height: 24px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.result-chip.win {
  background: #e7f7ee;
  border: 1px solid #b4e1cd;
  color: #166347;
}

.result-chip.loss {
  background: #ffecec;
  border: 1px solid #f0c9c9;
  color: #8f3d3d;
}

.result-chip.pending {
  background: #f0f3f6;
  border: 1px solid #d9e0e7;
  color: #5b6773;
}

.side-chip {
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
}

.side-chip.pro {
  color: #1f5b95;
  background: #e6f0ff;
  border: 1px solid #bed3ee;
}

.side-chip.con {
  color: #8f3d3d;
  background: #ffecec;
  border: 1px solid #f0c9c9;
}

.topic {
  color: #0f1b2d;
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
}

.row-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #5b6473;
  font-size: 12.5px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .mypage {
    padding: 24px 16px 36px;
  }

  .stats-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
