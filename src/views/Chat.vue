<template>
  <div class="flex size-full relative overflow-hidden">
    <!-- 主聊天窗口 -->
    <main class="flex-1 h-full min-w-0 relative ui-flex-col-full">
      <!-- 空状态，未选择任何会话时显示 -->
      <div v-if="!id" class="ui-flex-y size-full ui-text-foreground-dim opacity-50 select-none">
        <div class="w-24 h-24 ui-bg-background-dim/30 rounded-full ui-flex-center mb-6">
          <div class="i-ri-message-3-line text-5xl" />
        </div>
        <span class="text-lg font-medium">RimeQ</span>
        <span class="text-xs mt-2">选择一个聊天开始对话</span>
      </div>

      <!-- 会话区域 -->
      <div v-else class="ui-flex-col-full h-full relative ui-trans ui-dur-normal">
        <!-- 消息列表 -->
        <div
          id="msgPan"
          ref="scrollRef"
          class="flex-1 overflow-y-auto p-4 md:p-6 ui-scrollbar scroll-smooth z-0"
          @scroll="onScroll"
        >
          <!-- 历史消息加载指示器 -->
          <div v-if="messageStore.isLoading" class="ui-flex-center py-6">
            <div class="i-ri-loader-4-line animate-spin text-primary text-2xl" />
          </div>

          <!-- 消息气泡列表 -->
          <MsgBubble
            v-for="(msg, index) in list"
            :key="msg.message_id || index"
            :msg="msg"
            :selection-mode="isMultiSelect"
            :is-selected="selectedIds.includes(msg.message_id)"
            @contextmenu="onContextMenu"
            @poke="onPoke"
            @select="toggleSelect"
          />
        </div>

        <!-- 多选操作悬浮栏 -->
        <transition enter-active-class="ui-anim-scale-in ui-dur-fast" leave-active-class="ui-anim-scale-out ui-dur-fast">
          <div
            v-if="isMultiSelect"
            class="absolute bottom-24 left-1/2 -translate-x-1/2 ui-bg-background-main/90 backdrop-blur shadow-xl rounded-full px-6 py-2.5 ui-flex-x gap-6 border ui-border-background-dim z-50 select-none"
          >
            <div class="text-sm font-bold border-r pr-6 ui-border-background-dim ui-text-foreground-main">
              已选 {{ selectedIds.length }} 项
            </div>
            <div class="ui-flex-center gap-1 ui-ia hover:text-primary" @click="goToForward">
              <div class="i-ri-share-forward-line text-lg" />
              <span class="text-xs">转发</span>
            </div>
            <div class="ui-flex-center gap-1 ui-ia hover:text-red-500" @click="isMultiSelect = false">
              <div class="i-ri-close-circle-line text-lg" />
              <span class="text-xs">取消</span>
            </div>
          </div>
        </transition>

        <!-- 输入区域 -->
        <div v-if="!isMultiSelect" class="flex flex-col h-auto ui-bg-background-sub border-t ui-border-background-dim/50 z-20 relative">
          <!-- 回复消息预览 -->
          <div
            v-if="replyTarget"
            class="px-4 py-2 ui-bg-background-dim/20 ui-flex-between text-xs ui-text-foreground-sub border-b ui-border-background-dim/50"
          >
            <div class="ui-flex-truncate max-w-[85%] ui-flex-x gap-2">
              <div class="w-0.5 h-3 bg-primary rounded-full" />
              <span
                >回复 <span class="font-bold ui-text-foreground-main">@{{ replyTarget.sender.nickname }}</span> :
                {{ getSummary(replyTarget) }}</span
              >
            </div>
            <div
              class="i-ri-close-line ui-ia hover:text-red-500 text-base p-0.5 rounded hover:ui-bg-background-dim/50"
              @click="replyTarget = null"
            />
          </div>

          <!-- 输入工具栏 -->
          <InputTool :session-id="id" @insert="onInsert" @history="showHistory = true" />

          <!-- 文本输入框 -->
          <div class="flex-1 px-4 pb-3 flex flex-col min-h-[120px] relative">
            <textarea
              ref="inputRef"
              v-model="inputText"
              class="flex-1 w-full bg-transparent resize-none outline-none text-sm leading-6 ui-scrollbar placeholder-foreground-dim ui-text-foreground-main py-2 font-sans"
              placeholder="发送消息 (Ctrl+Enter 发送)"
              @keydown.enter.ctrl.prevent="doSend"
            />
            <div class="flex justify-end pb-1">
              <Button size="small" :disabled="!inputText.trim()" @click="doSend" class="!px-4 !py-1.5 !text-xs !font-bold">
                发送
              </Button>
            </div>
          </div>
        </div>

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
import Button from 'primevue/button'
import { useMessageStore } from '@/stores/message'
import { useSessionStore } from '@/stores/session'
import { bot } from '@/api'
import { determineMsgType } from '@/utils/msg-parser'
import { MsgType } from '@/types'
import type { ChatMsg } from '@/utils/msg-parser'
import MsgBubble from '@/components/MsgBubble.vue'
import ContextMenu, { type MenuItem } from '@/components/ContextMenu.vue'
import InputTool from '@/components/InputHelper.vue'

