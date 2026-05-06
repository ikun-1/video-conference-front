<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import MeetingHistory from '@/component/home/meeting/MeetingHistory.vue';
import MeetingAction from '@/component/home/meeting/MeetingAction.vue';

const containerRef = ref<HTMLElement | null>(null)
const leftPanelWidth = ref(0)
const isResizing = ref(false)
const isMobile = ref(false)

const leftPanelStyle = computed(() => {
  if (isMobile.value) {
    return { width: '100%' }
  }
  return { width: leftPanelWidth.value ? `${leftPanelWidth.value}px` : '33%' }
})

function updateViewportState() {
  isMobile.value = window.innerWidth < 768
}

function setDefaultPanelWidth() {
  const container = containerRef.value
  if (!container) return

  const minLeftWidth = 280
  const minRightWidth = 420
  const maxLeftWidth = Math.max(minLeftWidth, container.clientWidth - minRightWidth)
  const defaultWidth = Math.floor(container.clientWidth * 0.33)
  leftPanelWidth.value = Math.max(minLeftWidth, Math.min(maxLeftWidth, defaultWidth))
}

function initPanelWidth() {
  if (leftPanelWidth.value > 0) return
  setDefaultPanelWidth()
}

function startResize(e: MouseEvent) {
  if (isMobile.value) return
  e.preventDefault()
  const container = containerRef.value
  if (!container) return

  const containerRect = container.getBoundingClientRect()
  isResizing.value = true

  function onMouseMove(event: MouseEvent) {
    const nextWidth = event.clientX - containerRect.left
    const minLeftWidth = 280
    const minRightWidth = 420
    const maxLeftWidth = Math.max(minLeftWidth, containerRect.width - minRightWidth)

    leftPanelWidth.value = Math.max(minLeftWidth, Math.min(maxLeftWidth, nextWidth))
  }

  function onMouseUp() {
    isResizing.value = false
    window.removeEventListener('mousemove', onMouseMove)
    window.removeEventListener('mouseup', onMouseUp)
  }

  window.addEventListener('mousemove', onMouseMove)
  window.addEventListener('mouseup', onMouseUp)
}

function handleWindowResize() {
  updateViewportState()

  const container = containerRef.value
  if (!container || leftPanelWidth.value === 0 || isMobile.value) return
  const minLeftWidth = 280
  const minRightWidth = 420
  const maxLeftWidth = Math.max(minLeftWidth, container.clientWidth - minRightWidth)
  leftPanelWidth.value = Math.max(minLeftWidth, Math.min(maxLeftWidth, leftPanelWidth.value))
}

function resetPanelWidth() {
  setDefaultPanelWidth()
}

onMounted(() => {
  updateViewportState()
  initPanelWidth()
  window.addEventListener('resize', handleWindowResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', handleWindowResize)
})
</script>

<template>
  <div
    ref="containerRef"
    class="mt-4 sm:mt-16 flex h-full w-full flex-col gap-4 md:mt-24 md:flex-row md:gap-0 px-2 sm:px-0"
    :class="{ 'select-none': isResizing }"
  >
    <div class="min-w-0 shrink-0 md:pr-3 w-full" :style="leftPanelStyle">
      <MeetingAction @openJoin="$emit('openJoin')" />
    </div>

    <div
      v-show="!isMobile"
      class="mt-1 w-1.5 cursor-col-resize rounded bg-slate-200 transition-colors hover:bg-blue-400 active:bg-blue-500"
      @mousedown="startResize"
      @dblclick="resetPanelWidth"
    />

    <div class="min-w-0 flex-1 overflow-y-auto md:pl-3">
      <MeetingHistory />
    </div>
  </div>
</template>
