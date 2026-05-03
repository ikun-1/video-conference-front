import request from '@/utils/request'

export interface NotificationItem {
  id: number
  fromUserId: number
  toUserId: number
  type: string
  message: string
  status: 'unread' | 'read'
  createdAt: string
  readAt?: string
}

export interface NotificationListResult {
  list: NotificationItem[]
  count: number
}

export function createNotificationApi(toUserId: number, type: string, message?: string) {
  return request.post<NotificationItem>('/notifications', { toUserId, type, message })
}

export function getNotificationsApi(page = 1, limit = 20) {
  return request.get<NotificationListResult>('/notifications', { params: { page, limit } })
}

export function getUnreadCountApi() {
  return request.get<number>('/notifications/unread-count')
}

export function markAsReadApi(id: number) {
  return request.put(`/notifications/${id}/read`)
}

export function markAllAsReadApi() {
  return request.put('/notifications/read-all')
}

export function deleteNotificationApi(id: number) {
  return request.delete(`/notifications/${id}`)
}
