<template>
  <!-- 普通小表情 (内联显示) -->
  <img
    v-if="isNormalFace"
    :src="imageUrl"
    class="w-6 h-6 inline-block align-bottom mx-0.5 select-none"
    draggable="false"
    alt="[表情]"
  />

  <!-- 图片/超级表情 (块级显示) -->
  <div
    v-else
    class="inline-block my-1 rounded-lg overflow-hidden max-w-full relative group/img align-middle"
  >
    <img
      v-show="!hasError"
      :src="imageUrl"
      class="max-w-full max-h-[360px] min-w-[50px] min-h-[50px] object-cover cursor-pointer ui-bg-background-dim/50 block"
      referrerpolicy="no-referrer"
      loading="lazy"
      @click.stop="previewImage"
      @error="hasError = true"
    />
    <!-- 加载失败提示 -->
    <div
      v-if="hasError"
      class="ui-abs-full ui-bg-background-dim/30 text-xs ui-text-foreground-sub ui-flex-y gap-1 p-2 text-center min-h-[80px] min-w-[80px]"
    >
      <div class="i-ri-image-off-line text-xl" />
      <span>图片加载失败</span>
      <a :href="imageUrl" target="_blank" class="ui-text-primary hover:underline text-[10px]" @click.stop>尝试打开</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { EmojiUtils, superList } from '@/utils/emoji'
import type { Segment } from '@/types'

const props = defineProps<{ segment: Segment }>()
const router = useRouter()
const hasError = ref(false)

// 判断是否为普通小表情 (非超级表情且类型为 face)
const isNormalFace = computed(() => {
  return props.segment.type === 'face' && !superList.includes(Number(props.segment.data.id))
})

const imageUrl = computed(() => {
  const { type, data } = props.segment

  // 处理表情类型
  if (type === 'face') {
    return EmojiUtils.getNormalUrl(Number(data.id))
  }

  // 处理图片类型
  if (!data) return ''
  if (data.url && data.url.startsWith('http')) return data.url
  if (data.file) {
    if (data.file.startsWith('base64://')) return 'data:image/png;base64,' + data.file.substring(9)
    else if (data.file.startsWith('http')) return data.file
    else if (data.file.length > 500 && !data.file.includes('/')) return 'data:image/png;base64,' + data.file
  }
  return ''
})

const previewImage = () => {
  if (imageUrl.value) router.push({ query: { ...router.currentRoute.value.query, view: imageUrl.value } })
}
</script>
