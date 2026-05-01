export interface OverviewStats {
  totalMeetings: number
  activeMeetings: number
  totalParticipants: number
  totalRecordings: number
  totalDurationMs: number
}

export interface ParticipantStat {
  userId: number
  displayName: string
  isHost: boolean
  joinedAt: string
  leftAt: string
  durationMs: number
}

export interface MeetingStats {
  meetingId: number
  title: string
  roomNo: number
  status: string
  startedAt: string
  endedAt: string
  totalDurationMs: number
  participantCount: number
  participants: ParticipantStat[]
}

export interface UserMeetingStat {
  meetingId: number
  title: string
  roomNo: number
  isHost: boolean
  joinedAt: string
  leftAt: string
  durationMs: number
}

export interface UserStats {
  userId: number
  username: string
  nickname: string
  totalMeetings: number
  totalDurationMs: number
  meetingsHosted: number
  recentMeetings: UserMeetingStat[]
}

export interface TrendDay {
  date: string
  meetings: number
  participants: number
}

export interface QualityMetricSummary {
  label: string
  avgPacketsLost: number
  avgJitterMs: number
  avgRoundTripMs: number
  avgBitrateKbps: number
  minBitrateKbps: number
  maxBitrateKbps: number
  avgFps?: number
  maxFrameWidth?: number
  maxFrameHeight?: number
  sampleCount: number
}

export interface CandidateTypeDistribution {
  type: string
  count: number
}

export interface UserQualitySummary {
  userId: number
  clientId: string
  displayName: string
  audio?: QualityMetricSummary
  video?: QualityMetricSummary
  candidateType?: string
}

export interface MeetingQualityReport {
  meetingId: number
  roomNo: number
  title: string
  userCount: number
  users: UserQualitySummary[]
  candidateDist: CandidateTypeDistribution[]
  overallAvgJitterMs: number
  overallAvgRttMs: number
  overallAvgPacketLossRate: number
}

export interface TrendStats {
  days: TrendDay[]
}
