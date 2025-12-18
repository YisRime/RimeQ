<template>
  <div
    class="flex items-center gap-4 px-4 py-2 text-gray-500 border-t border-gray-100 dark:border-gray-800 select-none"
  >
    <!-- 表情按钮 -->
    <n-popover trigger="click" placement="top-start" :show-arrow="false" raw :style="{ padding: 0 }">
      <template #trigger>
        <div class="i-ri-emotion-line text-xl cursor-pointer hover:text-primary transition-colors" title="表情" />
      </template>
      <!-- 内嵌 Emoji 选择器 -->
      <div class="w-[350px] h-[300px] bg-white dark:bg-gray-900 shadow-xl rounded-xl flex flex-col">
        <n-tabs
          type="segment"
          class="flex-1"
          content-class="h-full overflow-hidden"
          pane-class="h-full overflow-y-auto custom-scrollbar p-2"
        >
          <!-- 超级/小黄脸表情 -->
          <n-tab-pane name="face" tab="表情">
            <div class="flex flex-col gap-2">
              <!-- 超级表情 -->
              <div class="text-xs text-gray-400 font-bold px-1">超级表情</div>
              <div class="grid grid-cols-6 gap-2">
                <div
                  v-for="id in superList"
                  :key="'super-' + id"
                  class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded transition-colors flex justify-center items-center"
                  @click="handleSelectSuper(id)"
                >
                  <!-- Lottie 动画容器 -->
                  <div :ref="(el) => setSuperEmojiRef(el, id)" class="w-12 h-12"></div>
                </div>
              </div>

              <!-- 小黄脸 -->
              <div class="text-xs text-gray-400 font-bold px-1 mt-2">经典</div>
              <div class="grid grid-cols-8 gap-1">
                <div
                  v-for="id in normalList"
                  :key="'normal-' + id"
                  class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded transition-colors flex justify-center"
                  @click="handleSelect(id)"
                >
                  <img
                    :src="EmojiUtils.getNormalUrl(id)"
                    class="w-6 h-6 object-contain"
                    loading="lazy"
                    :title="String(id)"
                  />
                </div>
              </div>

              <!-- Emoji -->
              <div class="text-xs text-gray-400 font-bold px-1 mt-2">Emoji</div>
              <div class="grid grid-cols-8 gap-1">
                <div
                  v-for="id in emojiList"
                  :key="'emoji-' + id"
                  class="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded transition-colors text-xl flex justify-center items-center"
                  @click="handleSelect(id)"
                >
                  {{ String.fromCodePoint(id) }}
                </div>
              </div>
            </div>
          </n-tab-pane>

          <!-- 颜文字 -->
          <n-tab-pane name="kaomoji" tab="颜文字">
            <div class="grid grid-cols-3 gap-2">
              <div
                v-for="(kaomoji, idx) in ['(⌒▽⌒)', '（￣▽￣）', '(=・ω・=)', '(｀・ω・´)', '(〜￣△￣)〜']"
                :key="idx"
                class="p-2 text-center text-sm border border-gray-200 dark:border-gray-700 rounded cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
                @click="handleKaomojiSelect(kaomoji)"
              >
                {{ kaomoji }}
              </div>
            </div>
          </n-tab-pane>
        </n-tabs>
      </div>
    </n-popover>

    <!-- 图片上传 -->
    <div class="relative overflow-hidden cursor-pointer hover:text-primary transition-colors text-xl" title="图片">
      <div class="i-ri-image-line" />
      <!-- 覆盖一个透明的 file input -->
      <input
        type="file"
        accept="image/*"
        class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        @change="handleUpload"
        @click="(e) => ((e.target as HTMLInputElement).value = '')"
      />
    </div>

    <!-- 文件上传 -->
    <div class="relative overflow-hidden cursor-pointer hover:text-primary transition-colors text-xl" title="文件">
      <div class="i-ri-folder-line" />
      <input
        type="file"
        class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        @change="handleUpload"
        @click="(e) => ((e.target as HTMLInputElement).value = '')"
      />
    </div>

    <div class="flex-1" />

    <!-- 聊天记录 (触发搜索面板) -->
    <div
      class="i-ri-history-line text-lg cursor-pointer hover:text-primary transition-colors"
      title="聊天记录"
      @click="$emit('history')"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { NPopover, NTabs, NTabPane } from 'naive-ui'
import { EmojiUtils, normalList, emojiList, superList } from '@/utils/emoji'
import type { AnimationItem } from 'lottie-web'
import type { ComponentPublicInstance } from 'vue'

defineOptions({
  name: 'InputTool'
})

defineProps<{ sessionId: string; disabled?: boolean }>()

const emit = defineEmits<{
  (e: 'insert', text: string): void
  (e: 'upload', file: File): void
  (e: 'history'): void
}>()

// Lottie 动画管理
const lottieInstances = new Map<number, AnimationItem>()
const containerRefs = new Map<number, HTMLElement>()

const setSuperEmojiRef = (el: Element | ComponentPublicInstance | null, id: number) => {
  if (el && el instanceof HTMLElement) {
    containerRefs.set(id, el)
  }
}

const loadSuperEmojiAnimations = async () => {
  try {
    const lottie = await import('lottie-web')

    for (const id of superList) {
      const container = containerRefs.get(id)
      if (!container) continue

      const animUrl = EmojiUtils.getSuperUrl(id)

      try {
        const response = await fetch(animUrl)
        const animData = await response.json()

        const anim = lottie.default.loadAnimation({
          container,
          renderer: 'svg',
          loop: false,
          autoplay: true,
          animationData: animData
        })

        lottieInstances.set(id, anim)
      } catch (e) {
        console.error(`[InputTool] Load super emoji ${id} failed`, e)
      }
    }
  } catch (e) {
    console.error('[InputTool] Load lottie-web failed', e)
  }
}

const handleSelect = (id: number) => {
  if (id >= 5000) {
    // Emoji 字符
    emit('insert', String.fromCodePoint(id))
  } else {
    // QQ 表情 ID
    emit('insert', `[CQ:face,id=${id}]`)
  }
}

const handleSelectSuper = (id: number) => {
  // 超级表情也是 QQ 表情 ID
  emit('insert', `[CQ:face,id=${id}]`)
}

const handleKaomojiSelect = (kaomoji: string) => {
  emit('insert', kaomoji)
}

const handleUpload = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  emit('upload', file)
}

// 生命周期
onMounted(() => {
  // 延迟加载动画，确保 DOM 已渲染
  setTimeout(() => {
    loadSuperEmojiAnimations()
  }, 100)
})

onBeforeUnmount(() => {
  // 清理所有 Lottie 实例
  lottieInstances.forEach((anim) => {
    anim.destroy()
  })
  lottieInstances.clear()
  containerRefs.clear()
})
</script>
