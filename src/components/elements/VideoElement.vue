<template>
  <div class="relative w-full ui-flex-center overflow-hidden rounded-lg min-h-32 min-w-32 group">
    <video
      v-if="!videoFailed && currentUrl"
      :key="currentUrl"
      :src="currentUrl"
      :poster="posterUrl"
      controls
      preload="metadata"
      class="block w-full max-h-64 object-contain"
      referrerpolicy="no-referrer"
      @error="onError"
    />
    <div v-else class="ui-flex-y size-full opacity-50 gap-1 p-4">
      <div class="i-ri-vidicon-line text-4xl" />
      <span class="text-xs">视频加载失败</span>
    </div>
    <div v-if="!videoFailed" class="absolute inset-0 ui-flex-center pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
      <div class="i-ri-play-circle-line text-4xl" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { refreshUrl } from '@/utils/rkey'
import { resolveMediaUrl } from '@/stores/database'
import { type VideoSegment } from '@/types'

// 定义组件属性
const props = defineProps<{
  segment: VideoSegment
  groupId?: number
}>()
const retried = ref(false)
const videoFailed = ref(false)

// 计算视频链接
const initialUrl = computed(() => {
  const d = props.segment.data
  if (d.url) return d.url
  if (d.file) return d.file
  return ''
})

// 计算封面图原始值
const posterRaw = computed(() => props.segment.data.thumb || '')

// 绑定响应式 URL
const currentUrl = ref('')
const posterUrl = ref('')
let videoBlobUrl = ''
let posterBlobUrl = ''

// 解析媒体地址（media:// 从本地加载为 Blob URL，base64:// 解码为 data URL）
const resolveSource = async (raw: string, decodeBase64: string): Promise<{ url: string; blob: string }> => {
  if (raw.startsWith('media://')) {
    const blob = await resolveMediaUrl(raw)
    return { url: blob, blob }
  }
  if (decodeBase64 && raw.startsWith('base64://')) return { url: `data:${decodeBase64};base64,${raw.slice(9)}`, blob: '' }
  return { url: raw, blob: '' }
}

// 加载失败处理
const onError = async () => {
  if (retried.value) {
    videoFailed.value = true
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
  videoFailed.value = true
}

// 监听初始 URL 变化
watch(initialUrl, async (raw) => {
  videoFailed.value = false
  retried.value = false
  if (videoBlobUrl) { URL.revokeObjectURL(videoBlobUrl); videoBlobUrl = '' }
  const { url, blob } = await resolveSource(raw, 'video/mp4')
  videoBlobUrl = blob
  currentUrl.value = url
  if (raw && !url) videoFailed.value = true
}, { immediate: true })

// 监听封面变化
watch(posterRaw, async (raw) => {
  if (posterBlobUrl) { URL.revokeObjectURL(posterBlobUrl); posterBlobUrl = '' }
  const { url, blob } = await resolveSource(raw, 'image/jpeg')
  posterBlobUrl = blob
  posterUrl.value = url
}, { immediate: true })

onUnmounted(() => {
  if (videoBlobUrl) URL.revokeObjectURL(videoBlobUrl)
  if (posterBlobUrl) URL.revokeObjectURL(posterBlobUrl)
})
</script>
