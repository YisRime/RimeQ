<template>
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
          <!-- 顶部加载圈 -->
          <div v-if="messageStore.isLoading" class="ui-flex-center py-6 ui-anim-fade-in">
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
        <!-- 底部输入栏容器 -->
        <div class="relative z-30 flex flex-col shrink-0 ui-bg-background-sub border-t ui-border-background-dim ui-trans z-20 shrink-0">
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
                  <span class="opacity-60 ml-1 truncate">{{ processMessageChain(replyTarget).previewText }}</span>
                </div>
              </div>
              <Button
                icon="i-ri-close-line"
                text rounded
                class="!w-6 !h-6 !text-foreground-dim hover:!text-red-500 hover:!bg-background-dim !border-none"
                @click="replyTarget = null"
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
                        @click="handleInputMenuClick(btn)"
                      />
                      <!-- 文件上传 -->
                      <input
                        v-if="btn.type === 'file' || btn.type === 'image'"
                        type="file"
                        :accept="btn.accept"
                        class="absolute inset-0 opacity-0 cursor-pointer"
                        @change="handleUploadInput"
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
                :class="showInputMenu ? '!bg-foreground-main !text-background-main rotate-45 shadow' : '!text-foreground-sub hover:!bg-background-dim'"
                @click="toggleInputMenu"
              />
            </div>

            <!-- Tiptap 编辑器区域 -->
            <div
              class="flex-1 min-w-0 bg-background-dim/30 border border-transparent rounded-[20px] px-4 flex flex-col justify-center ui-trans focus-within:bg-background-dim/20 focus-within:border-primary/30 focus-within:shadow-[0_0_0_2px_var(--primary-soft)]"
              :class="isExpanded ? 'h-128 py-2' : 'min-h-[2.5rem] py-2'"
              @click="focusEditor"
            >
              <editor-content
                :editor="editor"
                class="chat-editor w-full text-sm text-foreground-main leading-5 overflow-y-auto ui-scrollbar"
                :class="isExpanded ? 'h-64' : 'max-h-[100px]'"
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
                  v-if="!isEditorEmpty && !isMultiSelect"
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
                @click="handleInputSend"
              />
            </div>
          </div>
        </div>

        <!--
          [修改点]：右键菜单挂载点
          hidden: 隐藏这个 div，不要在界面上直接显示，Tippy 会抓取它的内容。
          ref="menuDomRef": 用于获取 DOM 传递给 Tippy
        -->
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount, type ComponentPublicInstance, h, defineComponent } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'

// Tiptap imports
import { useEditor, EditorContent, VueRenderer } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import tippy, { type Instance, type Props } from 'tippy.js'

import { useMessageStore } from '@/stores/message'
import { useSessionStore } from '@/stores/session'
import { bot } from '@/api'
import type { Message, Segment } from '@/types'
import type { AnimationItem } from 'lottie-web'
import MsgBubble from '@/components/MsgBubble.vue'
import ContextMenu, { type MenuItem } from '@/components/ContextMenu.vue'
import { EmojiUtils, emojiList, superList } from '@/utils/emoji'
import { processMessageChain } from '@/utils/handler'

defineOptions({ name: 'ChatView' })

// ----------------------------------------------------------------------
// 1. 内联组件与工具函数定义 (MentionList & Converter)
// ----------------------------------------------------------------------

// 内联 MentionList 组件 (渲染 @ 候选列表)
const MentionList = defineComponent({
  props: {
    items: { type: Array as () => any[], required: true },
    command: { type: Function, required: true }
  },
  setup(props, { expose }) {
    const selectedIndex = ref(0)
    watch(() => props.items, () => selectedIndex.value = 0)

    const selectItem = (index: number) => {
      const item = props.items[index]
      if (item) props.command({ id: item.id, label: item.label })
    }

    const onKeyDown = ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
        return true
      }
      if (event.key === 'ArrowDown') {
        selectedIndex.value = (selectedIndex.value + 1) % props.items.length
        return true
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex.value)
        return true
      }
      return false
    }

    expose({ onKeyDown })

    return () => h('div', {
      class: 'bg-background-sub border border-background-dim rounded-lg shadow-xl overflow-hidden min-w-[12rem] flex flex-col p-1 z-50'
    }, [
      props.items.length
        ? props.items.map((item, index) => h('button', {
            class: [
              'flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-left',
              index === selectedIndex.value ? 'bg-primary/10 text-primary' : 'hover:bg-background-dim text-foreground-main'
            ],
            onClick: () => selectItem(index)
          }, [
            h('img', { src: item.avatar, class: 'w-6 h-6 rounded-full bg-background-dim object-cover border border-background-dim/50' }),
            h('span', { class: 'truncate flex-1' }, item.label),
            h('span', { class: 'text-xs text-foreground-dim font-mono opacity-50' }, item.id)
          ]))
        : h('div', { class: 'p-2 text-xs text-foreground-dim text-center' }, '没有找到成员')
    ])
  }
})

