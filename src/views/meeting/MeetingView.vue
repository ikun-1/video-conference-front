<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useMeetingSession } from '@/composables/useMeetingSession'
import { endMeetingApi } from '@/api/meeting'
import MeetingHeader from '@/component/meeting/MeetingHeader.vue'
import MeetingMainArea from '@/component/meeting/MeetingMainArea.vue'
import MeetingFooter from '@/component/meeting/MeetingFooter.vue'

const router = useRouter()
const route = useRoute()
const roomNo = Number(route.params.roomNo)

const {
  roomTitle, hostName, myRole, isHost,
  isMuted, isCamOff, isSpeakerMuted, isScreenSharing, isRecording, recordingStartedAt, isHandRaised,
  networkLabel, networkDelay,
  cameraDevices, microphoneDevices, speakerDevices,
  selectedCameraDeviceId, selectedMicrophoneDeviceId, selectedSpeakerDeviceId,
  localStream, remoteStreams, screenStream, remoteAudioStream, cameraError,
  participants, selectedParticipantId, selectedParticipant,
  participantNames, screenSharerName, chatMessages, myClientId,
  init, cleanup, leaveRoom,
  toggleMic, toggleCam, toggleSpeaker,
  toggleShare, toggleRecord, raiseHand,
  sendChatMessage,
  selectCameraDevice, selectMicrophoneDevice, selectSpeakerDevice,
  selectParticipant,
} = useMeetingSession(roomNo)

const rightPanelMode = ref<'members' | 'chat'>('members')
const isWebFullscreen = ref(false)
const isWidescreen = ref(window.innerWidth < 640) // 手机端默认进入宽屏模式（即默认关闭右侧面板）
const isExitMeetingDialogVisible = ref(false)

// 控制上下工具栏的沉浸式显示与自动隐藏
const isControlsVisible = ref(true)
let hideControlsTimer: ReturnType<typeof setTimeout> | null = null

function resetControlsTimeout() {
  isControlsVisible.value = true
  if (hideControlsTimer) {
    clearTimeout(hideControlsTimer)
  }
  // 如果在手机端（屏幕小）则设置自动隐藏
  if (window.innerWidth < 640) {
    hideControlsTimer = setTimeout(() => {
      isControlsVisible.value = false
    }, 4000)
  }
}
function handleMainClick() {
  if (window.innerWidth < 640) {
    // 手机端：如果是显示的，点击则立即隐藏；如果是隐藏的，点击则显示
    if (isControlsVisible.value) {
      isControlsVisible.value = false
      if (hideControlsTimer) clearTimeout(hideControlsTimer)
    } else {
      resetControlsTimeout()
    }
  }
}

function handleMouseMove() {
  if (window.innerWidth >= 640) {
    resetControlsTimeout()
  }
}
function handleOpenMembers() {
  if (isWidescreen.value) {
    isWidescreen.value = false
    rightPanelMode.value = 'members'
  } else if (rightPanelMode.value === 'members') {
    isWidescreen.value = true
  } else {
    rightPanelMode.value = 'members'
  }
}

function handleOpenChat() {
  if (isWidescreen.value) {
    isWidescreen.value = false
    rightPanelMode.value = 'chat'
  } else if (rightPanelMode.value === 'chat') {
    isWidescreen.value = true
  } else {
    rightPanelMode.value = 'chat'
  }
}

function handleToggleWebFullscreen() {
  isWebFullscreen.value = !isWebFullscreen.value
  if (isWebFullscreen.value) {
    isWidescreen.value = false
  }
}

function handleToggleWidescreen() {
  isWidescreen.value = !isWidescreen.value
  if (isWidescreen.value) {
    isWebFullscreen.value = false
  }
}

