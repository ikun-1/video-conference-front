<script setup lang="ts">
import { onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { getUserDetailApi } from '@/api/user'

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

onMounted(async () => {
  if (!authStore.token || !user.value?.id) return

  try {
    const profile = await getUserDetailApi(user.value.id)
    authStore.setUser({
      ...user.value,
      username: profile.username || user.value.username,
      nickname: profile.nickname || user.value.nickname,
      avatarId: profile.avatarId,
      avatar: profile.avatar || user.value.avatar,
    })
  } catch {
    // handled by axios interceptor
  }
})
</script>

<template>
  <router-view />
</template>
