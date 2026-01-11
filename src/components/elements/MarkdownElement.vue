<template>
  <div
    class="w-full markdown-body text-sm"
    v-html="renderedMarkdown"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
})

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if ('target' in node) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

const renderedMarkdown = computed(() => {
  const content = (props.segment.data as any).content || ''
  const rawHtml = md.render(content)
  return DOMPurify.sanitize(rawHtml)
})
</script>
