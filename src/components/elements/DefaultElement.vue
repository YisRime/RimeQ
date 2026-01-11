<template>
  <div class="w-full my-1 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden group/code text-left">
    <div class="px-2 py-1 bg-gray-100 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 text-[10px] text-foreground-dim flex justify-between">
      <span class="font-mono">{{ segment.type }}</span>
      <span class="opacity-0 group-hover/code:opacity-100 transition-opacity cursor-pointer hover:text-primary" @click="copy">复制</span>
    </div>
    <div class="p-2 overflow-x-auto ui-scrollbar">
      <pre class="text-[10px] font-mono leading-normal whitespace-pre-wrap break-all text-foreground-sub select-text">{{ jsonContent }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()
const toast = useToast()

const jsonContent = computed(() => JSON.stringify(props.segment.data, null, 2))

const copy = () => {
  navigator.clipboard.writeText(JSON.stringify(props.segment, null, 2))
  toast.add({ severity: 'info', summary: '已复制 JSON', life: 2000 })
}
</script>
