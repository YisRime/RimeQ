<template>
  <div class="relative w-full group select-none min-h-32 min-w-32 flex flex-col overflow-hidden rounded-lg">
    <Image
      v-if="!imageFailed && currentUrl"
      :src="currentUrl"
      preview
      image-class="block w-full h-auto max-w-64 max-h-64 object-cover cursor-zoom-in hover:opacity-95 transition-opacity"
      class="size-full ui-flex-center"
      referrerpolicy="no-referrer"
      loading="lazy"
      @error="onError"
    />
    <div v-else-if="imageFailed" class="ui-flex-y size-full opacity-50 gap-1 p-4">
      <div class="i-ri-image-line text-4xl" />
      <span class="text-xs">图片加载失败</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onUnmounted } from 'vue'
import { Image } from 'primevue'
import { refreshUrl } from '@/utils/rkey'
import { resolveMediaUrl } from '@/stores/database'
import { type ImageSegment, type MFaceSegment } from '@/types'

// 定义组件属性
const props = defineProps<{
  segment: ImageSegment | MFaceSegment
  groupId?: number
}>()
const retried = ref(false)
const imageFailed = ref(false)

// 计算图片链接
const initialUrl = computed(() => {
  const d = props.segment.data
  if ('url' in d && d.url) return d.url
  if ('file' in d) {
    if (d.file.startsWith('http')) return d.file
    if (d.file.startsWith('base64://')) return `data:image/png;base64,${d.file.slice(9)}`
    return d.file
  }
  return ''
})

// 绑定响应式 URL
const currentUrl = ref('')
let objectUrl = ''

// 加载失败处理
const onError = async () => {
  if (retried.value) {
    imageFailed.value = true
    return
  }
  const url = currentUrl.value
  if (url.includes('multimedia.nt.qq.com.cn')) {
    retried.value = true
    const type = props.groupId ? 'group' : 'private'
    const newUrl = await refreshUrl(url, type, true)
    if (newUrl !== currentUrl.value) {
      currentUrl.value = newUrl
      return
    }
  }
  imageFailed.value = true
}

// 监听初始 URL 变化
watch(initialUrl, async (raw) => {
  imageFailed.value = false
  retried.value = false
  if (objectUrl) { URL.revokeObjectURL(objectUrl); objectUrl = '' }
  if (raw.startsWith('media://')) {
    objectUrl = await resolveMediaUrl(raw)
    currentUrl.value = objectUrl
    if (!objectUrl) imageFailed.value = true
  } else {
    currentUrl.value = raw
  }
}, { immediate: true })

onUnmounted(() => { if (objectUrl) URL.revokeObjectURL(objectUrl) })
</script>
