<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
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
const isWidescreen = ref(false)
const isExitMeetingDialogVisible = ref(false)

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

const inviteLink = computed(() => `${window.location.origin}/meeting/${roomNo}`)

async function handleCopyInvite() {
  try {
    await navigator.clipboard.writeText(inviteLink.value)
    ElMessage.success('会议链接已复制')
  } catch {
    ElMessage.warning('复制失败，请手动复制')
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
})

watch(cameraError, (msg) => {
  if (msg) {
    ElMessage.warning({ message: msg, duration: 6000 })
  }
})

onUnmounted(() => {
  cleanup()
})
</script>

<template>
  <main
    id="main-meeting-app"
    class="flex h-screen flex-col overflow-hidden bg-[#121212] text-white"
    :class="{ 'web-fullscreen': isWebFullscreen }"
  >
    <template v-if="!isWebFullscreen">
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
        @copy-invite="handleCopyInvite"
      />
    </template>

    <MeetingMainArea
      :participants="participants"
      :selected-participant-id="selectedParticipantId"
      :selected-participant="selectedParticipant"
      :right-panel-mode="rightPanelMode"
      :is-web-fullscreen="isWebFullscreen"
      :is-widescreen="isWidescreen"
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
    />

    <template v-if="!isWebFullscreen">
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
    </template>

    <el-dialog
      v-model="isExitMeetingDialogVisible"
      title="结束会议"
      width="420px"
      align-center
      :show-close="true"
      @close="handleLeaveMeetingDialogClose"
    >
      <div class="space-y-2 text-sm text-slate-600">
        <p>请选择你的操作。</p>
        <p>离开会议只会退出当前房间，结束会议会让所有参会者退出并结束整个会议。</p>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <el-button @click="handleLeaveMeetingDialogLeave">离开会议</el-button>
          <el-button type="danger" @click="handleLeaveMeetingDialogEnd">结束会议</el-button>
        </div>
      </template>
    </el-dialog>
  </main>
</template>
