import request from '@/utils/request'
import type { CreateMeetingParams, JoinMeetingParams, MeetingInfo, RecordingInfo, RecordingDetail } from '@/types/meeting'

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

// ---------- Recording API ----------

export function getRecordingsApi(params: {
  page?: number
  limit?: number
}): Promise<{ list: RecordingInfo[]; count: number }> {
  return request.get<{ list: RecordingInfo[]; count: number }>('/recordings', { params })
}

export function getRecordingDetailApi(id: number): Promise<RecordingDetail> {
  return request.get<RecordingDetail>(`/recordings/${id}`)
}

export function deleteRecordingApi(id: number): Promise<void> {
  return request.delete<void>(`/recordings/${id}`)
}

export async function downloadRecordingFile(id: number, fileId: number, filename: string): Promise<void> {
  const authStore = await import('@/stores/auth').then(m => m.useAuthStore())
  const baseURL = import.meta.env.VITE_API_BASE_URL ?? '/api'
  const url = `${baseURL}/recordings/${id}/files/${fileId}/download`

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${authStore.token}` },
  })
  if (!response.ok) {
    throw new Error('下载失败')
  }
  const blob = await response.blob()
  const blobUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = blobUrl
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(blobUrl)
}

export function getRecordingDownloadUrl(id: number, fileId: number): string {
  return `/api/recordings/${id}/files/${fileId}/download`
}
