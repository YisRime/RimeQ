<template>
  <div
    class="ui-flex-x gap-2 px-2 py-1 my-1 rounded-full ui-bg-background-dim/20 ui-ia hover:ui-bg-background-dim/40 w-fit"
    title="播放语音"
  >
    <div class="i-ri-voiceprint-line text-lg ui-text-primary" />
    <span class="text-xs ui-text-foreground-main">语音消息</span>
  </div>
</template>

<script setup lang="ts">
import type { Segment } from '@/types'
defineProps<{ segment: Segment }>()
</script>
