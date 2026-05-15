<script setup lang="ts">
import { onMounted, onUnmounted, ref, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getOverviewStatsApi, getUserStatsApi, getTrendStatsApi, getMeetingQualityReportApi } from '@/api/stats'
import type { OverviewStats, UserStats, TrendStats, MeetingQualityReport } from '@/types/stats'
import { storeToRefs } from 'pinia'
import { DataAnalysis } from '@element-plus/icons-vue'
import * as echarts from 'echarts'

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const loading = ref(true)
const overview = ref<OverviewStats | null>(null)
const myStats = ref<UserStats | null>(null)
const trend = ref<TrendStats | null>(null)
const trendChart = ref<HTMLElement | null>(null)
const roleChart = ref<HTMLElement | null>(null)
const durationChart = ref<HTMLElement | null>(null)
let chartInstance: echarts.ECharts | null = null
let roleChartInstance: echarts.ECharts | null = null
let durationChartInstance: echarts.ECharts | null = null

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
    nextTick(() => {
      initTrendChart()
      if (myStats.value) {
        initRoleChart()
        initDurationChart()
      }
    })
  }
}

function initRoleChart() {
  if (!roleChart.value || !myStats.value) return
  if (!roleChartInstance) {
    roleChartInstance = echarts.init(roleChart.value)
  }

  const hosted = myStats.value.meetingsHosted
  const participated = myStats.value.totalMeetings - hosted

  const option = {
    tooltip: { trigger: 'item' },
    legend: { bottom: '0%' },
    color: ['#f59e0b', '#3b82f6'],
    series: [
      {
        name: '参会角色',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' }
        },
        labelLine: { show: false },
        data: [
          { value: hosted, name: '作为主持人' },
          { value: participated, name: '作为参会者' }
        ]
      }
    ]
  }
  roleChartInstance.setOption(option)
}

function initDurationChart() {
  if (!durationChart.value || !myStats.value || !myStats.value.recentMeetings?.length) return
  if (!durationChartInstance) {
    durationChartInstance = echarts.init(durationChart.value)
  }

  const recentMeetings = [...myStats.value.recentMeetings].reverse()
  const titles = recentMeetings.map(m => m.title || `会议#${m.roomNo}`).map(t => t.length > 8 ? t.substring(0, 8) + '...' : t)
  const durations = recentMeetings.map(m => Math.round(m.durationMs / 60000)) // minutes

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: '{b} <br/> 时长: {c} 分钟'
    },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      data: titles,
      axisLabel: { color: '#64748b', interval: 0, rotate: 30 }
    },
    yAxis: {
      type: 'value',
      name: '时长 (分钟)',
      nameTextStyle: { color: '#64748b' },
      axisLabel: { color: '#64748b' },
      splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } }
    },
    series: [
      {
        name: '时长',
        type: 'bar',
        barWidth: '40%',
        data: durations,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#14b8a6' },
            { offset: 1, color: '#0f766e' }
          ]),
          borderRadius: [4, 4, 0, 0]
        }
      }
    ]
  }
  durationChartInstance.setOption(option)
}

function initTrendChart() {
  if (!trendChart.value || !trend.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(trendChart.value)
  }

  const dates = trend.value.days.map(d => d.date)
  const meetings = trend.value.days.map(d => d.meetings)
  const participants = trend.value.days.map(d => d.participants)

  const option = {
    tooltip: {
      trigger: 'axis'
    },
    legend: {
      data: ['新增会议数', '活跃参会人数'],
      bottom: '0%'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '5%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: dates,
      axisLabel: {
        color: '#64748b'
      },
      axisLine: {
        lineStyle: { color: '#e2e8f0' }
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        color: '#64748b'
      },
      splitLine: {
        lineStyle: {
          color: '#f1f5f9',
          type: 'dashed'
        }
      }
    },
    series: [
      {
        name: '新增会议数',
        type: 'line',
        smooth: true,
        data: meetings,
        itemStyle: { color: '#2563eb' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(37,99,235,0.3)' },
            { offset: 1, color: 'rgba(37,99,235,0.05)' }
          ])
        }
      },
      {
        name: '活跃参会人数',
        type: 'line',
        smooth: true,
        data: participants,
        itemStyle: { color: '#9333ea' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(147,51,234,0.3)' },
            { offset: 1, color: 'rgba(147,51,234,0.05)' }
          ])
        }
      }
    ]
  }

  chartInstance.setOption(option)
}

