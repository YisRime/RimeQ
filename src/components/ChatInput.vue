<template>
  <!-- 底部输入栏容器 -->
  <div class="relative z-30 flex flex-col shrink-0 ui-bg-background-sub border-t ui-border-background-dim ui-trans">
    <!-- 回复预览 -->
    <transition
      enter-active-class="ui-trans ui-dur-fast"
      leave-active-class="ui-trans ui-dur-fast"
      enter-from-class="opacity-0 translate-y-2"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="replyTarget"
        class="mx-3 mt-2 mb-0 px-3 py-2 rounded-xl ui-flex-between text-xs border ui-border-background-dim bg-background-dim/30 backdrop-blur-sm shadow-sm"
      >
        <div class="ui-flex-x gap-2 overflow-hidden pr-2">
          <div class="w-1 h-3 rounded-full bg-primary shrink-0" />
          <div class="ui-flex-truncate">
            <span class="text-foreground-sub">回复 </span>
            <span class="font-bold text-foreground-main">@{{ replyTarget.sender.nickname }}</span>
            <span class="opacity-60 ml-1 truncate">{{ getSummary(replyTarget) }}</span>
          </div>
        </div>
        <Button
          icon="i-ri-close-line"
          text rounded
          class="!w-6 !h-6 !text-foreground-dim hover:!text-red-500 hover:!bg-background-dim !border-none"
          @click="$emit('clear-reply')"
        />
      </div>
    </transition>
    <!-- 主操作区 -->
    <div class="w-full flex items-end gap-2 p-2 relative z-10">
      <!-- 左侧功能区 -->
      <div class="relative flex-none">
        <!-- 弹出菜单 -->
        <transition
          enter-active-class="transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="opacity-0 translate-y-4 scale-95 origin-bottom-left"
          leave-to-class="opacity-0 translate-y-4 scale-95 origin-bottom-left"
        >
          <div
            v-if="showMenu"
            class="absolute bottom-full left-0 mb-2 -ml-1 flex flex-col gap-2 z-50 items-start"
          >
            <!-- 扩展面板 -->
            <transition
              enter-active-class="ui-trans ui-dur-fast origin-bottom-left"
              leave-active-class="ui-trans ui-dur-fast origin-bottom-left"
              enter-from-class="opacity-0 scale-95"
              leave-to-class="opacity-0 scale-95"
            >
              <div
                v-if="activeTab"
                class="w-80 h-64 ui-bg-background-sub/95 backdrop-blur shadow-xl rounded-2xl border ui-border-background-dim flex flex-col overflow-hidden ml-1"
              >
                <div class="flex-1 overflow-y-auto ui-scrollbar p-2">
                  <!-- Emoji 面板 -->
                  <div v-if="activeTab === 'emoji'" class="grid grid-cols-8 gap-1">
                    <div
                      v-for="code in emojiList"
                      :key="code"
                      class="aspect-square ui-flex-center text-xl rounded cursor-pointer hover:bg-background-dim ui-trans"
                      @click="insertEmoji(code)"
                    >
                      {{ String.fromCodePoint(code) }}
                    </div>
                  </div>
                  <!-- 超级表情面板 -->
                  <div v-else-if="activeTab === 'super'" class="grid grid-cols-5 gap-2">
                    <div
                      v-for="id in superList"
                      :key="id"
                      class="aspect-square p-1.5 rounded-xl cursor-pointer hover:bg-background-dim ui-trans"
                      @click="insertSuperEmoji(id)"
                    >
                      <div :ref="(el) => setLottieRef(el, id)" class="size-full pointer-events-none" />
                    </div>
                  </div>
                  <!-- 收藏面板 -->
                  <div v-else class="size-full ui-flex-y text-foreground-dim gap-2 opacity-60">
                    <div class="i-ri-star-smile-line text-4xl" />
                    <span class="text-xs">暂无收藏</span>
                  </div>
                </div>
              </div>
            </transition>
            <!-- 分类按钮栏 -->
            <div class="flex p-1.5 ui-bg-background-sub/95 backdrop-blur shadow-xl rounded-full border ui-border-background-dim gap-1">
              <div v-for="btn in menuButtons" :key="btn.key" class="relative">
                <Button
                  v-tooltip.top="btn.label"
                  :icon="btn.icon"
                  rounded text
                  class="!w-10 !h-10 ui-trans !border-none"
                  :class="activeTab === btn.key ? '!bg-primary !text-primary-content scale-105 shadow-md' : '!text-foreground-sub hover:!bg-background-dim hover:!text-foreground-main'"
                  @click="handleMenuClick(btn)"
                />
                <!-- 文件上传 -->
                <input
                  v-if="btn.type === 'file'"
                  type="file"
                  :accept="btn.accept"
                  class="absolute inset-0 opacity-0 cursor-pointer"
                  @change="handleUpload"
                  @click.stop="(e: any) => (e.target.value = '')"
                />
              </div>
            </div>
          </div>
        </transition>
        <!-- 开关按钮 -->
        <Button
          icon="i-ri-add-line text-xl"
          rounded text
          class="!w-10 !h-10 ui-trans !border-none"
          :class="showMenu ? '!bg-foreground-main !text-background-main rotate-45 shadow' : '!text-foreground-sub hover:!bg-background-dim'"
          @click="toggleMenu"
        />
      </div>
      <!-- 输入框区域 -->
      <div
        class="flex-1 min-w-0 bg-background-dim/30 border border-transparent rounded-[20px] px-4 flex flex-col justify-center ui-trans focus-within:bg-background-dim/20 focus-within:border-primary/30 focus-within:shadow-[0_0_0_2px_var(--primary-soft)]"
        :class="isExpanded ? 'h-128 py-2' : 'min-h-[2.5rem] py-2'"
      >
        <textarea
          ref="textareaRef"
          v-model="inputValue"
          class="w-full bg-transparent border-none outline-none text-sm text-foreground-main placeholder-foreground-dim resize-none ui-scrollbar leading-5"
          :class="isExpanded ? 'h-64' : 'max-h-[100px]'"
          placeholder="请输入文本..."
          @keydown.enter.prevent="handleEnter"
          @focus="showMenu = false"
        />
      </div>
      <!-- 多选控制条 -->
      <transition
        enter-active-class="ui-trans"
        leave-active-class="ui-trans"
        enter-from-class="max-w-0 opacity-0 scale-90 translate-x-4"
        leave-to-class="max-w-0 opacity-0 scale-90 translate-x-4"
      >
        <div v-if="isMultiSelect" class="flex-none ui-flex-x gap-2 max-w-[200px] overflow-hidden">
          <div class="h-10 px-4 rounded-full bg-primary text-primary-content text-sm font-bold ui-flex-center gap-2 shadow-sm select-none whitespace-nowrap">
            <div class="i-ri-check-double-line text-lg" />
            <span>{{ selectedCount }}</span>
          </div>
          <Button
            v-tooltip.top="'取消'"
            icon="i-ri-close-line text-xl"
            text rounded
            class="!w-10 !h-10 shrink-0 !text-foreground-sub hover:!text-red-500 hover:!bg-background-dim !border-none"
            @click="cancelMulti"
          />
        </div>
      </transition>
      <!-- 右侧按钮组 -->
      <div class="flex-none flex items-end gap-2">
        <transition name="fade">
          <Button
            v-if="inputValue && !isMultiSelect"
            v-tooltip.top="isExpanded ? '收起' : '展开'"
            :icon="isExpanded ? 'i-ri-arrow-down-s-line text-xl' : 'i-ri-expand-up-down-line text-xl'"
            rounded text
            class="!w-10 !h-10 !text-foreground-sub hover:!text-primary hover:!bg-background-dim border ui-border-background-dim/50 ui-bg-background-main shadow-sm"
            @click="triggerExpand"
          />
        </transition>
        <Button
          v-tooltip.top="isMultiSelect ? '转发' : '发送'"
          :icon="isMultiSelect ? 'i-ri-share-forward-fill text-xl' : 'i-ri-send-plane-fill text-xl'"
          rounded
          class="!w-10 !h-10 shadow-sm active:scale-95 !border-none"
          :disabled="!canSend"
          @click="handleSend"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, type ComponentPublicInstance } from 'vue'
