<script setup lang="ts">
import { reactive, ref } from 'vue'
import { Lock, User, Message, Phone } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { useRouter } from 'vue-router'
import { registerApi } from '@/api/auth'

interface RegisterFormData {
  username: string
  nickname: string
  password: string
  confirmPassword: string
  email: string
  phone: string
}

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)
const formData = reactive<RegisterFormData>({
  username: '',
  nickname: '',
  password: '',
  confirmPassword: '',
  email: '',
  phone: '',
})

const validateConfirmPassword = (_rule: unknown, value: string, callback: (e?: Error) => void) => {
  if (value !== formData.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const formRules: FormRules<RegisterFormData> = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度不能少于6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

async function handleSubmit(): Promise<void> {
  if (!formRef.value) return

  await formRef.value.validate(async valid => {
    if (!valid) return

    loading.value = true
    try {
      await registerApi({
        username: formData.username,
        password: formData.password,
        nickname: formData.nickname || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
      })

      ElMessage.success('注册成功，请登录')
      await router.push('/login')
    } catch {
      // Error message is already handled by the request interceptor
    } finally {
      loading.value = false
    }
  })
}
</script>

<template>
  <el-form ref="formRef" :model="formData" :rules="formRules" label-position="top" @submit.prevent="handleSubmit">
    <el-form-item label="用户名" prop="username">
      <el-input v-model="formData.username" placeholder="请输入用户名" size="large" :prefix-icon="User" clearable />
    </el-form-item>

    <el-form-item label="昵称" prop="nickname">
      <el-input v-model="formData.nickname" placeholder="请输入昵称（选填）" size="large" clearable />
    </el-form-item>

    <el-form-item label="密码" prop="password">
      <el-input v-model="formData.password" type="password" placeholder="请输入密码（至少6位）" size="large"
        :prefix-icon="Lock" show-password clearable />
    </el-form-item>

    <el-form-item label="确认密码" prop="confirmPassword">
      <el-input v-model="formData.confirmPassword" type="password" placeholder="请再次输入密码" size="large"
        :prefix-icon="Lock" show-password clearable />
    </el-form-item>

    <el-form-item label="邮箱" prop="email">
      <el-input v-model="formData.email" placeholder="请输入邮箱（选填）" size="large" :prefix-icon="Message" clearable />
    </el-form-item>

    <el-form-item label="手机号" prop="phone">
      <el-input v-model="formData.phone" placeholder="请输入手机号（选填）" size="large" :prefix-icon="Phone" clearable />
    </el-form-item>

    <el-button native-type="submit" type="primary" size="large" :loading="loading"
      class="h-11! w-full! text-base! font-medium!">
      {{ loading ? '注册中...' : '注 册' }}
    </el-button>
  </el-form>
</template>