// 组件选项定义
defineOptions({ name: 'ChatView' })

// Vue-Router 实例
const router = useRouter()
// 当前路由信息
const route = useRoute()
// PrimeVue 的 Toast 服务
const toast = useToast()

// Pinia stores
const messageStore = useMessageStore()
const sessionStore = useSessionStore()

// 响应式状态
const id = computed(() => (route.params.id as string) || '')
const session = computed(() => sessionStore.getSession(id.value))
const list = computed(() => messageStore.messages)
const isGroup = computed(() => session.value?.type === 'group' || id.value.length > 5)

const inputText = ref('')
const scrollRef = ref<HTMLElement>()
const inputRef = ref<HTMLTextAreaElement>()

// UI 交互状态
const isMultiSelect = ref(false)
const selectedIds = ref<number[]>([])
const replyTarget = ref<ChatMsg | null>(null)
const showHistory = ref(false)

// 切换消息的选中状态
const toggleSelect = (msgId: number) => {
  const idx = selectedIds.value.indexOf(msgId)
  if (idx > -1) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(msgId)
}

// 滚动消息列表到底部
const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
}

// 监听滚动事件，用于加载历史消息
const onScroll = (e: Event) => {
  const el = e.target as HTMLElement
  if (el.scrollTop < 50 && id.value) messageStore.fetchCloudHistory(id.value)
}

// 发送消息
const doSend = () => {
  if (!inputText.value.trim()) return
  messageStore.sendMessage(id.value, inputText.value, replyTarget.value?.message_id)
  inputText.value = ''
  replyTarget.value = null
}

// 在输入框光标处插入文本
const onInsert = (str: string) => {
  inputText.value += str
  inputRef.value?.focus()
}

// 发送戳一戳
const onPoke = (uid: number) => {
  if (isGroup.value) bot.groupPoke(Number(id.value), uid)
  else bot.friendPoke(uid)
}

// 跳转到合并转发页面
const goToForward = () => {
  if (selectedIds.value.length === 0) return
  router.push({
    path: `/${id.value}/forward`,
    query: { ids: selectedIds.value.join(',') },
  })
}

// 右键菜单状态
const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const contextMsg = ref<ChatMsg | null>(null)

// 计算右键菜单的选项
const menuOpts = computed<MenuItem[]>(() => [
  { label: '引用', key: 'reply', icon: 'i-ri-reply-line' },
  { label: '转发', key: 'forward', icon: 'i-ri-share-forward-line' },
  { label: '多选', key: 'select', icon: 'i-ri-check-double-line' },
  { label: '撤回', key: 'recall', icon: 'i-ri-arrow-go-back-line', danger: true },
])

// 打开并定位右键菜单
const onContextMenu = (e: MouseEvent, msg: ChatMsg) => {
  if (isMultiSelect.value) return
  contextMsg.value = msg
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

// 处理右键菜单的点击事件
const onMenuSelect = (key: string) => {
  if (!contextMsg.value) return
  const msg = contextMsg.value
  switch (key) {
    case 'reply':
      replyTarget.value = msg
      inputRef.value?.focus()
      break
    case 'forward':
      router.push({ path: `/${id.value}/forward`, query: { ids: String(msg.message_id) } })
      break
    case 'select':
      isMultiSelect.value = true
      selectedIds.value = [msg.message_id]
      break
    case 'recall':
      bot
        .deleteMsg(msg.message_id)
        .then(() => {
          messageStore.recallMessage(msg.message_id)
        })
        .catch(() => toast.add({ severity: 'error', summary: '撤回失败', life: 3000 }))
      break
  }
}

// 获取消息内容的简短摘要
const getSummary = (msg: ChatMsg) => {
  const type = determineMsgType(msg.message)
  if (type === MsgType.Text) {
    const txt = msg.message
      .filter((s) => s.type === 'text')
      .map((s) => s.data.text)
      .join('')
    return txt.slice(0, 20) + (txt.length > 20 ? '...' : '')
  }
  return `[${type}]`
}

// 监听会话 ID 变化
watch(
  () => id.value,
  async (newId) => {
    if (newId) {
      isMultiSelect.value = false
      replyTarget.value = null
      inputText.value = ''
      await messageStore.openSession(newId)
      scrollToBottom()
    }
  },
  { immediate: true }
)

// 监听消息列表长度变化，自动滚动到底部
watch(
  () => list.value.length,
  (n, o) => {
    if (n > o) scrollToBottom()
  }
)
</script>
