import { computed, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getMeetingInfoApi } from '@/api/meeting'
import { useWebRTC } from './useWebRTC'
import { useSignaling, type ConnectionState } from './useSignaling'
import { useWebRTCStats } from './useWebRTCStats'
import type { MeetingParticipant, ParticipantInfo, RoomJoinedData, UserJoinedData, RecordingControlData } from '@/types/meeting'

export interface ChatMessage {
  fromClientId: string
  displayName: string
  text: string
}

export function useMeetingSession(roomNo: number) {
  const auth = useAuthStore()
  const webrtc = useWebRTC()
  const signaling = useSignaling()
  const rtcStats = useWebRTCStats(
    computed(() => webrtc.pc.value),
    (msg) => signaling.sendRaw(msg),
  )

  const state = reactive({
    roomTitle: '',
    hostName: '',
    myClientId: '',
    connectionState: 'disconnected' as ConnectionState,
    participants: [] as MeetingParticipant[],
    selectedParticipantId: '',
    isRecording: false,
    recordingStartedAt: 0, // Date.now() when recording started, 0 = inactive
    isHandRaised: false,
    networkLabel: '网络',
    networkDelay: 0,
    selectedCameraDeviceId: '',
    selectedMicrophoneDeviceId: '',
    selectedSpeakerDeviceId: '',
    isSpeakerMuted: false,
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

  const isHost = computed(() => state.hostName === auth.user?.nickname)

  async function init(opts?: { muteOnJoin?: boolean; disableCameraOnJoin?: boolean }) {
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
      onRecordingStateChanged: handleRecordingStateChanged,
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

    // Apply join preferences if provided: mute microphone and/or disable camera
    try {
      if (opts?.muteOnJoin) {
        const audioTrack = webrtc.localStream.value?.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.enabled = false
        }
        webrtc.isMuted.value = true
      }

      if (opts?.disableCameraOnJoin) {
        const videoTrack = webrtc.localStream.value?.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.enabled = false
        }
        webrtc.isCamOff.value = true
      }
    } catch (err) {
      console.warn('Failed to apply join preferences:', err)
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
      avatar: p.avatar,
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

    // Ensure local participant reflects current local media state (mute/cam)
    const local = state.participants.find(p => p.id === state.myClientId)
    if (local) {
      local.isMuted = webrtc.isMuted.value
      local.isCamOff = webrtc.isCamOff.value
    }

    // Start WebRTC quality stats collection
    rtcStats.start(7000)
  }

  function handleUserJoined(data: UserJoinedData) {
    const exists = state.participants.find(p => p.id === data.clientId)
    if (exists) return

    state.participants.push({
      id: data.clientId,
      displayName: data.displayName,
      avatar: data.avatar,
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

  function handleRecordingStateChanged(data: RecordingControlData) {
    if (data.action === 'started') {
      state.isRecording = true
      state.recordingStartedAt = Date.now()
    } else if (data.action === 'stopped') {
      state.isRecording = false
      state.recordingStartedAt = 0
    }
  }

  function handleError(msg: string) {
    console.error('Signaling error:', msg)
  }

  // ---- Media Controls ----

  function toggleSpeaker() {
    state.isSpeakerMuted = !state.isSpeakerMuted
    // Mute/unmute all audio and video elements on the page
    const mediaElements = document.querySelectorAll('audio, video') as NodeListOf<HTMLMediaElement>
    mediaElements.forEach((el) => {
      el.muted = state.isSpeakerMuted
    })
  }

  async function toggleMic() {
    await webrtc.toggleMic()
    signaling.sendMuteToggle(webrtc.isMuted.value, 'audio')
    // Update local participant state so UI reflects change immediately
    const localP = state.participants.find(p => p.id === state.myClientId)
    if (localP) localP.isMuted = webrtc.isMuted.value
  }

  async function toggleCam() {
    await webrtc.toggleCam()
    signaling.sendMuteToggle(webrtc.isCamOff.value, 'video')
    // Update local participant state so UI reflects change immediately
    const localP = state.participants.find(p => p.id === state.myClientId)
    if (localP) localP.isCamOff = webrtc.isCamOff.value
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
    if (state.isRecording) {
      signaling.sendRecordingControl('stop')
    } else {
      signaling.sendRecordingControl('start')
    }
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
    // After switching camera, ensure local participant and local webrtc state reflect camera status
    const videoEnabled = !!webrtc.localStream.value?.getVideoTracks()[0]?.enabled
    const localP = state.participants.find(p => p.id === state.myClientId)
    if (localP) localP.isCamOff = !videoEnabled
    webrtc.isCamOff.value = !videoEnabled
  }

  async function selectMicrophoneDevice(deviceId: string) {
    state.selectedMicrophoneDeviceId = deviceId
    await webrtc.switchMicrophone(deviceId)
    // After switching microphone, ensure local participant and local webrtc state reflect audio status
    const audioEnabled = !!webrtc.localStream.value?.getAudioTracks()[0]?.enabled
    const localP = state.participants.find(p => p.id === state.myClientId)
    if (localP) localP.isMuted = !audioEnabled
    webrtc.isMuted.value = !audioEnabled
  }

  function selectSpeakerDevice(deviceId: string) {
    state.selectedSpeakerDeviceId = deviceId
    // Auto-unmute speaker when selecting a speaker device
    if (state.isSpeakerMuted) {
      state.isSpeakerMuted = false
      const mediaElements = document.querySelectorAll('audio, video') as NodeListOf<HTMLMediaElement>
      mediaElements.forEach((el) => {
        el.muted = false
      })
    }
  }

  function selectParticipant(participantId: string) {
    state.selectedParticipantId = participantId
  }

  function cleanup() {
    rtcStats.stop()
    webrtc.cleanup()
    signaling.disconnect()
  }

  function leaveRoom() {
    signaling.sendLeaveRoom()
    cleanup()
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
    isHost,

    isMuted: computed(() => webrtc.isMuted.value),
    isCamOff: computed(() => webrtc.isCamOff.value),
    isSpeakerMuted: computed(() => state.isSpeakerMuted),
    isScreenSharing: computed(() => webrtc.isScreenSharing.value),
    isRecording: computed(() => state.isRecording),
    recordingStartedAt: computed(() => state.recordingStartedAt),
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
    toggleSpeaker,
    toggleShare,
    toggleRecord,
    raiseHand,
    sendChatMessage,
    selectCameraDevice,
    selectMicrophoneDevice,
    selectSpeakerDevice,
    selectParticipant,
    cleanup,
    leaveRoom,
  }
}
