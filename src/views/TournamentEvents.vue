<template>
  <div class="events-page">
    <div class="events-shell">
      <header class="page-tools">
        <div class="page-title">
          <span class="live-dot" />
          <span>MANJANG EVENT</span>
        </div>
        <div class="tool-actions">
          <label v-if="events.length > 1" class="event-select">
            <span class="sr-only">대회 선택</span>
            <select v-model="selectedEventId" @change="loadSelectedEvent">
              <option v-for="item in events" :key="item.id" :value="item.id">
                {{ item.title }}
              </option>
            </select>
          </label>
          <button
            v-if="isAdmin"
            type="button"
            class="button soft"
            @click="showCreate = !showCreate"
          >
            + 새 대회
          </button>
          <button v-if="isAdmin && event" type="button" class="button dark" @click="toggleManage">
            {{ manageMode ? '대회 화면 보기' : '운영 설정' }}
          </button>
        </div>
      </header>

      <section v-if="showCreate && isAdmin" class="create-panel panel">
        <div class="section-heading compact">
          <div>
            <p class="kicker">NEW EVENT</p>
            <h2>새 이벤트 대회 만들기</h2>
          </div>
          <button type="button" class="text-button" @click="applyDocumentEventPreset">
            첨부 자료 기본값 불러오기
          </button>
        </div>
        <form class="event-form" @submit.prevent="submitCreate">
          <label class="field wide">
            <span>대회명</span>
            <input v-model="eventForm.title" required placeholder="예: 2026 여름 만장토론대회" />
          </label>
          <label class="field wide">
            <span>논제</span>
            <input v-model="eventForm.topic" placeholder="대회 토론 논제" />
          </label>
          <label class="field">
            <span>시작일</span>
            <input v-model="eventForm.starts_on" type="date" required />
          </label>
          <label class="field">
            <span>종료일</span>
            <input v-model="eventForm.ends_on" type="date" required />
          </label>
          <label class="field">
            <span>장소</span>
            <input v-model="eventForm.venue" placeholder="진리관" />
          </label>
          <label class="field">
            <span>공개 상태</span>
            <select v-model="eventForm.status">
              <option value="draft">준비 중</option>
              <option value="open">참가 공개</option>
              <option value="ongoing">진행 중</option>
              <option value="completed">종료</option>
            </select>
          </label>
          <label class="field wide">
            <span>소개</span>
            <textarea
              v-model="eventForm.description"
              rows="2"
              placeholder="대회 안내를 입력하세요."
            />
          </label>
          <div class="form-actions wide">
            <p v-if="saveError" class="form-error">{{ saveError }}</p>
            <button type="submit" class="button primary" :disabled="saving">
              {{ saving ? '만드는 중...' : '대회 만들기' }}
            </button>
          </div>
        </form>
      </section>

      <section v-if="loading" class="state-panel panel">
        <div class="spinner" />
        <h2>대회 정보를 불러오고 있습니다</h2>
      </section>

      <section v-else-if="loadError" class="state-panel panel error-state">
        <span class="state-icon">!</span>
        <h2>대회 정보를 불러오지 못했습니다</h2>
        <p>{{ loadError }}</p>
        <button type="button" class="button soft" @click="loadEvents">다시 시도</button>
      </section>

      <section v-else-if="!event" class="empty-event panel">
        <div class="empty-mark">M</div>
        <p class="kicker">EVENT DESK</p>
        <h1>아직 등록된 이벤트 대회가 없습니다</h1>
        <p>임원진이 대회를 만들면 참가 팀, 조 편성, 일정과 경기 결과가 이곳에 표시됩니다.</p>
        <button v-if="isAdmin" type="button" class="button primary" @click="showCreate = true">
          첫 대회 만들기
        </button>
      </section>

      <template v-else-if="manageMode && isAdmin">
        <section class="manage-hero">
          <div>
            <p class="kicker">ADMIN CONTROL ROOM</p>
            <h1>{{ event.title }} 운영 설정</h1>
            <p>기본 정보, 참가 팀, 조 편성과 일정을 한 흐름에서 설정할 수 있습니다.</p>
          </div>
          <div class="setup-progress">
            <span :class="{ done: event.title }">1</span><i />
            <span :class="{ done: draftTeams.length > 0 }">2</span><i />
            <span :class="{ done: draftMatches.length > 0 }">3</span>
          </div>
        </section>

        <section class="manage-section panel">
          <div class="section-heading">
            <div>
              <p class="step-label">STEP 01</p>
              <h2>대회 기본 정보</h2>
              <p>공개 페이지에 보여줄 대회 정보와 진행 상태를 관리합니다.</p>
            </div>
          </div>
          <form class="event-form" @submit.prevent="submitEventUpdate">
            <label class="field wide"
              ><span>대회명</span><input v-model="eventForm.title" required
            /></label>
            <label class="field wide"><span>논제</span><input v-model="eventForm.topic" /></label>
            <label class="field"
              ><span>토론 방식</span><input v-model="eventForm.debate_format"
            /></label>
            <label class="field"
              ><span>승리 승점</span
              ><input v-model.number="eventForm.points_per_win" type="number" min="1" max="10"
            /></label>
            <label class="field"
              ><span>시작일</span><input v-model="eventForm.starts_on" type="date" required
            /></label>
            <label class="field"
              ><span>종료일</span><input v-model="eventForm.ends_on" type="date" required
            /></label>
            <label class="field"><span>장소</span><input v-model="eventForm.venue" /></label>
            <label class="field">
              <span>공개 상태</span>
              <select v-model="eventForm.status">
                <option value="draft">준비 중</option>
                <option value="open">참가 공개</option>
                <option value="ongoing">진행 중</option>
                <option value="completed">종료</option>
              </select>
            </label>
            <label class="field wide"
              ><span>소개</span><textarea v-model="eventForm.description" rows="3" />
            </label>
            <div class="form-actions wide">
              <button type="submit" class="button primary" :disabled="saving">
                {{ saving ? '저장 중...' : '기본 정보 저장' }}
              </button>
            </div>
          </form>
        </section>

        <section class="manage-section panel">
          <div class="section-heading">
            <div>
              <p class="step-label">STEP 02</p>
              <h2>참가 팀과 조 편성</h2>
              <p>회원 명단에서 참가자를 골라 팀에 배정하고 경력 점수를 설정합니다.</p>
            </div>
            <div class="heading-actions">
              <button type="button" class="button soft" @click="loadDocumentTeamPreset">
                이번 대회 구성 불러오기
              </button>
              <button type="button" class="button dark" @click="addTeam">+ 팀 추가</button>
            </div>
          </div>

          <p v-if="membersLoading" class="inline-state">회원 명단을 불러오는 중입니다.</p>
          <p v-else-if="membersError" class="inline-state error">{{ membersError }}</p>

          <div v-if="draftTeams.length" class="team-editor-grid">
            <article
              v-for="(team, teamIndex) in draftTeams"
              :key="team.client_key"
              class="team-editor-card"
            >
              <div class="team-editor-head">
                <div class="team-card-title">
                  <span class="group-badge">{{ team.group_name || '?' }}조</span>
                  <div>
                    <strong>{{ team.name || `새 팀 ${teamIndex + 1}` }}</strong>
                    <span>팀 정보와 참가 인원을 설정하세요.</span>
                  </div>
                </div>
                <button
                  type="button"
                  class="icon-button"
                  aria-label="팀 삭제"
                  @click="removeTeam(teamIndex)"
                >
                  ×
                </button>
              </div>
              <div class="team-inputs">
                <label class="team-name-field">
                  <span>팀명</span>
                  <input v-model="team.name" placeholder="팀명을 입력하세요" />
                </label>
                <label class="team-group-field">
                  <span>조</span>
                  <div class="group-input-wrap">
                    <input v-model="team.group_name" maxlength="6" placeholder="A" />
                    <em>조</em>
                  </div>
                </label>
              </div>
              <div class="member-picker-box">
                <div class="member-section-title">
                  <div>
                    <strong>팀원 추가</strong>
                    <span>회원 명단에서 참가자를 선택하세요.</span>
                  </div>
                </div>
                <div class="member-add-row">
                  <select
                    v-model="memberPicker[team.client_key]"
                    :disabled="availableMembers.length === 0"
                    aria-label="추가할 팀원 선택"
                  >
                    <option value="">참가 회원 선택</option>
                    <option v-for="member in availableMembers" :key="member.id" :value="member.id">
                      {{ member.name }} · {{ member.student_id }} ·
                      {{ member.generation || member.major }}
                    </option>
                  </select>
                  <button
                    type="button"
                    class="button dark small member-add-button"
                    :disabled="!memberPicker[team.client_key]"
                    @click="addPickedMember(team)"
                  >
                    + 팀원 추가
                  </button>
                </div>
              </div>
              <div class="team-members-editor">
                <div class="member-list-head">
                  <strong>등록된 팀원</strong>
                  <span>{{ team.members.length }}명</span>
                </div>
                <p v-if="team.members.length === 0" class="empty-line">등록된 팀원이 없습니다.</p>
                <div v-for="member in team.members" :key="member.user_id" class="member-edit-row">
                  <span class="member-avatar" aria-hidden="true">{{ member.name?.charAt(0) }}</span>
                  <div class="member-profile">
                    <strong>{{ member.name }}</strong>
                    <small>{{ member.major || '학과 미입력' }}</small>
                  </div>
                  <label class="experience-control">
                    <span>경력 점수</span>
                    <select
                      v-model.number="member.experience_score"
                      :aria-label="`${member.name} 경력 점수`"
                    >
                      <option :value="1">1점</option>
                      <option :value="2">2점</option>
                      <option :value="3">3점</option>
                    </select>
                  </label>
                  <button
                    type="button"
                    class="icon-button"
                    :aria-label="`${member.name} 팀에서 제외`"
                    @click="removeMember(team, member.user_id)"
                  >
                    ×
                  </button>
                </div>
              </div>
              <footer>
                <span>팀 평균 경력 점수</span>
                <strong>{{ draftTeamExperience(team) }}</strong>
              </footer>
            </article>
          </div>
          <div v-else class="empty-editor">
            <p>아직 팀이 없습니다. 팀을 추가하거나 이번 대회 구성을 불러오세요.</p>
          </div>
        </section>

        <section class="manage-section panel">
          <div class="section-heading">
            <div>
              <p class="step-label">STEP 03</p>
              <h2>대진과 일정</h2>
              <p>조별 풀리그 대진을 자동 생성한 뒤 시간과 장소를 세밀하게 조정할 수 있습니다.</p>
            </div>
            <button
              type="button"
              class="button dark"
              :disabled="draftTeams.length < 2"
              @click="generateSchedule"
            >
              대진 자동 생성
            </button>
          </div>

          <div v-if="draftMatches.length" class="schedule-editor">
            <article
              v-for="(match, index) in draftMatches"
              :key="`${match.round_label}-${index}`"
              class="schedule-edit-row"
            >
              <span class="match-kind" :class="match.stage">{{
                match.stage === 'final' ? '결승' : match.round_label
              }}</span>
              <div class="match-versus">
                <strong>{{ draftTeamName(match.team_a_key, match.team_a_source_group) }}</strong>
                <span>VS</span>
                <strong>{{ draftTeamName(match.team_b_key, match.team_b_source_group) }}</strong>
              </div>
              <input v-model="match.starts_at" type="datetime-local" aria-label="경기 시작 시간" />
              <input v-model="match.venue" placeholder="장소" aria-label="경기 장소" />
              <button
                type="button"
                class="icon-button"
                aria-label="경기 삭제"
                @click="draftMatches.splice(index, 1)"
              >
                ×
              </button>
            </article>
          </div>
          <div v-else class="empty-editor"><p>팀 편성을 마친 뒤 대진을 자동 생성하세요.</p></div>

          <div class="sticky-save">
            <div>
              <strong>{{ draftTeams.length }}팀 · {{ draftMatches.length }}경기</strong>
              <span>저장하면 공개 대회 페이지에 즉시 반영됩니다.</span>
              <p v-if="saveError" class="form-error">{{ saveError }}</p>
            </div>
            <button type="button" class="button primary" :disabled="saving" @click="submitSetup">
              {{ saving ? '저장 중...' : '팀·일정 저장하기' }}
            </button>
          </div>
        </section>
      </template>

      <template v-else-if="event">
        <section class="event-hero">
          <div class="hero-pattern" />
          <div class="hero-main">
            <div class="status-row">
              <span class="status-chip" :class="event.status">{{ statusLabel(event.status) }}</span>
              <span>{{ event.debate_format }}</span>
            </div>
            <h1>{{ event.title }}</h1>
            <p v-if="event.topic" class="topic">“{{ event.topic }}”</p>
            <p v-if="event.description" class="description">{{ event.description }}</p>
            <div class="hero-metadata">
              <span><b>DATE</b>{{ formatDateRange(event.starts_on, event.ends_on) }}</span>
              <span><b>PLACE</b>{{ event.venue || '장소 추후 공지' }}</span>
            </div>
          </div>
          <aside class="hero-scoreboard">
            <span class="score-label">TOURNAMENT</span>
            <strong>{{ dDayLabel }}</strong>
            <p>{{ event.progress.completed }} / {{ event.progress.total }} 경기 완료</p>
            <div class="progress-track"><i :style="{ width: `${progressPercent}%` }" /></div>
          </aside>
        </section>

        <nav class="event-tabs" aria-label="대회 정보 메뉴">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            :class="{ active: activeTab === tab.key }"
            @click="activeTab = tab.key"
          >
            {{ tab.label }}<span v-if="tab.count !== undefined">{{ tab.count }}</span>
          </button>
        </nav>

        <section v-if="activeTab === 'schedule'" class="content-section">
          <div class="section-heading on-page">
            <div>
              <p class="kicker">MATCH CENTER</p>
              <h2>경기 일정과 결과</h2>
            </div>
            <p>결과 입력과 동시에 조별 순위가 자동으로 갱신됩니다.</p>
          </div>
          <div v-if="matchesByDay.length" class="day-groups">
            <section v-for="day in matchesByDay" :key="day.date" class="day-block">
              <header>
                <div>
                  <span>{{ day.weekday }}</span
                  ><strong>{{ day.label }}</strong>
                </div>
                <i />
              </header>
              <div class="match-list">
                <article
                  v-for="match in day.matches"
                  :key="match.id"
                  class="match-card"
                  :class="{ completed: match.status === 'completed' }"
                >
                  <div class="match-meta">
                    <span class="stage-chip" :class="match.stage">{{
                      match.stage === 'final' ? 'FINAL' : `${match.group_name}조`
                    }}</span>
                    <strong>{{ formatTime(match.starts_at) }}</strong>
                    <small>{{ match.venue || '장소 미정' }}</small>
                  </div>
                  <div class="teams-versus">
                    <div :class="{ winner: match.winner_team_id === match.resolved_team_a_id }">
                      <span>{{ match.team_a_name }}</span
                      ><b>{{ displayScore(match.team_a_score) }}</b>
                    </div>
                    <em>VS</em>
                    <div :class="{ winner: match.winner_team_id === match.resolved_team_b_id }">
                      <span>{{ match.team_b_name }}</span
                      ><b>{{ displayScore(match.team_b_score) }}</b>
                    </div>
                  </div>
                  <div class="result-status">
                    <span v-if="match.status === 'completed'" class="finished"
                      >종료 · {{ match.winner_team_name }} 승</span
                    >
                    <span v-else>경기 예정</span>
                    <button
                      v-if="isAdmin"
                      type="button"
                      class="text-button"
                      @click="toggleResultEditor(match.id)"
                    >
                      {{
                        resultEditorId === match.id
                          ? '닫기'
                          : match.status === 'completed'
                            ? '결과 수정'
                            : '결과 입력'
                      }}
                    </button>
                  </div>
                  <form
                    v-if="isAdmin && resultEditorId === match.id"
                    class="result-editor"
                    @submit.prevent="submitResult(match)"
                  >
                    <label
                      ><span>{{ match.team_a_name }}</span
                      ><input
                        v-model.number="resultDraft[match.id].a"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                    /></label>
                    <span>:</span>
                    <label
                      ><span>{{ match.team_b_name }}</span
                      ><input
                        v-model.number="resultDraft[match.id].b"
                        type="number"
                        min="0"
                        step="0.01"
                        required
                    /></label>
                    <select
                      v-model="resultDraft[match.id].winner"
                      title="완전 동점일 때 승리 팀 지정"
                    >
                      <option value="">자동 판정</option>
                      <option v-if="match.resolved_team_a_id" :value="match.resolved_team_a_id">
                        {{ match.team_a_name }} 승
                      </option>
                      <option v-if="match.resolved_team_b_id" :value="match.resolved_team_b_id">
                        {{ match.team_b_name }} 승
                      </option>
                    </select>
                    <button class="button primary small" :disabled="resultSavingId === match.id">
                      {{ resultSavingId === match.id ? '저장 중' : '저장' }}
                    </button>
                  </form>
                </article>
              </div>
            </section>
          </div>
          <div v-else class="empty-content">아직 등록된 경기 일정이 없습니다.</div>
        </section>

        <section v-else-if="activeTab === 'standings'" class="content-section">
          <div class="section-heading on-page">
            <div>
              <p class="kicker">LIVE TABLE</p>
              <h2>조별 순위</h2>
            </div>
            <p>승점 → 상대 전적 → 낮은 평균 경력 점수 순으로 자동 산정합니다.</p>
          </div>
          <div v-if="standingsByGroup.length" class="standings-grid">
            <article v-for="group in standingsByGroup" :key="group.name" class="standing-card">
              <header>
                <span>{{ group.name }}</span
                ><strong>{{ group.name }}조</strong><small>1위 결승 진출</small>
              </header>
              <div class="standing-head">
                <span>순위 / 팀</span><span>경기</span><span>승</span><span>패</span
                ><span>승점</span>
              </div>
              <div
                v-for="row in group.rows"
                :key="row.team_id"
                class="standing-row"
                :class="{ leader: row.rank === 1 }"
              >
                <div>
                  <b>{{ row.rank }}</b
                  ><span>{{ row.team_name }}</span>
                </div>
                <span>{{ row.played }}</span
                ><span>{{ row.wins }}</span
                ><span>{{ row.losses }}</span
                ><strong>{{ row.points }}</strong>
              </div>
            </article>
          </div>
          <div v-else class="empty-content">팀 편성이 완료되면 순위표가 생성됩니다.</div>
        </section>

        <section v-else-if="activeTab === 'teams'" class="content-section">
          <div class="section-heading on-page">
            <div>
              <p class="kicker">TEAM ROSTER</p>
              <h2>참가 팀</h2>
            </div>
            <p>{{ event.teams.length }}개 팀 · {{ totalParticipants }}명 참가</p>
          </div>
          <div v-if="event.teams.length" class="roster-grid">
            <article v-for="team in event.teams" :key="team.id" class="roster-card">
              <header>
                <span>{{ team.group_name }}</span>
                <div>
                  <small>{{ team.group_name }}조</small>
                  <h3>{{ team.name }}</h3>
                </div>
                <b>{{ team.experience_score.toFixed(1) }}</b>
              </header>
              <div class="roster-members">
                <div v-for="member in team.members" :key="member.id">
                  <span class="avatar">{{ member.name.slice(0, 1) }}</span>
                  <div>
                    <strong>{{ member.name }}</strong
                    ><small>{{ member.generation || member.major }}</small>
                  </div>
                  <em>경력 {{ member.experience_score }}</em>
                </div>
              </div>
            </article>
          </div>
          <div v-else class="empty-content">아직 등록된 참가 팀이 없습니다.</div>
        </section>

        <section v-else class="content-section">
          <div class="section-heading on-page">
            <div>
              <p class="kicker">HOW IT WORKS</p>
              <h2>대회 운영 방식</h2>
            </div>
          </div>
          <div class="rules-layout">
            <div class="rule-flow">
              <article>
                <span>01</span>
                <div>
                  <h3>조별 풀리그</h3>
                  <p>
                    각 조에서 모든 팀이 한 번씩 맞붙습니다. 경기 승리 시
                    {{ event.points_per_win }}점이 주어집니다.
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>자동 순위 산정</h3>
                  <p>승점을 우선하고, 동률이면 동률 팀 간 상대 전적으로 순위를 정합니다.</p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>결승전</h3>
                  <p>
                    각 조 1위 팀이 결승에 진출하며 조별 결과 확정 후 대진이 자동으로 연결됩니다.
                  </p>
                </div>
              </article>
            </div>
            <aside class="tie-rule">
              <span>TIE BREAK</span>
              <h3>심사 점수가 같다면?</h3>
              <p>
                두 팀의 평균 심사 점수가 같을 때는 평균 경력 점수가 더 낮은 팀을 승리 팀으로
                판정합니다.
              </p>
              <div>심사 평균 점수 <b>→</b> 낮은 경력 점수</div>
            </aside>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/lib/auth'
