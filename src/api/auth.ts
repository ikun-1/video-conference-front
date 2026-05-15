import request from '@/utils/request'
import type { LoginResult, UserInfo } from '@/types/user'

export interface LoginParams {
  username: string
  password: string
  captchaId?: string
  captchaCode?: string
}

export interface CaptchaResult {
  captchaId: string
  captcha: string
  captchaAns: string
}

export function loginApi(params: LoginParams): Promise<LoginResult> {
  return request.post<LoginResult>('/auth/login', params)
}

export function getCaptchaApi(): Promise<CaptchaResult> {
  return request.post<CaptchaResult>('/captchas')
}

export function logoutApi(): Promise<void> {
  return request.post<void>('/auth/logout')
}

export interface RegisterParams {
  username: string
  password: string
  nickname?: string
  realName?: string
  email?: string
  phone?: string
}

export function registerApi(params: RegisterParams): Promise<void> {
  return request.post<void>('/users', params)
}

export type { UserInfo }
