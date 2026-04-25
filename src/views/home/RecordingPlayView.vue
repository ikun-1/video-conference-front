<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { getRecordingDetailApi } from '@/api/meeting'
import { useAuthStore } from '@/stores/auth'
import type { RecordingFileInfo } from '@/types/meeting'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const recordingId = Number(route.params.id)
const files = ref<RecordingFileInfo[]>([])
const title = ref('')
const loading = ref(true)

const audioFiles = computed(() => files.value.filter(f => f.kind === 'audio'))
const videoFiles = computed(() => files.value.filter(f => f.kind === 'video'))
const webmFiles = computed(() => files.value.filter(f => f.kind === 'webm'))

const videoUrls = ref<Record<number, string>>({})
const audioUrls = ref<Record<number, string>>({})
const webmUrls = ref<Record<number, string>>({})

onMounted(async () => {
  try {
    const detail = await getRecordingDetailApi(recordingId)
    title.value = detail.title
    files.value = detail.files
    // Preload playable URLs
    for (const f of detail.files) {
      if (f.playableUrl) {
        loadPlayableUrl(f)
      }
    }
  } catch {
    // handled by interceptor
  } finally {
    loading.value = false
  }
})

async function loadPlayableUrl(file: RecordingFileInfo) {
  if (!file.playableUrl) return
  const url = `${baseURL}${file.playableUrl}`
  const expectedMime = file.kind === 'audio' ? 'audio/webm' : 'video/webm'
  try {
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${authStore.token}` },
    })
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`)
    }

    const contentType = resp.headers.get('content-type') || ''
    if (contentType && !/^(video|audio)\//.test(contentType) && contentType !== 'application/octet-stream') {
      throw new Error(`Unexpected content type: ${contentType}`)
    }

    const blob = await resp.blob()
    const mediaBlob = blob.type === expectedMime ? blob : blob.slice(0, blob.size, expectedMime)
    const blobUrl = URL.createObjectURL(mediaBlob)
    if (file.kind === 'video') {
      videoUrls.value[file.id] = blobUrl
    } else if (file.kind === 'webm') {
      webmUrls.value[file.id] = blobUrl
    } else {
      audioUrls.value[file.id] = blobUrl
    }
  } catch {
    // silently fail
  }
}

onUnmounted(() => {
  for (const url of Object.values(videoUrls.value)) {
    URL.revokeObjectURL(url)
  }
  for (const url of Object.values(audioUrls.value)) {
    URL.revokeObjectURL(url)
  }
  for (const url of Object.values(webmUrls.value)) {
    URL.revokeObjectURL(url)
  }
})
</script>

<template>
  <div class="mx-auto max-w-4xl px-8 py-6">
    <!-- Header -->
    <div class="mb-6 flex items-center gap-4">
      <el-button text @click="router.back()">
        <el-icon><ArrowLeft /></el-icon>
        返回
      </el-button>
      <div>
        <h1 class="text-xl font-bold text-slate-800">{{ title || '录制回放' }}</h1>
      </div>
    </div>

    <div v-if="loading" class="py-20 text-center text-sm text-slate-400">加载中...</div>
    <div v-else-if="!files.length" class="py-20 text-center text-sm text-slate-400">暂无录制文件</div>

    <div v-else class="space-y-8">
      <!-- WebM (video+audio) -->
      <div v-if="webmFiles.length">
        <h2 class="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">录制视频</h2>
        <div class="space-y-3">
          <div
            v-for="file in webmFiles"
            :key="file.id"
            class="rounded-lg border border-slate-100 bg-white"
          >
            <div class="flex items-center gap-4 px-4 py-3">
              <span class="rounded bg-purple-100 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">录制</span>
              <span class="flex-1 text-sm text-slate-700">{{ file.displayName }}</span>
            </div>
            <div v-if="webmUrls[file.id]" class="border-t border-slate-100">
              <video
                :src="webmUrls[file.id]"
                controls
                class="w-full rounded-b-lg bg-black"
                style="max-height: 480px;"
              />
            </div>
            <div v-else class="border-t border-slate-100 px-4 py-8 text-center text-xs text-slate-400">
              加载中...
            </div>
          </div>
        </div>
      </div>

      <!-- Audio -->
      <div v-if="audioFiles.length">
        <h2 class="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">音频</h2>
        <div class="space-y-2">
          <div
            v-for="file in audioFiles"
            :key="file.id"
            class="flex items-center gap-4 rounded-lg border border-slate-100 bg-white px-4 py-3"
          >
            <span class="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">音频</span>
            <span class="flex-1 text-sm text-slate-700">{{ file.displayName }}</span>
            <audio
              v-if="audioUrls[file.id]"
              :src="audioUrls[file.id]"
              controls
              class="h-8 max-w-[240px]"
            />
            <span v-else class="text-xs text-slate-400">转换中...</span>
          </div>
        </div>
      </div>

      <!-- Video -->
      <div v-if="videoFiles.length">
        <h2 class="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">视频</h2>
        <div class="space-y-3">
          <div
            v-for="file in videoFiles"
            :key="file.id"
            class="rounded-lg border border-slate-100 bg-white"
          >
            <div class="flex items-center gap-4 px-4 py-3">
              <span class="rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-600">视频</span>
              <span class="flex-1 text-sm text-slate-700">{{ file.displayName }}</span>
            </div>
            <div v-if="videoUrls[file.id]" class="border-t border-slate-100">
              <video
                :src="videoUrls[file.id]"
                controls
                class="w-full rounded-b-lg bg-black"
                style="max-height: 480px;"
              />
            </div>
            <div v-else class="border-t border-slate-100 px-4 py-4 text-center text-xs text-slate-400">
              转换中...
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