import { useTextareaAutosize } from '@vueuse/core'
import Button from 'primevue/button'
import { useMessageStore } from '@/stores/message'
import { EmojiUtils, emojiList, superList } from '@/utils/emoji'
import { determineMsgType } from '@/utils/handler'
import { MsgType, type IMessage } from '@/types'
import type { AnimationItem } from 'lottie-web'

defineOptions({ name: 'ChatInput' })

// 组件定义
const props = defineProps<{
  modelValue: string
  replyTarget: IMessage | null
  sessionId: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', val: string): void
  (e: 'send'): void
  (e: 'forward'): void
  (e: 'clear-reply'): void
  (e: 'upload', file: File): void
}>()

const messageStore = useMessageStore()

// 状态变量
const showMenu = ref(false)
const activeTab = ref<'emoji' | 'super' | 'collection' | null>(null)
const isExpanded = ref(false)
const lottieMap = new Map<number, AnimationItem>()
const lottieRefs = new Map<number, HTMLElement>()

// 状态计算
const isMultiSelect = computed(() => messageStore.isMultiSelect)
const selectedCount = computed(() => messageStore.selectedIds.length)

// 菜单配置
const menuButtons = [
  { key: 'emoji', label: 'Emoji', icon: 'i-ri-emotion-line text-xl', type: 'tab' },
  { key: 'super', label: '超级表情', icon: 'i-ri-user-smile-line text-xl', type: 'tab' },
  { key: 'collection', label: '收藏表情', icon: 'i-ri-star-smile-line text-xl', type: 'tab' },
  { key: 'image', label: '图片', icon: 'i-ri-image-line text-xl', type: 'file', accept: 'image/*' },
  { key: 'file', label: '文件', icon: 'i-ri-file-line text-xl', type: 'file', accept: '*' },
] as const

