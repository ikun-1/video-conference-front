<script setup lang="ts">
import SideBar from '@/component/home/SideBar.vue'
import { RouterView } from 'vue-router'
</script>

<template>
  <main class="h-screen w-screen overflow-hidden bg-white">
    <div class="flex h-full w-full">
      <section class="flex h-full w-24 border-r border-slate-100">
        <SideBar />
      </section>
      <section class="flex h-full w-full overflow-hidden">
        <RouterView />
      </section>
    </div>
  </main>
</template>
