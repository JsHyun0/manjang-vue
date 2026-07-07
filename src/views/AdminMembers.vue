<template>
  <div class="members-page">
    <section v-if="!isAuthReady" class="state-card">
      <h2>권한 확인 중</h2>
      <p>잠시만 기다려주세요.</p>
    </section>

    <section v-else-if="!isAdmin" class="state-card denied">
      <h2>접근 권한이 없습니다</h2>
      <p>관리자 계정으로 로그인한 경우에만 회원 관리 페이지를 사용할 수 있습니다.</p>
      <router-link class="go-link" to="/home">홈으로 이동</router-link>
    </section>

    <template v-else>
      <section class="head">
        <div>
          <p class="eyebrow">Admin Workspace</p>
          <h1>회원 관리</h1>
          <p>멤버 시트 동기화로 회원을 등록/갱신합니다. (매 학기 초 3월/9월 말 권장)</p>
        </div>
        <div class="head-actions">
          <button type="button" class="btn ghost" :disabled="membersLoading" @click="loadMembers">
            새로고침
          </button>
        </div>
      </section>

      <section class="sync-panel">
        <h2>멤버 시트 동기화</h2>
        <p class="sync-desc">
          구글 스프레드시트(서버에 설정된 명단 시트)를 읽어 신규 회원을 등록하고 기존 회원 정보를
          갱신합니다. 신규 회원의 초기 비밀번호는 <strong>학번</strong>이며, 최초 로그인 시 비밀번호
          변경이 강제됩니다. 시트에 없는 기존 회원은 변경하지 않습니다.
        </p>

        <div class="sync-actions">
          <button type="button" class="btn primary" :disabled="syncing" @click="runSheetSync">
            {{ syncing && syncSource === 'sheet' ? '동기화 중...' : '구글시트에서 동기화' }}
          </button>

          <div class="csv-fallback">
            <span>구글시트를 읽을 수 없다면 CSV 파일로 동기화하세요:</span>
            <input
              ref="csvInput"
              type="file"
              accept=".csv,text/csv"
              :disabled="syncing"
              @change="runCsvSync"
            />
          </div>
        </div>

        <p v-if="syncError" class="sync-error">{{ syncError }}</p>

        <div v-if="syncResult" class="sync-result">
          <h3>동기화 결과 ({{ syncResult.source === 'sheet' ? '구글시트' : 'CSV 파일' }})</h3>
          <ul class="result-summary">
            <li>
              시트 회원 수: <strong>{{ syncResult.total_rows }}</strong>
            </li>
            <li class="ok">
              신규 등록: <strong>{{ syncResult.created }}</strong>
            </li>
            <li>
              정보 갱신: <strong>{{ syncResult.updated }}</strong>
            </li>
            <li>
              변경 없음: <strong>{{ syncResult.unchanged }}</strong>
            </li>
          </ul>
          <p v-if="syncResult.created_names.length > 0" class="created-names">
            신규: {{ syncResult.created_names.join(', ') }}
          </p>
          <div v-if="syncResult.errors.length > 0" class="result-errors">
            <strong>오류 {{ syncResult.errors.length }}건</strong>
            <ul>
              <li v-for="(err, index) in syncResult.errors" :key="index">{{ err }}</li>
            </ul>
          </div>
        </div>
      </section>

      <section class="list-panel">
        <div class="list-head">
          <h2>회원 목록</h2>
          <span>{{ filteredMembers.length }} / {{ members.length }}명</span>
        </div>

        <input
          v-model="memberQuery"
          class="member-search"
          type="text"
          placeholder="이름, 학번, 학과 검색"
          autocomplete="off"
        />

        <p v-if="membersLoading" class="state-line">회원 목록을 불러오는 중입니다.</p>
        <p v-else-if="membersError" class="state-line error">{{ membersError }}</p>
        <p v-else-if="filteredMembers.length === 0" class="state-line">표시할 회원이 없습니다.</p>

        <div v-else class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>이름</th>
                <th>학번</th>
                <th>학과</th>
                <th>기수</th>
                <th>상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in filteredMembers" :key="member.id">
                <td>
                  {{ member.name }}
                  <span v-if="member.role === 'admin'" class="mini-badge admin">관리자</span>
                </td>
                <td>{{ member.student_id }}</td>
                <td>{{ member.major || '-' }}</td>
                <td>{{ member.generation || '-' }}</td>
                <td>
                  <span v-if="member.must_change_password" class="mini-badge pending">초기PW</span>
                  <span v-else class="mini-badge active">사용 중</span>
                </td>
                <td class="row-actions">
                  <button
                    type="button"
                    class="btn tiny danger"
                    :disabled="resettingId === member.id"
                    @click="resetPassword(member)"
                  >
                    {{ resettingId === member.id ? '초기화 중...' : '비밀번호 초기화' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useAuth } from '@/lib/auth'
import {
  fetchMembers,
  resetMemberPassword,
  syncMembers,
  type MemberProfile,
  type MemberSyncResult,
} from '@/lib/members'

const { isAdmin, isAuthReady } = useAuth()

const members = ref<MemberProfile[]>([])
const membersLoading = ref(false)
const membersError = ref('')
const memberQuery = ref('')

const syncing = ref(false)
const syncSource = ref<'sheet' | 'csv'>('sheet')
const syncError = ref('')
const syncResult = ref<MemberSyncResult | null>(null)
const resettingId = ref<string | null>(null)
const csvInput = ref<HTMLInputElement | null>(null)

const filteredMembers = computed(() => {
  const query = memberQuery.value.trim().toLowerCase()
  if (!query) return members.value
  return members.value.filter((member) => {
    return (
      member.name.toLowerCase().includes(query) ||
      member.student_id.toLowerCase().includes(query) ||
      (member.major || '').toLowerCase().includes(query) ||
      (member.generation || '').toLowerCase().includes(query)
    )
  })
})

const loadMembers = async () => {
  if (!isAdmin.value) return
  membersLoading.value = true
  membersError.value = ''
  try {
    members.value = await fetchMembers()
  } catch (error: any) {
    membersError.value = error?.message || '회원 목록 조회에 실패했습니다.'
    members.value = []
  } finally {
    membersLoading.value = false
  }
}

const runSync = async (input: { csvText?: string }) => {
  syncing.value = true
  syncError.value = ''
  syncResult.value = null
  try {
    syncResult.value = await syncMembers(input)
    await loadMembers()
  } catch (error: any) {
    syncError.value = error?.message || '동기화에 실패했습니다.'
  } finally {
    syncing.value = false
  }
}

const runSheetSync = async () => {
  if (!isAdmin.value || syncing.value) return
  if (!confirm('구글시트 명단으로 회원을 동기화하시겠습니까?')) return
  syncSource.value = 'sheet'
  await runSync({})
}

const runCsvSync = async (event: Event) => {
  if (!isAdmin.value || syncing.value) return
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!confirm(`'${file.name}' 파일로 회원을 동기화하시겠습니까?`)) {
    input.value = ''
    return
  }
  syncSource.value = 'csv'
  try {
    const csvText = await file.text()
    await runSync({ csvText })
  } finally {
    input.value = ''
  }
}