// 自动调整高度
const { textarea: textareaRef, triggerResize } = useTextareaAutosize()

// 输入框双向绑定
const inputValue = computed({
  get: () => props.modelValue,
  set: (val) => {
    emit('update:modelValue', val)
    if (!isExpanded.value) nextTick(triggerResize)
  },
})

// 是否可发送
const canSend = computed(() => {
  if (isMultiSelect.value) return selectedCount.value > 0
  return !!props.modelValue.trim()
})

// 切换菜单显示
const toggleMenu = () => {
  showMenu.value = !showMenu.value
  if (!showMenu.value) {
    activeTab.value = null
    textareaRef.value?.focus()
  }
}

// 处理菜单点击
const handleMenuClick = (btn: typeof menuButtons[number]) => {
  if (btn.type === 'tab') {
    activeTab.value = activeTab.value === btn.key ? null : btn.key
  }
}

// 切换展开状态
const triggerExpand = () => {
  isExpanded.value = !isExpanded.value
  nextTick(() => {
    textareaRef.value?.focus()
    if (!isExpanded.value) triggerResize()
  })
}

// 取消多选
const cancelMulti = () => {
  messageStore.setMultiSelect(false)
}

// 处理回车发送
const handleEnter = (e: KeyboardEvent) => {
  if (e.shiftKey || e.ctrlKey) {
    inputValue.value += '\n'
  } else {
    handleSend()
  }
}

// 执行发送
const handleSend = () => {
  if (isMultiSelect.value) {
    emit('forward')
  } else if (inputValue.value.trim()) {
    emit('send')
    if (isExpanded.value) isExpanded.value = false
    nextTick(() => {
      textareaRef.value?.focus()
      triggerResize()
    })
  }
}

// 插入文本
const insertText = (text: string) => {
  const el = textareaRef.value
  if (!el) {
    inputValue.value += text
    return
  }
  const start = el.selectionStart
  const end = el.selectionEnd
  inputValue.value = inputValue.value.substring(0, start) + text + inputValue.value.substring(end)
  nextTick(() => {
    el.focus()
    el.selectionStart = el.selectionEnd = start + text.length
    if (!isExpanded.value) triggerResize()
  })
}

// 插入 Emoji
const insertEmoji = (code: number) => insertText(String.fromCodePoint(code))

// 插入超级表情
const insertSuperEmoji = (id: number) => {
  insertText(`[CQ:face,id=${id}]`)
  showMenu.value = false
}

// 处理文件上传
const handleUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (file) {
    emit('upload', file)
    showMenu.value = false
  }
}

// 获取消息摘要
const getSummary = (msg: IMessage) => {
  const type = determineMsgType(msg.message)
  if (type === MsgType.Text) {
    const txt = msg.message.filter((s) => s.type === 'text').map((s) => s.data.text).join('')
    return txt.length > 30 ? txt.slice(0, 30) + '...' : txt
  }
  return `[${type}]`
}

// 绑定 Lottie 元素
const setLottieRef = (el: Element | ComponentPublicInstance | null, id: number) => {
  if (el instanceof HTMLElement) lottieRefs.set(id, el)
}

// 加载超级表情动画
const loadLottie = async () => {
  if (activeTab.value !== 'super') return
  try {
    const lottie = (await import('lottie-web')).default
    for (const id of superList) {
      const container = lottieRefs.get(id)
      if (!container || lottieMap.has(id)) continue
      try {
        const res = await fetch(EmojiUtils.getSuperUrl(id))
        const data = await res.json()
        const anim = lottie.loadAnimation({
          container, renderer: 'svg', loop: true, autoplay: true, animationData: data,
        })
        lottieMap.set(id, anim)
      } catch { /* ignore */ }
    }
  } catch (e) {
    console.error('Lottie load failed:', e)
  }
}

// 监听 Tab 切换
watch(activeTab, (val) => {
  if (val === 'super') nextTick(loadLottie)
})

// 监听多选关闭
watch(isMultiSelect, (val) => {
  if (val) {
    showMenu.value = false
    isExpanded.value = false
  }
})

// 初始化高度
onMounted(() => triggerResize())

// 资源清理
onBeforeUnmount(() => {
  lottieMap.forEach((anim) => anim.destroy())
  lottieMap.clear()
  lottieRefs.clear()
})
</script>
