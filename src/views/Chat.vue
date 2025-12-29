<template>
  <div class="flex size-full relative overflow-hidden">
    <!-- 主聊天容器 -->
    <main class="flex-1 h-full min-w-0 relative ui-flex-col-full">
      <!-- 空状态 -->
      <div v-if="!id" class="ui-flex-y size-full ui-text-foreground-dim opacity-50 select-none">
        <div class="w-24 h-24 ui-bg-background-dim/30 rounded-full ui-flex-center mb-6">
          <div class="i-ri-message-3-line text-5xl" />
        </div>
        <span class="text-lg font-medium">RimeQ</span>
        <span class="text-xs mt-2">选择一个聊天开始对话</span>
      </div>

      <!-- 会话活跃状态 -->
      <div v-else class="ui-flex-col-full h-full relative ui-trans">
        <!-- 消息列表滚动区域 -->
        <div
          id="msgPan"
          ref="scrollRef"
          class="flex-1 overflow-y-auto p-4 md:p-6 ui-scrollbar scroll-smooth z-0"
          @scroll="onScroll"
        >
          <div v-if="messageStore.isLoading" class="ui-flex-center py-6">
            <div class="i-ri-loader-4-line animate-spin text-primary text-2xl" />
          </div>

          <!-- 使用 toggle 模式处理点击选择 -->
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

        <!-- 底部输入与操作组件 -->
        <ChatInput
          v-model="inputText"
          :reply-target="replyTarget"
          :session-id="id"
          @send="doSend"
          @forward="goToForward"
          @clear-reply="replyTarget = null"
          @show-history="showHistory = true"
          @upload="handleFileUpload"
        />

        <!-- 消息右键菜单 -->
        <ContextMenu v-model:show="showMenu" :x="menuX" :y="menuY" :options="menuOpts" @select="onMenuSelect" />
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
import type { IMessage, MessageSegment } from '@/types'
import MsgBubble from '@/components/MsgBubble.vue'
import ContextMenu, { type MenuItem } from '@/components/ContextMenu.vue'
import ChatInput from '@/components/ChatInput.vue'

defineOptions({ name: 'ChatView' })

const router = useRouter()
const route = useRoute()
const toast = useToast()
const messageStore = useMessageStore()
const sessionStore = useSessionStore()

const id = computed(() => (route.params.id as string) || '')
const session = computed(() => sessionStore.getSession(id.value))
const list = computed(() => messageStore.messages) // 注意：现在是 shallowRef，用法不变
const isGroup = computed(() => session.value?.type === 'group' || id.value.length > 5)

const inputText = ref('')
const scrollRef = ref<HTMLElement>()
const replyTarget = ref<IMessage | null>(null)
const showHistory = ref(false)
const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const contextMsg = ref<IMessage | null>(null)

// 滚动至消息列表底部
const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
}

// 触顶加载历史
const onScroll = (e: Event) => {
  const el = e.target as HTMLElement
  if (el.scrollTop < 50 && id.value) messageStore.fetchHistory(id.value)
}

// 核心发送逻辑
const doSend = async () => {
  const content = inputText.value.trim()
  if (!content) return

  const chain: MessageSegment[] = []
  if (replyTarget.value) {
    chain.push({ type: 'reply', data: { id: String(replyTarget.value.message_id) } })
  }
  chain.push({ type: 'text', data: { text: content } })

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

// 处理文件上传
const handleFileUpload = async (file: File) => {
  toast.add({ severity: 'info', summary: '正在上传...', detail: file.name, life: 2000 })
}

// 戳一戳
const onPoke = (uid: number) => {
  if (isGroup.value) bot.groupPoke(Number(id.value), uid)
  else bot.friendPoke(uid)
}

// 跳转多选转发
const goToForward = () => {
  if (messageStore.selectedIds.length === 0) return
  router.push(`/${id.value}/forward`)
}

// 右键菜单
const menuOpts = computed<MenuItem[]>(() => [
  { label: '引用', key: 'reply', icon: 'i-ri-reply-line' },
  { label: '转发', key: 'forward', icon: 'i-ri-share-forward-line' },
  { label: '多选', key: 'select', icon: 'i-ri-check-double-line' },
  { label: '撤回', key: 'recall', icon: 'i-ri-arrow-go-back-line', danger: true },
])

const onContextMenu = (e: MouseEvent, msg: IMessage) => {
  if (messageStore.isMultiSelect) return
  contextMsg.value = msg
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

// 菜单动作处理
const onMenuSelect = async (key: string) => {
  if (!contextMsg.value) return
  const msg = contextMsg.value
  switch (key) {
    case 'reply':
      replyTarget.value = msg
      break
    case 'forward':
      // 仅选中当前并跳转
      messageStore.handleSelection(msg.message_id, 'only')
      goToForward()
      break
    case 'select':
      // 仅选中当前并开启多选
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
