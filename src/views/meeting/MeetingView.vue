<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessageBox } from 'element-plus'
import { useMeetingSession } from '@/composables/useMeetingSession'
import MeetingHeader from '@/component/meeting/MeetingHeader.vue'
import MeetingMainArea from '@/component/meeting/MeetingMainArea.vue'
import MeetingFooter from '@/component/meeting/MeetingFooter.vue'

const {
  roomTitle, roomNo, hostName, myRole,
  isMuted, isCamOff, isScreenSharing, isRecording, isHandRaised, isSpeakerMuted,
  networkLabel, networkDelay,
  cameraDevices, microphoneDevices, speakerDevices,
  selectedCameraDeviceId, selectedMicrophoneDeviceId, selectedSpeakerDeviceId,
  remoteAudioStream,
  participants, selectedParticipantId, selectedParticipant,
  toggleMic, toggleCam, toggleSpeaker,
  toggleShare, toggleRecord, raiseHand,
  selectCameraDevice, selectMicrophoneDevice, selectSpeakerDevice,
  selectParticipant,
} = useMeetingSession()

const router = useRouter()
const rightPanelMode = ref<'members' | 'chat'>('members')
const isWebFullscreen = ref(false)
const isWidescreen = ref(false)

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

function handleLeaveMeeting() {
  ElMessageBox.confirm('确定要退出会议吗？', '退出会议', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    // todo 关闭各种媒体流，清理状态等
    router.push('/')
  }).catch(() => {
    /* 取消退出，不做任何操作 */
  })
}
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
        :network-label="networkLabel"
        :network-delay="networkDelay"
        :room-title="roomTitle"
        :room-no="roomNo"
        :host-name="hostName"
        :my-role="myRole"
      />
    </template>

    <MeetingMainArea
      :participants="participants"
      :selected-participant-id="selectedParticipantId"
      :selected-participant="selectedParticipant"
      :right-panel-mode="rightPanelMode"
      :is-web-fullscreen="isWebFullscreen"
      :is-widescreen="isWidescreen"
      @select-participant="selectParticipant"
      @toggle-web-fullscreen="handleToggleWebFullscreen"
      @toggle-widescreen="handleToggleWidescreen"
    />

    <template v-if="!isWebFullscreen">
      <MeetingFooter
        :is-muted="isMuted"
        :is-cam-off="isCamOff"
        :is-screen-sharing="isScreenSharing"
        :is-recording="isRecording"
        :is-hand-raised="isHandRaised"
        :is-speaker-muted="isSpeakerMuted"
        :camera-devices="cameraDevices"
        :microphone-devices="microphoneDevices"
        :speaker-devices="speakerDevices"
        :selected-camera-device-id="selectedCameraDeviceId"
        :selected-microphone-device-id="selectedMicrophoneDeviceId"
        :selected-speaker-device-id="selectedSpeakerDeviceId"
        :remote-audio-stream="remoteAudioStream"
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
  </main>
</template>
