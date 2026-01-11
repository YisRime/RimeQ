<template>
  <div class="w-full my-1 max-w-xs">
    <div
      class="flex flex-col ui-bg-background-sub rounded-lg border ui-border-background-dim/50 overflow-hidden shadow-sm hover:shadow-md ui-trans cursor-pointer"
      @click.stop="openLink"
    >
      <!-- 卡片头部 -->
      <div class="ui-flex-x gap-2 px-3 py-2 border-b ui-border-background-dim/50 ui-bg-background-dim/10">
        <div
          v-if="parsed.preview && !parsed.preview.startsWith('http')"
          class="w-4 h-4 rounded-full ui-bg-primary/20 ui-flex-center text-[10px] ui-text-primary shrink-0"
        >
          <div class="i-ri-share-line" />
        </div>
        <img
          v-else-if="parsed.preview"
          :src="parsed.preview"
          class="w-4 h-4 rounded-full object-cover shrink-0"
        />
        <span class="text-xs font-bold truncate flex-1 ui-text-foreground-main">{{ parsed.title }}</span>
      </div>
      <!-- 卡片内容 -->
      <div class="p-3 flex gap-3">
        <div class="ui-flex-truncate flex flex-col gap-1">
          <span class="text-xs line-clamp-3 ui-text-foreground-sub leading-relaxed">{{ parsed.desc || parsed.text }}</span>
        </div>
        <img
          v-if="parsed.preview && parsed.preview.startsWith('http')"
          :src="parsed.preview"
          class="w-16 h-16 rounded object-cover ui-bg-background-dim/30 shrink-0"
        />
      </div>
      <!-- 来源脚注 -->
      <div v-if="parsed.source" class="ui-flex-x gap-1 px-3 py-1 ui-bg-background-dim/10 text-[10px] ui-text-foreground-dim">
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

// 解析卡片数据
const parsed = computed(() => {
  const { type, data } = props.segment
  const rawData = data.data || ''

  // JSON 卡片解析
  if (type === 'json') {
    try {
      const json = JSON.parse(rawData)
      // 特殊处理群公告
      if (json.desc === '群公告') return { title: '群公告', desc: json.prompt || json.desc, preview: '', url: '' }

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

  // XML 卡片解析
  if (type === 'xml') {
    const titleMatch = rawData.match(/title="([^"]*)"/) || rawData.match(/<title>([^<]*)<\/title>/)
    const summaryMatch = rawData.match(/summary="([^"]*)"/) || rawData.match(/<summary>([^<]*)<\/summary>/)
    const sourceMatch = rawData.match(/source name="([^"]*)"/)
    return {
      title: titleMatch ? titleMatch[1] : 'XML 卡片',
      desc: summaryMatch ? summaryMatch[1] : '',
      source: sourceMatch ? sourceMatch[1] : '',
      url: ''
    }
  }

  return { title: '未知卡片', text: '[卡片]' }
})

const openLink = () => parsed.value.url && window.open(parsed.value.url, '_blank')
</script>