async function handleLeaveMeeting() {
  if (isHost.value) {
    isExitMeetingDialogVisible.value = true
    return
  }

  try {
    await ElMessageBox.confirm('确定要退出会议吗？', '退出会议', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
  } catch {
    return
  }

  leaveRoom()
  router.push('/')
}

function handleLeaveMeetingDialogLeave() {
  isExitMeetingDialogVisible.value = false
  leaveRoom()
  router.push('/')
}

async function handleLeaveMeetingDialogEnd() {
  isExitMeetingDialogVisible.value = false

  try {
    await endMeetingApi(roomNo)
  } catch {
    // End request failed, still clean up local state so the host can leave.
  }

  cleanup()
  router.push('/')
}

function handleLeaveMeetingDialogClose() {
  isExitMeetingDialogVisible.value = false
}

function handleSendChatMessage(text: string) {
  sendChatMessage(text)
}

onMounted(() => {
  const muteOnJoin = route.query.muteOnJoin === '1' || route.query.muteOnJoin === 'true'
  const disableCameraOnJoin = route.query.disableCameraOnJoin === '1' || route.query.disableCameraOnJoin === 'true'
  init({ muteOnJoin, disableCameraOnJoin })

  // 初始化隐藏计时器
  resetControlsTimeout()
  window.addEventListener('resize', resetControlsTimeout)
})

watch(cameraError, (msg) => {
  if (msg) {
    ElMessage.warning({ message: msg, duration: 6000 })
  }
})

onUnmounted(() => {
  cleanup()
  if (hideControlsTimer) clearTimeout(hideControlsTimer)
  window.removeEventListener('resize', resetControlsTimeout)
})
</script>

<template>
  <main
    id="main-meeting-app"
    class="relative flex h-[100dvh] flex-col overflow-hidden bg-[#121212] text-white"
    :class="{ 'web-fullscreen': isWebFullscreen }"
    @click="handleMainClick"
    @mousemove="handleMouseMove"
  >
    <template v-if="!isWebFullscreen">
      <div
        class="transition-opacity duration-500 z-40 sm:relative absolute top-0 left-0 right-0 sm:opacity-100 sm:pointer-events-auto"
        :class="[isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none']"
        @click.stop
      >
        <MeetingHeader
          :is-recording="isRecording"
          :recording-started-at="recordingStartedAt"
        :network-label="networkLabel"
        :network-delay="networkDelay"
        :room-title="roomTitle"
        :room-no="roomNo"
        :host-name="hostName"
        :my-role="myRole"
        :screen-sharer-name="screenSharerName"
      />
      </div>
    </template>

    <div class="flex-1 w-full absolute inset-0 sm:relative sm:inset-auto min-h-0 overflow-hidden" @click.stop="handleMainClick">
      <MeetingMainArea
        :participants="participants"
        :selected-participant-id="selectedParticipantId"
        :selected-participant="selectedParticipant"
        :right-panel-mode="rightPanelMode"
        :is-web-fullscreen="isWebFullscreen"
        :is-widescreen="isWidescreen"
        :is-controls-visible="isControlsVisible"
        :local-stream="localStream"
        :remote-streams="remoteStreams"
        :screen-stream="screenStream"
        :participant-names="participantNames"
        :chat-messages="chatMessages"
        :my-client-id="myClientId"
        :selected-speaker-device-id="selectedSpeakerDeviceId"
        @select-participant="selectParticipant"
        @toggle-web-fullscreen="handleToggleWebFullscreen"
        @toggle-widescreen="handleToggleWidescreen"
        @send-chat-message="handleSendChatMessage"
        class="h-full w-full"
      />
    </div>

    <template v-if="!isWebFullscreen">
      <div
        class="transition-opacity duration-500 z-40 sm:relative absolute bottom-0 left-0 right-0 sm:opacity-100 sm:pointer-events-auto"
        :class="[isControlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none']"
        @click.stop
      >
        <MeetingFooter
          :is-muted="isMuted"
          :is-cam-off="isCamOff"
        :is-screen-sharing="isScreenSharing"
        :is-recording="isRecording"
        :is-hand-raised="isHandRaised"
        :is-host="isHost"
        :camera-devices="cameraDevices"
        :microphone-devices="microphoneDevices"
        :speaker-devices="speakerDevices"
        :selected-camera-device-id="selectedCameraDeviceId"
        :selected-microphone-device-id="selectedMicrophoneDeviceId"
        :selected-speaker-device-id="selectedSpeakerDeviceId"
        :remote-audio-stream="remoteAudioStream"
        :is-speaker-muted="isSpeakerMuted"
        @toggle-mic="toggleMic"
        @toggle-cam="toggleCam"
        @toggle-speaker="toggleSpeaker"
        @toggle-share="toggleShare"
        @toggle-record="toggleRecord"
        @raise-hand="raiseHand"
        @open-members="handleOpenMembers"
        @open-chat="handleOpenChat"
        @leave-meeting="handleLeaveMeeting"
        @select-camera-device="selectCameraDevice"
        @select-microphone-device="selectMicrophoneDevice"
        @select-speaker-device="selectSpeakerDevice"
      />
      </div>
    </template>

    <el-dialog
      v-model="isExitMeetingDialogVisible"
      title="结束会议"
      width="min(420px, 90vw)"
      align-center
      :show-close="true"
      @close="handleLeaveMeetingDialogClose"
    >
      <div class="space-y-2 text-xs sm:text-sm text-slate-600">
        <p>请选择你的操作。</p>
        <p>离开会议只会退出当前房间，结束会议会让所有参会者退出并结束整个会议。</p>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-2 sm:gap-3">
          <el-button @click="handleLeaveMeetingDialogLeave">离开会议</el-button>
          <el-button type="danger" @click="handleLeaveMeetingDialogEnd">结束会议</el-button>
        </div>
      </template>
    </el-dialog>
  </main>
</template>
