<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getRecordingsApi, getRecordingDetailApi, deleteRecordingApi, downloadRecordingFile } from '@/api/meeting'
import type { RecordingInfo, RecordingDetail } from '@/types/meeting'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowDown, CaretRight, Delete, Download, VideoCamera } from '@element-plus/icons-vue'

const recordings = ref<RecordingInfo[]>([])
const details = ref<Record<number, RecordingDetail>>({})
const expanding = ref<Record<number, boolean>>({})
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const router = useRouter()

function goPlay(id: number) {
  router.push(`/recording/${id}/play`)
}

async function fetchRecordings() {
  loading.value = true
  try {
    const res = await getRecordingsApi({ page: page.value, limit: pageSize.value })
    recordings.value = res.list
    total.value = res.count
    const settled = await Promise.allSettled(
      res.list.map(r => getRecordingDetailApi(r.id))
    )
    details.value = {}
    res.list.forEach((r, i) => {
      if (settled[i]?.status === 'fulfilled') {
        details.value[r.id] = (settled[i] as PromiseFulfilledResult<RecordingDetail>).value
      }
    })
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
}

function toggleExpand(id: number) {
  expanding.value[id] = !expanding.value[id]
}

async function handleDownloadFile(recId: number, fileId: number, filename: string) {
  try {
    await downloadRecordingFile(recId, fileId, filename)
    ElMessage.success('下载完成')
  } catch {
    ElMessage.error('下载失败')
  }
}

async function handleDelete(id: number) {
  try {
    await ElMessageBox.confirm('确定要删除此录制记录吗？关联的文件将被永久删除。', '删除录制', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deleteRecordingApi(id)
    ElMessage.success('已删除')
    fetchRecordings()
  } catch {
    // cancelled
  }
}

function handlePageChange(val: number) {
  page.value = val
  fetchRecordings()
}

function formatDuration(ms: number): string {
  if (!ms) return '00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatStatus(status: string): string {
  switch (status) {
    case 'recording': return '录制中'
    case 'completed': return '已完成'
    case 'failed': return '失败'
    default: return status
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case 'recording': return 'bg-green-100 text-green-700'
    case 'completed': return 'bg-slate-100 text-slate-600'
    case 'failed': return 'bg-red-100 text-red-600'
    default: return 'bg-slate-100 text-slate-600'
  }
}

onMounted(fetchRecordings)
</script>

<template>
  <div class="px-16 py-8">
    <div class="mb-6 flex items-center justify-between">
      <h1 class="text-2xl font-bold text-slate-800">录制管理</h1>
    </div>

    <div v-if="loading" class="py-20 text-center text-sm text-slate-400">加载中...</div>

    <div v-else-if="!recordings.length" class="py-20 text-center text-sm text-slate-400">
      暂无录制记录
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="rec in recordings"
        :key="rec.id"
        class="overflow-hidden rounded-lg border border-slate-100 bg-white"
      >
        <!-- Summary row -->
        <div
          class="flex cursor-pointer items-center px-6 py-4 transition hover:bg-slate-50"
          @click="toggleExpand(rec.id)"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3">
              <el-icon :size="20" class="text-slate-400">
                <VideoCamera />
              </el-icon>
              <span class="text-base font-medium text-slate-900">{{ rec.title }}</span>
              <span
                class="rounded px-1.5 py-0.5 text-[10px] font-medium leading-none"
                :class="statusBadgeClass(rec.status)"
              >{{ formatStatus(rec.status) }}</span>
            </div>
            <div class="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span>会议号: {{ rec.roomNo }}</span>
              <span>时长: {{ formatDuration(rec.durationMs) }}</span>
              <span>文件数: {{ rec.fileCount }}</span>
              <span>{{ rec.startedAt }}</span>
            </div>
          </div>
          <div class="ml-4 flex items-center gap-2">
            <el-button size="small" @click.stop="goPlay(rec.id)">
              <el-icon><CaretRight /></el-icon>
              播放
            </el-button>
            <el-button size="small" type="danger" plain @click.stop="handleDelete(rec.id)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
            <el-icon class="text-slate-400 transition" :class="{ 'rotate-180': expanding[rec.id] }">
              <ArrowDown />
            </el-icon>
          </div>
        </div>

        <!-- File list -->
        <div v-if="expanding[rec.id] && details[rec.id]" class="border-t border-slate-100 bg-slate-50 px-6 py-3">
          <div class="mb-2 text-xs font-medium text-slate-500">录制文件</div>
          <div class="space-y-2">
            <div
              v-for="file in details[rec.id]!.files"
              :key="file.id"
              class="flex items-center justify-between rounded bg-white px-4 py-2 text-sm"
            >
              <div class="flex items-center gap-3">
                <span
                  class="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600"
                >{{ file.kind === 'video' ? '视频' : '音频' }}</span>
                <span class="text-slate-700">{{ file.displayName }}</span>
              </div>
              <el-button
                size="small"
                @click="handleDownloadFile(rec.id, file.id, file.downloadUrl)"
              >
                <el-icon><Download /></el-icon>
                下载
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="total > pageSize" class="mt-6 flex justify-center">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="prev, pager, next"
          @current-change="handlePageChange"
        />
      </div>
    </div>
  </div>
</template>