// ---- Quality Report ----
const qualityReport = ref<MeetingQualityReport | null>(null)
const qualityLoading = ref(false)
const selectedQualityMeetingId = ref<number | null>(null)
const connectionTypeChart = ref<HTMLElement | null>(null)
let connectionTypeChartInstance: echarts.ECharts | null = null
let isUnmounted = false

const handleResize = () => {
  if (chartInstance) chartInstance.resize()
  if (roleChartInstance) roleChartInstance.resize()
  if (durationChartInstance) durationChartInstance.resize()
  if (connectionTypeChartInstance) connectionTypeChartInstance.resize()
}

onMounted(() => {
  fetchData()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  isUnmounted = true
  window.removeEventListener('resize', handleResize)
  if (chartInstance) {
    chartInstance.dispose()
    chartInstance = null
  }
  if (roleChartInstance) {
    roleChartInstance.dispose()
    roleChartInstance = null
  }
  if (durationChartInstance) {
    durationChartInstance.dispose()
    durationChartInstance = null
  }
  if (connectionTypeChartInstance) {
    connectionTypeChartInstance.dispose()
    connectionTypeChartInstance = null
  }
})

async function loadQualityReport(meetingId: number) {
  selectedQualityMeetingId.value = meetingId
  qualityLoading.value = true
  qualityReport.value = null
  try {
    const result = await getMeetingQualityReportApi(meetingId)
    if (!isUnmounted) {
      qualityReport.value = result
      nextTick(() => {
        initConnectionTypeChart()
      })
    }
  } catch {
    if (!isUnmounted) qualityReport.value = null
  } finally {
    if (!isUnmounted) qualityLoading.value = false
  }
}

function initConnectionTypeChart() {
  if (!connectionTypeChart.value || !qualityReport.value || !qualityReport.value.candidateDist || qualityReport.value.candidateDist.length === 0) return
  if (!connectionTypeChartInstance) {
    connectionTypeChartInstance = echarts.init(connectionTypeChart.value)
  }

  const data = qualityReport.value.candidateDist.map(c => ({
    name: candidateTypeLabel(c.type),
    value: c.count
  }))

  const option = {
    tooltip: { trigger: 'item', formatter: '{b} : {c}次 ({d}%)' },
    legend: { top: '5%', left: 'center' },
    color: ['#10b981', '#6366f1', '#8b5cf6', '#8b5cf6'],
    series: [
      {
        name: '连接类型',
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['50%', '60%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2
        },
        data: data
      }
    ]
  }
  connectionTypeChartInstance.setOption(option)
}

function formatPercent(val: number): string {
  return val.toFixed(2) + '%'
}

function formatMs(val: number): string {
  return val.toFixed(1) + ' ms'
}

function formatKbps(val: number): string {
  return val.toFixed(0) + ' kbps'
}

function formatFps(val: number): string {
  return val.toFixed(1) + ' fps'
}

function candidateTypeLabel(type: string): string {
  switch (type) {
    case 'host': return '本地直连'
    case 'srflx': return 'STUN反射'
    case 'relay': return 'TURN中继'
    default: return type
  }
}

</script>

