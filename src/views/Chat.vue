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
              @select="(mid) => messageStore.setMultiSelect(mid)"
            />
          </div>
        </div>
        <!-- 底部输入区域容器 -->
        <ChatInput
          :chat-id="id"
          :is-group="isGroup"
          @send="scrollToBottom"
        />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue'
import tippy, { type Instance, type Props } from 'tippy.js'

import { bot } from '@/api'
import { useMessageStore, useSessionStore, useContactStore } from '@/stores'
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

// 会话上下文
const id = computed(() => (route.params.id as string) || '') // 当前会话ID
const session = computed(() => sessionStore.getSession(id.value)) // 当前会话对象
const list = computed(() => messageStore.messages) // 当前会话的消息列表
const isGroup = computed(() => { // 判断当前会话是否为群聊
  if (!id.value) return false
  if (session.value) return session.value.type === 'group'
  return contactStore.checkIsGroup(id.value)
})

// UI 状态管理
const contextMsg = ref<Message | null>(null) // 右键菜单的目标消息
let menuInstance: Instance<Props> | undefined // Tippy.js 菜单实例

// DOM 引用
const scrollRef = ref<HTMLElement>() // 消息列表滚动容器
const menuDomRef = ref<HTMLElement | null>(null) // 右键菜单 DOM 模板

// 滚动冷却状态
const loadingCoolDown = ref(false)
// 滚动到底部
const scrollToBottom = async (force = false) => {
  await nextTick()
  if (scrollRef.value) {
    const { scrollHeight, scrollTop, clientHeight } = scrollRef.value
    if (force || (scrollHeight - scrollTop - clientHeight < 200)) {
      scrollRef.value.scrollTop = scrollRef.value.scrollHeight
    }
  }
}

// 滚动事件监听
const onScroll = async (e: Event) => {
  if (messageStore.isLoading || messageStore.messages.length === 0 || loadingCoolDown.value) {
    return
  }
  const el = e.target as HTMLElement
  // 滚动到顶部时触发加载
  if (el.scrollTop < 50 && id.value) {
    loadingCoolDown.value = true
    const oldScrollHeight = el.scrollHeight
    const oldScrollTop = el.scrollTop
    const hasNewData = await messageStore.fetchHistory(id.value)
    await nextTick()
    if (hasNewData) {
      // 保持滚动位置
      el.scrollTop = el.scrollHeight - oldScrollHeight + oldScrollTop
      setTimeout(() => { loadingCoolDown.value = false }, 1000)
    } else {
      // 没有新数据，则延长冷却时间
      setTimeout(() => { loadingCoolDown.value = false }, 3000)
    }
  }
}

// 生命周期监听
watch(() => id.value, async (v) => { // 侦听会话 ID 变化
  if (v) {
    await messageStore.openSession(v) // 打开新会话
    await scrollToBottom(true) // 滚动到底部
  }
}, { immediate: true })

onBeforeUnmount(() => {
  menuInstance?.destroy()
})

// ============================================================================
// 右键菜单
// ============================================================================

// 选项定义
const menuOpts = computed<MenuItem[]>(() => [
  { label: '引用', key: 'reply', icon: 'i-ri-reply-line' },
  { label: '转发', key: 'forward', icon: 'i-ri-share-forward-line' },
  { label: '戳一戳', key: 'poke', icon: 'i-ri-hand-coin-line' },
  { label: '多选', key: 'select', icon: 'i-ri-check-double-line' },
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
  } else if (k === 'poke') {
    onPoke(m.sender.user_id)
  } else if (k === 'select') {
    messageStore.setMultiSelect(m.message_id)
  } else if (k === 'recall') {
    try {
      await bot.deleteMsg(m.message_id)
    } catch(e) {
      toast.add({ severity: 'error', summary: '撤回失败', detail: String(e), life: 3000 })
    }
  }
}
</script>
