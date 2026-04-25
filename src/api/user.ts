import request from '@/utils/request'
import type { UserInfo } from '@/types/user'

export interface UpdateUserProfileParams {
  nickname?: string
  password?: string
  realName?: string
  email?: string
  phone?: string
  avatarId?: number
  status?: 0 | 1
}

export interface UserProfileDetail extends UserInfo {
  realName?: string
  email?: string
  phone?: string
  status?: 0 | 1
}

export interface UploadImageResult {
  id: number
  address: string
}

// 获取用户列表
export function getUserListApi() {
  return request.get<UserInfo[]>('/users')
}

// 获取用户详情
export function getUserDetailApi(id: number) {
  return request.get<UserProfileDetail>(`/users/${id}`)
}

// 更新用户资料
export function updateUserProfileApi(id: number, params: UpdateUserProfileParams) {
  return request.put<UserInfo>(`/users/${id}`, params)
}

// 上传图片文件
export function uploadImageApi(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post<UploadImageResult, FormData>('/images', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
}
