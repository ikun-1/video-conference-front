<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight } from '@element-plus/icons-vue'
import { getMeetingHistoryApi } from '@/api/meeting'
import type { MeetingInfo } from '@/types/meeting'

const router = useRouter()
const meetings = ref<MeetingInfo[]>([])
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await getMeetingHistoryApi({ page: 1, limit: 10 })
    meetings.value = res.list
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  const month = d.getMonth() + 1
  const day = d.getDate()
  return `${month}月${day}日`
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

function joinMeeting(roomNo: number) {
  router.push(`/meeting/${roomNo}`)
}
</script>

<template>
  <div class="px-16">
    <div class="text-5xl font-semibold tracking-tight text-slate-800">{{ meetings.length ? formatDate(meetings[0].createdAt) : '暂无会议' }}</div>
    <div class="mt-3 text-sm text-slate-700">{{ new Date().toLocaleDateString('zh-CN', { weekday: 'long' }) }}</div>

    <div class="mt-6 flex items-center">
      <div class="h-px flex-1 bg-slate-100" />
      <button
        class="ml-6 rounded-full border border-slate-100 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:bg-slate-50">
        全部会议
        <el-icon class="ml-1 align-middle">
          <ArrowRight />
        </el-icon>
      </button>
    </div>

    <div v-if="loading" class="mt-8 text-center text-sm text-slate-400">加载中...</div>

    <div v-else class="mt-8 space-y-8">
      <div v-for="meeting in meetings" :key="meeting.id">
        <div class="text-xs text-slate-400">{{ formatDate(meeting.createdAt) }}</div>
        <div class="mt-4 flex items-start justify-between">
          <div class="min-w-0">
            <div class="text-base font-semibold text-slate-900">{{ meeting.title }}</div>
            <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{{ formatTime(meeting.createdAt) }}</span>
              <span class="text-slate-300">·</span>
              <span>{{ meeting.roomNo }}</span>
              <span class="text-slate-300">·</span>
              <span :class="meeting.status === 'active' ? 'text-green-600' : 'text-slate-400'">
                {{ meeting.status === 'active' ? '进行中' : meeting.status === 'waiting' ? '等待中' : '已结束' }}
              </span>
            </div>
          </div>
          <el-button
            v-if="meeting.status !== 'ended'"
            type="primary"
            class="ml-8 mt-1.5"
            @click="joinMeeting(meeting.roomNo)"
          >
            入会
          </el-button>
        </div>
      </div>

      <div v-if="!meetings.length && !loading" class="pt-8 text-center text-sm text-slate-400">
        暂无会议记录，点击上方"创建会议"开始
      </div>
    </div>
  </div>
</template>
