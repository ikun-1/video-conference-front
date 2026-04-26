<script setup lang="ts">
import {
  ArrowDown,
  Avatar,
  ChatDotRound,
  Monitor,
  MoreFilled,
  PhoneFilled,
} from '@element-plus/icons-vue'

import { ElMessage, ElPopover } from 'element-plus'

type DeviceItem = {
  deviceId: string
  label: string
}

interface MeetingFooterProps {
  isMuted: boolean
  isCamOff: boolean
  isScreenSharing: boolean
  isRecording: boolean
  isHandRaised: boolean
  isHost?: boolean
  isSpeakerMuted?: boolean
  cameraDevices?: DeviceItem[]
  microphoneDevices?: DeviceItem[]
  speakerDevices?: DeviceItem[]
  selectedCameraDeviceId?: string
  selectedMicrophoneDeviceId?: string
  selectedSpeakerDeviceId?: string
}

const props = withDefaults(defineProps<MeetingFooterProps>(), {
  cameraDevices: () => [],
  microphoneDevices: () => [],
  speakerDevices: () => [],
  isSpeakerMuted: false,
})


const emit = defineEmits<{
  toggleMic: []
  toggleCam: []
  toggleSpeaker: []
  openMembers: []
  openChat: []
  toggleShare: []
  toggleRecord: []
  toggleWhiteboard: []
  raiseHand: []
  leaveMeeting: []
  selectCameraDevice: [deviceId: string]
  selectMicrophoneDevice: [deviceId: string]
  selectSpeakerDevice: [deviceId: string]
}>()

function handleToggleMic(): void {
  emit('toggleMic')
  ElMessage({ message: props.isMuted ? '已开启麦克风' : '已关闭麦克风', type: props.isMuted ? 'success' : 'warning' })
}

function handleToggleCam(): void {
  emit('toggleCam')
  ElMessage({ message: props.isCamOff ? '已开启视频' : '已停止视频', type: props.isCamOff ? 'success' : 'warning' })
}

function handleToggleSpeaker(): void {
  emit('toggleSpeaker')
  ElMessage({ message: props.isSpeakerMuted ? '已开启扬声器' : '已关闭扬声器', type: props.isSpeakerMuted ? 'success' : 'warning' })
}

async function handleSelectSpeaker(deviceId: string): Promise<void> {
  emit('selectSpeakerDevice', deviceId)
}

function handleSelectMicrophone(deviceId: string): void {
  emit('selectMicrophoneDevice', deviceId)
  ElMessage({ message: '麦克风已切换', type: 'success' })
}

</script>

