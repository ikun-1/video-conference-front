export interface MeetingParticipant {
  id: string
  displayName: string
  avatar?: string
  isMuted: boolean
  isCamOff: boolean
  isHost: boolean
  isScreenSharing: boolean
}

// ---------- Meeting REST API types ----------

export interface CreateMeetingParams {
  title: string
  password?: string
}

export interface JoinMeetingParams {
  roomNo: number
  password?: string
}

export interface MeetingInfo {
  id: number
  roomNo: number
  title: string
  hostId: number
  hostName: string
  status: string
  createdAt: string
}

// ---------- WebSocket message types ----------

export interface WsClientMessage {
  type: string
  roomNo?: number
  password?: string
  sdp?: unknown
  candidate?: unknown
  muted?: boolean
  kind?: string
  text?: string
  action?: string
}

export interface WsServerMessage {
  type: string
  data: unknown
}

export interface ParticipantInfo {
  clientId: string
  displayName: string
  isHost: boolean
  isMuted: boolean
  isCamOff: boolean
}

export interface RoomJoinedData {
  roomNo: number
  clientId: string
  participants: ParticipantInfo[]
}

export interface UserJoinedData {
  clientId: string
  displayName: string
  isHost: boolean
}

export interface UserLeftData {
  clientId: string
}

export interface RenegotiationOffer {
  sdp: string
}

// ---------- Recording types ----------

export interface RecordingInfo {
  id: number
  roomNo: number
  title: string
  startedAt: string
  endedAt: string
  durationMs: number
  status: string
  fileCount: number
}

export interface RecordingFileInfo {
  id: number
  clientId: string
  displayName: string
  kind: string
  codec: string
  fileSize: number
  downloadUrl: string
  playableUrl?: string
}

export interface RecordingDetail extends RecordingInfo {
  files: RecordingFileInfo[]
}

export interface RecordingControlData {
  action: 'started' | 'stopped'
  startedAt?: string
  durationMs?: number
}
