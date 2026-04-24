import { computed, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getMeetingInfoApi } from '@/api/meeting'
import { useWebRTC } from './useWebRTC'
import { useSignaling, type ConnectionState } from './useSignaling'
import type { MeetingParticipant, ParticipantInfo, RoomJoinedData } from '@/types/meeting'

export interface ChatMessage {
  fromClientId: string
  displayName: string
  text: string
}

export function useMeetingSession(roomNo: number) {
  const auth = useAuthStore()
  const webrtc = useWebRTC()
  const signaling = useSignaling()

  const state = reactive({
    roomTitle: '',
    hostName: '',
    myClientId: '',
    connectionState: 'disconnected' as ConnectionState,
    participants: [] as MeetingParticipant[],
    selectedParticipantId: '',
    isRecording: false,
    isHandRaised: false,
    networkLabel: '网络',
    networkDelay: 0,
    selectedCameraDeviceId: '',
    selectedMicrophoneDeviceId: '',
    selectedSpeakerDeviceId: '',
    chatMessages: [] as ChatMessage[],
  })

  const selectedParticipant = computed(() =>
    state.participants.find(p => p.id === state.selectedParticipantId) ?? null
  )

  const participantNames = computed(() => {
    const map = new Map<string, string>()
    state.participants.forEach(p => map.set(p.id, p.displayName))
    return map
  })

  const screenSharerName = computed(() => {
    const sharer = state.participants.find(p => p.isScreenSharing)
    return sharer?.displayName ?? ''
  })

  async function init() {
    if (!roomNo || isNaN(roomNo)) {
      console.error('Invalid roomNo:', roomNo)
      return
    }

    try {
      const info = await getMeetingInfoApi(roomNo)
      state.roomTitle = info.title
      state.hostName = info.hostName
    } catch (err) {
      console.warn('Failed to fetch meeting info:', err)
    }

    signaling.setCallbacks({
      onRoomJoined: handleRoomJoined,
      onUserJoined: handleUserJoined,
      onUserLeft: handleUserLeft,
      onRemoteOffer: handleRemoteOffer,
      onRemoteAnswer: handleRemoteAnswer,
      onRemoteIceCandidate: handleRemoteIceCandidate,
      onUserMuted: handleUserMuted,
      onScreenShareStarted: handleScreenShareStarted,
      onScreenShareStopped: handleScreenShareStopped,
      onChatMessage: handleChatMessage,
      onError: handleError,
    })

    webrtc.createPeerConnection([
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ])

    webrtc.setOnIceCandidate((candidate) => {
      signaling.sendIceCandidate(candidate)
    })

    webrtc.setOnTrack((_stream) => {
      // stored automatically in remoteStreams map
    })

    // Start local media BEFORE connecting signaling so the WebRTC offer
    // always includes sendrecv transceivers for local audio/video.
    // This avoids a race where room-joined is processed and createOffer()
    // falls back to recvonly because localStream isn't ready yet.
    await webrtc.startLocalMedia()
    if (webrtc.cameraError.value) {
      console.warn('Camera/mic issue:', webrtc.cameraError.value)
    }

    // Connect signaling so the user can see remote participants
    signaling.connect(roomNo, auth.token)
    watchConnectionState()
  }

  function watchConnectionState() {
    const check = setInterval(() => {
      state.connectionState = signaling.connectionState.value
      if (signaling.connectionState.value === 'connected') {
        clearInterval(check)
      }
    }, 100)
    setTimeout(() => clearInterval(check), 10000)
  }

  async function handleRoomJoined(data: RoomJoinedData) {
    state.myClientId = data.clientId

    state.participants = data.participants.map((p: ParticipantInfo) => ({
      id: p.clientId,
      displayName: p.displayName,
      isMuted: p.isMuted,
      isCamOff: p.isCamOff,
      isHost: p.isHost,
      isScreenSharing: false,
    }))

    if (state.participants.length > 0) {
      state.selectedParticipantId = state.participants[0]!.id
    }

    // Await offer creation so the PC state is consistent before processing next messages
    const offer = await webrtc.createOffer()
    signaling.sendOffer(offer)
  }

  function handleUserJoined(data: { clientId: string; displayName: string; isHost: boolean }) {
    const exists = state.participants.find(p => p.id === data.clientId)
    if (exists) return

    state.participants.push({
      id: data.clientId,
      displayName: data.displayName,
      isMuted: false,
      isCamOff: false,
      isHost: data.isHost,
      isScreenSharing: false,
    })
  }

  function handleUserLeft(data: { clientId: string }) {
    state.participants = state.participants.filter(p => p.id !== data.clientId)

    const newStreams = new Map(webrtc.remoteStreams.value)
    newStreams.delete(data.clientId)
    webrtc.remoteStreams.value = newStreams

    if (state.selectedParticipantId === data.clientId) {
      state.selectedParticipantId = state.participants[0]?.id ?? ''
    }
  }

  async function handleRemoteOffer(data: { sdp: string }) {
    await webrtc.setRemoteDescription({ type: 'offer', sdp: data.sdp })
    const answer = await webrtc.createAnswer()
    signaling.sendAnswer(answer)
  }

  async function handleRemoteAnswer(data: RTCSessionDescriptionInit) {
    await webrtc.setRemoteDescription(data)
  }

  async function handleRemoteIceCandidate(data: RTCIceCandidateInit) {
    await webrtc.addIceCandidate(data)
  }

  function handleUserMuted(data: { clientId: string; muted: boolean; kind: string }) {
    const p = state.participants.find(p => p.id === data.clientId)
    if (!p) return
    if (data.kind === 'audio') {
      p.isMuted = data.muted
    } else if (data.kind === 'video') {
      p.isCamOff = data.muted
    }
  }

  function handleScreenShareStarted(data: { clientId: string }) {
    const p = state.participants.find(p => p.id === data.clientId)
    if (p) p.isScreenSharing = true
  }

  function handleScreenShareStopped(data: { clientId: string }) {
    const p = state.participants.find(p => p.id === data.clientId)
    if (p) p.isScreenSharing = false
  }

  function handleChatMessage(data: { fromClientId: string; displayName: string; text: string }) {
    state.chatMessages.push({
      fromClientId: data.fromClientId,
      displayName: data.displayName,
      text: data.text,
    })
  }

  function handleError(msg: string) {
    console.error('Signaling error:', msg)
  }

  // ---- Media Controls ----

  async function toggleMic() {
    await webrtc.toggleMic()
    signaling.sendMuteToggle(webrtc.isMuted.value, 'audio')
  }

  async function toggleCam() {
    await webrtc.toggleCam()
    signaling.sendMuteToggle(webrtc.isCamOff.value, 'video')
  }

  async function toggleShare() {
    if (webrtc.isScreenSharing.value) {
      await webrtc.stopScreenShare()
      signaling.sendScreenShareStop()
    } else {
      await webrtc.startScreenShare()
      signaling.sendScreenShareStart()
    }
  }

  function toggleRecord() {
    state.isRecording = !state.isRecording
  }

  function raiseHand() {
    state.isHandRaised = !state.isHandRaised
  }

  function sendChatMessage(text: string) {
    signaling.sendChatMessage(text)
  }

  async function selectCameraDevice(deviceId: string) {
    state.selectedCameraDeviceId = deviceId
    await webrtc.switchCamera(deviceId)
  }

  async function selectMicrophoneDevice(deviceId: string) {
    state.selectedMicrophoneDeviceId = deviceId
    await webrtc.switchMicrophone(deviceId)
  }

  function selectSpeakerDevice(deviceId: string) {
    state.selectedSpeakerDeviceId = deviceId
  }

  function selectParticipant(participantId: string) {
    state.selectedParticipantId = participantId
  }

  function cleanup() {
    webrtc.cleanup()
    signaling.disconnect()
  }

  return {
    roomTitle: computed(() => state.roomTitle),
    roomNo: computed(() => roomNo),
    hostName: computed(() => state.hostName),
    myClientId: computed(() => state.myClientId),
    connectionState: computed(() => state.connectionState),
    participants: computed(() => state.participants),
    selectedParticipant,
    selectedParticipantId: computed(() => state.selectedParticipantId),
    myRole: computed(() => state.hostName === auth.user?.nickname ? '主持人' : '成员'),

    isMuted: computed(() => webrtc.isMuted.value),
    isCamOff: computed(() => webrtc.isCamOff.value),
    isScreenSharing: computed(() => webrtc.isScreenSharing.value),
    isRecording: computed(() => state.isRecording),
    isHandRaised: computed(() => state.isHandRaised),
    networkLabel: computed(() => state.networkLabel),
    networkDelay: computed(() => state.networkDelay),

    localStream: webrtc.localStream,
    remoteStreams: webrtc.remoteStreams,
    screenStream: webrtc.screenStream,
    remoteAudioStream: computed(() => null),
    cameraError: webrtc.cameraError,

    cameraDevices: webrtc.cameraDevices,
    microphoneDevices: webrtc.microphoneDevices,
    speakerDevices: webrtc.speakerDevices,
    selectedCameraDeviceId: computed(() => state.selectedCameraDeviceId),
    selectedMicrophoneDeviceId: computed(() => state.selectedMicrophoneDeviceId),
    selectedSpeakerDeviceId: computed(() => state.selectedSpeakerDeviceId),

    participantNames,
    screenSharerName,
    chatMessages: computed(() => state.chatMessages),

    init,
    toggleMic,
    toggleCam,
    toggleShare,
    toggleRecord,
    raiseHand,
    sendChatMessage,
    selectCameraDevice,
    selectMicrophoneDevice,
    selectSpeakerDevice,
    selectParticipant,
    cleanup,
  }
}
