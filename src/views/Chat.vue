<template>
  <!-- 聊天视图根容器 -->
  <div class="ui-flex-col-full relative overflow-hidden bg-transparent">
    <!-- 主体区域 -->
    <main class="ui-flex-col-full min-w-0 relative">
      <!-- 空状态 -->
      <div v-if="!id" class="ui-flex-y size-full ui-text-foreground-dim select-none pb-20">
        <div class="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 ui-flex-center shadow-lg mb-6 text-white">
          <div class="i-ri-chat-smile-2-fill text-5xl drop-shadow-md" />
        </div>
        <h2 class="text-xl font-bold ui-text-foreground-main mb-2 tracking-wide">RimeQ</h2>
        <p class="text-xs opacity-60">选择联系人开始聊天</p>
      </div>
      <!-- 活跃会话区域 -->
      <div v-else class="ui-flex-col-full relative">
        <!-- 消息列表滚动区 -->
        <div
          id="msgPan"
          ref="scrollRef"
          class="flex-1 overflow-y-auto px-3 md:px-4 ui-scrollbar scroll-smooth relative"
          @scroll="onScroll"
        >
          <!-- 顶部加载指示器 -->
          <div v-if="messageStore.isLoading" class="ui-flex-center py-6 ui-anim-fade-in h-10">
            <div class="i-ri-loader-4-line animate-spin text-primary text-xl" />
          </div>
          <!-- 消息流容器 -->
          <div class="flex flex-col gap-3 pb-4 pt-4">
            <MsgBubble
              v-for="(msg, index) in list"
              :key="msg.message_id || index"
              :msg="msg"
              :selection-mode="messageStore.isMultiSelect"
              :is-selected="messageStore.selectedIds.includes(msg.message_id)"
              @contextmenu="onContextMenu"
              @poke="onPoke"
              @select="(mid) => messageStore.handleSelection(mid, 'toggle')"
            />
          </div>
        </div>
        <!-- 底部输入区域容器 -->
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
                  <span class="opacity-60 ml-1 truncate">{{ processMessageChain(messageStore.replyTarget).previewText }}</span>
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
                <div
                  v-if="showInputMenu"
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
                        <!-- Emoji 列表 -->
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
                        <!-- 超级表情 (Lottie) 列表 -->
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
                        v-for="btn in menuButtons"
                        :key="btn.key"
                        v-tooltip.top="btn.label"
                        :icon="btn.icon"
                        rounded text
                        class="!w-10 !h-10 ui-trans !border-none"
                        :class="activeTab === btn.key ? '!bg-primary !text-primary-content scale-105 shadow-md' : '!text-foreground-sub hover:!bg-background-dim hover:!text-foreground-main'"
                        @click="handleInputMenuClick(btn)"
                    />
                  </div>
                </div>
              </transition>
              <!-- 菜单开关按钮 -->
              <Button
                icon="i-ri-add-line text-xl"
                rounded text
                class="!w-10 !h-10 ui-trans !border-none"
                :class="showInputMenu ? '!bg-foreground-main !text-background-main rotate-45 shadow' : '!text-foreground-sub hover:!bg-background-dim'"
                @click="toggleInputMenu"
              />
            </div>
            <!-- Tiptap 编辑器容器 -->
            <div
              class="flex-1 min-w-0 bg-background-dim/30 border border-transparent rounded-[20px] px-4 flex flex-col justify-center ui-trans focus-within:bg-background-dim/20 focus-within:border-primary/30 focus-within:shadow-[0_0_0_2px_var(--primary-soft)]"
              :class="isExpanded ? 'h-32' : 'min-h-[2.5rem]'"
              @click="focusEditor"
            >
              <editor-content
                :editor="editor"
                class="chat-editor w-full text-sm text-foreground-main leading-5"
              />
            </div>
            <!-- 多选状态指示条 -->
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
            <!-- 右侧操作按钮组 -->
            <div class="flex-none flex items-end gap-2">
              <!-- 展开/收起编辑器按钮 -->
              <transition name="fade">
                <Button
                  v-if="!isEditorEmpty && !isMultiSelect"
                  v-tooltip.top="isExpanded ? '收起' : '展开'"
                  :icon="isExpanded ? 'i-ri-arrow-down-s-line text-xl' : 'i-ri-expand-up-down-line text-xl'"
                  rounded text
                  class="!w-10 !h-10 !text-foreground-sub hover:!text-primary hover:!bg-background-dim border ui-border-background-dim/50 ui-bg-background-main shadow-sm"
                  @click="triggerExpand"
                />
              </transition>
              <!-- 发送/转发按钮 -->
              <Button
                v-tooltip.top="isMultiSelect ? '转发' : '发送'"
                :icon="isMultiSelect ? 'i-ri-share-forward-fill text-xl' : 'i-ri-send-plane-fill text-xl'"
                rounded
                class="!w-10 !h-10 shadow-sm active:scale-95 !border-none"
                :disabled="!canSend"
                @click="handleInputSend"
              />
            </div>
          </div>
        </div>
        <!-- 右键菜单隐形容器 -->
        <div class="hidden">
          <div ref="menuDomRef">
            <ContextMenu
              :options="menuOpts"
              @select="onMenuSelect"
            />
          </div>
        </div>
      </div>
    </main>
    <!-- 文件输入框 -->
    <input ref="imageInputRef" type="file" accept="image/*" class="hidden" @change="handleImageSelect">
    <input ref="fileInputRef" type="file" class="hidden" @change="handleFileUpload">
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import { EditorContent } from '@tiptap/vue-3'
import tippy, { type Instance, type Props } from 'tippy.js'

