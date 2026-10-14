<template>
  <div class="ui-flex-x gap-2 p-1 w-40 max-w-sm ui-trans select-none">
    <!-- 播放图标 -->
    <div
      class="size-8 ui-flex-center shrink-0 ui-ia text-primary"
      @click="togglePlay"
    >
      <div v-if="isLoading" class="i-ri-loader-4-line animate-spin text-lg" />
      <div v-else-if="audioFailed" class="i-ri-error-warning-line text-lg" />
      <div v-else class="text-lg" :class="isPlaying ? 'i-ri-pause-fill' : 'i-ri-play-fill'" />
    </div>
    <!-- 进度条 -->
    <div
      ref="progressTrackRef"
      class="flex-1 min-w-0 h-1 bg-background-sub/50 rounded-full overflow-hidden cursor-pointer"
      @mousedown="ScrubStart"
    >
      <div
        class="h-full bg-primary/50 pointer-events-none"
        :style="{ width: progress + '%' }"
      />
    </div>
    <!-- 时长 -->
    <span class="text-xs font-mono opacity-60 w-10 text-center">
      {{ audioFailed ? '--:--' : formattedDuration }}
    </span>
    <!-- Audio 元素 -->
    <audio
      ref="audioRef"
      :src="audioSrc"
      preload="metadata"
      class="hidden"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="onEnded"
      @error="onError"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { bot } from '@/api'
import type { RecordSegment } from '@/types'

// 属性定义
const props = defineProps<{ segment: RecordSegment }>()
const audioRef = ref<HTMLAudioElement>()
const progressTrackRef = ref<HTMLElement>()

const audioSrc = ref('')
const isLoading = ref(false)
const isPlaying = ref(false)
const audioFailed = ref(false)
const duration = ref(0)
const progress = ref(0)

// 计算属性
const formattedDuration = computed(() => {
  const d = duration.value
  if (!d || !isFinite(d)) return '0:00'
  const minutes = Math.floor(d / 60)
  const seconds = Math.floor(d % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
})

// 状态切换
const togglePlay = async () => {
  if (audioFailed.value || isLoading.value) return
  const audio = audioRef.value
  if (!audio) return
  // 切换状态
  if (audioSrc.value) {
    if (audio.paused) audio.play()
    else audio.pause()
    return
  }
  // 加载播放
  isLoading.value = true
  try {
    const res = await bot.getRecord(props.segment.data.file, 'mp3')
    audioSrc.value = res.url || `data:audio/mp3;base64,${res.base64}`
    await nextTick()
    await audioRef.value?.play()
  } catch (e) {
    console.error('[Record] 获取音频失败:', e)
    audioFailed.value = true
  } finally {
    isLoading.value = false
  }
}

// 加载数据
const onLoadedMetadata = () => {
  if (audioRef.value) duration.value = audioRef.value.duration
}

// 更新时间
const onTimeUpdate = () => {
  if (document.onmousemove || !audioRef.value || !duration.value) return
  progress.value = (audioRef.value.currentTime / duration.value) * 100
}

// 播放结束
const onEnded = () => {
  if (audioRef.value) audioRef.value.currentTime = 0
  progress.value = 0
}

// 播放错误
const onError = () => { if (audioSrc.value) audioFailed.value = true }

// 进度条拖动
const Scrub = (event: MouseEvent) => {
  if (!audioRef.value || !progressTrackRef.value || !duration.value) return
  const trackRect = progressTrackRef.value.getBoundingClientRect()
  const percentage = Math.max(0, Math.min(1, (event.clientX - trackRect.left) / trackRect.width))
  audioRef.value.currentTime = duration.value * percentage
  progress.value = percentage * 100
}

// 拖动开始
const ScrubStart = (event: MouseEvent) => {
  if (!audioSrc.value) {
    togglePlay()
    return
  }
  Scrub(event)
  document.onmousemove = Scrub
  document.onmouseup = () => {
    document.onmousemove = null
    document.onmouseup = null
  }
}

// 文件监听
watch(() => props.segment.data.file, () => {
  audioSrc.value = ''
  audioFailed.value = false
  isPlaying.value = false
  isLoading.value = false
  duration.value = 0
  progress.value = 0
}, { immediate: true })

// 清理监听
onUnmounted(() => {
  document.onmousemove = null
  document.onmouseup = null
  const audio = audioRef.value
  if (audio) {
    audio.pause()
    audio.removeAttribute('src')
    audio.load()
  }
  audioSrc.value = ''
})
</script>