import { fetchMembers, type MemberProfile } from '@/lib/members'
import {
  createTournament,
  fetchTournament,
  fetchTournaments,
  saveTournamentMatchResult,
  saveTournamentSetup,
  updateTournament,
  type TournamentDetail,
  type TournamentInput,
  type TournamentMatch,
  type TournamentSetupMatch,
  type TournamentStatus,
  type TournamentSummary,
} from '@/lib/tournaments'

type DraftMember = { user_id: string; name: string; major: string; experience_score: number }
type DraftTeam = { client_key: string; name: string; group_name: string; members: DraftMember[] }
type DraftMatch = TournamentSetupMatch
type TabKey = 'schedule' | 'standings' | 'teams' | 'guide'

const route = useRoute()
const router = useRouter()
const { isAdmin } = useAuth()

const events = ref<TournamentSummary[]>([])
const event = ref<TournamentDetail | null>(null)
const selectedEventId = ref('')
const loading = ref(true)
const loadError = ref('')
const saveError = ref('')
const saving = ref(false)
const showCreate = ref(false)
const manageMode = ref(route.query.manage === '1')
const activeTab = ref<TabKey>('schedule')
const members = ref<MemberProfile[]>([])
const membersLoading = ref(false)
const membersError = ref('')
const draftTeams = reactive<DraftTeam[]>([])
const draftMatches = reactive<DraftMatch[]>([])
const memberPicker = reactive<Record<string, string>>({})
const resultDraft = reactive<
  Record<string, { a: number | null; b: number | null; winner: string }>
