<template>
  <div class="block my-1 rounded-lg overflow-hidden max-w-full relative w-full">
    <video
      :src="videoUrl"
      controls
      class="max-w-full max-h-[320px] bg-black rounded-lg block"
      referrerpolicy="no-referrer"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()

const videoUrl = computed(() => {
  const data = props.segment.data
  if (!data) return ''
  if (data.url && data.url.startsWith('http')) return data.url
  if (data.file && data.file.startsWith('http')) return data.file
  return ''
})
</script>
