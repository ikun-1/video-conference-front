<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { RouterView, RouterLink, useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  CollectionTag,
  DataAnalysis,
  Message,
  Microphone,
  Setting,
  SwitchButton,
  UserFilled,
  VideoCamera,
} from '@element-plus/icons-vue'

import SideBar from '@/component/home/SideBar.vue'
import { useAuthStore } from '@/stores/auth'
import { useNotificationWS } from '@/composables/useNotificationWS'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const { unreadCount, connect: connectNotifWS } = useNotificationWS()

const currentUser = computed(() => ({
  name: user.value?.nickname || user.value?.username || '未登录',
  avatar: user.value?.avatar || '',
}))

const sidebarItems = [
  { label: '会议', icon: VideoCamera, to: { name: 'home' }, activeNames: ['home'] },
  { label: '通讯录', icon: CollectionTag, to: { name: 'contacts' }, activeNames: ['contacts'] },
  { label: '录制', icon: Microphone, to: { name: 'recording' }, activeNames: ['recording'] },
  { label: '统计', icon: DataAnalysis, to: { name: 'stats' }, activeNames: ['stats'] },
]

function isActive(names: string[]): boolean {
  return route.name != null && names.includes(String(route.name))
}

const isProfileActive = computed(() => route.name === 'profile')

function handleLogout() {
  ElMessageBox.confirm('确定要退出登录吗？', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      authStore.clearAuth()
      ElMessage.success('已退出登录')
      router.push({ name: 'login' })
    })
    .catch(() => {})
}

function goProfile() {
  router.push({ name: 'profile' })
}

onMounted(() => {
  if (authStore.isAuthenticated) {
    connectNotifWS()
  }
})
</script>

<template>
  <main class="flex h-[100dvh] w-screen flex-col sm:flex-row overflow-hidden bg-white text-slate-800">
    <!-- Desktop Sidebar -->
    <section class="hidden sm:flex h-full w-24 flex-shrink-0 border-r border-slate-100">
      <SideBar />
    </section>

    <!-- Mobile Top Bar -->
    <header class="flex sm:hidden items-center justify-between px-4 py-2 border-b border-slate-100 bg-white z-10 flex-shrink-0">
      <div class="flex items-center gap-2" @click="goProfile">
        <div class="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-slate-50" :class="isProfileActive ? 'ring-2 ring-blue-200' : ''">
          <img v-if="currentUser.avatar" :src="currentUser.avatar" alt="用户头像" class="h-full w-full object-cover" />
          <el-icon v-else :size="16" class="text-slate-500"><UserFilled /></el-icon>
        </div>
        <span class="text-sm font-medium text-slate-700 truncate max-w-[120px]">{{ currentUser.name }}</span>
      </div>

      <div class="flex items-center gap-3">
        <RouterLink :to="{ name: 'notifications' }" class="relative flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-50" :class="isActive(['notifications']) ? 'bg-blue-50 text-blue-600' : ''">
          <el-icon :size="20"><Message /></el-icon>
          <span v-if="unreadCount > 0" class="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold leading-none text-white">
            {{ unreadCount > 99 ? '99+' : unreadCount }}
          </span>
        </RouterLink>

        <button class="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-50" :class="isProfileActive ? 'bg-blue-50 text-blue-600' : ''" @click="goProfile">
          <el-icon :size="20"><Setting /></el-icon>
        </button>

        <button class="flex h-8 w-8 items-center justify-center rounded-full text-red-500 transition hover:bg-red-50" @click="handleLogout">
          <el-icon :size="20"><SwitchButton /></el-icon>
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <section class="flex flex-1 flex-col h-full min-h-0 w-full overflow-hidden bg-slate-50 sm:bg-white relative">
      <RouterView />
    </section>

    <!-- Mobile Bottom Navigation Bar -->
    <nav class="flex sm:hidden items-center justify-around border-t border-slate-100 bg-white z-10 flex-shrink-0 h-[60px] pb-[env(safe-area-inset-bottom)] px-1">
      <RouterLink v-for="item in sidebarItems" :key="item.label" :to="item.to" class="flex flex-1 flex-col items-center justify-center gap-1 h-full py-1 text-slate-500 transition-colors" :class="isActive(item.activeNames) ? 'text-blue-600' : ''">
        <el-icon :size="22" :class="isActive(item.activeNames) ? 'text-blue-600' : 'text-slate-400'">
          <component :is="item.icon" />
        </el-icon>
        <span class="text-[10px] font-medium leading-none">{{ item.label }}</span>
      </RouterLink>
    </nav>
  </main>
</template>
