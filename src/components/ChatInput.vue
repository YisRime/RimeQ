<template>
  <div class="relative z-30 flex flex-col shrink-0 ui-bg-background-sub border-t ui-border-background-dim ui-trans z-20 shrink-0">
    <!-- 回复引用预览条 -->
    <transition
      enter-active-class="ui-trans ui-dur-fast"
      leave-active-class="ui-trans ui-dur-fast"
      enter-from-class="opacity-0 translate-y-2"
      leave-to-class="opacity-0 translate-y-2"
    >
      <div
        v-if="messageStore.replyTarget"
        class="mx-3 mt-2 mb-0 px-3 py-2 rounded-xl ui-flex-between text-xs border ui-border-background-dim bg-background-dim/30 backdrop-blur-sm shadow-sm"
      >
        <div class="ui-flex-x gap-2 overflow-hidden pr-2">
          <div class="w-1 h-3 rounded-full bg-primary shrink-0" />
          <div class="ui-flex-truncate">
            <span class="text-foreground-sub">回复 </span>
            <span class="font-bold text-foreground-main">@{{ messageStore.replyTarget.sender.nickname }}</span>
            <span class="opacity-60 ml-1 truncate">{{ parseMessage(messageStore.replyTarget).previewText }}</span>
          </div>
        </div>
        <!-- 取消引用按钮 -->
        <Button
          icon="i-ri-close-line"
          text rounded
          class="!w-6 !h-6 !text-foreground-dim hover:!text-red-500 hover:!bg-background-dim !border-none"
          @click="messageStore.setReplyTarget(null)"
        />
      </div>
    </transition>
    <!-- 主操作区 -->
    <div class="w-full flex items-end gap-2 p-2 relative z-10">
      <!-- 左侧功能菜单区 -->
      <div class="relative flex-none">
        <!-- 弹出式功能面板 -->
        <transition
          enter-active-class="transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          leave-active-class="transition-all duration-200 ease-in"
          enter-from-class="opacity-0 translate-y-4 scale-95 origin-bottom-left"
          leave-to-class="opacity-0 translate-y-4 scale-95 origin-bottom-left"
        >
          <div v-if="showInputMenu" class="absolute bottom-full left-0 mb-2 -ml-1 flex flex-col gap-2 z-50 items-start">
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
                  <!-- Emoji 列表 -->
                  <div v-if="activeTab === 'emoji'" class="grid grid-cols-8 gap-1">
                    <div
                      v-for="code in emojiList" :key="code"
                      class="aspect-square ui-flex-center text-xl rounded cursor-pointer hover:bg-background-dim ui-trans"
                      @click="insertText(String.fromCodePoint(code)); focus()"
                    >{{ String.fromCodePoint(code) }}</div>
                  </div>
                  <!-- 超级表情 (Lottie) 列表 -->
                  <div v-else-if="activeTab === 'super'" class="grid grid-cols-5 gap-2">
                    <div
                      v-for="id in superList" :key="id"
                      class="aspect-square p-1.5 rounded-xl cursor-pointer hover:bg-background-dim ui-trans relative"
                      @click="insertImage(EmojiUtils.getNormalUrl(id)); showInputMenu = false; focus()"
                      @mouseenter="handleMouseEnter(id)"
                      @mouseleave="handleMouseLeave(id)"
                    >
                      <img v-show="hoveringId !== id" :src="EmojiUtils.getNormalUrl(id)" class="size-full object-contain pointer-events-none" loading="lazy" />
                      <div v-show="hoveringId === id" :ref="el => setLottieRef(el, id)" class="size-full pointer-events-none" />
                    </div>
                  </div>
                  <!-- 收藏表情列表 -->
                  <div v-else class="size-full ui-flex-y text-foreground-dim gap-2 opacity-60">
                    <div class="i-ri-star-smile-line text-4xl" />
                    <span class="text-xs">暂无收藏</span>
                  </div>
                </div>
              </div>
            </transition>
            <!-- 菜单分类按钮栏 -->
            <div class="flex p-1.5 ui-bg-background-sub/95 backdrop-blur shadow-xl rounded-full border ui-border-background-dim gap-1">
              <Button
                  v-for="btn in menuButtons" :key="btn.key"
                  v-tooltip.top="btn.label" :icon="btn.icon" rounded text
                  class="!w-10 !h-10 ui-trans !border-none"
                  :class="activeTab === btn.key ? '!bg-primary !text-primary-content scale-105 shadow-md' : '!text-foreground-sub hover:!bg-background-dim hover:!text-foreground-main'"
                  @click="handleMenuClick(btn)"
              />
            </div>
          </div>
        </transition>
        <!-- 菜单开关按钮 -->
        <Button
          icon="i-ri-add-line text-xl" rounded text
          class="!w-10 !h-10 ui-trans !border-none"
          :class="showInputMenu ? '!bg-foreground-main !text-background-main rotate-45 shadow' : '!text-foreground-sub hover:!bg-background-dim'"
          @click="showInputMenu = !showInputMenu; if(!showInputMenu) { activeTab = null; focus() }"
        />
      </div>
      <!-- Tiptap 编辑器容器 -->
      <div
        class="flex-1 min-w-0 bg-background-dim/30 border border-transparent rounded-[20px] px-4 flex flex-col justify-center ui-trans focus-within:bg-background-dim/20 focus-within:border-primary/30 focus-within:shadow-[0_0_0_2px_var(--primary-soft)]"
        :class="isExpanded ? 'h-32' : 'min-h-[2.5rem]'"
        @click="focus"
      >
        <editor-content
          :editor="editor"
          class="chat-editor w-full text-sm text-foreground-main leading-5 py-2 caret-primary ui-scrollbar transition-all duration-300 ease-in-out"
          :class="isExpanded ? 'max-h-40' : 'max-h-24'"
        />
      </div>
      <!-- 多选状态指示条 -->
      <transition
        enter-active-class="ui-trans" leave-active-class="ui-trans"
        enter-from-class="max-w-0 opacity-0 scale-90 translate-x-4" leave-to-class="max-w-0 opacity-0 scale-90 translate-x-4"
      >
        <div v-if="isMultiSelect" class="flex-none ui-flex-x gap-2 max-w-[200px] overflow-hidden">
          <div class="h-10 px-4 rounded-full bg-primary text-primary-content text-sm font-bold ui-flex-center gap-2 shadow-sm select-none whitespace-nowrap">
            <div class="i-ri-check-double-line text-lg" />
            <span>{{ messageStore.selectedIds.length }}</span>
          </div>
          <Button
            v-tooltip.top="'取消'" icon="i-ri-close-line text-xl" text rounded
            class="!w-10 !h-10 shrink-0 !text-foreground-sub hover:!text-red-500 hover:!bg-background-dim !border-none"
            @click="messageStore.setMultiSelect()"
          />
        </div>
      </transition>
      <!-- 右侧操作按钮组 -->
      <div class="flex-none flex items-end gap-2">
        <!-- 展开/收起编辑器按钮 -->
        <transition name="fade">
          <Button
            v-if="!isEmpty && !isMultiSelect"
            v-tooltip.top="isExpanded ? '收起' : '展开'"
            :icon="isExpanded ? 'i-ri-arrow-down-s-line text-xl' : 'i-ri-expand-up-down-line text-xl'"
            rounded text
            class="!w-10 !h-10 !text-foreground-sub hover:!text-primary hover:!bg-background-dim border ui-border-background-dim/50 ui-bg-background-main shadow-sm"
            @click="isExpanded = !isExpanded; nextTick(focus)"
          />
        </transition>
        <!-- 发送/转发按钮 -->
        <Button
          v-tooltip.top="isMultiSelect ? '转发' : '发送'"
          :icon="isMultiSelect ? 'i-ri-share-forward-fill text-xl' : 'i-ri-send-plane-fill text-xl'"
          rounded
          class="!w-10 !h-10 shadow-sm active:scale-95 !border-none"
          :disabled="isMultiSelect ? !messageStore.selectedIds.length : isEmpty"
          @click="handleSend"
        />
      </div>
    </div>
    <!-- 文件输入框 -->
    <input ref="imageInput" type="file" accept="image/*" class="hidden" @change="e => handleFile('img', e)">
    <input ref="fileInput" type="file" class="hidden" @change="e => handleFile('file', e)">
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { Button, useToast } from 'primevue'
import { EditorContent } from '@tiptap/vue-3'
import type { AnimationItem } from 'lottie-web'
import { bot } from '@/api'
import { useMessageStore } from '@/stores'
import { useChatEditor } from '@/utils/editor'
import { EmojiUtils, emojiList, superList } from '@/utils/emoji'
import { parseMessage } from '@/utils/parser'

