<script setup lang="ts">
import RegisterForm from '@/component/auth/RegisterForm.vue'
import { useRouter } from 'vue-router'

const currentYear = new Date().getFullYear()
const router = useRouter()

function goToLogin(): void {
  router.push('/login')
}
</script>

<template>
  <main class="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
    <div
      class="pointer-events-none absolute -top-56 left-1/2 h-[38rem] w-[38rem] -translate-x-1/2 rounded-full bg-cyan-400/20 blur-3xl" />
    <div
      class="pointer-events-none absolute -bottom-56 right-0 h-[34rem] w-[34rem] rounded-full bg-blue-500/25 blur-3xl" />

    <div
      class="relative mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 px-6 py-10 lg:grid-cols-2 lg:px-10">
      <section class="space-y-6">
        <div
          class="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs tracking-wide text-cyan-200">
          <span class="inline-block h-2 w-2 rounded-full bg-cyan-300" />
          Video Conference System
        </div>

        <h1 class="max-w-xl text-4xl font-semibold leading-tight text-white sm:text-5xl">
          加入我们，开启远程协作
        </h1>

        <p class="max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
          注册账号后即可创建和加入会议、管理通讯录以及查看录制记录。只需填写基本信息，快速完成注册。
        </p>

        <div class="grid max-w-xl grid-cols-1 gap-3 sm:grid-cols-3">
          <div class="rounded-2xl border border-white/15 bg-white/6 p-4">
            <p class="text-xs text-slate-400">高清画质</p>
            <p class="mt-1 text-lg font-semibold text-cyan-200">1080p</p>
          </div>
          <div class="rounded-2xl border border-white/15 bg-white/6 p-4">
            <p class="text-xs text-slate-400">多端同步</p>
            <p class="mt-1 text-lg font-semibold text-blue-200">实时互通</p>
          </div>
          <div class="rounded-2xl border border-white/15 bg-white/6 p-4">
            <p class="text-xs text-slate-400">安全加密</p>
            <p class="mt-1 text-lg font-semibold text-emerald-200">端到端</p>
          </div>
        </div>
      </section>

      <section
        class="mx-auto w-full max-w-md rounded-3xl border border-white/15 bg-white/95 p-6 shadow-2xl shadow-cyan-950/20 backdrop-blur sm:p-8">
        <header class="mb-6 space-y-1">
          <h2 class="text-2xl font-semibold text-slate-900">创建账号</h2>
          <p class="text-sm text-slate-500">填写信息完成注册</p>
        </header>

        <RegisterForm />

        <p class="mt-6 text-center text-sm text-slate-400">
          已有账号？
          <el-button link class="text-blue-500! p-0! text-sm!" @click="goToLogin">
            立即登录
          </el-button>
        </p>

        <p class="mt-4 text-center text-xs text-slate-400">
          &copy; {{ currentYear }} Video Conference. All rights reserved.
        </p>
      </section>
    </div>
  </main>
</template>
