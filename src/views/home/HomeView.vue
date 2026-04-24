<script setup lang="ts">
import MeetingHistory from '@/component/home/meeting/MeetingHistory.vue';
import MeetingAction from '@/component/home/meeting/MeetingAction.vue';
</script>

<template>
  <div class="flex gap-6 w-full h-full mt-24">
    <div class="w-1/3">
      <MeetingAction @openJoin="$emit('openJoin')" />
    </div>
    <div class="w-2/3 h-full overflow-y-auto">
      <MeetingHistory />
    </div>
  </div>
</template>
