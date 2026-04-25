import { ref, type Ref } from 'vue'

export interface DeviceInfo {
  deviceId: string
  label: string
}

export function useWebRTC() {
  const localStream = ref<MediaStream | null>(null)
  const remoteStreams = ref<Map<string, MediaStream>>(new Map())
  const screenStream = ref<MediaStream | null>(null)
  const isMuted = ref(false)
  const isCamOff = ref(false)
  const isScreenSharing = ref(false)
  const cameraError = ref('')

  const cameraDevices = ref<DeviceInfo[]>([])
  const microphoneDevices = ref<DeviceInfo[]>([])
  const speakerDevices = ref<DeviceInfo[]>([])

  let pc: RTCPeerConnection | null = null
  let onIceCandidateHandler: ((candidate: RTCIceCandidateInit) => void) | null = null
  let onTrackHandler: ((stream: MediaStream, clientId?: string) => void) | null = null

  function applyCodecPreferences(transceiver: RTCRtpTransceiver, kind: 'audio' | 'video') {
    const caps = RTCRtpSender.getCapabilities(kind)
    if (!caps || !caps.codecs?.length) return

    const target = kind === 'video' ? 'video/VP8' : 'audio/opus'
    const preferred = caps.codecs.filter(c => c.mimeType.toLowerCase() === target.toLowerCase())
    if (!preferred.length) return
    const others = caps.codecs.filter(c => c.mimeType.toLowerCase() !== target.toLowerCase())
    transceiver.setCodecPreferences([...preferred, ...others])
  }

  async function enumerateDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices()
    cameraDevices.value = devices
      .filter(d => d.kind === 'videoinput')
      .map(d => ({ deviceId: d.deviceId, label: d.label || `Camera ${cameraDevices.value.length + 1}` }))
    microphoneDevices.value = devices
      .filter(d => d.kind === 'audioinput')
      .map(d => ({ deviceId: d.deviceId, label: d.label || `Microphone ${microphoneDevices.value.length + 1}` }))
    speakerDevices.value = devices
      .filter(d => d.kind === 'audiooutput')
      .map(d => ({ deviceId: d.deviceId, label: d.label || `Speaker ${speakerDevices.value.length + 1}` }))
  }

  async function startLocalMedia(videoDeviceId?: string, audioDeviceId?: string) {
    // Stop existing tracks
    if (localStream.value) {
      localStream.value.getTracks().forEach(t => t.stop())
    }

    const constraints: MediaStreamConstraints = {
      audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
      video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : {
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      cameraError.value = ''
      localStream.value = stream
      isMuted.value = false
      isCamOff.value = false

      // Enumerate devices after media starts (labels are populated)
      await enumerateDevices()

      return stream
    } catch (err: any) {
      let msg = ''
      switch (err.name) {
        case 'NotFoundError':
          msg = '未检测到摄像头或麦克风设备，请确认硬件已连接'
          break
        case 'NotAllowedError':
          msg = '摄像头/麦克风权限被拒绝，请在浏览器地址栏左侧点击锁图标，开启摄像头和麦克风权限'
          break
        case 'NotReadableError':
          msg = '摄像头被其他应用占用（如另一个浏览器、OBS或其他软件），请关闭其他应用后再试'
          break
        case 'OverconstrainedError':
          msg = '摄像头不支持当前请求的分辨率，请尝试选择其他摄像头'
          break
        case 'AbortError':
          msg = '启动摄像头超时，摄像头可能被其他应用占用，或设备响应缓慢'
          break
        default:
          msg = `摄像头/麦克风访问失败: ${err.message || err.name || '未知错误'}`
      }
      cameraError.value = msg
      console.error('Failed to get user media:', err.name, msg)
      return null
    }
  }

  function createPeerConnection(iceServers: RTCIceServer[]) {
    pc = new RTCPeerConnection({ iceServers })

    pc.onicecandidate = (event) => {
      if (event.candidate && onIceCandidateHandler) {
        onIceCandidateHandler(event.candidate.toJSON())
      }
    }

    pc.ontrack = (event) => {
      const [stream] = event.streams
      if (stream) {
        // Backend uses "stream_{clientID}" as stream ID; strip prefix to get actual clientId
        const clientId = stream.id.replace(/^stream_/, '')
        console.log(`[WebRTC] ontrack: streamId=${stream.id} -> clientId=${clientId}`)
        remoteStreams.value = new Map(remoteStreams.value.set(clientId, stream))
        if (onTrackHandler) {
          onTrackHandler(stream)
        }
      }
    }

    pc.onconnectionstatechange = () => {
      console.log('PC state:', pc?.connectionState)
    }

    return pc
  }

  async function createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!pc) throw new Error('PeerConnection not created')

    // Add transceivers if not already added
    if (pc.getTransceivers().length === 0) {
      if (localStream.value) {
        localStream.value.getTracks().forEach(track => {
          if (pc) {
            const transceiver = pc.addTransceiver(track, { direction: 'sendrecv' })
            applyCodecPreferences(transceiver, track.kind as 'audio' | 'video')
          }
        })
      } else {
        // No local media available (e.g. camera already in use by another window).
        // Add recvonly transceivers so we can still receive remote participants' video/audio.
        const audioTransceiver = pc.addTransceiver('audio', { direction: 'recvonly' })
        applyCodecPreferences(audioTransceiver, 'audio')
        const videoTransceiver = pc.addTransceiver('video', { direction: 'recvonly' })
        applyCodecPreferences(videoTransceiver, 'video')
      }
    }

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    return offer
  }

  async function setRemoteDescription(sdp: RTCSessionDescriptionInit) {
    if (!pc) throw new Error('PeerConnection not created')
    await pc.setRemoteDescription(new RTCSessionDescription(sdp))
  }

  async function createAnswer(): Promise<RTCSessionDescriptionInit> {
    if (!pc) throw new Error('PeerConnection not created')
    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)
    return answer
  }

  async function addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!pc) return
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate))
    } catch (err) {
      console.warn('Failed to add ICE candidate:', err)
    }
  }

  function setOnIceCandidate(handler: (candidate: RTCIceCandidateInit) => void) {
    onIceCandidateHandler = handler
  }

  function setOnTrack(handler: (stream: MediaStream, clientId?: string) => void) {
    onTrackHandler = handler
  }

  async function toggleMic() {
    if (!localStream.value) return
    const audioTrack = localStream.value.getAudioTracks()[0]
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled
      isMuted.value = !audioTrack.enabled
    }
  }

  async function toggleCam() {
    if (!localStream.value) return
    const videoTrack = localStream.value.getVideoTracks()[0]
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled
      isCamOff.value = !videoTrack.enabled
    }
  }

  async function startScreenShare() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
      })
      screenStream.value = stream
      isScreenSharing.value = true

      // Replace video track with screen track
      const [screenTrack] = stream.getVideoTracks()
      const [videoTrack] = localStream.value?.getVideoTracks() ?? []

      if (pc && videoTrack && screenTrack) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(screenTrack)
        }
      }

      // Listen for stop (user clicks "Stop sharing" in browser UI)
      screenTrack!.onended = () => {
        stopScreenShare()
      }
    } catch (err) {
      console.error('Screen share failed:', err)
      isScreenSharing.value = false
    }
  }

  async function stopScreenShare() {
    if (screenStream.value) {
      screenStream.value.getTracks().forEach(t => t.stop())
      screenStream.value = null
    }
    isScreenSharing.value = false

    // Restore camera video track
    if (pc && localStream.value) {
      const videoTrack = localStream.value.getVideoTracks()[0]
      if (videoTrack) {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video')
        if (sender) {
          await sender.replaceTrack(videoTrack)
        }
      }
    }
  }

  async function switchCamera(deviceId: string) {
    if (!localStream.value) return
    const newStream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
      audio: false,
    })
    const newVideoTrack = newStream.getVideoTracks()[0]
    if (!newVideoTrack) return
    const [oldVideoTrack] = localStream.value.getVideoTracks()

    if (oldVideoTrack) {
      localStream.value.removeTrack(oldVideoTrack)
      oldVideoTrack.stop()
    }

    localStream.value.addTrack(newVideoTrack)

    if (pc) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video')
      if (sender) {
        await sender.replaceTrack(newVideoTrack)
      }
    }
  }

  async function switchMicrophone(deviceId: string) {
    if (!localStream.value) return
    const newStream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: deviceId } },
      video: false,
    })
    const newAudioTrack = newStream.getAudioTracks()[0]
    if (!newAudioTrack) return
    const [oldAudioTrack] = localStream.value.getAudioTracks()

    if (oldAudioTrack) {
      localStream.value.removeTrack(oldAudioTrack)
      oldAudioTrack.stop()
    }

    localStream.value.addTrack(newAudioTrack)

    if (pc) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'audio')
      if (sender) {
        await sender.replaceTrack(newAudioTrack)
      }
    }
  }

  function cleanup() {
    if (localStream.value) {
      localStream.value.getTracks().forEach(t => t.stop())
      localStream.value = null
    }
    if (screenStream.value) {
      screenStream.value.getTracks().forEach(t => t.stop())
      screenStream.value = null
    }
    if (pc) {
      pc.close()
      pc = null
    }
    remoteStreams.value = new Map()
    isMuted.value = false
    isCamOff.value = false
    isScreenSharing.value = false
  }

  return {
    // State
    localStream,
    remoteStreams,
    screenStream,
    isMuted,
    isCamOff,
    isScreenSharing,
    cameraError,
    cameraDevices,
    microphoneDevices,
    speakerDevices,

    // Actions
    startLocalMedia,
    createPeerConnection,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    setOnIceCandidate,
    setOnTrack,
    enumerateDevices,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
    switchCamera,
    switchMicrophone,
    cleanup,
  }
}
