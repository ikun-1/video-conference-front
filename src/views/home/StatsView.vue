<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getOverviewStatsApi, getUserStatsApi, getTrendStatsApi } from '@/api/stats'
import type { OverviewStats, UserStats, TrendStats } from '@/types/stats'
import { storeToRefs } from 'pinia'
import { DataAnalysis } from '@element-plus/icons-vue'

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const loading = ref(true)
const overview = ref<OverviewStats | null>(null)
const myStats = ref<UserStats | null>(null)
const trend = ref<TrendStats | null>(null)

function formatDuration(ms: number): string {
  if (!ms) return '00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatShortDuration(ms: number): string {
  if (!ms) return '0分钟'
  const totalMin = Math.floor(ms / 60000)
  if (totalMin < 60) return `${totalMin}分钟`
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return m > 0 ? `${h}小时${m}分钟` : `${h}小时`
}

async function fetchData() {
  loading.value = true
  try {
    const [ov, tr] = await Promise.all([
      getOverviewStatsApi(),
      getTrendStatsApi(7),
    ])
    overview.value = ov
    trend.value = tr

    if (user.value?.id) {
      myStats.value = await getUserStatsApi(user.value.id)
    }
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="overflow-y-auto px-16 py-8">
    <div class="mb-6 flex items-center gap-3">
      <el-icon :size="28" class="text-blue-600"><DataAnalysis /></el-icon>
      <h1 class="text-2xl font-bold text-slate-800">会议统计</h1>
    </div>

    <div v-if="loading" class="py-20 text-center text-sm text-slate-400">加载中...</div>

    <template v-else>
      <!-- Overview Cards -->
      <div v-if="overview" class="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <el-card shadow="hover" class="!border-slate-100">
          <div class="flex flex-col items-center py-4 text-center">
            <span class="text-3xl font-bold text-blue-600">{{ overview.totalMeetings }}</span>
            <span class="mt-2 text-sm text-slate-500">总会议数</span>
          </div>
        </el-card>
        <el-card shadow="hover" class="!border-slate-100">
          <div class="flex flex-col items-center py-4 text-center">
            <span class="text-3xl font-bold text-green-600">{{ overview.activeMeetings }}</span>
            <span class="mt-2 text-sm text-slate-500">进行中会议</span>
          </div>
        </el-card>
        <el-card shadow="hover" class="!border-slate-100">
          <div class="flex flex-col items-center py-4 text-center">
            <span class="text-3xl font-bold text-purple-600">{{ overview.totalParticipants }}</span>
            <span class="mt-2 text-sm text-slate-500">累计参会人数</span>
          </div>
        </el-card>
        <el-card shadow="hover" class="!border-slate-100">
          <div class="flex flex-col items-center py-4 text-center">
            <span class="text-3xl font-bold text-amber-600">{{ overview.totalRecordings }}</span>
            <span class="mt-2 text-sm text-slate-500">录制总数</span>
          </div>
        </el-card>
      </div>

      <!-- My Stats Section -->
      <div v-if="myStats" class="mb-8">
        <h2 class="mb-4 text-lg font-semibold text-slate-700">我的会议统计</h2>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-3">
          <el-card shadow="hover" class="!border-slate-100">
            <div class="flex flex-col items-center py-3 text-center">
              <span class="text-2xl font-bold text-slate-800">{{ myStats.totalMeetings }}</span>
              <span class="mt-1 text-xs text-slate-500">参与会议</span>
            </div>
          </el-card>
          <el-card shadow="hover" class="!border-slate-100">
            <div class="flex flex-col items-center py-3 text-center">
              <span class="text-2xl font-bold text-slate-800">{{ myStats.meetingsHosted }}</span>
              <span class="mt-1 text-xs text-slate-500">主持次数</span>
            </div>
          </el-card>
          <el-card shadow="hover" class="!border-slate-100">
            <div class="flex flex-col items-center py-3 text-center">
              <span class="text-2xl font-bold text-slate-800">{{ formatShortDuration(myStats.totalDurationMs) }}</span>
              <span class="mt-1 text-xs text-slate-500">总参会时长</span>
            </div>
          </el-card>
        </div>

        <!-- Recent Meetings Table -->
        <div v-if="myStats.recentMeetings.length" class="mt-4">
          <h3 class="mb-3 text-sm font-medium text-slate-600">最近参与会议</h3>
          <el-table :data="myStats.recentMeetings" stripe size="small" class="w-full">
            <el-table-column prop="title" label="会议标题" min-width="140" />
            <el-table-column label="角色" width="80">
              <template #default="{ row }">
                <el-tag v-if="row.isHost" size="small" type="warning">主持人</el-tag>
                <el-tag v-else size="small" type="info">参会者</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="加入时间" width="160">
              <template #default="{ row }">{{ row.joinedAt }}</template>
            </el-table-column>
            <el-table-column label="离开时间" width="160">
              <template #default="{ row }">{{ row.leftAt || '-' }}</template>
            </el-table-column>
            <el-table-column label="参会时长" width="120">
              <template #default="{ row }">{{ formatDuration(row.durationMs) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- Trend Section -->
      <div v-if="trend && trend.days.length" class="mb-8">
        <h2 class="mb-4 text-lg font-semibold text-slate-700">每日趋势 (近7天)</h2>
        <el-table :data="trend.days" stripe size="small" class="w-full">
          <el-table-column prop="date" label="日期" width="140" />
          <el-table-column label="新增会议数" width="140">
            <template #default="{ row }">
              <span class="font-medium text-blue-600">{{ row.meetings }}</span>
            </template>
          </el-table-column>
          <el-table-column label="活跃参会人数">
            <template #default="{ row }">
              <span class="font-medium text-purple-600">{{ row.participants }}</span>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </template>
  </div>
</template>
