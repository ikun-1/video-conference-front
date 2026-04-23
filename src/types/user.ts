export interface UserInfo {
  id: number
  username: string
  nickname?: string
  avatarId?: number
  avatar?: string
  roles?: string[]
}

export interface LoginResult {
  token: string
  user: UserInfo
}
