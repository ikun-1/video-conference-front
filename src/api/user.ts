import request from '@/utils/request'
import type { UserInfo } from '@/types/user'

export interface UpdateUserProfileParams {
  nickname?: string
  avatar?: string
}

// 获取当前用户信息
export function getCurrentUserApi() {
  return request.get<UserInfo>('/user/me')
}

// 更新当前用户信息
export function updateCurrentUserApi(params: UpdateUserProfileParams) {
  return request.put<UserInfo>('/user/me', params)
}

// 获取用户列表
export function getUserListApi() {
  return request.get<UserInfo[]>('/users')
}