import { useMessageStore, useSessionStore, useContactStore } from '@/stores'
import { bot } from '@/api'
import type { Message, Segment } from '@/types'
import type { AnimationItem } from 'lottie-web'
import MsgBubble from '@/components/MsgBubble.vue'
import ContextMenu, { type MenuItem } from '@/components/ContextMenu.vue'
import { EmojiUtils, emojiList, superList } from '@/utils/emoji'
import { processMessageChain } from '@/utils/handler'
import { useChatEditor } from '@/utils/editor'

defineOptions({ name: 'ChatView' })

// 全局实例
const router = useRouter()
const route = useRoute()
const toast = useToast()
const messageStore = useMessageStore()
const sessionStore = useSessionStore()
const contactStore = useContactStore()

// 当前会话 ID
const id = computed(() => (route.params.id as string) || '')
// 当前会话对象
const session = computed(() => sessionStore.getSession(id.value))
// 消息列表
const list = computed(() => messageStore.messages)
// 是否为群组会话
const isGroup = computed(() => {
  if (!id.value) return false
  if (session.value) return session.value.type === 'group'
  return contactStore.checkIsGroup(id.value)
})
// 是否处于多选模式
const isMultiSelect = computed(() => messageStore.isMultiSelect)
// 多选模式选中数量
const selectedCount = computed(() => messageStore.selectedIds.length)

const scrollRef = ref<HTMLElement>()
const imageInputRef = ref<HTMLInputElement>()
const fileInputRef = ref<HTMLInputElement>()
const menuDomRef = ref<HTMLElement | null>(null)

// 右键菜单的目标消息
const contextMsg = ref<Message | null>(null)
// 是否显示输入框菜单
const showInputMenu = ref(false)
// 当前激活的功能菜单
const activeTab = ref<'emoji' | 'super' | 'collection' | null>(null)
// 编辑器是否展开
const isExpanded = ref(false)
// Tippy 菜单实例
let menuInstance: Instance<Props> | undefined

// Lottie 动画
const lottieMap = new Map<number, AnimationItem>()
const lottieRefs = new Map<number, HTMLElement>()

// 右键菜单选项
const menuOpts = computed<MenuItem[]>(() => [
  { label: '引用', key: 'reply', icon: 'i-ri-reply-line' },
  { label: '转发', key: 'forward', icon: 'i-ri-share-forward-line' },
  { label: '多选', key: 'select', icon: 'i-ri-check-double-line' },
  { label: '撤回', key: 'recall', icon: 'i-ri-arrow-go-back-line', danger: true },
])

// 输入框左侧菜单配置
const menuButtons = [
  { key: 'emoji', label: 'Emoji', icon: 'i-ri-emotion-line text-xl', type: 'tab' },
  { key: 'super', label: '超级表情', icon: 'i-ri-user-smile-line text-xl', type: 'tab' },
  { key: 'collection', label: '收藏表情', icon: 'i-ri-star-smile-line text-xl', type: 'tab' },
  { key: 'image', label: '图片', icon: 'i-ri-image-line text-xl', type: 'image' },
  { key: 'file', label: '文件', icon: 'i-ri-file-line text-xl', type: 'file' },
] as const

// 编辑器是否为空
const isEditorEmpty = computed(() => !editor.value || editor.value.isEmpty)
// 是否允许发送
const canSend = computed(() => isMultiSelect.value ? selectedCount.value > 0 : !isEditorEmpty.value)

/**
 * 将 Tiptap 编辑器内容转换为 OneBot 消息段格式
 * @returns Segment[] 消息段数组
 */