defineOptions({ name: 'ChatInput' })

const props = defineProps<{ chatId: string; isGroup: boolean }>()
const emit = defineEmits<{ (e: 'send'): void }>()
const router = useRouter()
const toast = useToast()
const messageStore = useMessageStore()

// UI 状态
const showInputMenu = ref(false)
const activeTab = ref<'emoji' | 'super' | 'collection' | null>(null)
const isExpanded = ref(false)
const isMultiSelect = computed(() => messageStore.isMultiSelect)
const hoveringId = ref<number | null>(null)

// DOM 缓存
const imageInput = ref<HTMLInputElement>()
const fileInput = ref<HTMLInputElement>()
const lottieMap = new Map<number, AnimationItem>()
const lottieRefs = new Map<number, HTMLElement>()
const lottieCache = new Map<number, any>()

// 菜单配置
const menuButtons = [
  { key: 'emoji', label: 'Emoji', icon: 'i-ri-emotion-line text-xl', type: 'tab' },
  { key: 'super', label: '超级表情', icon: 'i-ri-user-smile-line text-xl', type: 'tab' },
  { key: 'collection', label: '收藏表情', icon: 'i-ri-star-smile-line text-xl', type: 'tab' },
  { key: 'image', label: '图片', icon: 'i-ri-image-line text-xl', type: 'act' },
  { key: 'file', label: '文件', icon: 'i-ri-file-line text-xl', type: 'act' },
] as const

