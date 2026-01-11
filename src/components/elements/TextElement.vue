<template>
  <div class="whitespace-pre-wrap align-middle break-words" v-html="renderedText" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()
const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

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
    result += `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">${escapeHtml(url)}</a>`
    lastIndex = index + url.length
  }

  result += escapeHtml(content.substring(lastIndex))
  return result
})
</script>
