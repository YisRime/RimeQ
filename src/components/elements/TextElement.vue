<template>
  <!-- At 元素 -->
  <span
    v-if="segment.type === 'at'"
    class="ui-text-primary cursor-pointer hover:underline align-baseline"
    @click.stop="handleMention"
  >@{{ atName }}</span>
  <!-- 普通文本 -->
  <span
    v-else
    class="whitespace-pre-wrap break-words align-baseline"
    v-html="renderedText"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useContactStore } from '@/stores'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment; groupId?: number }>()
const emit = defineEmits<{ (e: 'mention', item: { id: string; name: string }): void }>()
const contactStore = useContactStore()

// URL 正则表达式
const urlRegex = /((?:https?:\/\/|www\.|(?:\d{1,3}\.){3}\d{1,3}|[\w-]+\.[a-z]{2,10})(?:[^\s<]*[^<.,:;"')\]\s])?)/gi

// At 逻辑
const atName = computed(() => {
  const { qq, name } = props.segment.data
  if (name) return name
  if (qq === 'all') return '全体成员'
  return contactStore.getUserName(qq || '', props.groupId)
})

// 点击事件
const handleMention = () => {
  const id = String(props.segment.data.qq || '')
  if (id && id !== 'all') emit('mention', { id, name: atName.value })
}

// 文本转义
function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// 文本渲染
const renderedText = computed(() => {
  const content = props.segment.data.text || ''
  const matches = [...content.matchAll(urlRegex)]
  if (matches.length === 0) return escapeHtml(content)
  let result = ''
  let lastIndex = 0
  for (const match of matches) {
    const url = match[0]
    const index = match.index!
    result += escapeHtml(content.substring(lastIndex, index))
    let href = url
    if (!href.match(/^https?:\/\//i)) href = 'http://' + href
    result += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" class="ui-text-primary hover:underline break-all">${escapeHtml(url)}</a>`
    lastIndex = index + url.length
  }
  result += escapeHtml(content.substring(lastIndex))
  return result
})
</script>
