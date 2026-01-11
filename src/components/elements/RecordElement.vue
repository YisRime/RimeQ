<template>
  <div
    class="flex items-center gap-2 px-2 py-1 my-1 rounded-full bg-background-dim/20 cursor-pointer hover:bg-background-dim/40 transition-colors w-fit select-none"
    title="播放语音"
  >
    <div class="i-ri-voiceprint-line text-lg text-primary" />
    <span class="text-xs text-foreground-main">语音消息</span>
  </div>
</template>

<script setup lang="ts">
import type { Segment } from '@/types'
defineProps<{ segment: Segment }>()
</script>