<template>
  <div class="h-full overflow-y-auto px-4 sm:px-16 py-4 sm:py-8 pb-20 sm:pb-8">
    <div class="mb-4 sm:mb-6 flex items-center gap-2 sm:gap-3">
      <el-icon :size="24" class="text-blue-600 sm:!text-[28px]"><DataAnalysis /></el-icon>
      <h1 class="text-xl sm:text-2xl font-bold text-slate-800">会议统计</h1>
    </div>

    <div v-if="loading" class="py-10 sm:py-20 text-center text-sm text-slate-400">加载中...</div>

    <template v-else>
      <!-- Overview Cards -->
      <div v-if="overview" class="mb-6 sm:mb-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <el-card shadow="hover" class="!border-slate-100" body-class="!p-0">
          <div class="flex flex-col items-center py-3 sm:py-4 text-center">
            <span class="text-2xl sm:text-3xl font-bold text-blue-600">{{ overview.totalMeetings }}</span>
            <span class="mt-1 sm:mt-2 text-[10px] sm:text-sm text-slate-500">总会议数</span>
          </div>
        </el-card>
        <el-card shadow="hover" class="!border-slate-100" body-class="!p-0">
          <div class="flex flex-col items-center py-3 sm:py-4 text-center">
            <span class="text-2xl sm:text-3xl font-bold text-green-600">{{ overview.activeMeetings }}</span>
            <span class="mt-1 sm:mt-2 text-[10px] sm:text-sm text-slate-500">进行中会议</span>
          </div>
        </el-card>
        <el-card shadow="hover" class="!border-slate-100" body-class="!p-0">
          <div class="flex flex-col items-center py-3 sm:py-4 text-center">
            <span class="text-2xl sm:text-3xl font-bold text-purple-600">{{ overview.totalParticipants }}</span>
            <span class="mt-1 sm:mt-2 text-[10px] sm:text-sm text-slate-500">累计参会人数</span>
          </div>
        </el-card>
        <el-card shadow="hover" class="!border-slate-100" body-class="!p-0">
          <div class="flex flex-col items-center py-3 sm:py-4 text-center">
            <span class="text-2xl sm:text-3xl font-bold text-amber-600">{{ overview.totalRecordings }}</span>
            <span class="mt-1 sm:mt-2 text-[10px] sm:text-sm text-slate-500">录制总数</span>
          </div>
        </el-card>
      </div>

      <!-- My Stats Section -->
      <div v-if="myStats" class="mb-6 sm:mb-8">
        <h2 class="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-slate-700">我的会议统计</h2>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
          <div class="grid grid-cols-1 gap-2 sm:gap-4 h-full">
            <el-card shadow="hover" class="!border-slate-100 h-full flex flex-col justify-center" body-class="!p-0 h-full">
              <div class="flex flex-col items-center py-4 text-center">
                <span class="text-xl sm:text-3xl font-bold text-slate-800">{{ myStats.totalMeetings }}</span>
                <span class="mt-1 text-xs text-slate-500">参与会议</span>
              </div>
            </el-card>
            <el-card shadow="hover" class="!border-slate-100 h-full flex flex-col justify-center" body-class="!p-0 h-full">
              <div class="flex flex-col items-center py-4 text-center">
                <span class="text-base sm:text-2xl font-bold text-slate-800 whitespace-nowrap overflow-hidden text-ellipsis px-1 w-full">{{ formatShortDuration(myStats.totalDurationMs) }}</span>
                <span class="mt-1 text-xs text-slate-500">总参会时长</span>
              </div>
            </el-card>
          </div>
          <el-card shadow="hover" class="!border-slate-100 col-span-1" header="参会角色">
            <div ref="roleChart" class="w-full h-40 sm:h-48"></div>
          </el-card>
          <el-card shadow="hover" class="!border-slate-100 col-span-1" header="近期参会时长">
            <div ref="durationChart" class="w-full h-40 sm:h-48"></div>
          </el-card>
        </div>

        <!-- Trend Section -->
        <div v-if="trend && trend.days.length" class="mb-6 sm:mb-8">
          <h2 class="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-slate-700">每日趋势 (近7天)</h2>
          <div ref="trendChart" class="w-full h-64 sm:h-80 bg-white rounded-lg shadow-sm border border-slate-100 p-2 sm:p-4"></div>
        </div>

        <!-- Recent Meetings Table -->
        <div v-if="myStats.recentMeetings?.length" class="mt-4 sm:mt-6">
          <h3 class="mb-2 sm:mb-3 text-xs sm:text-sm font-medium text-slate-600">最近参与会议</h3>
          <el-table :data="myStats.recentMeetings" stripe size="small" class="w-full text-xs sm:text-sm">
            <el-table-column prop="title" label="会议标题" min-width="120" />
            <el-table-column label="角色" width="70">
              <template #default="{ row }">
                <el-tag v-if="row.isHost" size="small" type="warning">主持人</el-tag>
                <el-tag v-else size="small" type="info">参会者</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="加入时间" width="140">
              <template #default="{ row }">{{ row.joinedAt }}</template>
            </el-table-column>
            <el-table-column label="离开时间" width="140">
              <template #default="{ row }">{{ row.leftAt || '-' }}</template>
            </el-table-column>
            <el-table-column label="参会时长" width="100">
              <template #default="{ row }">{{ formatDuration(row.durationMs) }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- Quality Report Section -->
      <div v-if="myStats?.recentMeetings?.length" class="mb-6 sm:mb-8">
        <h2 class="mb-3 sm:mb-4 text-base sm:text-lg font-semibold text-slate-700">会议质量报告</h2>
        <div class="mb-3 flex flex-row overflow-x-auto gap-2 scrollbar-none pb-1">
          <el-button
            v-for="m in myStats.recentMeetings.slice(0, 10)"
            :key="m.meetingId"
            :type="selectedQualityMeetingId === m.meetingId ? 'primary' : 'default'"
            size="small"
            plain
            class="shrink-0"
            :disabled="qualityLoading"
            @click="loadQualityReport(m.meetingId)"
          >
            {{ m.title || '会议#' + m.roomNo }}
          </el-button>
        </div>

        <div v-if="qualityLoading" class="py-10 text-center text-sm text-slate-400">加载质量报告中...</div>

        <div v-else-if="qualityReport" class="space-y-4">
          <!-- Overall quality metrics -->
          <el-card shadow="hover" class="!border-slate-100">
            <template #header>
              <span class="font-medium text-slate-700 text-sm sm:text-base">会议总体质量</span>
            </template>
            <div class="grid grid-cols-3 gap-2 sm:gap-4 md:grid-cols-3">
              <div class="text-center">
                <div class="text-sm sm:text-lg font-semibold text-slate-800">{{ formatMs(qualityReport.overallAvgJitterMs) }}</div>
                <div class="text-[10px] sm:text-xs text-slate-500">平均抖动</div>
              </div>
              <div class="text-center border-l border-r border-slate-100">
                <div class="text-sm sm:text-lg font-semibold text-slate-800">{{ formatMs(qualityReport.overallAvgRttMs) }}</div>
                <div class="text-[10px] sm:text-xs text-slate-500">平均时延</div>
              </div>
              <div class="text-center">
                <div class="text-sm sm:text-lg font-semibold text-slate-800">{{ formatPercent(qualityReport.overallAvgPacketLossRate) }}</div>
                <div class="text-[10px] sm:text-xs text-slate-500">平均丢包率</div>
              </div>
            </div>
            <div v-if="qualityReport.candidateDist && qualityReport.candidateDist.length" class="mt-3 border-t border-slate-100 pt-3">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div class="mb-2 text-[10px] sm:text-xs font-medium text-slate-500">连接类型统计 (WebRTC P2P)</div>
                  <div class="flex flex-col gap-2 sm:gap-3">
                    <div v-for="c in qualityReport.candidateDist" :key="c.type" class="text-xs sm:text-sm flex items-center justify-between bg-slate-50 p-2 rounded">
                      <span>
                        <el-tag size="small" type="info" class="!text-[10px] sm:!text-xs mr-2">{{ candidateTypeLabel(c.type) }}</el-tag>
                      </span>
                      <span class="text-slate-600 font-medium">{{ c.count }} 次</span>
                    </div>
                  </div>
                </div>
                <div class="flex justify-center items-center">
                  <div ref="connectionTypeChart" class="w-full h-40 sm:h-48"></div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- Per-user quality -->
          <div v-for="user in qualityReport.users" :key="user.clientId">
            <el-card shadow="hover" class="!border-slate-100">
              <template #header>
                <div class="flex items-center gap-2">
                  <span class="font-medium text-slate-700 text-sm sm:text-base">{{ user.displayName || '用户#' + user.userId }}</span>
                  <el-tag v-if="user.candidateType" size="small" type="info" class="!text-[10px] sm:!text-xs">{{ candidateTypeLabel(user.candidateType) }}</el-tag>
                </div>
              </template>
              <div class="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
                <div v-if="user.audio" class="bg-slate-50/50 p-2 sm:p-3 rounded-lg">
                  <h4 class="mb-2 text-[10px] sm:text-xs font-medium text-slate-500 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-blue-400"></span>音频质量
                  </h4>
                  <div class="grid grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-sm">
                    <div><span class="text-slate-400">抖动:</span> <span class="text-slate-700 font-medium">{{ formatMs(user.audio.avgJitterMs) }}</span></div>
                    <div><span class="text-slate-400">时延:</span> <span class="text-slate-700 font-medium">{{ formatMs(user.audio.avgRoundTripMs) }}</span></div>
                    <div><span class="text-slate-400">丢包:</span> <span class="text-slate-700 font-medium">{{ user.audio.avgPacketsLost.toFixed(1) }}</span></div>
                    <div><span class="text-slate-400">采样:</span> <span class="text-slate-700 font-medium">{{ user.audio.sampleCount }} <span class="scale-90 inline-block font-normal">次</span></span></div>
                  </div>
                </div>
                <div v-if="user.video" class="bg-slate-50/50 p-2 sm:p-3 rounded-lg">
                  <h4 class="mb-2 text-[10px] sm:text-xs font-medium text-slate-500 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-green-400"></span>视频质量
                  </h4>
                  <div class="grid grid-cols-2 gap-1.5 sm:gap-2 text-[11px] sm:text-sm">
                    <div><span class="text-slate-400">抖动:</span> <span class="text-slate-700 font-medium">{{ formatMs(user.video.avgJitterMs) }}</span></div>
                    <div><span class="text-slate-400">时延:</span> <span class="text-slate-700 font-medium">{{ formatMs(user.video.avgRoundTripMs) }}</span></div>
                    <div><span class="text-slate-400">丢包:</span> <span class="text-slate-700 font-medium">{{ user.video.avgPacketsLost.toFixed(1) }}</span></div>
                    <div><span class="text-slate-400">比特率:</span> <span class="text-slate-700 font-medium">{{ formatKbps(user.video.avgBitrateKbps) }}</span></div>
                    <div class="col-span-2 sm:col-span-1"><span class="text-slate-400">帧率:</span> <span class="text-slate-700 font-medium">{{ formatFps(user.video.avgFps ?? 0) }}</span></div>
                    <div v-if="user.video.maxFrameWidth" class="col-span-2 sm:col-span-1"><span class="text-slate-400">分辨率:</span> <span class="text-slate-700 font-medium">{{ user.video.maxFrameWidth }}×{{ user.video.maxFrameHeight }}</span></div>
                  </div>
                </div>
              </div>
            </el-card>
          </div>

          <!-- No quality data -->
          <div v-if="qualityReport.userCount === 0" class="py-10 text-center text-sm text-slate-400">
            该会议尚无质量数据（会议进行时 WebRTC 质量采集会自动上报）
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