const convertEditorContentToSegments = (): Segment[] => {
  if (!editor.value) return []
  const segments: Segment[] = []
  const json = editor.value.getJSON()
  if (json.content && Array.isArray(json.content)) {
    json.content.forEach((node: any, index: number) => {
      if (node.type === 'paragraph') {
        if (index > 0) segments.push({ type: 'text', data: { text: '\n' } })
        if (node.content) {
          node.content.forEach((child: any) => {
            if (child.type === 'text') segments.push({ type: 'text', data: { text: child.text } })
            else if (child.type === 'image' && child.attrs.src) segments.push({ type: 'image', data: { file: child.attrs.src } })
            else if (child.type === 'mention' && child.attrs.id) segments.push({ type: 'at', data: { qq: child.attrs.id } })
          })
        }
      }
    })
  }
  return segments
}

/**
 * 处理发送逻辑
 * 支持普通发送和多选转发
 */
const handleInputSend = async () => {
  if (isMultiSelect.value) {
    if (messageStore.selectedIds.length > 0) router.push(`/${id.value}/forward`)
    return
  }
  if (isEditorEmpty.value) return
  const segments = convertEditorContentToSegments()
  if (messageStore.replyTarget) segments.unshift({ type: 'reply', data: { id: String(messageStore.replyTarget.message_id) } })
  if (segments.length === 0) return
  editor.value?.commands.clearContent()
  messageStore.setReplyTarget(null)
  if (isExpanded.value) isExpanded.value = false
  try {
    await bot.sendMsg({
      message_type: isGroup.value ? 'group' : 'private',
      [isGroup.value ? 'group_id' : 'user_id']: Number(id.value),
      message: segments
    })
  } catch (e) {
    toast.add({ severity: 'error', summary: '发送失败', detail: String(e), life: 3000 })
  }
  nextTick(focusEditor)
}

// 初始化编辑器
const editor = useChatEditor({ currentId: id, isGroup: isGroup, onSend: handleInputSend })
const focusEditor = () => editor.value?.commands.focus()

// 输入框菜单交互
const toggleInputMenu = () => {
  showInputMenu.value = !showInputMenu.value
  if (!showInputMenu.value) { activeTab.value = null; focusEditor() }
}
const handleInputMenuClick = (btn: any) => {
  if (btn.type === 'tab') activeTab.value = activeTab.value === btn.key ? null : btn.key
  else if (btn.type === 'image') imageInputRef.value?.click()
  else if (btn.type === 'file') fileInputRef.value?.click()
}
const triggerExpand = () => { isExpanded.value = !isExpanded.value; nextTick(focusEditor) }
const cancelMulti = () => messageStore.setMultiSelect(false)
const insertEmoji = (code: number) => { editor.value?.commands.insertContent(String.fromCodePoint(code)); focusEditor() }
const insertSuperEmoji = (i: number) => { editor.value?.commands.setImage({ src: EmojiUtils.getNormalUrl(i) }); focusEditor(); showInputMenu.value = false }

// Lottie 动画加载
const setLottieRef = (el: any, i: number) => { if (el instanceof HTMLElement) lottieRefs.set(i, el) }
const loadLottie = async () => {
  if (activeTab.value !== 'super') return
  try {
    const lottie = (await import('lottie-web')).default
    for (const i of superList) {
      const el = lottieRefs.get(i)
      if (!el || lottieMap.has(i)) continue
      try {
        const res = await fetch(EmojiUtils.getSuperUrl(i))
        const d = await res.json()
        lottieMap.set(i, lottie.loadAnimation({ container: el, renderer: 'svg', loop: true, autoplay: true, animationData: d }))
      } catch {}
    }
  } catch {}
}
// 监听 Tab 切换
watch(activeTab, (v) => { if (v === 'super') nextTick(loadLottie) })

// 滚动加载
const loadingCoolDown = ref(false)

/**
 * 滚动到底部
 * @param force - 是否强制滚动，忽略距离检查
 */
const scrollToBottom = async (force = false) => {
  await nextTick()
  if (scrollRef.value) {
    const { scrollHeight, scrollTop, clientHeight } = scrollRef.value
    if (force || scrollHeight - scrollTop - clientHeight < 200) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  }
}

/**
 * 监听滚动事件，处理历史消息加载
 * @param e - 滚动事件对象
 */
const onScroll = async (e: Event) => {
  if (messageStore.isLoading || messageStore.isFinished || loadingCoolDown.value) return
  const el = e.target as HTMLElement
  if (el.scrollTop < 50 && id.value) {
    loadingCoolDown.value = true
    const oldScrollHeight = el.scrollHeight
    const oldScrollTop = el.scrollTop
    const hasNewData = await messageStore.fetchHistory(id.value)
    await nextTick()
    if (hasNewData) {
      el.scrollTop = el.scrollHeight - oldScrollHeight + oldScrollTop
      setTimeout(() => { loadingCoolDown.value = false }, 500)
    } else {
      setTimeout(() => { loadingCoolDown.value = false }, 2000)
    }
  }
}

