import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import type { UserInfo } from '@/types/user'

const TOKEN_KEY = 'token'
const USER_INFO_KEY = 'userInfo'

function parseStoredUser(raw: string | null): UserInfo | null {
  if (!raw) return null

  try {
    return JSON.parse(raw) as UserInfo
  } catch {
    return null
  }
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(TOKEN_KEY) ?? '')
  const user = ref<UserInfo | null>(parseStoredUser(localStorage.getItem(USER_INFO_KEY)))

  const isAuthenticated = computed(() => Boolean(token.value))

  function setToken(nextToken: string): void {
    token.value = nextToken
    localStorage.setItem(TOKEN_KEY, nextToken)
  }

  function setUser(nextUser: UserInfo | null): void {
    user.value = nextUser

    if (nextUser) {
      localStorage.setItem(USER_INFO_KEY, JSON.stringify(nextUser))
      return
    }

    localStorage.removeItem(USER_INFO_KEY)
  }

  function setAuth(nextToken: string, nextUser: UserInfo): void {
    setToken(nextToken)
    setUser(nextUser)
  }

  function clearAuth(): void {
    token.value = ''
    user.value = null
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_INFO_KEY)
  }

  return {
    token,
    user,
    isAuthenticated,
    setToken,
    setUser,
    setAuth,
    clearAuth,
  }
})
