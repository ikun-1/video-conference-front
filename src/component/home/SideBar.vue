<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
    CollectionTag,
    Message,
    Microphone,
    Setting,
    SwitchButton,
    UserFilled,
    VideoCamera,
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { RouterLink, useRouter, useRoute, type RouteLocationRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

interface SidebarItem {
    label: string
    icon: typeof VideoCamera
    to: RouteLocationRaw
    activeNames: string[]
}

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { user } = storeToRefs(authStore)

const sidebarItems: SidebarItem[] = [
    { label: '会议', icon: VideoCamera, to: { name: 'home' }, activeNames: ['home'] },
    { label: '通讯录', icon: CollectionTag, to: { name: 'contacts' }, activeNames: ['contacts'] },
    { label: '录制', icon: Microphone, to: { name: 'recording' }, activeNames: ['recording'] },
]

const currentUser = computed(() => ({
    name: user.value?.nickname || user.value?.username || '未登录',
    avatar: user.value?.avatar || '',
}))

const baseItemClass =
    'flex select-none flex-col items-center gap-2 rounded-2xl px-2 py-2 transition hover:bg-slate-50'

function isActive(names: string[]): boolean {
    return route.name != null && names.includes(String(route.name))
}

function handleLogout() {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    })
        .then(() => {
            authStore.clearAuth()
            ElMessage.success('已退出登录')
            router.push({ name: 'login' })
        })
        .catch(() => {
            // 用户取消了操作
        })
}

</script>

<template>
    <aside class="flex h-full w-24 flex-col items-center pb-6 pt-4">
        <div class="flex flex-col items-center gap-2 px-1 text-center">
            <div class="relative">
                <div
                    class="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-100 bg-white shadow-sm">
                    <img v-if="currentUser.avatar" :src="currentUser.avatar" alt="用户头像"
                        class="h-full w-full object-cover" />
                    <el-icon v-else :size="20" class="text-slate-800">
                        <UserFilled />
                    </el-icon>
                </div>
            </div>
            <p class="w-full truncate text-xs font-medium text-slate-600">{{ currentUser.name }}</p>
        </div>

        <div class="mt-14 flex flex-col items-center gap-8">
            <RouterLink v-for="item in sidebarItems" :key="item.label" :to="item.to"
                :class="[baseItemClass, isActive(item.activeNames) ? 'bg-blue-50' : '']">
                <span class="flex h-10 w-10 items-center justify-center rounded-xl"
                    :class="isActive(item.activeNames) ? 'bg-blue-100 text-blue-600' : 'bg-slate-50 text-slate-500'">
                    <el-icon :size="20">
                        <component :is="item.icon" />
                    </el-icon>
                </span>
                <span class="text-sm font-medium"
                    :class="isActive(item.activeNames) ? 'text-blue-600' : 'text-slate-500'">
                    {{ item.label }}
                </span>
            </RouterLink>
        </div>

        <div class="mt-auto flex flex-col items-center gap-7 opacity-80">
            <button
                class="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-50">
                <el-icon :size="18">
                    <Message />
                </el-icon>
            </button>
            <button
                class="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-50">
                <el-icon :size="18">
                    <Setting />
                </el-icon>
            </button>
            <button
                class="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-50"
                @click="handleLogout">
                <el-icon :size="18">
                    <SwitchButton />
                </el-icon>
            </button>
        </div>
    </aside>
</template>
