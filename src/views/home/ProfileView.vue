<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Camera, UserFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { getUserDetailApi, updateUserProfileApi, uploadImageApi } from '@/api/user'

interface ProfileForm {
  nickname: string
  realName: string
  email: string
  phone: string
}

const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const loading = ref(false)
const saving = ref(false)
const avatarUploading = ref(false)
const avatarInputRef = ref<HTMLInputElement | null>(null)
const currentStatus = ref<0 | 1>(1)
const previewAvatar = ref('')

const form = reactive<ProfileForm>({
  nickname: '',
  realName: '',
  email: '',
  phone: '',
})

const currentUserId = computed(() => user.value?.id || 0)
const username = computed(() => user.value?.username || '')

async function loadProfile() {
  if (!currentUserId.value) {
    ElMessage.error('用户未登录')
    return
  }

  loading.value = true
  try {
    const profile = await getUserDetailApi(currentUserId.value)
    form.nickname = profile.nickname || ''
    form.realName = profile.realName || ''
    form.email = profile.email || ''
    form.phone = profile.phone || ''
    currentStatus.value = profile.status === 0 ? 0 : 1
    previewAvatar.value = profile.avatar || user.value?.avatar || ''

    authStore.setUser({
      ...(user.value || { id: currentUserId.value, username: profile.username || '' }),
      username: profile.username || user.value?.username || '',
      nickname: profile.nickname || user.value?.nickname || '',
      avatarId: profile.avatarId,
      avatar: profile.avatar || user.value?.avatar || '',
    })
  } finally {
    loading.value = false
  }
}

function triggerAvatarUpload() {
  if (avatarUploading.value || saving.value) return
  avatarInputRef.value?.click()
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  if (!currentUserId.value) {
    ElMessage.error('用户未登录，无法上传头像')
    input.value = ''
    return
  }

  const allowTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowTypes.includes(file.type)) {
    ElMessage.error('仅支持 JPG、PNG、WEBP 格式图片')
    input.value = ''
    return
  }

  const maxSize = 2 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('头像大小不能超过 2MB')
    input.value = ''
    return
  }

  avatarUploading.value = true
  try {
    const uploadResult = await uploadImageApi(file)
    await updateUserProfileApi(currentUserId.value, {
      nickname: form.nickname,
      realName: form.realName,
      email: form.email,
      phone: form.phone,
      status: currentStatus.value,
      avatarId: uploadResult.id,
    })

    previewAvatar.value = uploadResult.address
    authStore.setUser({
      ...(user.value || { id: currentUserId.value, username: '' }),
      nickname: form.nickname || user.value?.nickname || '',
      avatarId: uploadResult.id,
      avatar: uploadResult.address,
    })

    ElMessage.success('头像更新成功')
  } finally {
    avatarUploading.value = false
    input.value = ''
  }
}

async function handleSaveProfile() {
  if (!currentUserId.value) {
    ElMessage.error('用户未登录')
    return
  }

  saving.value = true
  try {
    await updateUserProfileApi(currentUserId.value, {
      nickname: form.nickname,
      realName: form.realName,
      email: form.email,
      phone: form.phone,
      status: currentStatus.value,
      avatarId: user.value?.avatarId,
    })

    authStore.setUser({
      ...(user.value || { id: currentUserId.value, username: '' }),
      nickname: form.nickname || user.value?.nickname || '',
      avatar: previewAvatar.value || user.value?.avatar || '',
    })

    ElMessage.success('个人信息更新成功')
  } finally {
    saving.value = false
  }
}

onMounted(loadProfile)
</script>

<template>
  <div class="h-full w-full overflow-y-auto bg-slate-50 px-4 sm:px-10 py-4 sm:py-8">
    <div class="mx-auto max-w-4xl rounded-2xl border border-slate-100 bg-white p-4 sm:p-8 shadow-sm">
      <div class="mb-6 sm:mb-8 flex items-center justify-between">
        <div>
          <h1 class="text-xl sm:text-2xl font-semibold text-slate-800">个人信息</h1>
          <p class="mt-1 text-xs sm:text-sm text-slate-500">在这里更新你的头像和账户资料</p>
        </div>
      </div>

      <div v-loading="loading" class="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-[280px,1fr]">
        <section class="rounded-xl border border-slate-100 bg-slate-50 p-4 sm:p-6">
          <div class="flex flex-col items-center">
            <div
              class="group relative flex h-32 w-32 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white"
              @click="triggerAvatarUpload"
            >
              <img v-if="previewAvatar" :src="previewAvatar" alt="头像" class="h-full w-full object-cover" />
              <el-icon v-else :size="56" class="text-slate-400">
                <UserFilled />
              </el-icon>
              <span
                class="absolute inset-0 flex items-center justify-center bg-black/45 opacity-0 transition group-hover:opacity-100"
              >
                <el-icon :size="20" class="text-white">
                  <Camera />
                </el-icon>
              </span>
            </div>
            <input
              ref="avatarInputRef"
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              class="hidden"
              :disabled="avatarUploading || saving"
              @change="handleAvatarChange"
            />
            <p class="mt-4 text-sm text-slate-600">点击头像上传新图片</p>
            <p class="mt-1 text-xs text-slate-400">支持 JPG/PNG/WEBP，最大 2MB</p>
          </div>
        </section>

        <section class="rounded-xl border border-slate-100 p-4 sm:p-6">
          <el-form label-width="72px" class="max-w-xl sm:label-width-[96px]">
            <el-form-item label="用户名">
              <el-input :model-value="username" disabled />
            </el-form-item>
            <el-form-item label="昵称">
              <el-input v-model="form.nickname" placeholder="请输入昵称" />
            </el-form-item>
            <el-form-item label="真实姓名">
              <el-input v-model="form.realName" placeholder="请输入真实姓名" />
            </el-form-item>
            <el-form-item label="邮箱">
              <el-input v-model="form.email" placeholder="请输入邮箱" />
            </el-form-item>
            <el-form-item label="手机号">
              <el-input v-model="form.phone" placeholder="请输入手机号" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="handleSaveProfile">保存修改</el-button>
            </el-form-item>
          </el-form>
        </section>
      </div>
    </div>
  </div>
</template>
