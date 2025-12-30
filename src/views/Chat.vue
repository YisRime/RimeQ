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
        <!-- 底部输入组件 -->
        <ChatInput
          v-model="inputText"
          class="z-20 shrink-0"
          :reply-target="replyTarget"
          :session-id="id"
          @send="doSend"
          @forward="goToForward"
          @clear-reply="replyTarget = null"
          @upload="handleFileUpload"
        />
        <!-- 右键上下文菜单 -->
        <ContextMenu
          v-model:show="showMenu"
          :x="menuX"
          :y="menuY"
          :options="menuOpts"
          @select="onMenuSelect"
        />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import { useMessageStore } from '@/stores/message'
import { useSessionStore } from '@/stores/session'
import { bot } from '@/api'
import type { IMessage, Segment } from '@/types'
import MsgBubble from '@/components/MsgBubble.vue'
import ContextMenu, { type MenuItem } from '@/components/ContextMenu.vue'
import ChatInput from '@/components/ChatInput.vue'

defineOptions({ name: 'ChatView' })

// 核心依赖
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
const inputText = ref('')
const scrollRef = ref<HTMLElement>()
const replyTarget = ref<IMessage | null>(null)
const contextMsg = ref<IMessage | null>(null)

// 菜单位置状态
const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)

// 菜单配置项
const menuOpts = computed<MenuItem[]>(() => [
  { label: '引用', key: 'reply', icon: 'i-ri-reply-line' },
  { label: '转发', key: 'forward', icon: 'i-ri-share-forward-line' },
  { label: '多选', key: 'select', icon: 'i-ri-check-double-line' },
  { label: '撤回', key: 'recall', icon: 'i-ri-arrow-go-back-line', danger: true },
])

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

// 发送消息逻辑
const doSend = async () => {
  const content = inputText.value.trim()
  if (!content) return

  // 构建消息链
  const chain: Segment[] = []
  if (replyTarget.value) {
    chain.push({ type: 'reply', data: { id: String(replyTarget.value.message_id) } })
  }
  chain.push({ type: 'text', data: { text: content } })

  // 重置状态
  inputText.value = ''
  replyTarget.value = null

  try {
    await bot.sendMsg({
      message_type: isGroup.value ? 'group' : 'private',
      [isGroup.value ? 'group_id' : 'user_id']: Number(id.value),
      message: chain
    })
  } catch (e) {
    console.error('发送消息失败:', e)
    toast.add({ severity: 'error', summary: '发送失败', detail: String(e), life: 3000 })
  }
}

// 文件上传
const handleFileUpload = (file: File) => {
  toast.add({ severity: 'info', summary: '正在上传', detail: file.name, life: 2000 })
}

// 戳一戳交互
const onPoke = (uid: number) => {
  if (isGroup.value) bot.groupPoke(Number(id.value), uid)
  else bot.friendPoke(uid)
}

// 多选转发
const goToForward = () => {
  if (messageStore.selectedIds.length > 0) {
    router.push(`/${id.value}/forward`)
  }
}

// 右键菜单触发
const onContextMenu = (e: MouseEvent, msg: IMessage) => {
  if (messageStore.isMultiSelect) return
  contextMsg.value = msg
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

// 菜单项选择
const onMenuSelect = async (key: string) => {
  const msg = contextMsg.value
  if (!msg) return

  switch (key) {
    case 'reply':
      replyTarget.value = msg
      break
    case 'forward':
      messageStore.handleSelection(msg.message_id, 'only')
      goToForward()
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
      inputText.value = ''
      await messageStore.openSession(newId)
      scrollToBottom()
    }
  },
  { immediate: true }
)
</script>
