<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { DocumentCopy } from '@element-plus/icons-vue'
import { useAuthStore } from '@/stores/auth'

interface MainMeetingHeaderProps {
  isRecording: boolean
  recordingStartedAt?: number
  networkLabel: string
  networkDelay: number
  roomTitle: string
  roomNo: number
  hostName: string
  myRole: string
  screenSharerName?: string
}

const props = withDefaults(defineProps<MainMeetingHeaderProps>(), {
  isRecording: false,
  recordingStartedAt: 0,
  networkLabel: '网络',
  networkDelay: 15,
  roomTitle: '软工2024 毕业设计答辩',
  roomNo: 852372,
  hostName: '李老师',
  myRole: '成员',
  screenSharerName: '',
})
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const emit = defineEmits<{
  copyInvite: []
}>()

const signalStrength = computed(() => {
  if (props.networkDelay <= 20) {
    return 4
  }
  if (props.networkDelay <= 35) {
    return 3
  }
  if (props.networkDelay <= 50) {
    return 2
  }
  return 1
})

const currentUserName = computed(() => user.value?.nickname || user.value?.username || '未登录用户')
const currentUserAvatar = computed(() => user.value?.avatar || '')

// Timer tick to refresh elapsed display every second
const tick = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  timer = setInterval(() => {
    tick.value++
  }, 1000)
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

// Re-evaluates every tick because recordingStartedAt is read through tick
const formattedElapsed = computed(() => {
  void tick.value // force reactivity
  if (!props.recordingStartedAt) return '00:00:00'
  const totalSec = Math.floor((Date.now() - props.recordingStartedAt) / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
</script>

<template>
  <header class="flex h-14 items-center justify-between border-b border-white/5 bg-[#1a1a1a] px-6">
    <div class="flex flex-1 items-center justify-start space-x-4">
      <div class="flex items-center gap-2 rounded bg-white/5 px-2 py-1 text-xs text-slate-200">
        <div
          class="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-[10px] font-bold text-white">
          <img v-if="currentUserAvatar" :src="currentUserAvatar" alt="用户头像" class="h-full w-full object-cover" />
          <span v-else>{{ currentUserName[0] || '我' }}</span>
        </div>
        <span class="max-w-[96px] truncate leading-none">{{ currentUserName }}</span>
      </div>

      <div v-if="screenSharerName" class="flex items-center space-x-2 rounded bg-white/5 px-2 py-1 text-xs text-slate-200">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full bg-[#0052D9] text-[10px] font-bold text-white">
          {{ screenSharerName[0] || '主' }}
        </div>
        <div class="flex min-w-0 items-center">
          <i aria-hidden="true" class="iconfont icon-pc mr-1 inline-flex items-center text-blue-400 leading-none"
            style="font-size: 12px; line-height: 1;" />
          <span class="truncate leading-none">{{ screenSharerName }} 正在共享屏幕</span>
        </div>
      </div>

      <div v-if="isRecording" class="flex items-center rounded bg-red-500/20 px-2 py-0.5 text-xs text-red-500">
        <span class="mr-2 h-2 w-2 animate-pulse rounded-full bg-red-500" />
        REC {{ formattedElapsed }}
      </div>
    </div>

    <div class="flex flex-1 items-center justify-center text-sm text-slate-300">
      <div class="flex items-center gap-2 truncate">
        <svg aria-hidden="true" class="h-[14px] w-[14px] shrink-0 text-green-500" viewBox="0 0 24 24"
          fill="currentColor">
          <path
            d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5m-3 8V6a3 3 0 1 1 6 0v3zm3 4a2 2 0 0 1 1 3.73V19h-2v-2.27A2 2 0 0 1 12 13" />
        </svg>
        <span class="truncate font-medium">{{ roomTitle }}</span>
      </div>
    </div>

    <div class="flex flex-1 items-center justify-end space-x-6">
      <div class="flex items-center space-x-4 text-slate-400">
        <div class="flex items-center text-xs">
          <span class="network-signal mr-1 text-green-500" aria-hidden="true">
            <span :class="{ 'is-active': signalStrength >= 1 }" />
            <span :class="{ 'is-active': signalStrength >= 2 }" />
            <span :class="{ 'is-active': signalStrength >= 3 }" />
            <span :class="{ 'is-active': signalStrength >= 4 }" />
          </span>
          <span>{{ props.networkLabel }} {{ props.networkDelay }}ms</span>
        </div>
        <div class="text-xs">会议ID: {{ roomNo }}</div>
      </div>

      <button
        class="flex items-center rounded bg-white/10 px-3 py-1.5 text-xs text-white transition-all hover:bg-white/20"
        type="button" @click="emit('copyInvite')">
        <el-icon class="mr-1">
          <DocumentCopy />
        </el-icon>
        邀请成员
      </button>
    </div>
  </header>
</template>

<style scoped>
.network-signal {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.network-signal span {
  width: 2px;
  border-radius: 9999px;
  background: rgb(34 197 94 / 0.3);
}

.network-signal span.is-active {
  background: currentColor;
}

.network-signal span:nth-child(1) {
  height: 4px;
}

.network-signal span:nth-child(2) {
  height: 6px;
}

.network-signal span:nth-child(3) {
  height: 9px;
}

.network-signal span:nth-child(4) {
  height: 12px;
}
</style>
