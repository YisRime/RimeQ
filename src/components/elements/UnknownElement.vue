<template>
  <span class="text-xs opacity-50 bg-red-500/10 text-red-500 px-1 rounded">
    [{{ displayText }}]
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()

const mappings: Record<string, string> = {
  poke: '戳一戳',
  dice: '骰子',
  rps: '猜拳'
}

const displayText = computed(() => {
  return mappings[props.segment.type] || `未知: ${props.segment.type}`
})
</script>
