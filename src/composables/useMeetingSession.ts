import { computed, reactive, toRefs } from 'vue'
import type { MeetingParticipant } from '@/types/meeting'

type DeviceItem = { deviceId: string; label: string }

const mockParticipants: MeetingParticipant[] = [
  { id: '1', displayName: '李老师', isMuted: false, isCamOff: false, isHost: true, isScreenSharing: false },
  { id: '2', displayName: '张三', isMuted: true, isCamOff: false, isHost: false, isScreenSharing: false },
  { id: '3', displayName: '王五', isMuted: false, isCamOff: true, isHost: false, isScreenSharing: false },
  { id: '4', displayName: '赵六', isMuted: false, isCamOff: false, isHost: false, isScreenSharing: false },
  { id: '5', displayName: '孙七', isMuted: true, isCamOff: true, isHost: false, isScreenSharing: false },
  { id: '6', displayName: '周八', isMuted: false, isCamOff: false, isHost: false, isScreenSharing: false },
  { id: '7', displayName: '吴九', isMuted: false, isCamOff: false, isHost: false, isScreenSharing: false },
  { id: '8', displayName: '郑十', isMuted: false, isCamOff: true, isHost: false, isScreenSharing: false },
]

export function useMeetingSession() {
  const state = reactive({
    // 房间信息
    roomTitle: '软工2024 毕业设计答辩',
    roomNo: 852372,
    hostName: '李老师',
    myRole: '成员',
    // 媒体状态
    isMuted: false,
    isCamOff: false,
    isScreenSharing: false,
    isRecording: false,
    isHandRaised: false,
    isSpeakerMuted: false,
    // 网络
    networkLabel: '网络',
    networkDelay: 15,
    // 设备列表
    cameraDevices: [] as DeviceItem[],
    microphoneDevices: [] as DeviceItem[],
    speakerDevices: [] as DeviceItem[],
    selectedCameraDeviceId: '',
    selectedMicrophoneDeviceId: '',
    selectedSpeakerDeviceId: '',
    remoteAudioStream: null as MediaStream | null,
    // 参会者
    participants: mockParticipants as MeetingParticipant[],
    selectedParticipantId: '1',
  })

  const selectedParticipant = computed(() =>
    state.participants.find(p => p.id === state.selectedParticipantId) ?? null
  )

  function toggleMic() { state.isMuted = !state.isMuted }
  function toggleCam() { state.isCamOff = !state.isCamOff }
  function toggleSpeaker() { state.isSpeakerMuted = !state.isSpeakerMuted }
  function toggleShare() { state.isScreenSharing = !state.isScreenSharing }
  function toggleRecord() { state.isRecording = !state.isRecording }
  function raiseHand() { state.isHandRaised = !state.isHandRaised }

  function selectCameraDevice(deviceId: string) { state.selectedCameraDeviceId = deviceId }
  function selectMicrophoneDevice(deviceId: string) { state.selectedMicrophoneDeviceId = deviceId }
  function selectSpeakerDevice(deviceId: string) { state.selectedSpeakerDeviceId = deviceId }
  function selectParticipant(participantId: string) { state.selectedParticipantId = participantId }

  return {
    ...toRefs(state),
    selectedParticipant,
    toggleMic,
    toggleCam,
    toggleSpeaker,
    toggleShare,
    toggleRecord,
    raiseHand,
    selectCameraDevice,
    selectMicrophoneDevice,
    selectSpeakerDevice,
    selectParticipant,
  }
}