>({})
const resultEditorId = ref('')
const resultSavingId = ref('')

const emptyForm = (): TournamentInput => ({
  title: '',
  topic: '',
  description: '',
  debate_format: '자유토론',
  starts_on: new Date().toISOString().slice(0, 10),
  ends_on: new Date().toISOString().slice(0, 10),
  venue: '',
  status: 'draft',
  points_per_win: 1,
})
const eventForm = reactive<TournamentInput>(emptyForm())

const tabs = computed(() => [
  { key: 'schedule' as const, label: '일정·결과', count: event.value?.matches.length ?? 0 },
  { key: 'standings' as const, label: '조별 순위' },
  { key: 'teams' as const, label: '참가 팀', count: event.value?.teams.length ?? 0 },
  { key: 'guide' as const, label: '대회 방식' },
])
const progressPercent = computed(() =>
  event.value?.progress.total
    ? Math.round((event.value.progress.completed / event.value.progress.total) * 100)
    : 0,
)
const totalParticipants = computed(
  () => event.value?.teams.reduce((sum, team) => sum + team.members.length, 0) ?? 0,
)
const availableMembers = computed(() => {
  const assigned = new Set(
    draftTeams.flatMap((team) => team.members.map((member) => member.user_id)),
  )
  return members.value.filter((member) => !assigned.has(member.id))
})
const standingsByGroup = computed(() => {
  const grouped = new Map<string, TournamentDetail['standings']>()
  for (const row of event.value?.standings ?? []) {
    const list = grouped.get(row.group_name) ?? []
    list.push(row)
    grouped.set(row.group_name, list)
  }
  return [...grouped.entries()].map(([name, rows]) => ({ name, rows }))
})
const matchesByDay = computed(() => {
  const grouped = new Map<string, TournamentMatch[]>()
  for (const match of event.value?.matches ?? []) {
    const date = match.starts_at.slice(0, 10)
    const list = grouped.get(date) ?? []
    list.push(match)
    grouped.set(date, list)
  }
  return [...grouped.entries()].map(([date, matches]) => {
    const value = new Date(`${date}T00:00:00`)
    return {
      date,
      label: new Intl.DateTimeFormat('ko-KR', { month: 'long', day: 'numeric' }).format(value),
      weekday: new Intl.DateTimeFormat('ko-KR', { weekday: 'short' }).format(value),
      matches,
    }
  })
})
const dDayLabel = computed(() => {
  if (!event.value) return ''
  if (event.value.status === 'completed') return 'CLOSED'
  if (event.value.status === 'ongoing') return 'LIVE'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(`${event.value.starts_on}T00:00:00`)
  const days = Math.ceil((start.getTime() - today.getTime()) / 86400000)
  return days > 0 ? `D-${days}` : days === 0 ? 'D-DAY' : 'READY'
})

