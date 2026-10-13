<template>
  <div
    ref="container"
    class="relative size-32 mx-auto pointer-events-none select-none my-1"
    :title="meta.name"
  />
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import lottie, { type AnimationItem } from 'lottie-web'
import { QFace } from '@/utils/qface'
import type { Segment, FaceSegment, DiceSegment, RpsSegment } from '@/types'

// 共享动画数据缓存
const animationDataCache = new Map<string, unknown>()
async function fetchAnimationData(url: string): Promise<unknown> {
  const cached = animationDataCache.get(url)
  if (cached) return cached
  const data = await fetch(url).then(r => r.json())
  animationDataCache.set(url, data)
  if (animationDataCache.size > 64) {
    const oldest = animationDataCache.keys().next().value
    if (oldest !== undefined) animationDataCache.delete(oldest)
  }
  return data
}

const props = defineProps<{ segment: Segment }>()
const container = ref<HTMLElement>()
let anim: AnimationItem | null = null
let observer: IntersectionObserver | null = null

// 计算元数据
const meta = computed(() => {
  const { type, data } = props.segment
  switch (type) {
    case 'dice': {
      const res = (data as DiceSegment['data']).result
      return { name: `[骰子:${res}]`, url: QFace.resolveAsset('358', res) }
    }
    case 'rps': {
      const rpsMap: Record<string, string> = { '1': '布', '2': '剪刀', '3': '石头' }
      const res = (data as RpsSegment['data']).result
      return { name: `[猜拳|${rpsMap[String(res)]}]`, url: QFace.resolveAsset('359', res) }
    }
    case 'face': {
      const id = (data as FaceSegment['data']).id
      const face = QFace.get(id)
      return { name: face ? `[${face.name}]` : '[表情]', url: face?.assets?.lottie || '' }
    }
    default:
      return { name: '', url: '' }
  }
})

// 初始化 Lottie 动画
const initAnimation = async () => {
  observer?.disconnect()
  observer = null
  if (anim) {
    anim.destroy()
    anim = null
  }
  if (!container.value || !meta.value.url) return
  const el = container.value
  const url = meta.value.url
  try {
    const animationData = await fetchAnimationData(url)
    if (!container.value || container.value !== el || meta.value.url !== url) return
    anim = lottie.loadAnimation({
      container: el,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: animationData as Record<string, unknown>
    })
    observer = new IntersectionObserver(([entry]) => {
      if (!anim) return
      if (entry?.isIntersecting) anim.play()
      else anim.pause()
    })
    observer.observe(el)
  } catch (e) {
    console.warn('[SuperFace] 动画加载失败:', e)
  }
}

onMounted(initAnimation)

onUnmounted(() => {
  observer?.disconnect()
  observer = null
  if (anim) {
    anim.destroy()
    anim = null
  }
})

watch(() => meta.value.url, initAnimation)
</script>