// 工具函数：将 Tiptap JSON 转换为 OneBot 消息段
const convertEditorJsonToSegment = (json: any): Segment[] => {
  const segments: Segment[] = []
  if (!json.content || !Array.isArray(json.content)) return segments

  json.content.forEach((node: any) => {
    if (node.type === 'paragraph') {
      // 段落之间添加换行符（第一行除外）
      if (segments.length > 0) {
        segments.push({ type: 'text', data: { text: '\n' } })
      }
      if (node.content) {
        node.content.forEach((child: any) => {
          if (child.type === 'text') {
            segments.push({ type: 'text', data: { text: child.text } })
          } else if (child.type === 'image') {
            segments.push({ type: 'image', data: { file: child.attrs.src } })
          } else if (child.type === 'mention') {
            segments.push({ type: 'at', data: { qq: child.attrs.id } })
          }
        })
      }
    }
  })
  // [修复 1] 使用可选链 ?. 访问
  if (segments.length > 0 && segments[0]?.type === 'text' && segments[0]?.data?.text === '\n') {
    segments.shift()
  }
  return segments
}

// ----------------------------------------------------------------------
// 2. 核心逻辑
// ----------------------------------------------------------------------

const router = useRouter()
const route = useRoute()
const toast = useToast()
const messageStore = useMessageStore()
const sessionStore = useSessionStore()

// 基础状态
const id = computed(() => (route.params.id as string) || '')
const session = computed(() => sessionStore.getSession(id.value))
const list = computed(() => messageStore.messages)
const isGroup = computed(() => session.value?.type === 'group' || id.value.length > 5)

// UI 交互状态
const scrollRef = ref<HTMLElement>()
const replyTarget = ref<Message | null>(null)
const contextMsg = ref<Message | null>(null)
const showInputMenu = ref(false)
const activeTab = ref<'emoji' | 'super' | 'collection' | null>(null)
const isExpanded = ref(false)
const lottieMap = new Map<number, AnimationItem>()
const lottieRefs = new Map<number, HTMLElement>()

