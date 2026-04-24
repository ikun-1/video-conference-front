import request from '@/utils/request'
import type { CreateMeetingParams, JoinMeetingParams, MeetingInfo } from '@/types/meeting'

export function createMeetingApi(params: CreateMeetingParams): Promise<number> {
  return request.post<number>('/meetings', params)
}

export function getMeetingInfoApi(roomNo: number): Promise<MeetingInfo> {
  return request.get<MeetingInfo>(`/meetings/${roomNo}`)
}

export function joinMeetingApi(params: JoinMeetingParams): Promise<number> {
  return request.post<number>(`/meetings/${params.roomNo}/join`, { password: params.password })
}

export function endMeetingApi(roomNo: number): Promise<void> {
  return request.delete<void>(`/meetings/${roomNo}`)
}

export function getMeetingHistoryApi(params: {
  page?: number
  limit?: number
}): Promise<{ list: MeetingInfo[]; count: number }> {
  return request.get<{ list: MeetingInfo[]; count: number }>('/meetings', { params })
}