<template>
  <footer
    class="relative z-30 flex h-20 items-center justify-between overflow-visible border-t border-white/10 bg-[#1a1a1a] px-8">
    <div class="flex items-center space-x-4">
      <div class="flex items-center overflow-hidden  rounded-lg">
        <button :class="[
          'footer-toggle footer-toggle--left',
          props.isMuted ? 'footer-toggle--active footer-toggle--danger' : 'footer-toggle--idle',
        ]" type="button" @click="handleToggleMic">
          <i :class="['iconfont', props.isMuted ? 'icon-maikefengguanbi' : 'icon-icon_maikefeng']"
            aria-hidden="true"></i>
          <span class="sr-only">{{ props.isMuted ? '开启麦克风' : '关闭麦克风' }}</span>
        </button>
        <el-popover trigger="click" placement="top" :width="260" teleported>
          <template #reference>
            <button aria-label="选择麦克风设备" class="footer-toggle footer-toggle--right" type="button">
              <el-icon :size="12">
                <ArrowDown />
              </el-icon>
            </button>
          </template>

          <div class="rounded-xl bg-[#202020] p-2">
            <div class="mb-2 px-2 text-xs font-semibold text-slate-300">选择麦克风</div>
            <div v-if="!microphoneDevices.length" class="px-3 py-2 text-xs text-slate-400">未检测到麦克风设备</div>
            <button v-for="device in microphoneDevices" :key="device.deviceId" class="device-option" type="button"
              @click.stop="handleSelectMicrophone(device.deviceId)">
              <span class="truncate">{{ device.label || '未知麦克风' }}</span>
              <span v-if="device.deviceId === selectedMicrophoneDeviceId" class="ml-2 text-xs text-blue-400">已选</span>
            </button>
          </div>
        </el-popover>
      </div>

      <div class="flex items-center overflow-hidden rounded-lg">
        <button :class="[
          'footer-toggle footer-toggle--left',
          props.isCamOff ? 'footer-toggle--active footer-toggle--danger' : 'footer-toggle--idle',
        ]" type="button" @click="handleToggleCam">
          <i aria-hidden="true" :class="props.isCamOff ? 'iconfont icon-kaiqishipin' : 'iconfont icon-guanbishipin1'"
            class="text-white" style="font-size: 20px; line-height: 1;" />
          <span class="sr-only">{{ props.isCamOff ? '开启视频' : '关闭视频' }}</span>
        </button>
        <el-popover trigger="click" placement="top" :width="256" teleported>
          <template #reference>
            <button aria-label="选择摄像头设备" class="footer-toggle footer-toggle--right" type="button">
              <el-icon :size="12">
                <ArrowDown />
              </el-icon>
            </button>
          </template>

          <div class="rounded-xl bg-[#202020] p-2">
            <div class="mb-2 px-2 text-xs font-semibold text-slate-300">选择摄像头</div>
            <div v-if="!cameraDevices.length" class="px-3 py-2 text-xs text-slate-400">未检测到摄像头设备</div>
            <button v-for="device in cameraDevices" :key="device.deviceId" class="device-option" type="button"
              @click.stop="emit('selectCameraDevice', device.deviceId)">
              <span class="truncate">{{ device.label || '未知摄像头' }}</span>
              <span v-if="device.deviceId === selectedCameraDeviceId" class="ml-2 text-xs text-blue-400">已选</span>
            </button>
          </div>
        </el-popover>
      </div>

      <div class="flex items-center overflow-hidden rounded-lg">
        <button :class="[
          'footer-toggle footer-toggle--left',
          props.isSpeakerMuted ? 'footer-toggle--active footer-toggle--danger' : 'footer-toggle--idle',
        ]" type="button" @click="handleToggleSpeaker">
          <i aria-hidden="true"
            :class="props.isSpeakerMuted ? 'iconfont icon-shengyin-guanbi' : 'iconfont icon-shengyindakai'"
            style="font-size: 20px; line-height: 1;" />
          <span class="sr-only">{{ props.isSpeakerMuted ? '开启扬声器' : '关闭扬声器' }}</span>
        </button>
        <el-popover trigger="click" placement="top" :width="260" teleported>
          <template #reference>
            <button aria-label="选择扬声器设备" class="footer-toggle footer-toggle--right" type="button">
              <el-icon :size="12">
                <ArrowDown />
              </el-icon>
            </button>
          </template>

          <div class="rounded-xl bg-[#202020] p-2">
            <div class="mb-2 px-2 text-xs font-semibold text-slate-300">选择扬声器</div>
            <div v-if="!speakerDevices.length" class="px-3 py-2 text-xs text-slate-400">未检测到扬声器设备</div>
            <button v-for="device in speakerDevices" :key="device.deviceId" class="device-option" type="button"
              @click.stop="handleSelectSpeaker(device.deviceId)">
              <span class="truncate">{{ device.label || '未知扬声器' }}</span>
              <span v-if="device.deviceId === selectedSpeakerDeviceId" class="ml-2 text-xs text-blue-400">已选</span>
            </button>
          </div>
        </el-popover>
      </div>

    </div>

    <div class="flex  items-center space-x-4">
      <button class="flex flex-col items-center" type="button" @click="emit('openMembers')">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white transition-all hover:bg-blue-600/30">
          <el-icon :size="24">
            <Avatar />
          </el-icon>
        </div>
        <span class="mt-1 text-xs text-slate-300">成员</span>
      </button>

      <button class="flex flex-col items-center" type="button" @click="emit('openChat')">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white transition-all hover:bg-slate-100/15">
          <el-icon :size="24">
            <ChatDotRound />
          </el-icon>
        </div>
        <span class="mt-1 text-xs text-slate-300">聊天</span>
      </button>

      <button class="flex flex-col items-center" type="button" @click="emit('toggleShare')">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl text-white transition-all"
          :class="props.isScreenSharing ? 'bg-blue-600' : 'bg-white/10 hover:bg-blue-600'">
          <el-icon :size="24">
            <Monitor />
          </el-icon>
        </div>
        <span class="mt-1 text-xs text-slate-300">共享屏幕</span>
      </button>

      <button v-if="props.isHost" class="flex flex-col items-center" type="button" @click="emit('toggleRecord')">
        <div class="flex h-12 w-12 items-center justify-center rounded-xl text-white transition-all"
          :class="props.isRecording ? 'bg-red-600/30 text-red-500' : 'bg-white/10 hover:bg-red-600'">
          <svg aria-hidden="true" class="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="12" r="4.5" />
            <path
              d="M12 2.75a9.25 9.25 0 1 0 9.25 9.25A9.26 9.26 0 0 0 12 2.75m0 1.5a7.75 7.75 0 1 1-7.75 7.75A7.76 7.76 0 0 1 12 4.25" />
          </svg>
        </div>
        <span class="mt-1 text-xs text-slate-300">录制</span>
      </button>

      <button class="flex flex-col items-center" type="button">
        <div
          class="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 text-white transition-all hover:bg-white/20">
          <el-icon :size="24">
            <MoreFilled />
          </el-icon>
        </div>
        <span class="mt-1 text-xs text-slate-300">更多</span>
      </button>
    </div>

    <div class="flex w-1/4 items-center justify-end">
      <button
        class="flex items-center rounded-lg bg-red-600 px-6 py-2.5 font-bold text-white transition-all hover:bg-red-700"
        type="button" @click="emit('leaveMeeting')">
        <el-icon class="mr-2" :size="20">
          <PhoneFilled />
        </el-icon>
        退出会议
      </button>
    </div>
  </footer>
</template>

<style scoped>
@reference "tailwindcss";

.footer-toggle {
  @apply flex h-12 items-center justify-center transition-all;
}

.footer-toggle--left {
  @apply w-12 rounded-none;
}

.footer-toggle--right {
  @apply w-8 border-l border-white/10 bg-white/5 text-white hover:bg-white/15;
}

.footer-toggle--idle {
  @apply bg-white/10 hover:bg-white/20;
}

.footer-toggle--active {
  @apply text-white;
}

.footer-toggle--danger {
  @apply bg-red-500/20 text-red-500;
}

.device-option {
  @apply flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10;
}
</style>
