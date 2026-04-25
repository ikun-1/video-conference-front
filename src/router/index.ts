import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

import HomeLayout from '@/layout/HomeLayout.vue'
import { useAuthStore } from '@/stores/auth'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/',
    component: HomeLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', name: 'home', component: () => import('@/views/home/HomeView.vue') },
      {
        path: 'contacts',
        name: 'contacts',
        component: () => import('@/views/home/ContactsView.vue'),
      },
      {
        path: 'recording',
        name: 'recording',
        component: () => import('@/views/home/RecordingView.vue'),
      },
      {
        path: 'recording/:id/play',
        name: 'recording-play',
        component: () => import('@/views/home/RecordingPlayView.vue'),
      },
    ],
  },
  {
    path: '/meeting/:roomNo',
    name: 'meeting',
    component: () => import('@/views/meeting/MeetingView.vue'),
    meta: { requiresAuth: true },
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(to => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return { name: 'login' }
  }

  if (to.name === 'login' && authStore.isAuthenticated) {
    return { name: 'home' }
  }

  return true
})

export default router