// 文件处理
const handleFile = async (type: 'img' | 'file', e: Event) => {
  const f = (e.target as HTMLInputElement).files?.[0]
  if (!f) return
  ;(e.target as HTMLInputElement).value = ''
  if (type === 'img') {
    const r = new FileReader()
    r.onload = ev => { insertImage(ev.target?.result as string); focus() }
    r.readAsDataURL(f)
  } else {
    toast.add({ severity: 'info', summary: '开始上传', detail: f.name, life: 3000 })
    try {
      const b64 = btoa(new Uint8Array(await f.arrayBuffer()).reduce((d, b) => d + String.fromCharCode(b), ''))
      const method = props.isGroup ? bot.uploadGroupFile : bot.uploadPrivateFile
      await method(Number(props.chatId), 'base64://' + b64, f.name)
      emit('send')
    } catch (e) { toast.add({ severity: 'error', summary: '上传失败', detail: String(e) }) }
  }
  showInputMenu.value = false
}

// 编辑器初始化
const { editor, focus, insertText, insertImage, clear, getSegments } = useChatEditor({
  currentId: computed(() => props.chatId),
  isGroup: computed(() => props.isGroup),
  onSend: handleSend,
  onFile: f => {
    const dt = new DataTransfer(); dt.items.add(f)
    const e = { target: { files: dt.files, value: '' } } as unknown as Event
    handleFile('file', e)
  }
})
const isEmpty = computed(() => !editor.value || editor.value.isEmpty)

// 生命周期监听
watch(() => messageStore.replyTarget, t => t && focus())
watch(isMultiSelect, v => v && (showInputMenu.value = isExpanded.value = false))
onBeforeUnmount(() => {
  lottieMap.forEach(a => a.destroy())
  lottieMap.clear(); lottieRefs.clear(); editor.value?.destroy()
})

// 交互逻辑
const handleMenuClick = (btn: any) => {
  if (btn.type === 'tab') activeTab.value = activeTab.value === btn.key ? null : btn.key
  else if (btn.key === 'image') imageInput.value?.click()
  else fileInput.value?.click()
}

// Lottie 逻辑
const setLottieRef = (el: any, i: number) => el instanceof HTMLElement && lottieRefs.set(i, el)
const handleMouseEnter = async (id: number) => {
  hoveringId.value = id
  await nextTick()
  const el = lottieRefs.get(id)
  if (!el || lottieMap.has(id)) return
  try {
    if (!lottieCache.has(id)) lottieCache.set(id, await (await fetch(EmojiUtils.getSuperUrl(id))).json())
    if (hoveringId.value !== id) return
    const lottie = (await import('lottie-web')).default
    lottieMap.set(id, lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: true, animationData: lottieCache.get(id) }))
  } catch (e) { console.warn('Lottie Load Failed', id, e) }
}
const handleMouseLeave = (id: number) => {
  hoveringId.value = null
  const anim = lottieMap.get(id)
  if (anim) {
    anim.destroy()
    lottieMap.delete(id)
  }
}

// 发送逻辑
async function handleSend() {
  if (isMultiSelect.value) return messageStore.selectedIds.length && router.push(`/${props.chatId}/forward`)
  if (isEmpty.value) return
  const segments = getSegments()
  if (messageStore.replyTarget) segments.unshift({ type: 'reply', data: { id: String(messageStore.replyTarget.message_id) } })
  if (!segments.length) return
  clear(); messageStore.setReplyTarget(null); isExpanded.value = false
  try {
    await bot.sendMsg({
      message_type: props.isGroup ? 'group' : 'private',
      [props.isGroup ? 'group_id' : 'user_id']: Number(props.chatId),
      message: segments
    })
    emit('send')
  } catch (e) {
    toast.add({ severity: 'error', summary: '发送失败', detail: String(e), life: 3000 })
  }
  nextTick(focus)
}
</script>

<style lang="scss">
/* 编辑器核心样式 */
.chat-editor {
  .ProseMirror {
    outline: none;
    min-height: 1.25rem;
    p {
      margin: 0;
    }
    /* 图片样式 */
    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 4px 0;
      /* 选中样式 */
      &.ProseMirror-selectednode {
        outline: 2px solid var(--primary-color);
      }
    }
    /* 占位符样式 */
    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--text-dim);
      pointer-events: none;
      height: 0;
    }
    /* 选中文本背景色 */
    &::selection {
      background-color: var(--primary-soft);
    }
  }
}
</style>
