<template>
  <div class="w-full ui-flex-x gap-3 p-3 ui-bg-background-sub rounded-xl border ui-border-background-dim/50 my-1 ui-ia hover:ui-bg-background-dim/20 shadow-sm">
    <!-- 文件图标 -->
    <div class="w-10 h-10 ui-bg-primary/10 ui-text-primary rounded-lg ui-flex-center text-xl shrink-0">
      <div class="i-ri-file-line" />
    </div>
    <!-- 文件信息 -->
    <div class="ui-flex-truncate flex flex-col">
      <span class="text-sm font-bold truncate ui-text-foreground-main">{{ fileName }}</span>
      <span class="text-[10px] ui-text-foreground-sub opacity-60">{{ fileSizeStr }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatFileSize } from '@/utils/format'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()
const fileName = computed(() => props.segment.data.name || props.segment.data.file || '未知文件')
const fileSizeStr = computed(() => formatFileSize(Number(props.segment.data.size || 0)))
</script>
