<template>
  <span
    class="text-primary font-bold select-none cursor-pointer hover:underline mx-0.5 px-1 rounded bg-primary/10 align-middle text-sm py-0.5"
    @click.stop
  >
    @{{ displayName }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useContactStore } from '@/stores'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()
const contactStore = useContactStore()

const displayName = computed(() => {
  const { qq, name } = props.segment.data
  if (name) return name
  if (qq === 'all') return '全体成员'
  return contactStore.getUserName(qq || '')
})
</script>
