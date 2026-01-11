<template>
  <div
    class="whitespace-pre-wrap align-middle break-words"
    v-html="renderedText"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()

const renderedText = computed(() => {
  const content = props.segment.data.text || ''
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g
  const matches = [...content.matchAll(urlRegex)]

  if (matches.length === 0) {
    return escapeHtml(content)
  }

  let result = ''
  let lastIndex = 0

  for (const match of matches) {
    const url = match[0]
    const index = match.index!
    const textBefore = content.substring(lastIndex, index)
    result += escapeHtml(textBefore)

    const escapedUrl = escapeHtml(url)
    result += `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline break-all">${escapedUrl}</a>`
    lastIndex = index + url.length
  }

  result += escapeHtml(content.substring(lastIndex))
  return result
})

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}
</script>
