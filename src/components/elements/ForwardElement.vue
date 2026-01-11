<template>
  <div class="w-full my-1 max-w-xs">
    <div class="flex flex-col bg-white/90 dark:bg-[#333] rounded-lg border border-black/5 dark:border-white/5 overflow-hidden shadow-sm cursor-pointer hover:bg-white dark:hover:bg-[#3a3a3a] transition-colors">
      <div class="px-3 py-2 border-b border-black/5 font-bold text-sm truncate bg-gray-50/50 dark:bg-white/5">
        {{ title }}
      </div>
      <div class="p-3 flex flex-col gap-1 text-xs text-foreground-sub">
        <div v-for="(node, i) in previewNodes" :key="i" class="truncate opacity-80">
          <span>{{ node.sender }}: </span>
          <span>{{ node.text }}</span>
        </div>
        <div v-if="!previewNodes.length" class="italic opacity-50">查看转发消息</div>
      </div>
      <div class="px-3 py-1 bg-black/5 dark:bg-white/5 text-[10px] text-foreground-dim border-t border-black/5">
        查看聊天记录
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getTextPreview } from '@/utils/format'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()

const title = computed(() => (props.segment.data as any).summary || '聊天记录')

const previewNodes = computed(() => {
  const content = (props.segment.data as any).content
  if (!content || !Array.isArray(content)) return []

  return content.slice(0, 4).map((node: any) => {
    if (node.type === 'node') {
      const sender = node.data.nickname || node.data.user_id || '未知'
      let text = ''
      if (Array.isArray(node.data.content)) {
        text = getTextPreview(node.data.content)
      } else if (typeof node.data.content === 'string') {
        text = node.data.content
      }
      return { sender: String(sender), text }
    }
    return { sender: '未知', text: '[未知节点]' }
  })
})
</script>
