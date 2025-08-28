import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Timer from '../views/Timer.vue'
import Reservation from '../views/Reservation.vue'
import Record from '../views/Record.vue'

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
      path: '/record',
      name: 'Record',
      component: Record,
    },
  ],
})

export default router
