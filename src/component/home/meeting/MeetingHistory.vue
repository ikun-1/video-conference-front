<script setup lang="ts">
import { ArrowRight } from '@element-plus/icons-vue'

</script>

<template>
  <div class="px-16">
    <div class="text-5xl font-semibold tracking-tight text-slate-800">4月16日</div>
    <div class="mt-3 text-sm text-slate-700">周四 农历二月廿九</div>

    <div class="mt-6 flex items-center">
      <div class="h-px flex-1 bg-slate-100" />
      <button
        class="ml-6 rounded-full border border-slate-100 bg-white px-3 py-1.5 text-xs text-slate-500 transition hover:bg-slate-50">
        全部会议
        <el-icon class="ml-1 align-middle">
          <ArrowRight />
        </el-icon>
      </button>
    </div>

    <div class="mt-8 space-y-8">
      <div>
        <div class="text-xs text-slate-400">今天 4月16日</div>
        <div class="mt-4 flex items-start justify-between">
          <div class="min-w-0">
            <div class="text-base font-semibold text-slate-900">安祖义的快速会议</div>
            <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>11:25-12:25</span>
              <span class="text-slate-300">·</span>
              <span>803 767 255</span>
              <span class="text-slate-300">·</span>
              <span class="text-blue-600">进行中</span>
            </div>
          </div>
          <el-button type="primary" class="ml-8 mt-1.5">入会</el-button>
        </div>
      </div>

      <div>
        <div class="text-xs text-slate-400">明天 4月17日</div>
        <div class="mt-4">
          <div class="text-base font-semibold text-slate-900">5步快速上手会议</div>
          <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>11:30-12:30</span>
            <span class="text-slate-300">·</span>
            <span>717 3407 7412</span>
            <span class="text-slate-300">·</span>
            <span>体验</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
