<template>
  <div class="w-full my-1 max-w-xs">
    <div
      class="flex flex-col bg-white/90 dark:bg-[#333] rounded-lg border border-black/5 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
      @click.stop="openLink"
    >
      <!-- 标题区 -->
      <div class="px-3 py-2 border-b border-black/5 flex items-center gap-2 bg-gray-50/50 dark:bg-white/5">
        <div v-if="parsed.preview && !parsed.preview.startsWith('http')" class="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[10px] text-primary shrink-0">
          <div class="i-ri-share-line" />
        </div>
        <img v-else-if="parsed.preview" :src="parsed.preview" class="w-4 h-4 rounded-full object-cover shrink-0" />
        <span class="text-xs font-bold truncate flex-1">{{ parsed.title }}</span>
      </div>
      <!-- 内容区 -->
      <div class="p-3 flex gap-3">
        <div class="flex-1 min-w-0 flex flex-col gap-1">
          <span class="text-xs line-clamp-3 text-foreground-sub leading-relaxed">{{ parsed.desc || parsed.text }}</span>
        </div>
        <img v-if="parsed.preview && parsed.preview.startsWith('http')" :src="parsed.preview" class="w-16 h-16 rounded object-cover bg-black/5 shrink-0" />
      </div>
      <!-- 底部来源 -->
      <div v-if="parsed.source" class="px-3 py-1 bg-black/5 dark:bg-white/5 text-[10px] text-foreground-dim flex items-center gap-1">
        <div class="i-ri-link-m" />
        <span>{{ parsed.source }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()

// 原 parser.ts 中的解析逻辑
const parsed = computed(() => {
  const { type, data } = props.segment
  const rawData = data.data || ''

  // JSON
  if (type === 'json') {
    try {
      const json = JSON.parse(rawData)
      if (json.desc === '群公告') {
        return { title: '群公告', desc: json.prompt || json.desc, preview: '', url: '' }
      }
      const metaKeys = Object.keys(json.meta || {})
      if (metaKeys.length > 0) {
        const body = json.meta[metaKeys[0]]
        if (body) {
          return {
            title: body.title || body.tag || json.prompt || json.app || '卡片消息',
            desc: body.desc,
            preview: body.preview || body.cover || body.icon,
            url: body.jumpUrl || body.qqdocurl || body.url
          }
        }
      }
      return { title: json.prompt || '卡片消息', text: '[JSON卡片]' }
    } catch {
      return { title: 'JSON解析失败', text: rawData }
    }
  }

  // XML
  if (type === 'xml') {
    const titleMatch = rawData.match(/title="([^"]*)"/) || rawData.match(/<title>([^<]*)<\/title>/)
    const summaryMatch = rawData.match(/summary="([^"]*)"/) || rawData.match(/<summary>([^<]*)<\/summary>/)
    const sourceMatch = rawData.match(/source name="([^"]*)"/)

    return {
      title: titleMatch ? titleMatch[1] : 'XML 卡片',
      desc: summaryMatch ? summaryMatch[1] : '',
      source: sourceMatch ? sourceMatch[1] : '',
      url: '' // 简化处理，实际可能需要解析 url 字段
    }
  }

  return { title: '未知卡片', text: '[卡片]' }
})

const openLink = () => {
  if (parsed.value.url) window.open(parsed.value.url, '_blank')
}
</script>
