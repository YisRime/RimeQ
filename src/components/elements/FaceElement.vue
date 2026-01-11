<template>
  <span class="inline-block align-middle mx-0.5" :title="`表情 ${faceId}`">
    <img
      v-if="faceUrl"
      :src="faceUrl"
      class="w-6 h-6 inline-block align-bottom"
    />
    <span v-else class="text-xs bg-black/10 px-1 rounded">[表情:{{ faceId }}]</span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { EmojiUtils } from '@/utils/emoji'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()
const faceId = computed(() => Number(props.segment.data.id))
const faceUrl = computed(() => EmojiUtils.getNormalUrl(faceId.value))
</script>
