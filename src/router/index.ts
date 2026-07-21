import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import ResetPassword from '../views/ResetPassword.vue'
import ChangePassword from '../views/ChangePassword.vue'
import MyPage from '../views/MyPage.vue'
import AdminMembers from '../views/AdminMembers.vue'
import Timer from '../views/Timer.vue'
import Reservation from '../views/Reservation.vue'
import Record from '../views/Record.vue'
import DebateManage from '../views/DebateManage.vue'
import TournamentEvents from '../views/TournamentEvents.vue'
import { useAuth } from '../lib/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/home',
      name: 'Home',
      component: Home,
    },
    {
      path: '/login',
      name: 'Login',
      component: Login,
    },
    {
      path: '/reset-password',
      name: 'ResetPassword',
      component: ResetPassword,
    },
    {
      path: '/change-password',
      name: 'ChangePassword',
      component: ChangePassword,
    },
    {
      path: '/mypage',
      name: 'MyPage',
      component: MyPage,
    },
    {
      path: '/admin/members',
      name: 'AdminMembers',
      component: AdminMembers,
    },
    {
      path: '/timer',
      name: 'Timer',
      component: Timer,
    },
    {
      path: '/reservation',
      name: 'Reservation',
      component: Reservation,
    },
    {
      path: '/events',
      name: 'TournamentEvents',
      component: TournamentEvents,
    },
    {
      path: '/record',
      name: 'Record',
      component: Record,
    },
    {
      path: '/record/manage',
      name: 'DebateManage',
      component: DebateManage,
    },
  ],
})

// 초기 비밀번호(학번) 사용 중인 회원은 비밀번호를 변경할 때까지 다른 페이지로 이동 불가
router.beforeEach((to) => {
  const { isLoggedIn, mustChangePassword } = useAuth()
  if (isLoggedIn.value && mustChangePassword.value && to.path !== '/change-password') {
    return '/change-password'
  }
  return true
})

export default router
