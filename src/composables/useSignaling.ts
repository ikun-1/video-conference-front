import { ref } from 'vue'
import type {
  WsServerMessage,
  RoomJoinedData,
  UserJoinedData,
  UserLeftData,
  ParticipantInfo,
  RenegotiationOffer,
  RecordingControlData,
} from '@/types/meeting'

export type ConnectionState = 'disconnected' | 'connecting' | 'connected'

interface SignalingCallbacks {
  onRoomJoined?: (data: RoomJoinedData) => Promise<void> | void
  onUserJoined?: (data: UserJoinedData) => void
  onUserLeft?: (data: UserLeftData) => void
  onRemoteOffer?: (data: RenegotiationOffer) => Promise<void> | void
  onRemoteAnswer?: (data: RTCSessionDescriptionInit) => Promise<void> | void
  onRemoteIceCandidate?: (data: RTCIceCandidateInit) => Promise<void> | void
  onUserMuted?: (data: { clientId: string; muted: boolean; kind: string }) => void
  onScreenShareStarted?: (data: { clientId: string }) => void
  onScreenShareStopped?: (data: { clientId: string }) => void
  onChatMessage?: (data: { fromClientId: string; displayName: string; text: string }) => void
  onRecordingStateChanged?: (data: RecordingControlData) => void
  onError?: (message: string) => void
}

export function useSignaling() {
  const connectionState = ref<ConnectionState>('disconnected')
  let ws: WebSocket | null = null
  let callbacks: SignalingCallbacks = {}
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const maxReconnectAttempts = 5
  let reconnectRoomNo = 0
  let reconnectToken = ''

  // Message queue for serial processing
  const msgQueue: (() => Promise<void>)[] = []
  let processingQueue = false

  async function enqueue(fn: () => Promise<void>) {
    msgQueue.push(fn)
    if (!processingQueue) {
      processingQueue = true
      while (msgQueue.length > 0) {
        const task = msgQueue.shift()!
        try {
          await task()
        } catch (err) {
          console.error('Signaling task error:', err)
        }
      }
      processingQueue = false
    }
  }

  function getWsUrl(token: string): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/api/ws/meeting?token=${token}`
  }

  function connect(roomNo: number, token: string) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      return
    }

    connectionState.value = 'connecting'
    reconnectRoomNo = roomNo
    reconnectToken = token

    const url = getWsUrl(token)
    ws = new WebSocket(url)

    ws.onopen = () => {
      connectionState.value = 'connected'
      reconnectAttempts = 0

      // Send join-room message
      sendMessage({ type: 'join-room', roomNo })
    }

    ws.onclose = () => {
      connectionState.value = 'disconnected'
      ws = null
      attemptReconnect()
    }

    ws.onerror = () => {
      console.error('WebSocket error')
    }

    ws.onmessage = (event: MessageEvent) => {
      try {
        const msg: WsServerMessage = JSON.parse(event.data)
        enqueue(() => handleServerMessage(msg))
      } catch (err) {
        console.error('Failed to parse WS message:', err)
      }
    }
  }

  async function handleServerMessage(msg: WsServerMessage) {
    switch (msg.type) {
      case 'room-joined':
        await callbacks.onRoomJoined?.(msg.data as RoomJoinedData)
        break
      case 'user-joined':
        callbacks.onUserJoined?.(msg.data as UserJoinedData)
        break
      case 'user-left':
        callbacks.onUserLeft?.(msg.data as UserLeftData)
        break
      case 'offer':
        await callbacks.onRemoteOffer?.(msg.data as RenegotiationOffer)
        break
      case 'answer':
        await callbacks.onRemoteAnswer?.(msg.data as RTCSessionDescriptionInit)
        break
      case 'ice-candidate':
        await callbacks.onRemoteIceCandidate?.(msg.data as RTCIceCandidateInit)
        break
      case 'user-muted':
        callbacks.onUserMuted?.(msg.data as { clientId: string; muted: boolean; kind: string })
        break
      case 'screen-share-started':
        callbacks.onScreenShareStarted?.(msg.data as { clientId: string })
        break
      case 'screen-share-stopped':
        callbacks.onScreenShareStopped?.(msg.data as { clientId: string })
        break
      case 'chat-message':
        callbacks.onChatMessage?.(msg.data as { fromClientId: string; displayName: string; text: string })
        break
      case 'recording-started':
      case 'recording-stopped':
        callbacks.onRecordingStateChanged?.(msg.data as RecordingControlData)
        break
      case 'error':
        callbacks.onError?.(msg.data as string)
        break
    }
  }

  function attemptReconnect() {
    if (reconnectAttempts >= maxReconnectAttempts) return
    reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000)
    console.log(`Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`)
    reconnectTimer = setTimeout(() => {
      connect(reconnectRoomNo, reconnectToken)
    }, delay)
  }

  function sendMessage(msg: Record<string, unknown>) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg))
    }
  }

  function sendOffer(sdp: RTCSessionDescriptionInit) {
    sendMessage({ type: 'offer', sdp })
  }

  function sendAnswer(sdp: RTCSessionDescriptionInit) {
    sendMessage({ type: 'answer', sdp })
  }

  function sendIceCandidate(candidate: RTCIceCandidateInit) {
    sendMessage({ type: 'ice-candidate', candidate })
  }

  function sendMuteToggle(muted: boolean, kind: 'audio' | 'video') {
    sendMessage({ type: 'mute-toggle', muted, kind })
  }

  function sendScreenShareStart() {
    sendMessage({ type: 'screen-share-start' })
  }

  function sendScreenShareStop() {
    sendMessage({ type: 'screen-share-stop' })
  }

  function sendChatMessage(text: string) {
    sendMessage({ type: 'chat-message', text })
  }

  function sendRecordingControl(action: 'start' | 'stop') {
    sendMessage({ type: 'recording-control', action })
  }

  function setCallbacks(cbs: SignalingCallbacks) {
    callbacks = cbs
  }

  function disconnect() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
    reconnectAttempts = maxReconnectAttempts // prevent reconnect
    if (ws) {
      ws.close()
      ws = null
    }
    connectionState.value = 'disconnected'
  }

  function sendRaw(msg: Record<string, unknown>) {
    sendMessage(msg)
  }

  return {
    connectionState,
    connect,
    disconnect,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    sendMuteToggle,
    sendScreenShareStart,
    sendScreenShareStop,
    sendChatMessage,
    sendRecordingControl,
    sendRaw,
    setCallbacks,
  }
}
