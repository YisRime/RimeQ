<template>
  <div class="w-full flex items-center gap-3 p-3 bg-background-sub rounded-xl border border-background-dim/50 my-1 cursor-pointer hover:bg-background-dim/20 transition-colors shadow-sm">
    <div class="w-10 h-10 bg-primary/10 text-primary rounded-lg flex items-center justify-center text-xl shrink-0">
      <div class="i-ri-file-line" />
    </div>
    <div class="flex-1 min-w-0 flex flex-col">
      <span class="text-sm font-bold truncate text-foreground-main">{{ fileName }}</span>
      <span class="text-[10px] text-foreground-sub opacity-60">{{ fileSizeStr }}</span>
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
