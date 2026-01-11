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
              :show-raw="rawJsonId.has(msg.message_id)"
              @contextmenu="(e) => onContextMenu(e, msg)"
              @poke="onPoke"
              @select="(mid) => messageStore.setMultiSelect(mid)"
              @mention="onInsertMention"
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
          ref="chatInputRef"
          :chat-id="id"
          :is-group="isGroup"
          @send="scrollToBottom(true)"
        />
        <!-- 右键菜单 -->
        <ContextMenu
          ref="contextMenu"
          :model="menuItems"
          :pt="{ root: { class: '!min-w-0 w-auto !rounded-lg bg-background-sub/95 backdrop-blur border border-background-dim/50 shadow-xl z-50' } }"
        >
          <template #item="{ item, props }">
            <a
              v-bind="props.action"
              class="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer select-none transition-colors"
              :class="item.class || 'text-foreground-main hover:bg-background-dim/50'"
            >
              <span
                v-if="item.icon"
                :class="[item.icon, 'text-sm opacity-80 shrink-0']"
              />
              <span class="whitespace-nowrap text-sm font-medium">
                {{ item.label }}
              </span>
            </a>
          </template>
        </ContextMenu>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ContextMenu } from 'primevue'
import { useIntersectionObserver } from '@vueuse/core'

import { bot } from '@/api'
import { useMessageStore, useSessionStore, useContactStore, useSettingStore } from '@/stores'
import type { Message } from '@/types'
import MsgBubble from '@/components/MsgBubble.vue'
import ChatInput from '@/components/ChatInput.vue'

defineOptions({ name: 'ChatView' })

// 全局实例
const router = useRouter()
const route = useRoute()
const messageStore = useMessageStore()
const sessionStore = useSessionStore()
const contactStore = useContactStore()
const settingStore = useSettingStore()

// 会话上下文
const id = computed(() => (route.params.id as string) || '') // 当前会话 ID
const session = computed(() => sessionStore.getSession(id.value)) // 当前会话对象
const list = computed(() => messageStore.messages) // 当前会话消息列表
const isGroup = computed(() => !!id.value && (session.value?.type === 'group' || contactStore.checkIsGroup(id.value))) // 当前会话是否为群聊

// UI 状态
const contextMenu = ref() // 右键菜单实例
const contextMsg = ref<Message | null>(null) // 右键菜单目标消息
const markdownId = ref(new Set<number>()) // Markdown 渲染消息 ID
const rawJsonId = ref(new Set<number>()) // 原始数据渲染消息 ID

// DOM 引用
const scrollRef = ref<HTMLElement>() // 消息列表滚动容器
const bottomRef = ref<HTMLElement>() // 底部按钮检测容器
const chatInputRef = ref<InstanceType<typeof ChatInput>>() // 输入框组件引用

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

// 滚动触底
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
  rawJsonId.value.clear()
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

// 发送戳一戳
const onPoke = (uid: number) => {
  bot.sendPoke({ user_id: uid, group_id: isGroup.value ? Number(id.value) : undefined })
}

// 插入提及
const onInsertMention = (item: { id: string, name: string }) => {
  if (chatInputRef.value) chatInputRef.value.insertMention(item.id, item.name)
}

// 点击右键菜单
const onContextMenu = (e: MouseEvent, msg: Message) => {
  if (messageStore.isMultiSelect) return
  contextMsg.value = msg
  contextMenu.value.show(e)
}

// 菜单选项
const menuItems = computed(() => {
  const m = contextMsg.value
  if (!m) return []
  // 是否可撤回
  const isMe = m.sender.user_id === settingStore.user?.user_id
  let showRecall = isMe
  if (isGroup.value && !showRecall) {
    const members = contactStore.members.get(Number(id.value))
    const myRole = members?.find(u => u.user_id === settingStore.user?.user_id)?.role || 'member'
    if (myRole !== 'member') showRecall = true
  } else if (!isGroup.value) {
    showRecall = true
  }
  const items: any[] = [
    { label: '引用', icon: 'i-ri-reply-line', command: () => messageStore.setReplyTarget(m) },
    { label: '多选', icon: 'i-ri-check-double-line', command: () => messageStore.setMultiSelect(m.message_id) },
    {
      label: '转发',
      icon: 'i-ri-share-forward-line',
      command: () => {
        messageStore.setMultiSelect(m.message_id)
        if (messageStore.selectedIds.length) router.push(`/${id.value}/forward`)
      }
    }
  ]
  if (showRecall) {
    items.push({
      label: '撤回',
      icon: 'i-ri-arrow-go-back-line',
      class: 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20',
      command: () => bot.deleteMsg(m.message_id)
    })
  }
  items.push(
    { separator: true },
    {
      label: 'Markdown',
      icon: markdownId.value.has(m.message_id) ? 'i-ri-markdown-fill' : 'i-ri-markdown-line',
      class: markdownId.value.has(m.message_id) ? 'text-primary bg-primary/10' : '',
      command: () => markdownId.value.has(m.message_id) ? markdownId.value.delete(m.message_id) : markdownId.value.add(m.message_id)
    },
    {
      label: 'Raw Json',
      icon: rawJsonId.value.has(m.message_id) ? 'i-ri-code-s-slash-fill' : 'i-ri-code-s-slash-line',
      class: rawJsonId.value.has(m.message_id) ? 'text-primary bg-primary/10' : '',
      command: () => rawJsonId.value.has(m.message_id) ? rawJsonId.value.delete(m.message_id) : rawJsonId.value.add(m.message_id)
    }
  )
  return items
})
</script>