// Tiptap 编辑器初始化
const editor = useEditor({
  content: '',
  extensions: [
    StarterKit,
    Image.configure({
      allowBase64: true,
      inline: true,
    }),
    Placeholder.configure({
      placeholder: '请输入消息... (输入 @ 提及)',
    }),
    Mention.configure({
      HTMLAttributes: {
        class: 'text-primary font-bold bg-primary/10 rounded px-1 py-0.5 mx-0.5 decoration-clone inline-block',
      },
      suggestion: {
        items: async ({ query }: { query: string }) => {
          if (!isGroup.value) return []
          try {
            // 获取群成员列表 (实际建议走 Store 缓存)
            const list = await bot.getGroupMemberList(Number(id.value))
            const q = query.toLowerCase()
            return list
              .filter(item =>
                String(item.user_id).includes(q) ||
                (item.card && item.card.toLowerCase().includes(q)) ||
                (item.nickname && item.nickname.toLowerCase().includes(q))
              )
              .slice(0, 10)
              .map(item => ({
                id: item.user_id,
                label: item.card || item.nickname,
                avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${item.user_id}`
              }))
          } catch (e) {
            console.error('Fetch members failed', e)
            return []
          }
        },
        render: () => {
          let component: VueRenderer
          let popup: Instance[]

          return {
            onStart: (props: any) => {
              component = new VueRenderer(MentionList, { props, editor: props.editor })
              if (!props.clientRect) return

              // [修复 2] 使用 as HTMLElement 强制类型转换，确保 content 匹配类型
              popup = tippy([document.body], {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: component.element as HTMLElement,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'top-start',
                zIndex: 9999,
              })
            },
            onUpdate(props: any) {
              component.updateProps(props)
              if (!props.clientRect) return
              popup?.[0]?.setProps({ getReferenceClientRect: props.clientRect })
            },
            onKeyDown(props: any) {
              if (props.event.key === 'Escape') {
                popup?.[0]?.hide()
                return true
              }
              return component.ref?.onKeyDown(props)
            },
            onExit() {
              popup?.[0]?.destroy()
              component.destroy()
            },
          }
        },
      }
    }),
  ],
  editorProps: {
    handlePaste: (view, event) => {
      // 粘贴图片处理
      const items = event.clipboardData?.items
      if (items) {
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            const blob = item.getAsFile()
            if (blob) {
              const reader = new FileReader()
              reader.onload = (e) => {
                const src = e.target?.result as string
                // 确保 image 节点存在
                if (view.state.schema.nodes.image) {
                  view.dispatch(view.state.tr.replaceSelectionWith(
                    view.state.schema.nodes.image.create({ src })
                  ))
                }
              }
              reader.readAsDataURL(blob)
              return true
            }
          }
        }
      }
      return false
    },
    handleKeyDown: (view, event) => {
      if (event.key === 'Enter' && !event.shiftKey && !event.ctrlKey) {
        handleInputSend()
        return true
      }
      return false
    }
  }
})

// [修改点] 右键菜单 Tippy 逻辑
const menuDomRef = ref<HTMLElement | null>(null)
let menuInstance: Instance<Props> | undefined

const menuOpts = computed<MenuItem[]>(() => [
  { label: '引用', key: 'reply', icon: 'i-ri-reply-line' },
  { label: '转发', key: 'forward', icon: 'i-ri-share-forward-line' },
  { label: '多选', key: 'select', icon: 'i-ri-check-double-line' },
  { label: '撤回', key: 'recall', icon: 'i-ri-arrow-go-back-line', danger: true },
])

// 计算属性
const isMultiSelect = computed(() => messageStore.isMultiSelect)
const selectedCount = computed(() => messageStore.selectedIds.length)
const isEditorEmpty = computed(() => !editor.value || editor.value.isEmpty)
const canSend = computed(() => {
  if (isMultiSelect.value) return selectedCount.value > 0
  return !isEditorEmpty.value
})

// 菜单配置
const menuButtons = [
  { key: 'emoji', label: 'Emoji', icon: 'i-ri-emotion-line text-xl', type: 'tab' },
  { key: 'super', label: '超级表情', icon: 'i-ri-user-smile-line text-xl', type: 'tab' },
  { key: 'collection', label: '收藏表情', icon: 'i-ri-star-smile-line text-xl', type: 'tab' },
  { key: 'image', label: '图片', icon: 'i-ri-image-line text-xl', type: 'image', accept: 'image/*' },
  { key: 'file', label: '文件', icon: 'i-ri-file-line text-xl', type: 'file', accept: '*' },
] as const

// 切换输入菜单
const toggleInputMenu = () => {
  showInputMenu.value = !showInputMenu.value
  if (!showInputMenu.value) {
    activeTab.value = null
    focusEditor()
  }
}

// 处理菜单点击
const handleInputMenuClick = (btn: typeof menuButtons[number]) => {
  if (btn.type === 'tab') {
    activeTab.value = activeTab.value === btn.key ? null : btn.key
  }
}

// 聚焦编辑器
const focusEditor = () => {
  editor.value?.commands.focus()
}

// 切换展开状态
const triggerExpand = () => {
  isExpanded.value = !isExpanded.value
  nextTick(focusEditor)
}

// 取消多选
const cancelMulti = () => {
  messageStore.setMultiSelect(false)
}

// 插入 Emoji
const insertEmoji = (code: number) => {
  const emoji = String.fromCodePoint(code)
  editor.value?.commands.insertContent(emoji)
  focusEditor()
}

// 插入超级表情
const insertSuperEmoji = (id: number) => {
  const url = EmojiUtils.getNormalUrl(id)
  editor.value?.commands.setImage({ src: url })
  focusEditor()
  showInputMenu.value = false
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
    showInputMenu.value = false
    isExpanded.value = false
  }
})

// 资源清理
onBeforeUnmount(() => {
  lottieMap.forEach((anim) => anim.destroy())
  lottieMap.clear()
  lottieRefs.clear()
  editor.value?.destroy()
  menuInstance?.destroy()
})

// 滚动到底部
const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
}

// 滚动事件监听
const onScroll = (e: Event) => {
  const el = e.target as HTMLElement
  if (el.scrollTop < 50 && id.value) {
    messageStore.fetchHistory(id.value)
  }
}

// 处理输入发送
const handleInputSend = async () => {
  if (isMultiSelect.value) {
    // 多选转发跳转
    if (messageStore.selectedIds.length > 0) {
      router.push(`/${id.value}/forward`)
    }
  } else {
    // 普通消息发送
    if (isEditorEmpty.value || !editor.value) return

    // 转换富文本内容
    const segments = convertEditorJsonToSegment(editor.value.getJSON())

    // 附加引用
    if (replyTarget.value) {
      segments.unshift({ type: 'reply', data: { id: String(replyTarget.value.message_id) } })
    }

    if (segments.length === 0) return

    // 重置状态
    editor.value.commands.clearContent()
    replyTarget.value = null
    if (isExpanded.value) isExpanded.value = false

    try {
      await bot.sendMsg({
        message_type: isGroup.value ? 'group' : 'private',
        [isGroup.value ? 'group_id' : 'user_id']: Number(id.value),
        message: segments
      })
    } catch (e) {
      console.error('发送消息失败:', e)
      toast.add({ severity: 'error', summary: '发送失败', detail: String(e), life: 3000 })
    }

    nextTick(focusEditor)
  }
}

// 处理输入文件上传
const handleUploadInput = (e: Event) => {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  // 检查是否是图片类型的按钮触发
  const isImageUpload = input.accept.includes('image')

  if (isImageUpload && editor.value) {
    // 插入图片到编辑器
    const reader = new FileReader()
    reader.onload = (evt) => {
      const src = evt.target?.result as string
      editor.value?.commands.setImage({ src })
      focusEditor()
      showInputMenu.value = false
    }
    reader.readAsDataURL(file)
  } else {
    // 暂不支持编辑器内文件混排，保持原有文件上传逻辑
    toast.add({ severity: 'info', summary: '文件发送请使用群文件功能', detail: file.name, life: 2000 })
    showInputMenu.value = false
  }
}

// 戳一戳交互
const onPoke = (uid: number) => {
  bot.sendPoke({
    user_id: uid,
    group_id: isGroup.value ? Number(id.value) : undefined
  })
}

// [修改点] 右键菜单触发 (Tippy 实现)
const onContextMenu = (e: MouseEvent, msg: Message) => {
  if (messageStore.isMultiSelect) return
  e.preventDefault() // 阻止默认菜单
  contextMsg.value = msg

  // 如果 Tippy 实例不存在，创建一个
  // [修复 3] 确保 content 不为 null
  if (!menuInstance && menuDomRef.value) {
    const el = menuDomRef.value
    const content = el.firstElementChild || el

    menuInstance = tippy(document.body, {
      content: content,
      trigger: 'manual',
      placement: 'bottom-start', // 默认右键菜单位置
      interactive: true,
      arrow: false,
      offset: [0, 0],
      appendTo: document.body,
      zIndex: 9999,
      onClickOutside(instance) {
        instance.hide()
      },
      onHide() {
        contextMsg.value = null
      }
    })
  }

  // 设置虚拟元素位置并显示
  if (menuInstance) {
    menuInstance.setProps({
      getReferenceClientRect: () => ({
        width: 0,
        height: 0,
        top: e.clientY,
        bottom: e.clientY,
        left: e.clientX,
        right: e.clientX,
        x: e.clientX,
        y: e.clientY,
        toJSON: () => {}
      } as DOMRect)
    })
    menuInstance.show()
  }
}

// 菜单项选择 (Tippy 模式下，点击后手动隐藏)
const onMenuSelect = async (key: string) => {
  menuInstance?.hide() // 点击后隐藏菜单
  const msg = contextMsg.value
  if (!msg) return

  switch (key) {
    case 'reply':
      replyTarget.value = msg
      focusEditor()
      break
    case 'forward':
      messageStore.handleSelection(msg.message_id, 'only')
      if (messageStore.selectedIds.length > 0) {
        router.push(`/${id.value}/forward`)
      }
      break
    case 'select':
      messageStore.handleSelection(msg.message_id, 'only')
      break
    case 'recall':
      try {
        await bot.deleteMsg(msg.message_id)
      } catch (e) {
        toast.add({ severity: 'error', summary: '撤回失败', detail: String(e), life: 3000 })
      }
      break
  }
}

// 监听会话 ID 变化
watch(
  () => id.value,
  async (newId) => {
    if (newId) {
      replyTarget.value = null
      editor.value?.commands.clearContent()
      await messageStore.openSession(newId)
      scrollToBottom()
      // 如果是群组，可以在这里预加载群成员到 Store
    }
  },
  { immediate: true }
)

// 初始化
onMounted(() => {
  // editor mounted automatically
})
</script>

<style lang="scss">
/* Tiptap 编辑器样式修正 */
.chat-editor {
  .ProseMirror {
    outline: none;
    min-height: 2.5rem;

    p {
      margin: 0;
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 8px;
      margin: 4px 0;

      &.ProseMirror-selectednode {
        outline: 2px solid var(--primary-color);
      }
    }

    /* Placeholder 样式 */
    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--text-dim);
      pointer-events: none;
      height: 0;
    }
  }
}
</style>