function statusLabel(status: TournamentStatus) {
  return { draft: '준비 중', open: '참가 공개', ongoing: '진행 중', completed: '대회 종료' }[status]
}
function formatDateRange(start: string, end: string) {
  const format = (date: string) =>
    new Intl.DateTimeFormat('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    }).format(new Date(`${date}T00:00:00`))
  return start === end ? format(start) : `${format(start)} – ${format(end)}`
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}
function displayScore(score: number | null) {
  return score === null ? '–' : Number(score).toFixed(Number(score) % 1 ? 1 : 0)
}
function localDatetime(value: string) {
  const date = new Date(value)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}
function uniqueKey(prefix = 'team') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function setForm(detail?: TournamentDetail) {
  Object.assign(
    eventForm,
    detail
      ? {
          title: detail.title,
          topic: detail.topic,
          description: detail.description,
          debate_format: detail.debate_format,
          starts_on: detail.starts_on,
          ends_on: detail.ends_on,
          venue: detail.venue,
          status: detail.status,
          points_per_win: detail.points_per_win,
        }
      : emptyForm(),
  )
}
function hydrateDraft(detail: TournamentDetail) {
  draftTeams.splice(
    0,
    draftTeams.length,
    ...detail.teams.map((team) => ({
      client_key: team.client_key || team.id,
      name: team.name,
      group_name: team.group_name,
      members: team.members.map((member) => ({
        user_id: member.user_id,
        name: member.name,
        major: member.major,
        experience_score: member.experience_score,
      })),
    })),
  )
  draftMatches.splice(
    0,
    draftMatches.length,
    ...detail.matches.map((match) => ({
      stage: match.stage,
      round_label: match.round_label,
      starts_at: localDatetime(match.starts_at),
      venue: match.venue,
      team_a_key: detail.teams.find((team) => team.id === match.team_a_id)?.client_key ?? null,
      team_b_key: detail.teams.find((team) => team.id === match.team_b_id)?.client_key ?? null,
      team_a_source_group: match.team_a_source_group,
      team_b_source_group: match.team_b_source_group,
      winner_team_key:
        detail.teams.find((team) => team.id === match.winner_team_id)?.client_key ?? null,
      team_a_score: match.team_a_score,
      team_b_score: match.team_b_score,
      status: match.status,
      notes: match.notes,
    })),
  )
  for (const match of detail.matches) {
    resultDraft[match.id] = { a: match.team_a_score, b: match.team_b_score, winner: '' }
  }
}

async function loadEvents() {
  loading.value = true
  loadError.value = ''
  try {
    events.value = await fetchTournaments()
    const queryId = typeof route.query.id === 'string' ? route.query.id : ''
    selectedEventId.value = events.value.some((item) => item.id === queryId)
      ? queryId
      : (events.value[0]?.id ?? '')
    if (selectedEventId.value) await loadSelectedEvent()
    else event.value = null
  } catch (error: any) {
    loadError.value = error?.message || '대회 정보를 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}
async function loadSelectedEvent() {
  if (!selectedEventId.value) return
  try {
    event.value = await fetchTournament(selectedEventId.value)
    setForm(event.value)
    hydrateDraft(event.value)
    void router.replace({ query: { ...route.query, id: selectedEventId.value } })
  } catch (error: any) {
    loadError.value = error?.message || '대회 정보를 불러오지 못했습니다.'
  }
}
async function ensureMembers() {
  if (members.value.length || membersLoading.value) return
  membersLoading.value = true
  membersError.value = ''
  try {
    members.value = await fetchMembers()
  } catch (error: any) {
    membersError.value = error?.message || '회원 명단을 불러오지 못했습니다.'
  } finally {
    membersLoading.value = false
  }
}
async function toggleManage() {
  manageMode.value = !manageMode.value
  if (manageMode.value) await ensureMembers()
  void router.replace({ query: { ...route.query, manage: manageMode.value ? '1' : undefined } })
}
function applyDocumentEventPreset() {
  Object.assign(eventForm, {
    title: '2026 만장토론대회',
    topic: '선거운동에 생성형 AI로 제작한 콘텐츠의 사용을 전면 금지해야 한다.',
    description: '조별리그를 거쳐 각 조 1위가 결승전에 진출하는 만장일치식 자유토론 대회입니다.',
    debate_format: '만장일치식 자유토론',
    starts_on: '2026-07-24',
    ends_on: '2026-07-25',
    venue: '진리관',
    status: 'open',
    points_per_win: 1,
  })
}
async function submitCreate() {
  saving.value = true
  saveError.value = ''
  try {
    const created = await createTournament({ ...eventForm })
    event.value = created
    selectedEventId.value = created.id
    showCreate.value = false
    manageMode.value = true
    await ensureMembers()
    setForm(created)
    hydrateDraft(created)
    await refreshSummaries()
  } catch (error: any) {
    saveError.value = error?.message || '대회를 만들지 못했습니다.'
  } finally {
    saving.value = false
  }
}
async function submitEventUpdate() {
  if (!event.value) return
  saving.value = true
  saveError.value = ''
  try {
    event.value = await updateTournament(event.value.id, { ...eventForm })
    await refreshSummaries()
  } catch (error: any) {
    saveError.value = error?.message || '저장하지 못했습니다.'
  } finally {
    saving.value = false
  }
}
async function refreshSummaries() {
  events.value = await fetchTournaments()
}

function addTeam() {
  const used = new Set(draftTeams.map((team) => team.group_name))
  const group =
    ['A', 'B', 'C', 'D'].find((name) => !used.has(name)) ??
    draftTeams[draftTeams.length - 1]?.group_name ??
    'A'
  const key = uniqueKey()
  draftTeams.push({ client_key: key, name: '', group_name: group, members: [] })
  memberPicker[key] = ''
}
function removeTeam(index: number) {
  const removed = draftTeams[index]
  if (!removed || !confirm(`'${removed.name || '이 팀'}'을 편성에서 제거할까요?`)) return
  draftTeams.splice(index, 1)
  for (let i = draftMatches.length - 1; i >= 0; i--) {
    if (
      draftMatches[i].team_a_key === removed.client_key ||
      draftMatches[i].team_b_key === removed.client_key
    )
      draftMatches.splice(i, 1)
  }
}
function addPickedMember(team: DraftTeam) {
  const userId = memberPicker[team.client_key]
  const member = members.value.find((item) => item.id === userId)
  if (!member) return
  team.members.push({
    user_id: member.id,
    name: member.name,
    major: member.major,
    experience_score: 1,
  })
  memberPicker[team.client_key] = ''
}
function removeMember(team: DraftTeam, userId: string) {
  team.members = team.members.filter((member) => member.user_id !== userId)
}
function draftTeamExperience(team: DraftTeam) {
  return team.members.length
    ? (
        team.members.reduce((sum, member) => sum + member.experience_score, 0) / team.members.length
      ).toFixed(1)
    : '–'
}
function draftTeamName(key: string | null, source: string | null) {
  return (
    draftTeams.find((team) => team.client_key === key)?.name ||
    (source ? `${source}조 1위` : '미정')
  )
}

function loadDocumentTeamPreset() {
  if (!members.value.length) {
    membersError.value = '회원 명단을 먼저 불러와주세요.'
    return
  }
  if (draftTeams.length && !confirm('현재 팀 편성을 첨부 자료의 구성으로 바꿀까요?')) return
  const presets = [
    [
      '대학원생들',
      'A',
      [
        ['이다현', 3],
        ['현지승', 3],
      ],
    ],
    [
      '금성',
      'A',
      [
        ['송형록', 3],
        ['김효정', 2],
      ],
    ],
    [
      '이의재기',
      'A',
      [
        ['이소영', 2],
        ['박재환', 1],
      ],
    ],
    [
      '희비스커스',
      'A',
      [
        ['원희진', 1],
        ['최은비', 1],
      ],
    ],
    [
      '노인과바다',
      'B',
      [
        ['박다인', 3],
        ['김재동', 2],
      ],
    ],
    [
      '장황',
      'B',
      [
        ['황교현', 2],
        ['장준홍', 1],
      ],
    ],
    [
      '곽정팔',
      'B',
      [
        ['박정은', 3],
        ['곽희원', 1],
      ],
    ],
  ] as Array<[string, string, Array<[string, number]>]>
  const missing: string[] = []
  const teams = presets.map(([name, group, roster]) => ({
    client_key: `preset-${group}-${name}`,
    name,
    group_name: group,
    members: roster.flatMap(([memberName, score]) => {
      const found = members.value.find((item) => item.name.trim() === memberName)
      if (!found) {
        missing.push(memberName)
        return []
      }
      return [{ user_id: found.id, name: found.name, major: found.major, experience_score: score }]
    }),
  }))
  draftTeams.splice(0, draftTeams.length, ...teams)
  generateDocumentSchedule()
  if (missing.length) alert(`회원 명단에서 찾지 못해 제외된 참가자: ${missing.join(', ')}`)
}
function generateDocumentSchedule() {
  const key = (name: string) => draftTeams.find((team) => team.name === name)?.client_key ?? null
  const rows: Array<[string, string, string, string, string]> = [
    ['A조 경기 1', '2026-07-24T19:00', '진리관 305호', '이의재기', '희비스커스'],
    ['A조 경기 2', '2026-07-24T19:00', '진리관 307호', '대학원생들', '금성'],
    ['A조 경기 3', '2026-07-24T19:55', '진리관 305호', '금성', '희비스커스'],
    ['A조 경기 4', '2026-07-24T19:55', '진리관 307호', '대학원생들', '이의재기'],
    ['A조 경기 5', '2026-07-24T20:50', '진리관 305호', '금성', '이의재기'],
    ['A조 경기 6', '2026-07-24T20:50', '진리관 307호', '대학원생들', '희비스커스'],
    ['B조 경기 1', '2026-07-25T10:00', '진리관 306호', '노인과바다', '장황'],
    ['B조 경기 2', '2026-07-25T10:55', '진리관 306호', '노인과바다', '곽정팔'],
    ['B조 경기 3', '2026-07-25T11:50', '진리관 306호', '장황', '곽정팔'],
  ]
  const matches: DraftMatch[] = rows.map(([label, starts, venue, a, b]) => ({
    stage: 'group',
    round_label: label,
    starts_at: starts,
    venue,
    team_a_key: key(a),
    team_b_key: key(b),
    team_a_source_group: null,
    team_b_source_group: null,
    winner_team_key: null,
    team_a_score: null,
    team_b_score: null,
    status: 'scheduled',
    notes: '',
  }))
  matches.push({
    stage: 'final',
    round_label: '결승전',
    starts_at: '2026-07-25T14:00',
    venue: '진리관 306호',
    team_a_key: null,
    team_b_key: null,
    team_a_source_group: 'A',
    team_b_source_group: 'B',
    winner_team_key: null,
    team_a_score: null,
    team_b_score: null,
    status: 'scheduled',
    notes: '',
  })
  draftMatches.splice(0, draftMatches.length, ...matches)
}
function generateSchedule() {
  const groups = new Map<string, DraftTeam[]>()
  for (const team of draftTeams) {
    const list = groups.get(team.group_name) ?? []
    list.push(team)
    groups.set(team.group_name, list)
  }
  const matches: DraftMatch[] = []
  let offset = 0
  for (const [group, teams] of groups.entries()) {
    let game = 1
    for (let i = 0; i < teams.length; i++)
      for (let j = i + 1; j < teams.length; j++) {
        const date = new Date(`${eventForm.starts_on}T10:00:00`)
        date.setMinutes(date.getMinutes() + offset * 55)
        matches.push({
          stage: 'group',
          round_label: `${group}조 경기 ${game++}`,
          starts_at: localDatetime(date.toISOString()),
          venue: eventForm.venue,
          team_a_key: teams[i].client_key,
          team_b_key: teams[j].client_key,
          team_a_source_group: null,
          team_b_source_group: null,
          winner_team_key: null,
          team_a_score: null,
          team_b_score: null,
          status: 'scheduled',
          notes: '',
        })
        offset++
      }
  }
  const groupNames = [...groups.keys()]
  if (groupNames.length >= 2)
    matches.push({
      stage: 'final',
      round_label: '결승전',
      starts_at: `${eventForm.ends_on}T16:00`,
      venue: eventForm.venue,
      team_a_key: null,
      team_b_key: null,
      team_a_source_group: groupNames[0],
      team_b_source_group: groupNames[1],
      winner_team_key: null,
      team_a_score: null,
      team_b_score: null,
      status: 'scheduled',
      notes: '',
    })
  draftMatches.splice(0, draftMatches.length, ...matches)
}
async function submitSetup() {
  if (!event.value) return
  if (draftTeams.some((team) => !team.name.trim() || !team.group_name.trim())) {
    saveError.value = '모든 팀의 팀명과 조를 입력해주세요.'
    return
  }
  saving.value = true
  saveError.value = ''
  try {
    event.value = await saveTournamentSetup(
      event.value.id,
      draftTeams.map((team) => ({
        client_key: team.client_key,
        name: team.name,
        group_name: team.group_name,
        members: team.members.map((member) => ({
          user_id: member.user_id,
          experience_score: member.experience_score,
        })),
      })),
      draftMatches.map((match) => ({ ...match })),
    )
    hydrateDraft(event.value)
    await refreshSummaries()
  } catch (error: any) {
    saveError.value = error?.message || '팀과 일정을 저장하지 못했습니다.'
  } finally {
    saving.value = false
  }
}
function toggleResultEditor(matchId: string) {
  resultEditorId.value = resultEditorId.value === matchId ? '' : matchId
  const match = event.value?.matches.find((item) => item.id === matchId)
  if (match && !resultDraft[matchId])
    resultDraft[matchId] = { a: match.team_a_score, b: match.team_b_score, winner: '' }
}
async function submitResult(match: TournamentMatch) {
  if (!event.value) return
  const draft = resultDraft[match.id]
  if (draft.a === null || draft.b === null) return
  resultSavingId.value = match.id
  try {
    event.value = await saveTournamentMatchResult(event.value.id, match.id, {
      team_a_score: Number(draft.a),
      team_b_score: Number(draft.b),
      winner_team_id: draft.winner || null,
    })
    hydrateDraft(event.value)
    resultEditorId.value = ''
    await refreshSummaries()
  } catch (error: any) {
    alert(error?.message || '결과를 저장하지 못했습니다.')
  } finally {
    resultSavingId.value = ''
  }
}

onMounted(async () => {
  await loadEvents()
  if (manageMode.value && isAdmin.value) await ensureMembers()
})
</script>

<style scoped>
.events-page {
  min-height: 100%;
  flex: 1;
  background: #f3f1ec;
  color: #18231f;
}
.events-shell {
  width: min(1180px, 100%);
  margin: 0 auto;
  padding: 26px 28px 72px;
}
.page-tools {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}
.page-title {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.14em;
  color: #53615b;
}
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #ff5b35;
  box-shadow: 0 0 0 4px rgba(255, 91, 53, 0.12);
}
.tool-actions,
.heading-actions {
  display: flex;
  gap: 9px;
  align-items: center;
  flex-wrap: wrap;
}
.event-select select {
  min-width: 190px;
}
.button {
  border: 0;
  border-radius: 9px;
  padding: 10px 15px;
  font: inherit;
  font-size: 13px;
  font-weight: 750;
  cursor: pointer;
  transition:
    transform 0.15s,
    opacity 0.15s;
}
.button:hover {
  transform: translateY(-1px);
}
.button:disabled {
  opacity: 0.5;
  cursor: default;
  transform: none;
}
.button.primary {
  background: #ff5b35;
  color: white;
  box-shadow: 0 8px 18px -10px #d84a29;
}
.button.dark {
  background: #20342c;
  color: white;
}
.button.soft {
  background: #fff;
  color: #25352f;
  border: 1px solid #dedbd2;
}
.button.small {
  padding: 7px 11px;
  font-size: 12px;
}
.panel {
  background: white;
  border: 1px solid #dfdcd3;
  border-radius: 14px;
  box-shadow: 0 14px 35px -32px rgba(30, 45, 39, 0.45);
}
.create-panel,
.manage-section {
  padding: 26px;
  margin-bottom: 18px;
}
.section-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 24px;
}
.section-heading.compact {
  margin-bottom: 16px;
}
.section-heading h2 {
  margin: 1px 0 4px;
  font-size: 23px;
  letter-spacing: -0.025em;
}
.section-heading p {
  color: #6a746e;
  font-size: 13px;
}
.step-label,
.kicker {
  color: #ff5b35 !important;
  font-size: 10px !important;
  letter-spacing: 0.14em;
  font-weight: 850;
  margin: 0;
}
.text-button {
  border: 0;
  background: none;
  color: #e64d2b;
  font: inherit;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  padding: 4px;
}
.event-form {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 15px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  grid-column: span 1;
}
.field.wide,
.form-actions.wide {
  grid-column: span 2;
}
.field span,
.team-inputs label span {
  font-size: 11px;
  font-weight: 750;
  color: #5f6b65;
}
input,
select,
textarea {
  width: 100%;
  border: 1px solid #d9d6cd;
  border-radius: 8px;
  background: #fbfaf7;
  padding: 10px 11px;
  color: #1d2c26;
  font: inherit;
  font-size: 13px;
  outline: none;
}
input:focus,
select:focus,
textarea:focus {
  border-color: #ff795b;
  box-shadow: 0 0 0 3px rgba(255, 91, 53, 0.09);
}
textarea {
  resize: vertical;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 12px;
}
.form-error {
  color: #c63c24;
  font-size: 12px;
  margin-right: auto;
}
.state-panel,
.empty-event {
  padding: 80px 24px;
  text-align: center;
}
.state-panel h2,
.empty-event h1 {
  margin: 14px 0 5px;
  font-size: 24px;
}
.state-panel p,
.empty-event p {
  color: #6b746f;
}
.empty-event .button {
  margin-top: 22px;
}
.empty-mark {
  margin: auto;
  width: 60px;
  height: 60px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #20342c;
  color: white;
  font: 800 25px Georgia;
}
.state-icon {
  margin: auto;
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #fff0ec;
  color: #d94120;
  font-weight: 900;
}
.spinner {
  width: 34px;
  height: 34px;
  border: 3px solid #eee9df;
  border-top-color: #ff5b35;
  border-radius: 50%;
  margin: auto;
  animation: spin 0.8s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.manage-hero {
  padding: 32px 34px;
  border-radius: 14px;
  background: #20342c;
  color: white;
  margin-bottom: 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.manage-hero h1 {
  margin: 3px 0 5px;
  font-size: 31px;
  letter-spacing: -0.035em;
}
.manage-hero p:not(.kicker) {
  color: #b7c4be;
}
.setup-progress {
  display: flex;
  align-items: center;
}
.setup-progress span {
  width: 34px;
  height: 34px;
  border: 1px solid #607069;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: #91a098;
  font-size: 12px;
  font-weight: 800;
}
.setup-progress span.done {
  background: #ff5b35;
  color: white;
  border-color: #ff5b35;
}
.setup-progress i {
  width: 28px;
  height: 1px;
  background: #607069;
}
.inline-state {
  background: #f5f3ee;
  padding: 12px;
  border-radius: 8px;
  font-size: 12px;
  color: #67716c;
}
.inline-state.error {
  color: #bd3a23;
}
.team-editor-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px;
}
.team-editor-card {
  border: 1px solid #ddd9cf;
  border-radius: 14px;
  padding: 20px;
  background: #fff;
  box-shadow: 0 12px 28px -28px rgba(29, 47, 39, 0.55);
}
.team-editor-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 14px;
  padding-bottom: 16px;
  border-bottom: 1px solid #eeeae2;
}
.team-card-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 11px;
}
.team-card-title > div {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.team-card-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #1f3029;
  font-size: 15px;
}
.team-card-title > div > span {
  color: #8a928e;
  font-size: 10px;
}
.group-badge {
  flex: 0 0 auto;
  min-width: 38px;
  height: 30px;
  display: grid;
  place-items: center;
  background: #20342c;
  color: white;
  padding: 0 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
}
.icon-button {
  width: 29px;
  height: 29px;
  border-radius: 7px;
  border: 1px solid #ddd8cf;
  background: white;
  color: #8a8f8c;
  font-size: 18px;
  cursor: pointer;
}
.team-inputs {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 104px;
  gap: 12px;
  margin: 18px 0;
}
.team-inputs label {
  display: flex;
  flex-direction: column;
  gap: 7px;
}
.team-inputs input {
  height: 42px;
  background: white;
}
.group-input-wrap {
  position: relative;
}
.group-input-wrap input {
  padding-right: 33px;
  text-transform: uppercase;
}
.group-input-wrap em {
  position: absolute;
  top: 50%;
  right: 12px;
  transform: translateY(-50%);
  color: #727d77;
  font-size: 12px;
  font-style: normal;
  pointer-events: none;
}
.member-picker-box {
  border: 1px solid #e5e1d8;
  border-radius: 10px;
  padding: 13px;
  background: #f8f7f3;
}
.member-section-title,
.member-list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.member-section-title > div {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.member-section-title strong,
.member-list-head strong {
  color: #2b3b34;
  font-size: 11px;
}
.member-section-title span {
  color: #8a928e;
  font-size: 10px;
}
.member-add-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  margin-top: 10px;
}
.member-add-row select {
  height: 40px;
  min-width: 0;
  background: white;
}
.member-add-button {
  min-width: 92px;
  height: 40px;
  white-space: nowrap;
}
.team-members-editor {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.member-list-head {
  margin-bottom: 1px;
}
.member-list-head > span {
  min-width: 31px;
  padding: 3px 8px;
  border-radius: 999px;
  background: #edf1ee;
  color: #53625b;
  text-align: center;
  font-size: 10px;
  font-weight: 750;
}
.member-edit-row {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr) auto 29px;
  align-items: center;
  gap: 10px;
  background: #fcfbf8;
  border: 1px solid #e7e3db;
  border-radius: 10px;
  padding: 9px 10px;
}
.member-avatar {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #e8eeeb;
  color: #294037;
  font-size: 12px;
  font-weight: 850;
}
.member-profile {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.member-profile strong,
.member-profile small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.member-profile strong {
  color: #1e2e27;
  font-size: 13px;
}
.member-edit-row small {
  color: #89918d;
  font-size: 10px;
}
.experience-control {
  display: flex;
  align-items: center;
  gap: 7px;
}
.experience-control span {
  font-size: 10px;
  color: #7a837e;
  white-space: nowrap;
}
.experience-control select {
  width: 66px;
  height: 34px;
  padding: 5px 8px;
  background: white;
}
.team-editor-card footer {
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: 9px;
  background: #fff2ed;
  display: flex;
  justify-content: flex-end;
  align-items: baseline;
  gap: 8px;
  color: #68736d;
  font-size: 11px;
}
.team-editor-card footer strong {
  color: #ff5b35;
  font-size: 18px;
}
.empty-line {
  text-align: center;
  color: #969c99;
  font-size: 11px;
  padding: 18px 12px;
  border: 1px dashed #dcd8cf;
  border-radius: 9px;
  background: #faf9f6;
}
.empty-editor {
  border: 1px dashed #d6d1c7;
  background: #faf9f5;
  border-radius: 10px;
  padding: 30px;
  text-align: center;
  color: #7c847f;
  font-size: 13px;
}
.schedule-editor {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.schedule-edit-row {
  display: grid;
  grid-template-columns: 86px 1fr 180px 150px 30px;
  gap: 9px;
  align-items: center;
  border: 1px solid #e2ded5;
  border-radius: 9px;
  padding: 9px;
}
.match-kind {
  font-size: 10px;
  font-weight: 850;
  color: #506059;
}
.match-kind.final {
  color: #ff5b35;
}
.match-versus {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  column-gap: 10px;
  width: 100%;
  min-width: 0;
}
.match-versus strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
}
.match-versus strong:first-child {
  text-align: right;
}
.match-versus strong:last-child {
  text-align: left;
}
.match-versus span {
  justify-self: center;
  font-size: 9px;
  color: #9aa09c;
}
.sticky-save {
  margin-top: 22px;
  background: #20342c;
  border-radius: 10px;
  padding: 16px 18px;
  color: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 18px;
}
.sticky-save div {
  display: flex;
  flex-direction: column;
}
.sticky-save span {
  color: #aebdb6;
  font-size: 11px;
}
.sticky-save .form-error {
  margin: 3px 0 0;
  color: #ffb4a2;
}
.event-hero {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1fr 235px;
  min-height: 330px;
  background: #20342c;
  border-radius: 18px;
  color: white;
}
.hero-pattern {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 85% 15%, rgba(255, 91, 53, 0.18), transparent 24%),
    repeating-linear-gradient(120deg, transparent 0 54px, rgba(255, 255, 255, 0.025) 55px 56px);
}
.hero-main {
  position: relative;
  padding: 48px 52px;
}
.status-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 11px;
  color: #afbeb7;
  letter-spacing: 0.04em;
}
.status-chip {
  padding: 5px 9px;
  border-radius: 999px;
  background: #40534b;
  color: white;
  font-weight: 750;
}
.status-chip.ongoing {
  background: #ff5b35;
}
.status-chip.completed {
  background: #68736e;
}
.status-chip.open {
  background: #e9c95e;
  color: #24332d;
}
.hero-main h1 {
  max-width: 720px;
  margin: 20px 0 10px;
  font-size: clamp(36px, 5vw, 57px);
  line-height: 1.05;
  letter-spacing: -0.05em;
}
.topic {
  font-family: Georgia, 'Noto Serif KR', serif;
  font-size: 17px;
  color: #f2eee6;
  line-height: 1.55;
  max-width: 760px;
}
.description {
  color: #aebcb6;
  margin-top: 12px;
  font-size: 13px;
}
.hero-metadata {
  display: flex;
  gap: 28px;
  margin-top: 30px;
}
.hero-metadata span {
  display: flex;
  flex-direction: column;
  font-size: 13px;
}
.hero-metadata b {
  font-size: 9px;
  color: #75877f;
  letter-spacing: 0.14em;
  margin-bottom: 3px;
}
.hero-scoreboard {
  position: relative;
  background: #ff5b35;
  margin: 24px 24px 24px 0;
  border-radius: 12px;
  padding: 25px 22px;
  align-self: stretch;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.score-label {
  margin-bottom: auto;
  font-size: 9px;
  font-weight: 850;
  letter-spacing: 0.16em;
}
.hero-scoreboard strong {
  font-size: 41px;
  letter-spacing: -0.05em;
}
.hero-scoreboard p {
  font-size: 11px;
  opacity: 0.85;
}
.progress-track {
  height: 5px;
  background: rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  margin-top: 13px;
  overflow: hidden;
}
.progress-track i {
  display: block;
  height: 100%;
  background: white;
  border-radius: inherit;
}
.event-tabs {
  display: flex;
  gap: 2px;
  margin: 16px 0 35px;
  border-bottom: 1px solid #d7d3ca;
}
.event-tabs button {
  border: 0;
  background: none;
  padding: 14px 18px;
  color: #6f7773;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  border-bottom: 2px solid transparent;
}
.event-tabs button.active {
  color: #1d2d26;
  border-bottom-color: #ff5b35;
}
.event-tabs button span {
  display: inline-grid;
  place-items: center;
  margin-left: 7px;
  min-width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #e7e4dc;
  font-size: 9px;
}
.content-section {
  min-height: 320px;
}
.section-heading.on-page {
  align-items: end;
}
.section-heading.on-page h2 {
  font-size: 30px;
}
.section-heading.on-page > p {
  max-width: 420px;
  text-align: right;
}
.day-groups {
  display: flex;
  flex-direction: column;
  gap: 30px;
}
.day-block > header {
  display: grid;
  grid-template-columns: auto 1fr;
  align-items: center;
  gap: 18px;
  margin-bottom: 10px;
}
.day-block > header div {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.day-block > header span {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #ff5b35;
  color: white;
  font-size: 10px;
  font-weight: 800;
}
.day-block > header strong {
  font-size: 17px;
}
.day-block > header i {
  height: 1px;
  background: #d9d5cc;
}
.match-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.match-card {
  display: grid;
  grid-template-columns: 170px 1fr 165px;
  background: white;
  border: 1px solid #dfdcd3;
  border-radius: 11px;
  overflow: hidden;
}
.match-meta {
  display: grid;
  grid-template-columns: auto 1fr;
  align-content: center;
  gap: 4px 9px;
  border-right: 1px solid #e6e2da;
  padding: 17px;
}
.match-meta strong {
  font-size: 19px;
}
.match-meta small {
  grid-column: 2;
  color: #7a837e;
}
.stage-chip {
  align-self: center;
  padding: 4px 7px;
  border-radius: 5px;
  background: #e9eee9;
  color: #3c5148;
  font-size: 9px;
  font-weight: 850;
}
.stage-chip.final {
  background: #ff5b35;
  color: white;
}
.teams-versus {
  display: grid;
  grid-template-columns: 1fr 30px 1fr;
  align-items: center;
  padding: 12px 24px;
}
.teams-versus div {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
  min-width: 0;
}
.teams-versus div:last-child {
  flex-direction: row-reverse;
}
.teams-versus span {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.teams-versus b {
  font-size: 23px;
  color: #a5aba8;
}
.teams-versus div.winner b,
.teams-versus div.winner span {
  color: #e64d2b;
}
.teams-versus em {
  text-align: center;
  color: #a4aaa7;
  font-style: normal;
  font-size: 9px;
}
.result-status {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: center;
  padding: 14px 17px;
  border-left: 1px solid #e6e2da;
  color: #84908a;
  font-size: 11px;
}
.finished {
  color: #2f6c51;
  font-weight: 750;
}
.result-editor {
  grid-column: 1 / -1;
  border-top: 1px solid #e5e1d8;
  background: #faf9f5;
  padding: 11px 16px;
  display: flex;
  align-items: end;
  justify-content: flex-end;
  gap: 8px;
}
.result-editor label {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.result-editor label span {
  font-size: 9px;
  color: #707b75;
}
.result-editor input {
  width: 90px;
  padding: 7px;
}
.result-editor select {
  width: 180px;
  padding: 7px;
}
.standings-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
}
.standing-card {
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #ddd9d0;
  background: white;
}
.standing-card header {
  background: #20342c;
  color: white;
  padding: 18px;
  display: grid;
  grid-template-columns: 42px 1fr auto;
  align-items: center;
}
.standing-card header > span {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #ff5b35;
  font-weight: 850;
}
.standing-card header strong {
  font-size: 19px;
}
.standing-card header small {
  color: #a7b6af;
}
.standing-head,
.standing-row {
  display: grid;
  grid-template-columns: 1fr repeat(4, 48px);
  align-items: center;
  padding: 10px 16px;
}
.standing-head {
  color: #939a96;
  font-size: 9px;
  border-bottom: 1px solid #ebe8e1;
}
.standing-head span:not(:first-child),
.standing-row > span,
.standing-row > strong {
  text-align: center;
}
.standing-row {
  min-height: 54px;
  border-bottom: 1px solid #eeebe5;
  font-size: 12px;
}
.standing-row:last-child {
  border-bottom: 0;
}
.standing-row > div {
  display: flex;
  align-items: center;
  gap: 12px;
}
.standing-row > div b {
  width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #eeece6;
}
.standing-row.leader {
  background: #fff8f5;
}
.standing-row.leader > div b {
  background: #ff5b35;
  color: white;
}
.standing-row > strong {
  color: #e64d2b;
  font-size: 16px;
}
.roster-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.roster-card {
  background: white;
  border: 1px solid #dedad1;
  border-radius: 12px;
  overflow: hidden;
}
.roster-card > header {
  display: grid;
  grid-template-columns: 38px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 17px;
  border-bottom: 1px solid #ebe7df;
}
.roster-card > header > span {
  display: grid;
  place-items: center;
  width: 35px;
  height: 35px;
  border-radius: 50%;
  background: #20342c;
  color: white;
  font-weight: 850;
}
.roster-card h3 {
  font-size: 15px;
  line-height: 1.25;
}
.roster-card header small {
  color: #87908b;
  font-size: 9px;
}
.roster-card header > b {
  color: #ff5b35;
  font-size: 19px;
}
.roster-members {
  padding: 8px 14px 14px;
}
.roster-members > div {
  display: grid;
  grid-template-columns: 32px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 9px 0;
  border-bottom: 1px solid #efede7;
}
.roster-members > div:last-child {
  border: 0;
}
.avatar {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #eeeae2;
  font-size: 11px;
  font-weight: 800;
}
.roster-members div div {
  display: flex;
  flex-direction: column;
}
.roster-members strong {
  font-size: 12px;
}
.roster-members small {
  color: #909692;
  font-size: 9px;
}
.roster-members em {
  font-style: normal;
  font-size: 9px;
  color: #748079;
}
.rules-layout {
  display: grid;
  grid-template-columns: 1.4fr 0.6fr;
  gap: 16px;
}
.rule-flow {
  background: white;
  border: 1px solid #ddd9d0;
  border-radius: 12px;
  padding: 10px 24px;
}
.rule-flow article {
  display: grid;
  grid-template-columns: 52px 1fr;
  gap: 14px;
  padding: 24px 0;
  border-bottom: 1px solid #ebe7df;
}
.rule-flow article:last-child {
  border: 0;
}
.rule-flow article > span {
  color: #ff5b35;
  font: 800 23px Georgia;
}
.rule-flow h3 {
  font-size: 16px;
}
.rule-flow p,
.tie-rule p {
  margin-top: 5px;
  color: #737d78;
  font-size: 12px;
}
.tie-rule {
  background: #ff5b35;
  color: white;
  border-radius: 12px;
  padding: 29px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.tie-rule > span {
  font-size: 9px;
  letter-spacing: 0.16em;
  font-weight: 850;
}
.tie-rule h3 {
  margin-top: 12px;
  font-size: 23px;
}
.tie-rule p {
  color: #ffe0d8;
}
.tie-rule div {
  margin-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.3);
  padding-top: 14px;
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}
.empty-content {
  border: 1px dashed #d3cfc5;
  padding: 60px 20px;
  text-align: center;
  color: #828a86;
  border-radius: 12px;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
@media (max-width: 900px) {
  .event-form {
    grid-template-columns: repeat(2, 1fr);
  }
  .event-hero {
    grid-template-columns: 1fr;
  }
  .hero-scoreboard {
    margin: 0 24px 24px;
    min-height: 155px;
  }
  .hero-main {
    padding: 40px 32px;
  }
  .team-editor-grid,
  .standings-grid,
  .rules-layout {
    grid-template-columns: 1fr;
  }
  .roster-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .schedule-edit-row {
    grid-template-columns: 82px 1fr 160px 30px;
  }
  .schedule-edit-row input:nth-of-type(2) {
    grid-column: 2 / 4;
  }
  .match-card {
    grid-template-columns: 140px 1fr;
  }
  .result-status {
    grid-column: 1 / -1;
    flex-direction: row;
    justify-content: space-between;
    border-left: 0;
    border-top: 1px solid #e6e2da;
  }
  .result-editor {
    flex-wrap: wrap;
  }
}
@media (max-width: 640px) {
  .events-shell {
    padding: 18px 14px 50px;
  }
  .page-tools,
  .section-heading,
  .manage-hero {
    align-items: stretch;
    flex-direction: column;
  }
  .tool-actions {
    width: 100%;
  }
  .event-select {
    flex: 1;
  }
  .event-select select {
    min-width: 0;
  }
  .event-form {
    grid-template-columns: 1fr;
  }
  .field,
  .field.wide,
  .form-actions.wide {
    grid-column: 1;
  }
  .form-actions {
    justify-content: stretch;
  }
  .form-actions .button {
    width: 100%;
  }
  .manage-hero {
    padding: 26px;
  }
  .setup-progress {
    margin-top: 8px;
  }
  .team-editor-grid,
  .roster-grid {
    grid-template-columns: 1fr;
  }
  .team-editor-card {
    padding: 16px;
  }
  .team-card-title > div > span {
    display: none;
  }
  .team-inputs {
    grid-template-columns: minmax(0, 1fr) 88px;
  }
  .member-add-row {
    grid-template-columns: 1fr;
  }
  .member-add-button {
    width: 100%;
  }
  .member-edit-row {
    grid-template-columns: 34px minmax(0, 1fr) 29px;
  }
  .experience-control {
    grid-column: 2 / 4;
    justify-content: space-between;
    padding-top: 7px;
    border-top: 1px solid #eeeae2;
  }
  .experience-control select {
    width: 76px;
  }
  .team-editor-card footer {
    justify-content: space-between;
  }
  .schedule-edit-row {
    grid-template-columns: 72px 1fr 30px;
  }
  .schedule-edit-row input {
    grid-column: 1 / 4;
  }
  .schedule-edit-row input:nth-of-type(2) {
    grid-column: 1 / 4;
  }
  .sticky-save {
    align-items: stretch;
    flex-direction: column;
  }
  .hero-main {
    padding: 34px 24px;
  }
  .hero-main h1 {
    font-size: 38px;
  }
  .hero-metadata {
    flex-direction: column;
    gap: 10px;
  }
  .event-tabs {
    overflow-x: auto;
  }
  .event-tabs button {
    white-space: nowrap;
    padding-inline: 12px;
  }
  .section-heading.on-page > p {
    text-align: left;
  }
  .match-card {
    grid-template-columns: 1fr;
  }
  .match-meta {
    grid-template-columns: auto 1fr auto;
    border-right: 0;
    border-bottom: 1px solid #e6e2da;
  }
  .match-meta small {
    grid-column: auto;
    text-align: right;
  }
  .teams-versus {
    padding: 18px 14px;
  }
  .result-editor {
    align-items: stretch;
  }
  .result-editor select {
    width: 100%;
  }
  .standing-head,
  .standing-row {
    grid-template-columns: 1fr repeat(4, 36px);
    padding-inline: 10px;
  }
  .rules-layout {
    grid-template-columns: 1fr;
  }
}
</style>
