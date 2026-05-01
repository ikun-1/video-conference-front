import request from '@/utils/request'
import type { OverviewStats, MeetingStats, UserStats, TrendStats, MeetingQualityReport } from '@/types/stats'

export function getOverviewStatsApi(): Promise<OverviewStats> {
  return request.get<OverviewStats>('/stats/overview')
}

export function getMeetingStatsApi(meetingId: number): Promise<MeetingStats> {
  return request.get<MeetingStats>(`/stats/meetings/${meetingId}`)
}

export function getUserStatsApi(userId: number): Promise<UserStats> {
  return request.get<UserStats>(`/stats/users/${userId}`)
}

export function getTrendStatsApi(days: number = 7): Promise<TrendStats> {
  return request.get<TrendStats>('/stats/trend', { params: { days } })
}

export function getMeetingQualityReportApi(meetingId: number): Promise<MeetingQualityReport> {
  return request.get<MeetingQualityReport>(`/stats/quality/${meetingId}`)
}
