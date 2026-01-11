<template>
  <div class="w-full markdown-body text-sm ui-text-foreground-main" v-html="renderedMarkdown" />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'
import type { Segment } from '@/types'

// 将实例提升到模块作用域，避免重复创建
const md = new MarkdownIt({ html: false, breaks: true, linkify: true })

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if ('target' in node) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

const props = defineProps<{ segment: Segment }>()

const renderedMarkdown = computed(() => {
  const content = (props.segment.data as any).content || ''
  const rawHtml = md.render(content)
  return DOMPurify.sanitize(rawHtml)
})
</script>