// 文件/图片处理
const handleImageSelect = (e: any) => {
  const f = e.target.files?.[0]
  if (f) { const r = new FileReader(); r.onload = (ev) => { editor.value?.commands.setImage({ src: ev.target?.result as string }); focusEditor() }; r.readAsDataURL(f); showInputMenu.value = false; e.target.value = '' }
}
const handleFileUpload = async (e: any) => {
  const f = e.target.files?.[0]
  if (!f) return
  if (!isGroup.value) { toast.add({ severity: 'warn', summary: '暂不支持私聊文件发送', life: 2000 }); return }
  toast.add({ severity: 'info', summary: '开始上传文件', detail: f.name, life: 2000 })
  try {
    const ab = await f.arrayBuffer()
    const b64 = btoa(new Uint8Array(ab).reduce((d, b) => d + String.fromCharCode(b), ''))
    await bot.uploadGroupFile(Number(id.value), 'base64://' + b64, f.name)
    toast.add({ severity: 'success', summary: '文件发送成功', life: 3000 })
  } catch(err) { toast.add({ severity: 'error', summary: '上传失败', detail: String(err), life: 3000 }) }
  showInputMenu.value = false; e.target.value = ''
}

// 右键菜单与交互
const onPoke = (uid: number) => bot.sendPoke({ user_id: uid, group_id: isGroup.value ? Number(id.value) : undefined })

/**
 * 显示消息右键菜单
 */
const onContextMenu = (e: MouseEvent, msg: Message) => {
  if (isMultiSelect.value) return
  e.preventDefault(); contextMsg.value = msg
  if (!menuInstance && menuDomRef.value) {
    menuInstance = tippy(document.body, { content: menuDomRef.value, trigger: 'manual', placement: 'bottom-start', interactive: true, arrow: false, offset: [0, 0], appendTo: document.body, zIndex: 9999, onClickOutside(i){i.hide()}, onHide(){contextMsg.value=null} })
  }
  menuInstance?.setProps({ getReferenceClientRect: () => ({ width: 0, height: 0, top: e.clientY, bottom: e.clientY, left: e.clientX, right: e.clientX, x: e.clientX, y: e.clientY, toJSON(){} } as any) })
  menuInstance?.show()
}

/**
 * 处理右键菜单项点击
 */
const onMenuSelect = async (k: string) => {
  menuInstance?.hide(); const m = contextMsg.value; if (!m) return
  if (k === 'reply') { messageStore.setReplyTarget(m); focusEditor() }
  else if (k === 'forward') { messageStore.handleSelection(m.message_id, 'only'); if (messageStore.selectedIds.length) router.push(`/${id.value}/forward`) }
  else if (k === 'select') messageStore.handleSelection(m.message_id, 'only')
  else if (k === 'recall') { try { await bot.deleteMsg(m.message_id) } catch(e) { toast.add({ severity: 'error', summary: '撤回失败', detail: String(e), life: 3000 }) } }
}

// 监听会话 ID 变化，切换会话
watch(() => id.value, async (v) => {
  if (v) {
    editor.value?.commands.clearContent()
    await messageStore.openSession(v)
    await scrollToBottom(true)
  }
}, { immediate: true })

// 监听消息列表长度，自动滚动到底部
watch(() => messageStore.messages.length, () => { if (!messageStore.isLoading) scrollToBottom(false) })
// 监听多选模式状态，自动关闭其他面板
watch(isMultiSelect, (v) => { if (v) { showInputMenu.value = false; isExpanded.value = false } })

// 组件销毁前清理资源
onBeforeUnmount(() => {
  lottieMap.forEach(a => a.destroy());
  lottieMap.clear();
  lottieRefs.clear();
  editor.value?.destroy();
  menuInstance?.destroy()
})
</script>

<style lang="scss">
.chat-editor {
  overflow-y: auto;
  max-height: 10rem;

  /* 自定义滚动条样式，替换非标准 @apply */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;

  /* Tiptap 编辑器内部样式重置 */
  .ProseMirror {
    outline: none; min-height: 1.25rem;
    p { margin: 0; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 4px 0; &.ProseMirror-selectednode { outline: 2px solid var(--primary-color); } }
    /* 空编辑器占位符 */
    p.is-editor-empty:first-child::before { content: attr(data-placeholder); float: left; color: var(--text-dim); pointer-events: none; height: 0; }
    &::selection { background-color: var(--primary-soft); }
  }
}
</style>
