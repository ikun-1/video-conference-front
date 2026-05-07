<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { UserFilled, Message, Bell, VideoCamera } from '@element-plus/icons-vue'
import { getNotificationsApi, markAsReadApi, markAllAsReadApi, deleteNotificationApi } from '@/api/notification'
import type { NotificationItem } from '@/api/notification'
import { subscribe } from '@/composables/useNotificationWS'

const router = useRouter()

const notifications = ref<NotificationItem[]>([])
const loading = ref(false)

async function loadNotifications() {
  loading.value = true
  try {
    const result = await getNotificationsApi()
    notifications.value = result.list
  } catch {
    notifications.value = []
  } finally {
    loading.value = false
  }
}


async function handleMarkRead(n: NotificationItem) {
  if (n.status === 'read') return
  try {
    await markAsReadApi(n.id)
    n.status = 'read'
  } catch {
    // ignore
  }
}

function invitationInfo(n: NotificationItem): { text: string; roomNo?: number } {
  if (n.type !== 'invitation') return { text: n.message || '新消息' }
  try {
    const parsed = JSON.parse(n.message)
    return { text: parsed.text || n.message, roomNo: parsed.roomNo }
  } catch {
    return { text: n.message || '新消息' }
  }
}

function handleClick(n: NotificationItem) {
  const info = invitationInfo(n)
  if (info.roomNo) {
    handleMarkRead(n)
    router.push({ name: 'meeting', params: { roomNo: info.roomNo } })
  } else {
    handleMarkRead(n)
  }
}

async function handleMarkAllRead() {
  try {
    await markAllAsReadApi()
    notifications.value.forEach(n => (n.status = 'read'))
    ElMessage.success('已全部标记为已读')
  } catch {
    // ignore
  }
}

async function handleDelete(n: NotificationItem) {
  try {
    await deleteNotificationApi(n.id)
    notifications.value = notifications.value.filter(item => item.id !== n.id)
  } catch {
    // ignore
  }
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return d.toLocaleDateString('zh-CN')
}

onMounted(() => {
  loadNotifications()
  const unsub = subscribe((data: unknown) => {
    if (
      typeof data === 'object' &&
      data !== null &&
      'type' in data &&
      data.type === 'new-notification' &&
      'notification' in data &&
      data.notification
    ) {
      const notification = data.notification as NotificationItem
      if (!notifications.value.some(existing => existing.id === notification.id)) {
        notifications.value.unshift(notification)
      }
    }
  })
  onUnmounted(unsub)
})
</script>

<template>
  <div class="flex h-full flex-col px-4 sm:px-16 py-4 sm:py-8 pb-0  md:pb-8">
    <!-- Header -->
    <div class="mb-4 sm:mb-6 flex items-center justify-between">
      <div class="flex items-center gap-2 sm:gap-3">
        <el-icon :size="24" class="text-blue-600"><Bell /></el-icon>
        <h1 class="text-xl sm:text-2xl font-bold text-slate-800">消息</h1>
      </div>
      <el-button v-if="notifications.some(n => n.status === 'unread')" size="small" @click="handleMarkAllRead">
        全部已读
      </el-button>
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-1 items-center justify-center">
      <span class="text-sm text-slate-400">加载中...</span>
    </div>

    <!-- Empty -->
    <div v-else-if="notifications.length === 0" class="flex flex-1 items-center justify-center">
      <div class="text-center">
        <el-icon :size="48" class="mb-3 text-slate-300"><Message /></el-icon>
        <p class="text-sm text-slate-400">暂无消息</p>
      </div>
    </div>

    <!-- List -->
    <div v-else class="flex-1 overflow-y-auto">
      <div class="space-y-2 sm:space-y-1 pb-4">
        <div
          v-for="n in notifications"
          :key="n.id"
          class="flex cursor-pointer items-start gap-3 sm:gap-4 rounded-lg border border-slate-100 px-3 sm:px-4 py-3 sm:py-3.5 transition hover:bg-slate-50 flex-wrap sm:flex-nowrap relative"
          :class="n.status === 'unread' ? 'bg-blue-50/40' : 'bg-white'"
          @click="handleClick(n)"
        >
          <!-- Icon -->
          <div
            class="mt-0.5 flex h-8 w-8 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full"
            :class="n.type === 'invitation' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'"
          >
            <el-icon :size="16" class="sm:!text-[20px]" v-if="n.type === 'invitation'">
              <UserFilled />
            </el-icon>
            <el-icon :size="16" class="sm:!text-[20px]" v-else>
              <Message />
            </el-icon>
          </div>

          <!-- Content -->
          <div class="min-w-0 flex-1 pr-4 sm:pr-0">
            <p class="text-[13px] sm:text-sm leading-snug" :class="n.status === 'unread' ? 'font-medium text-slate-800' : 'text-slate-600'">
              {{ invitationInfo(n).text }}
              <el-icon v-if="invitationInfo(n).roomNo" :size="14" class="ml-1 inline text-blue-500 align-text-bottom">
                <VideoCamera />
              </el-icon>
            </p>
            <p class="mt-1 text-[11px] sm:text-xs text-slate-400">{{ formatTime(n.createdAt) }}</p>
          </div>

          <!-- Unread dot (mobile absolute, desktop relative) -->
          <span v-if="n.status === 'unread'" class="absolute right-3 top-4 sm:static sm:mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />

          <!-- Actions -->
          <div class="flex items-center gap-2 w-full sm:w-auto justify-end mt-1 sm:mt-0 border-t border-slate-50 sm:border-0 pt-2 sm:pt-0">
            <!-- Join button for invitations -->
            <el-button v-if="n.type === 'invitation' && invitationInfo(n).roomNo" size="small" type="primary" plain @click.stop="router.push({ name: 'meeting', params: { roomNo: invitationInfo(n).roomNo } })">
              加入
            </el-button>

            <!-- Delete -->
            <el-button size="small" type="danger" plain @click.stop="handleDelete(n)">
              删除
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
