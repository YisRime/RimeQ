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
          class="flex-1 overflow-y-auto px-3 md:px-4 ui-scrollbar relative"
          @scroll="onScroll"
        >
          <!-- 消息流容器 -->
          <div class="flex flex-col gap-3 pb-4 pt-4 relative" style="overflow-anchor: auto">
            <MsgBubble
              v-for="(msg, index) in list"
              :key="msg.message_id || index"
              :msg="msg"
              :selection-mode="messageStore.isMultiSelect"
              :is-selected="messageStore.selectedIds.includes(msg.message_id)"
              :force-markdown="markdownId.has(msg.message_id)"
              @contextmenu="onContextMenu"
              @poke="onPoke"
              @select="(mid) => messageStore.setMultiSelect(mid)"
            />
            <!-- 底部按钮检测 -->
            <div
              ref="bottomRef"
              class="absolute bottom-0 left-0 w-full h-[256px] pointer-events-none opacity-0"
            />
          </div>
        </div>
        <!-- 回到底部按钮 -->
        <div
          v-if="showScroll"
          class="absolute bottom-20 right-6 z-20 cursor-pointer bg-primary text-primary-content text-xs px-3 py-2 rounded-full shadow-lg hover:bg-primary-hover active:scale-95 transition-all flex items-center gap-1 select-none"
          @click="scrollToBottom(true)"
        >
          <div class="i-ri-arrow-down-double-line" />
          <span v-if="newMsgCount > 0" class="font-bold">{{ newMsgCount }}</span>
        </div>
        <!-- 底部输入区域 -->
        <ChatInput
          :chat-id="id"
          :is-group="isGroup"
          @send="scrollToBottom(true)"
        />
        <!-- 右键菜单容器 -->
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
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue'
import { useIntersectionObserver } from '@vueuse/core'
import tippy, { type Instance, type Props } from 'tippy.js'

import { bot } from '@/api'
import { useMessageStore, useSessionStore, useContactStore, useSettingStore } from '@/stores'
import type { Message } from '@/types'
import MsgBubble from '@/components/MsgBubble.vue'
import ChatInput from '@/components/ChatInput.vue'
import ContextMenu, { type MenuItem } from '@/components/ContextMenu.vue'

defineOptions({ name: 'ChatView' })

// 全局实例
const router = useRouter()
const route = useRoute()
const toast = useToast()
const messageStore = useMessageStore()
const sessionStore = useSessionStore()
const contactStore = useContactStore()
const settingStore = useSettingStore()

// 会话上下文
const id = computed(() => (route.params.id as string) || '') // 当前会话 ID
const session = computed(() => sessionStore.getSession(id.value)) // 当前会话对象
const list = computed(() => messageStore.messages) // 当前会话消息列表
const isGroup = computed(() => !!id.value && (session.value?.type === 'group' || contactStore.checkIsGroup(id.value))) // 当前会话是否为群聊

// UI 状态管理
const contextMsg = ref<Message | null>(null) // 右键菜单的目标消息
let menuInstance: Instance<Props> | undefined // Tippy.js 菜单实例
const markdownId = ref(new Set<number>()) // Markdown 渲染消息 ID

// DOM 引用
const scrollRef = ref<HTMLElement>() // 消息列表滚动容器
const bottomRef = ref<HTMLElement>() // 底部按钮检测容器
const menuDomRef = ref<HTMLElement | null>(null) // 右键菜单 DOM 容器

// 滚动状态
const showScroll = ref(false) // 显示回到底部按钮
const newMsgCount = ref(0) // 新消息数量

// 底部检测
useIntersectionObserver(bottomRef, ([entry]) => {
  if (!entry) return
  const isNearBottom = entry.isIntersecting
  showScroll.value = !isNearBottom
  if (isNearBottom) newMsgCount.value = 0
}, { root: scrollRef.value })

// 滚动到底部
const scrollToBottom = async (smooth = true) => {
  await nextTick()
  if (scrollRef.value) {
    const el = scrollRef.value
    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'instant'
    })
  }
}

// 滚动事件监听
const onScroll = async (e: Event) => {
  const el = e.target as HTMLElement
  if (messageStore.isLoading || list.value.length === 0) return
  if (el.scrollTop < 512 && id.value) await messageStore.fetchHistory(id.value)
}

// 生命周期监听
watch(() => id.value, (v) => {
  if (v) messageStore.openSession(v)
  markdownId.value.clear()
}, { immediate: true })

// 消息列表监听
watch(() => list.value, async (newVal, oldVal) => {
  const newLen = newVal.length
  const oldLen = oldVal?.length || 0
  if (newLen <= oldLen) return
  if (oldLen === 0) return
  const newLastId = newVal[newLen - 1]?.message_id
  const oldLastId = oldVal?.[oldLen - 1]?.message_id
  if (newLastId === oldLastId) return
  const lastMsg = newVal[newLen - 1]
  const isMe = lastMsg?.sender.user_id === settingStore.user?.user_id
  if (isMe || !showScroll.value) {
    await scrollToBottom(true)
  } else {
    newMsgCount.value += (newLen - oldLen)
  }
})

onBeforeUnmount(() => {
  menuInstance?.destroy()
})

// 选项定义
const menuOpts = computed<MenuItem[]>(() => [
  { label: '引用', key: 'reply', icon: 'i-ri-reply-line' },
  { label: '多选', key: 'select', icon: 'i-ri-check-double-line' },
  { label: '转发', key: 'forward', icon: 'i-ri-share-forward-line' },
  { label: 'Markdown', key: 'markdown', icon: 'i-ri-markdown-line' },
  { label: '撤回', key: 'recall', icon: 'i-ri-arrow-go-back-line', danger: true },
])

// 发送戳一戳
const onPoke = (uid: number) => {
  bot.sendPoke({ user_id: uid, group_id: isGroup.value ? Number(id.value) : undefined })
}

// 处理气泡点击
const onContextMenu = (e: MouseEvent, msg: Message) => {
  if (messageStore.isMultiSelect) return
  e.preventDefault()
  contextMsg.value = msg
  if (!menuInstance && menuDomRef.value) {
    menuInstance = tippy(document.body, {
      content: menuDomRef.value,
      trigger: 'manual',
      placement: 'bottom-start',
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
  menuInstance?.setProps({
    getReferenceClientRect: () => ({
      width: 0,
      height: 0,
      top: e.clientY,
      bottom: e.clientY,
      left: e.clientX,
      right: e.clientX,
      x: e.clientX,
      y: e.clientY,
      toJSON() {}
    } as any)
  })
  menuInstance?.show()
}

// 处理选项点击
const onMenuSelect = async (k: string) => {
  menuInstance?.hide()
  const m = contextMsg.value
  if (!m) return
  if (k === 'reply') {
    messageStore.setReplyTarget(m)
  } else if (k === 'forward') {
    messageStore.setMultiSelect(m.message_id)
    if (messageStore.selectedIds.length) router.push(`/${id.value}/forward`)
  } else if (k === 'markdown') {
    if (markdownId.value.has(m.message_id)) {
      markdownId.value.delete(m.message_id)
    } else {
      markdownId.value.add(m.message_id)
    }
  } else if (k === 'select') {
    messageStore.setMultiSelect(m.message_id)
  } else if (k === 'recall') {
    await bot.deleteMsg(m.message_id).catch(e => toast.add({ severity: 'error', summary: '撤回失败', detail: String(e), life: 3000 }))
  }
}
</script>
