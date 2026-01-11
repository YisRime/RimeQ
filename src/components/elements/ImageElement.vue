<template>
  <div class="block my-1 rounded-lg overflow-hidden max-w-full relative group/img">
    <img
      v-show="!hasError"
      :src="imageUrl"
      class="max-w-full max-h-[360px] min-w-[50px] min-h-[50px] object-cover cursor-pointer bg-background-dim/50 block"
      referrerpolicy="no-referrer"
      loading="lazy"
      @click.stop="previewImage"
      @error="hasError = true"
    />
    <!-- 加载失败占位 -->
    <div
      v-if="hasError"
      class="flex absolute inset-0 bg-gray-200 dark:bg-gray-800 text-xs text-gray-500 items-center justify-center flex-col gap-1 p-2 text-center min-h-[80px] min-w-[80px]"
    >
      <div class="i-ri-image-off-line text-xl" />
      <span>图片加载失败</span>
      <a :href="imageUrl" target="_blank" class="text-primary hover:underline text-[10px]" @click.stop>尝试打开</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()
const router = useRouter()
const hasError = ref(false)

// 原 parser.ts 中的 resolveImageUrl 逻辑
const imageUrl = computed(() => {
  const data = props.segment.data
  if (!data) return ''
  if (data.url && data.url.startsWith('http')) return data.url
  if (data.file) {
    if (data.file.startsWith('base64://')) {
      return 'data:image/png;base64,' + data.file.substring(9)
    } else if (data.file.startsWith('http')) {
      return data.file
    } else if (data.file.length > 500 && !data.file.includes('/')) {
      return 'data:image/png;base64,' + data.file
    }
  }
  return ''
})

const previewImage = () => {
  if (imageUrl.value) {
    router.push({ query: { ...router.currentRoute.value.query, view: imageUrl.value } })
  }
}
</script>
