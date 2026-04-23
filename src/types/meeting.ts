export interface MeetingParticipant {
  id: string
  displayName: string
  avatar?: string
  isMuted: boolean
  isCamOff: boolean
  isHost: boolean
  isScreenSharing: boolean
}
