<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowDown, Calendar, Lightning, Monitor, Plus } from '@element-plus/icons-vue'

interface QuickAction {
  title: string
  icon: 'plus' | 'lightning' | 'calendar' | 'monitor'
  hasArrow?: boolean
}

interface JoinMeetingForm {
  meetingNumber: string
  participantName: string
  meetingPassword: string
  muteOnJoin: boolean
  disableCameraOnJoin: boolean
}

interface CreateMeetingForm {
  meetingTitle: string
  usePassword: boolean
  meetingPassword: string
}

const joinDialogVisible = ref(false)
const createDialogVisible = ref(false)
const joinForm = reactive<JoinMeetingForm>({
  meetingNumber: '',
  participantName: '',
  meetingPassword: '',
  muteOnJoin: true,
  disableCameraOnJoin: true,
})
const createForm = reactive<CreateMeetingForm>({
  meetingTitle: '',
  usePassword: false,
  meetingPassword: '',
})

const quickActions: QuickAction[] = [
  { title: '加入会议', icon: 'plus' },
  { title: '创建会议', icon: 'lightning', hasArrow: true },
  { title: '预定会议', icon: 'calendar', hasArrow: true },
  { title: '共享屏幕', icon: 'monitor' },
]

const canJoin = computed(() => joinForm.meetingNumber.trim().length > 0 && joinForm.participantName.trim().length > 0)
const canCreate = computed(() => createForm.meetingTitle.trim().length > 0 && (!createForm.usePassword || createForm.meetingPassword.trim().length > 0))

function handleActionClick(title: string): void {
  if (title === '加入会议') {
    joinDialogVisible.value = true
  }

  if (title === '创建会议') {
    createDialogVisible.value = true
  }
}

function handleJoinMeeting(): void {
  if (!canJoin.value) return

  // TODO: 这里接入真正的入会逻辑
  joinDialogVisible.value = false
}

function handleCreateMeeting(): void {
  if (!canCreate.value) return

  // TODO: 这里接入真正的创建会议逻辑
  createDialogVisible.value = false
}
</script>

<template>
  <div class="flex-1">
    <div class="grid grid-cols-2 gap-y-12">
      <div v-for="item in quickActions" :key="item.title" class="flex flex-col items-center">
        <button
          class="group flex cursor-pointer flex-col items-center rounded-2xl px-4 py-2 text-center transition-transform duration-200 hover:scale-105 active:scale-95"
          type="button"
          @click="handleActionClick(item.title)"
        >
          <div
            class="flex h-28 w-28 items-center justify-center rounded-[26px] bg-blue-600 text-4xl text-white shadow-sm transition-transform duration-200 group-hover:scale-110"
          >
            <el-icon :size="42">
              <Plus v-if="item.icon === 'plus'" />
              <Lightning v-else-if="item.icon === 'lightning'" />
              <Calendar v-else-if="item.icon === 'calendar'" />
              <Monitor v-else />
            </el-icon>
          </div>
          <div
            class="mt-4 flex items-center gap-1 text-base font-medium text-slate-900 transition-colors group-hover:text-blue-600"
          >
            <span>{{ item.title }}</span>
            <el-icon v-if="item.hasArrow" :size="14" class="transition-transform duration-200 group-hover:scale-110">
              <ArrowDown />
            </el-icon>
          </div>
        </button>
      </div>
    </div>

    <el-dialog
      v-model="joinDialogVisible"
      width="520px"
      align-center
      :show-close="false"
      class="join-meeting-dialog"
    >
      <div class="rounded-3xl bg-white p-6">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 class="text-2xl font-semibold text-slate-900">加入会议</h3>
            <p class="mt-2 text-sm text-slate-500">请输入会议号并确认入会设置</p>
          </div>
          <button
            type="button"
            class="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500 transition-colors hover:bg-slate-200"
            @click="joinDialogVisible = false"
          >
            关闭
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">会议号</label>
            <el-input v-model="joinForm.meetingNumber" placeholder="请输入会议号" size="large" clearable />
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">参会名</label>
            <el-input v-model="joinForm.participantName" placeholder="请输入参会名" size="large" clearable />
          </div>

          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">会议密码</label>
            <el-input
              v-model="joinForm.meetingPassword"
              type="password"
              show-password
              placeholder="请输入会议密码（可选）"
              size="large"
              clearable
            />
          </div>

          <div class="grid grid-cols-2 gap-3 pt-2">
            <div class="rounded-2xl bg-slate-50 p-4">
              <el-switch v-model="joinForm.disableCameraOnJoin" size="large" />
              <p class="mt-3 text-sm font-medium text-slate-800">入会关闭摄像头</p>
              <p class="mt-1 text-xs text-slate-500">进入会议后默认关闭视频</p>
            </div>
            <div class="rounded-2xl bg-slate-50 p-4">
              <el-switch v-model="joinForm.muteOnJoin" size="large" />
              <p class="mt-3 text-sm font-medium text-slate-800">入会静音</p>
              <p class="mt-1 text-xs text-slate-500">进入会议后默认关闭麦克风</p>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <el-button @click="joinDialogVisible = false">取消</el-button>
          <el-button type="primary" :disabled="!canJoin" @click="handleJoinMeeting">加入会议</el-button>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="createDialogVisible"
      width="520px"
      align-center
      :show-close="false"
      class="create-meeting-dialog"
    >
      <div class="rounded-3xl bg-white p-6">
        <div class="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 class="text-2xl font-semibold text-slate-900">创建会议</h3>
            <p class="mt-2 text-sm text-slate-500">填写会议标题，并可选设置会议密码</p>
          </div>
          <button
            type="button"
            class="rounded-full bg-slate-100 px-3 py-1 text-sm text-slate-500 transition-colors hover:bg-slate-200"
            @click="createDialogVisible = false"
          >
            关闭
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="mb-2 block text-sm font-medium text-slate-700">会议标题</label>
            <el-input v-model="createForm.meetingTitle" placeholder="请输入会议标题" size="large" clearable />
          </div>

          <div class="rounded-2xl bg-slate-50 p-4" id="usePassword">
            <label class="mb-2 block text-sm font-medium text-slate-700" for="usePasswordSwitch">设置会议密码</label>
            <el-switch v-model="createForm.usePassword" id="usePasswordSwitch" size="large" />

          </div>

          <transition name="fade-slide">
            <div v-if="createForm.usePassword">
              <label class="mb-2 block text-sm font-medium text-slate-700">会议密码</label>
              <el-input
                v-model="createForm.meetingPassword"
                type="password"
                show-password
                placeholder="请输入会议密码"
                size="large"
                clearable
              />
            </div>
          </transition>
        </div>

        <div class="mt-6 flex justify-end gap-3">
          <el-button @click="createDialogVisible = false">取消</el-button>
          <el-button type="primary" :disabled="!canCreate" @click="handleCreateMeeting">创建会议</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
:deep(.join-meeting-dialog),
:deep(.create-meeting-dialog) {
  border-radius: 24px;
}

:deep(.join-meeting-dialog .el-dialog),
:deep(.create-meeting-dialog .el-dialog) {
  border-radius: 24px;
  overflow: hidden;
}

:deep(.join-meeting-dialog .el-dialog__header),
:deep(.create-meeting-dialog .el-dialog__header) {
  display: none;
}

:deep(.join-meeting-dialog .el-dialog__body),
:deep(.create-meeting-dialog .el-dialog__body) {
  padding: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
