<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Lock, User } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { getCaptchaApi, loginApi } from '@/api/auth'
import { useAuthStore } from '@/stores/auth'

interface LoginFormData {
  username: string
  password: string
  captchaCode: string
  captchaId: string
  rememberMe: boolean
}

const router = useRouter()
const authStore = useAuthStore()
const formRef = ref<FormInstance>()
const loading = ref(false)
const captchaUrl = ref('')
const formData = reactive<LoginFormData>({
  username: '',
  password: '',
  captchaCode: '',
  captchaId: '',
  rememberMe: true,
})

const formRules: FormRules<LoginFormData> = {
  username: [{ required: true, message: '请输入账号/邮箱', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  captchaCode: [{ required: true, message: '请输入验证码', trigger: 'blur' }],
}

async function refreshCaptcha(): Promise<void> {
  try {
    const captcha = await getCaptchaApi()
    formData.captchaId = captcha.captchaId
    captchaUrl.value = captcha.captcha
  } catch {
    ElMessage.error('验证码获取失败，请稍后重试')
  }
}

async function handleSubmit(): Promise<void> {
  if (!formRef.value) return

  await formRef.value.validate(async valid => {
    if (!valid) return

    loading.value = true
    try {
      const loginResult = await loginApi({
        username: formData.username,
        password: formData.password,
        captchaId: formData.captchaId,
        captchaCode: formData.captchaCode,
      })

      if (formData.rememberMe) {
        localStorage.setItem('rememberedUsername', formData.username)
      } else {
        localStorage.removeItem('rememberedUsername')
      }

      authStore.setAuth(loginResult.token, loginResult.user)
      ElMessage.success('登录成功')
      await router.push('/')
    } catch {
      ElMessage.error('登录失败，请检查账号、密码或验证码')
      await refreshCaptcha()
    } finally {
      loading.value = false
    }
  })
}

function handleForgotPassword(): void {
  ElMessage.info('请联系管理员或接入找回密码流程')
}

onMounted(() => {
  const rememberedUsername = localStorage.getItem('rememberedUsername')
  if (rememberedUsername) {
    formData.username = rememberedUsername
  }
  refreshCaptcha()
})
</script>

<template>
  <el-form ref="formRef" :model="formData" :rules="formRules" label-position="top" @submit.prevent="handleSubmit">
    <el-form-item label="账号" prop="username">
      <el-input v-model="formData.username" placeholder="请输入账号/邮箱" size="large" :prefix-icon="User" clearable />
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input v-model="formData.password" type="password" placeholder="请输入密码" size="large" :prefix-icon="Lock"
        show-password clearable />
    </el-form-item>

    <el-form-item label="验证码" prop="captchaCode">
      <el-row :gutter="12" align="middle" class="w-full">
        <el-col :xs="16" :sm="18" :md="18">
          <el-input v-model="formData.captchaCode" placeholder="请输入验证码" size="large" />
        </el-col>
        <el-col :xs="8" :sm="6" :md="6">
          <el-button native-type="button" class="h-10! w-full! overflow-hidden! p-0!" @click="refreshCaptcha">
            <img v-if="captchaUrl" :src="captchaUrl" alt="验证码" class="h-full w-full object-cover" />
            <span v-else>点击刷新</span>
          </el-button>
        </el-col>
      </el-row>
    </el-form-item>

    <el-row class="mb-6" justify="space-between" align="middle">
      <el-col :span="12">
        <el-checkbox v-model="formData.rememberMe">记住密码</el-checkbox>
      </el-col>
      <el-col :span="12" class="text-right">
        <el-button link class="text-blue-500!" @click="handleForgotPassword">忘记密码？</el-button>
      </el-col>
    </el-row>

    <el-button native-type="submit" type="primary" size="large" :loading="loading"
      class="h-11! w-full! text-base! font-medium!">
      {{ loading ? '登录中...' : '登 录' }}
    </el-button>
  </el-form>
</template>
