<script setup lang="ts">
import { onMounted, ref, onUnmounted, computed, nextTick, watch } from 'vue'
import { Microphone, Mute } from '@element-plus/icons-vue'
import type { MeetingParticipant } from '@/types/meeting'
import type { ChatMessage } from '@/composables/useMeetingSession'

interface MeetingMainAreaProps {
  participants: MeetingParticipant[]
  selectedParticipantId: string
  selectedParticipant: MeetingParticipant | null
  rightPanelMode?: 'members' | 'chat'
  isWebFullscreen?: boolean
  isWidescreen?: boolean
  localStream?: MediaStream | null
  remoteStreams?: Map<string, MediaStream> | null
  participantNames?: Map<string, string>
  chatMessages?: ChatMessage[]
  myClientId?: string
}

const props = withDefaults(defineProps<MeetingMainAreaProps>(), {
  rightPanelMode: 'members',
  isWebFullscreen: false,
  isWidescreen: false,
  localStream: null,
  remoteStreams: null,
  participantNames: undefined,
  chatMessages: () => [],
  myClientId: '',
})

const emit = defineEmits<{
  selectParticipant: [participantId: string]
  toggleWebFullscreen: []
  toggleWidescreen: []
  sendChatMessage: [text: string]
}>()

const rightPanelWidth = ref(280)
const isFullscreen = ref(false)
const isResizing = ref(false)
const videoContainerRef = ref<HTMLElement>()
const chatContainerRef = ref<HTMLElement>()
const chatInput = ref('')
// Auto-scroll chat on new messages
watch(() => props.chatMessages?.length, () => {
  nextTick(() => {
    if (chatContainerRef.value) {
      chatContainerRef.value.scrollTop = chatContainerRef.value.scrollHeight
    }
  })
})

function getStreamForParticipant(id: string): MediaStream | null | undefined {
  if (props.remoteStreams && props.remoteStreams.has(id)) {
    return props.remoteStreams.get(id)
  }
  return null
}

const selectedParticipantStream = computed(() => {
  if (!props.selectedParticipant) return localStream.value
  // Check if selected participant has a remote stream
  const remote = getStreamForParticipant(props.selectedParticipant.id)
  if (remote) return remote
  return localStream.value
})

const localStream = computed(() => props.localStream)

function startResize(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startWidth = rightPanelWidth.value
  isResizing.value = true

  function onMouseMove(e: MouseEvent) {
    const newWidth = startWidth - (e.clientX - startX)
    rightPanelWidth.value = Math.max(window.innerWidth / 8, Math.min(window.innerWidth / 2, newWidth))
  }

  function onMouseUp() {
    isResizing.value = false
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  }

  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

onUnmounted(() => {
  isResizing.value = false
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

function toggleWidescreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  }
  emit('toggleWidescreen')
}

async function handleToggleWebFullscreen() {
  if (document.fullscreenElement) {
    await document.exitFullscreen()
  }
  emit('toggleWebFullscreen')
}

function onFullscreenChange() {
  isFullscreen.value = !!document.fullscreenElement
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen()
  } else {
    if (props.isWidescreen) emit('toggleWidescreen')
    if (props.isWebFullscreen) emit('toggleWebFullscreen')
    videoContainerRef.value?.requestFullscreen()
  }
}

function handleSendChatMessage() {
  const text = chatInput.value.trim()
  if (!text) return
  emit('sendChatMessage', text)
  chatInput.value = ''
}

onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
})
</script>

