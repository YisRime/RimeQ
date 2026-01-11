<template>
  <div class="w-full my-1 rounded-lg ui-bg-background-sub border ui-border-background-dim overflow-hidden group/code text-left">
    <!-- 头部信息 -->
    <div class="ui-flex-between px-2 py-1 ui-bg-background-dim/50 border-b ui-border-background-dim text-[10px] ui-text-foreground-dim">
      <span class="font-mono">{{ segment.type }}</span>
      <span
        class="opacity-0 group-hover/code:opacity-100 ui-trans cursor-pointer hover:ui-text-primary"
        @click="copy"
      >
        复制
      </span>
    </div>
    <!-- JSON 内容 -->
    <div class="p-2 overflow-x-auto ui-scrollbar">
      <pre class="text-[10px] font-mono leading-normal whitespace-pre-wrap break-all ui-text-foreground-sub select-text">{{ jsonContent }}</pre>
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