const resetPassword = async (member: MemberProfile) => {
  if (!isAdmin.value) return
  if (
    !confirm(
      `${member.name}(${member.student_id})의 비밀번호를 학번으로 초기화하시겠습니까?\n다음 로그인 시 비밀번호 변경이 강제됩니다.`,
    )
  ) {
    return
  }
  resettingId.value = member.id
  try {
    await resetMemberPassword(member.id)
    await loadMembers()
  } catch (error: any) {
    alert(error?.message || '비밀번호 초기화에 실패했습니다.')
  } finally {
    resettingId.value = null
  }
}

onMounted(() => {
  void loadMembers()
})

watch(isAdmin, (nextIsAdmin) => {
  if (nextIsAdmin && members.value.length === 0) {
    void loadMembers()
  }
})
</script>

<style scoped>
.members-page {
  min-height: 100vh;
  padding: 1.5rem;
  background:
    radial-gradient(circle at 0% 0%, rgba(66, 108, 142, 0.14), transparent 35%),
    linear-gradient(160deg, #f5f9fb, #eef4f7);
}

.state-card {
  max-width: 860px;
  margin: 0 auto;
  border-radius: 14px;
  border: 1px dashed #bccbd4;
  background: #fff;
  padding: 2rem;
  text-align: center;
  color: #3f545f;
}

.state-card.denied {
  border-color: #efc7c7;
  color: #7c3a3a;
}

.go-link {
  display: inline-block;
  margin-top: 1rem;
  text-decoration: none;
  color: #1d5f7f;
  font-weight: 700;
}

.head {
  max-width: 1100px;
  margin: 0 auto 1rem;
  border-radius: 14px;
  border: 1px solid #b8c9d5;
  background: linear-gradient(140deg, #ffffff, #edf4f8);
  padding: 1rem 1.2rem;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.eyebrow {
  margin: 0;
  color: #2f5f79;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.head h1 {
  margin: 0.3rem 0;
  color: #1e4256;
}

.head p {
  margin: 0;
  color: #4b5f6b;
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.sync-panel,
.list-panel {
  max-width: 1100px;
  margin: 0 auto 1rem;
  border-radius: 14px;
  border: 1px solid #c0d1dc;
  background: #fff;
  padding: 1rem 1.2rem;
}

.sync-panel h2,
.list-panel h2 {
  margin: 0 0 0.6rem;
  color: #23495d;
}

.sync-desc {
  margin: 0 0 0.8rem;
  color: #4b5f6b;
  font-size: 0.9rem;
  line-height: 1.6;
}

.sync-actions {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.csv-fallback {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
  color: #5b6f7b;
  font-size: 0.85rem;
}

.csv-fallback input {
  font-size: 0.85rem;
}

.sync-error {
  margin: 0.8rem 0 0;
  color: #b42323;
  font-size: 0.9rem;
}

.sync-result {
  margin-top: 1rem;
  border: 1px solid #cfe0d8;
  background: #f6fbf8;
  border-radius: 12px;
  padding: 0.9rem;
}

.sync-result h3 {
  margin: 0 0 0.5rem;
  color: #1e5a41;
  font-size: 0.98rem;
}

.result-summary {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  color: #3f5a4d;
  font-size: 0.9rem;
}

.result-summary .ok strong {
  color: #17734f;
}

.created-names {
  margin: 0.6rem 0 0;
  color: #3f5a4d;
  font-size: 0.85rem;
}

.result-errors {
  margin-top: 0.7rem;
  border-top: 1px dashed #d1e0d8;
  padding-top: 0.6rem;
  color: #8f3d3d;
  font-size: 0.85rem;
}

.result-errors ul {
  margin: 0.4rem 0 0;
  padding-left: 1.2rem;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}

.list-head span {
  color: #546875;
  font-size: 0.86rem;
}

.member-search {
  width: 100%;
  max-width: 320px;
  margin: 0.6rem 0 0.8rem;
  border: 1px solid #ccdae2;
  border-radius: 10px;
  padding: 0.55rem 0.7rem;
  font-size: 0.9rem;
  background: #fafcfe;
  box-sizing: border-box;
}

.member-search:focus {
  outline: none;
  border-color: #7aa5bd;
  box-shadow: 0 0 0 3px rgba(80, 130, 160, 0.14);
}

.state-line {
  color: #546875;
  margin: 0.4rem 0 0;
}

.state-line.error {
  color: #b42323;
}

.table-wrap {
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

th,
td {
  text-align: left;
  padding: 0.55rem 0.6rem;
  border-bottom: 1px solid #e3ecf1;
  color: #26404f;
  white-space: nowrap;
}

th {
  color: #546875;
  font-size: 0.78rem;
  font-weight: 700;
}

.mini-badge {
  display: inline-flex;
  align-items: center;
  height: 20px;
  padding: 0 7px;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 700;
  margin-left: 0.3rem;
}

.mini-badge.admin {
  background: #e7f7ee;
  border: 1px solid #b4e1cd;
  color: #166347;
}

.mini-badge.pending {
  background: #fef7e7;
  border: 1px solid #f2dfae;
  color: #92600a;
  margin-left: 0;
}

.mini-badge.active {
  background: #eef4fe;
  border: 1px solid #c7dbf7;
  color: #2d6cdf;
  margin-left: 0;
}

.row-actions {
  text-align: right;
}

.btn {
  border: none;
  border-radius: 10px;
  height: 38px;
  padding: 0 0.8rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn.ghost {
  background: #eef4f8;
  border: 1px solid #c7d8e2;
  color: #24505f;
}

.btn.primary {
  background: #1e5a7a;
  color: #fff;
  align-self: flex-start;
}

.btn.tiny {
  height: 30px;
  padding: 0 0.6rem;
  font-size: 0.78rem;
  border-radius: 8px;
}

.btn.danger {
  background: #fff;
  border: 1px solid rgba(225, 29, 72, 0.25);
  color: #be123c;
}

.btn.danger:hover {
  background: #fff5f5;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

@media (max-width: 760px) {
  .members-page {
    padding: 0.9rem;
  }

  .head {
    flex-direction: column;
  }
}
</style>
