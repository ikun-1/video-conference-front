<script setup lang="ts">
import { onMounted, ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { getUserListApi } from '@/api/user'
import type { UserInfo } from '@/types/user'
import { ElMessage } from 'element-plus'
import { Search, UserFilled } from '@element-plus/icons-vue'
import { createNotificationApi } from '@/api/notification'
import { createMeetingApi } from '@/api/meeting'

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const users = ref<UserInfo[]>([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = 20
const keyword = ref('')
const searchInput = ref('')

// Debounced search
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(searchInput, (val) => {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    keyword.value = val
    page.value = 1
    fetchUsers()
  }, 300)
})

async function fetchUsers() {
  loading.value = true
  try {
    const result = await getUserListApi({
      page: page.value,
      limit: pageSize,
      key: keyword.value || undefined,
    })
    // Exclude current user
    users.value = result.list.filter(u => u.id !== user.value?.id)
    total.value = result.count - (user.value ? 1 : 0)
  } catch {
    users.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function onPageChange(p: number) {
  page.value = p
  fetchUsers()
}

const inviteRoomNo = ref<number | null>(null)

async function handleInvite(target: UserInfo) {
  const myName = user.value?.nickname || user.value?.username || '有人'
  try {
    if (inviteRoomNo.value === null) {
      inviteRoomNo.value = await createMeetingApi({ title: `${myName} 的会议` })
    }
    await createNotificationApi(
      target.id,
      'invitation',
      JSON.stringify({ roomNo: inviteRoomNo.value, text: `${myName} 邀请你加入会议` }),
    )
    ElMessage.success(`已邀请 ${target.nickname || target.username}`)
  } catch {
    ElMessage.warning('发送邀请失败')
  }
}

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

onMounted(fetchUsers)
</script>

<template>
  <div class="flex h-full flex-col px-16 py-8">
    <!-- Header -->
    <div class="mb-6 flex items-center gap-3">
      <h1 class="text-2xl font-bold text-slate-800">通讯录</h1>
    </div>

    <!-- Search -->
    <div class="mb-4">
      <el-input
        v-model="searchInput"
        placeholder="搜索用户..."
        :prefix-icon="Search"
        clearable
        class="max-w-xs"
        size="large"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex flex-1 items-center justify-center">
      <span class="text-sm text-slate-400">加载中...</span>
    </div>

    <!-- Empty -->
    <div v-else-if="users.length === 0" class="flex flex-1 items-center justify-center">
      <div class="text-center">
        <el-icon :size="48" class="mb-3 text-slate-300"><UserFilled /></el-icon>
        <p class="text-sm text-slate-400">{{ keyword ? '未找到匹配的用户' : '暂无其他用户' }}</p>
      </div>
    </div>

    <!-- User List -->
    <div v-else class="flex-1 overflow-y-auto">
      <div class="grid gap-3 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="u in users"
          :key="u.id"
          class="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm transition hover:shadow-md"
        >
          <!-- Avatar -->
          <div class="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-100 text-sm font-bold text-blue-600">
            <img v-if="u.avatar" :src="u.avatar" alt="" class="h-full w-full object-cover" />
            <span v-else>{{ (u.nickname || u.username)[0]?.toUpperCase() }}</span>
          </div>

          <!-- Info -->
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium text-slate-800">{{ u.nickname || u.username }}</p>
            <p v-if="u.nickname" class="truncate text-xs text-slate-400">@{{ u.username }}</p>
          </div>

          <!-- Invite -->
          <button
            class="shrink-0 rounded-md bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition hover:bg-blue-100"
            @click="handleInvite(u)"
          >
            邀请
          </button>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="total > pageSize" class="mt-4 flex justify-center">
      <el-pagination
        v-model:current-page="page"
        :page-size="pageSize"
        :total="total"
        layout="prev, pager, next"
        small
        @current-change="onPageChange"
      />
    </div>
  </div>
</template>