<template>
  <div class="relative flex min-h-0 flex-1 overflow-hidden bg-[#0a0a0a]" :class="{ 'select-none': isResizing }">
    <!-- Left: main video display area -->
    <div ref="videoContainerRef" class="group relative flex flex-1 items-center justify-center overflow-hidden bg-[#0a0a0a] video-container">
      <template v-if="selectedParticipant">
        <video
          v-if="getStreamForParticipant(selectedParticipant.id) || (selectedParticipant.id === myClientId && localStream)"
          class="h-full w-full object-contain"
          :srcObject="getStreamForParticipant(selectedParticipant.id) || localStream"
          autoplay
          muted
          playsinline
        />
        <div v-else class="flex h-full w-full items-center justify-center">
          <div class="text-center">
            <span
              class="mb-2 flex h-24 w-24 items-center justify-center rounded-full bg-gray-700 text-3xl text-slate-400"
            >{{ selectedParticipant.displayName[0] }}</span>
            <p class="text-lg text-slate-400">{{ selectedParticipant.displayName }}</p>
            <p class="mt-1 text-sm text-slate-500">摄像头已关闭</p>
          </div>
        </div>
      </template>

      <div v-else class="text-center text-slate-600">
        <p class="text-lg">请选择参会成员</p>
      </div>

      <!-- Controls: bottom-right -->
      <div
        class="absolute bottom-3 right-3 z-10 flex items-center gap-1 rounded-lg bg-black/60 p-1 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <el-tooltip content="宽屏模式" placement="top">
          <button
            class="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            :class="{ 'bg-blue-600/30 text-blue-400': isWidescreen }"
            type="button"
            @click="toggleWidescreen"
          >
            <i class="iconfont" :class="isWidescreen ? 'icon-wangyekuanpingshou' : 'icon-wangyekuanping'" />
          </button>
        </el-tooltip>
        <el-tooltip content="网页全屏" placement="top">
          <button
            class="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            :class="{ 'bg-blue-600/30 text-blue-400': isWebFullscreen }"
            type="button"
            @click="handleToggleWebFullscreen"
          >
            <i class="iconfont" :class="isWebFullscreen ? 'icon-wangyequanpingshouqilai' : 'icon-wangyequanping'" />
          </button>
        </el-tooltip>
        <el-tooltip content="全屏" placement="top">
          <button
            class="rounded-md p-1.5 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
            :class="{ 'bg-blue-600/30 text-blue-400': isFullscreen }"
            type="button"
            @click="toggleFullscreen"
          >
            <i class="iconfont" :class="isFullscreen ? 'icon-quanpingtuichu' : 'icon-quanping'" />
          </button>
        </el-tooltip>
      </div>
    </div>

    <!-- Draggable divider -->
    <div
      v-show="!(isWidescreen || isWebFullscreen)"
      class="relative w-1.5 cursor-col-resize flex-shrink-0 bg-white/5 transition-colors hover:bg-blue-500 active:bg-blue-600"
      @mousedown="startResize"
    />

    <!-- Right panel -->
    <div
      v-show="!(isWidescreen || isWebFullscreen)"
      class="flex flex-col overflow-hidden bg-[#1a1a1a]" :style="{ width: rightPanelWidth + 'px' }"
    >
      <!-- Members panel -->
      <template v-if="rightPanelMode === 'members'">
        <div class="flex-shrink-0 border-b border-white/10 px-4 py-3 text-sm font-medium text-slate-300">
          参会成员（{{ participants.length }}）
        </div>

        <div class="flex-1 space-y-3 overflow-y-auto p-3">
          <button
            v-for="participant in participants"
            :key="participant.id"
            class="relative block w-full overflow-hidden rounded-lg bg-gray-800 transition-colors hover:opacity-90"
            :class="{
              'ring-2 ring-blue-500': participant.id === selectedParticipantId,
            }"
            style="aspect-ratio: 16/9"
            type="button"
            @click="emit('selectParticipant', participant.id)"
          >
            <video
              v-if="!participant.isCamOff && (getStreamForParticipant(participant.id) || (participant.id === myClientId && localStream))"
              class="h-full w-full object-cover"
              :srcObject="getStreamForParticipant(participant.id) || localStream"
              autoplay
              muted
              playsinline
            />
            <div v-else class="flex h-full w-full items-center justify-center bg-gray-800">
              <span class="text-3xl text-slate-500">{{ participant.displayName[0] }}</span>
            </div>

            <div class="absolute left-0 right-0 top-0 bg-gradient-to-b from-black/70 to-transparent px-2 pb-6 pt-1.5">
              <div class="flex items-center gap-1.5 text-sm text-white">
                <span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-600 text-xs">
                  <img v-if="participant.avatar" :src="participant.avatar" class="h-full w-full rounded-full object-cover" />
                  <span v-else>{{ participant.displayName[0] }}</span>
                </span>
                <span class="truncate">{{ participant.displayName }}</span>
                <span v-if="participant.isHost" class="rounded bg-yellow-500/20 px-1 text-xs text-yellow-400">主持人</span>
              </div>
            </div>
            <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1.5 pt-5">
              <div class="flex items-center gap-2 text-xs text-slate-300">
                <el-icon :size="14" :style="{ color: participant.isMuted ? '#f87171' : '#4ade80' }">
                  <Mute v-if="participant.isMuted" />
                  <Microphone v-else />
                </el-icon>
                <svg
                  class="h-3.5 w-3.5"
                  :class="participant.isCamOff ? 'text-red-400' : 'text-green-400'"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                >
                  <path d="M23 7l-7 5 7 5V7z" />
                  <rect x="1" y="5" width="15" height="14" rx="2" />
                  <line v-if="participant.isCamOff" x1="22" y1="2" x2="2" y2="22" />
                </svg>
              </div>
            </div>
          </button>
        </div>
      </template>

      <!-- Chat panel -->
      <template v-if="rightPanelMode === 'chat'">
        <div class="flex-shrink-0 border-b border-white/10 px-4 py-3 text-sm font-medium text-slate-300">
          聊天
        </div>

        <div ref="chatContainerRef" class="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
          <div v-for="(msg, i) in chatMessages" :key="i"
            :class="['flex', msg.fromClientId === myClientId ? 'justify-end' : 'justify-start']">
            <div :class="['max-w-[80%] rounded-lg px-3 py-2',
              msg.fromClientId === myClientId ? 'bg-blue-600 text-white' : 'bg-white/10 text-slate-200']">
              <div class="mb-1 text-xs opacity-70">{{ msg.displayName }}</div>
              <div>{{ msg.text }}</div>
            </div>
          </div>
          <div v-if="!chatMessages.length" class="pt-8 text-center text-slate-500">暂无消息</div>
        </div>

        <div class="flex-shrink-0 border-t border-white/10 p-3">
          <div class="flex gap-2">
            <input
              v-model="chatInput"
              class="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-blue-500"
              placeholder="输入消息..."
              type="text"
              @keyup.enter="handleSendChatMessage"
            />
            <button
              class="flex-shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700"
              type="button"
              @click="handleSendChatMessage"
            >
              发送
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.video-container:fullscreen {
  width: 100vw;
  height: 100vh;
}
</style>
