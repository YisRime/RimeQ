<template>
  <div class="flex h-full w-full relative overflow-hidden">
    <!-- === 主聊天窗口 === -->
    <main class="flex-1 h-full min-w-0 relative flex flex-col">
      <!-- 空状态 -->
      <div v-if="!id" class="flex-center flex-col h-full text-dim opacity-50 select-none">
        <div class="w-24 h-24 bg-dim/30 rounded-full flex-center mb-6">
          <div class="i-ri-message-3-line text-5xl" />
        </div>
        <span class="text-lg font-medium">RimeQ</span>
        <span class="text-xs mt-2">选择一个聊天开始对话</span>
      </div>

      <!-- 会话区域 -->
      <div v-else class="flex flex-col h-full relative my-trans">
        <!-- 消息列表 -->
        <div
          id="msgPan"
          ref="scrollRef"
          class="flex-1 overflow-y-auto p-4 md:p-6 my-scrollbar scroll-smooth z-0"
          @scroll="onScroll"
        >
          <!-- 加载中 -->
          <div v-if="messageStore.isLoading.value[id]" class="flex-center py-6">
            <div class="i-ri-loader-4-line animate-spin text-primary text-2xl" />
          </div>

          <!-- 消息气泡 -->
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

        <!-- 多选悬浮栏 -->
        <transition name="my-fade">
          <div
            v-if="isMultiSelect"
            class="absolute bottom-24 left-1/2 -translate-x-1/2 bg-main/90 backdrop-blur shadow-xl rounded-full px-6 py-2.5 flex-x gap-6 border border-dim z-50 select-none"
          >
            <div class="text-sm font-bold border-r pr-6 border-dim text-main">已选 {{ selectedIds.length }} 项</div>
            <div
              class="flex-center gap-1 cursor-pointer hover:text-primary transition-colors"
              @click="goToForward"
            >
               <div class="i-ri-share-forward-line text-lg" />
               <span class="text-xs">转发</span>
            </div>
            <div
              class="flex-center gap-1 cursor-pointer hover:text-red-500 transition-colors"
              @click="isMultiSelect = false"
            >
              <div class="i-ri-close-circle-line text-lg" />
              <span class="text-xs">取消</span>
            </div>
          </div>
        </transition>

        <!-- 输入区 -->
        <div v-if="!isMultiSelect" class="flex flex-col h-auto bg-sub border-t border-dim/50 z-20 relative">
          <!-- 引用回复展示 -->
          <div v-if="replyTarget" class="px-4 py-2 bg-dim/20 flex-between text-xs text-sub border-b border-dim/50">
            <div class="truncate max-w-[85%] flex-x gap-2">
              <div class="w-0.5 h-3 bg-primary rounded-full" />
              <span>回复 <span class="font-bold text-main">@{{ replyTarget.sender.nickname }}</span> : {{ getSummary(replyTarget) }}</span>
            </div>
            <div
              class="i-ri-close-line cursor-pointer hover:text-red-500 text-base p-0.5 rounded hover:bg-dim/50"
              @click="replyTarget = null"
            />
          </div>

          <!-- 工具栏 -->
          <InputTool :session-id="id" @insert="onInsert" @history="showHistory = true" />

          <!-- 输入框 -->
          <div class="flex-1 px-4 pb-3 flex flex-col min-h-[120px] relative">
            <textarea
              ref="inputRef"
              v-model="inputText"
              class="flex-1 w-full bg-transparent resize-none outline-none text-sm leading-6 my-scrollbar placeholder-dim text-main py-2 font-sans"
              placeholder="发送消息 (Ctrl+Enter 发送)"
              @keydown.enter.ctrl.prevent="doSend"
            />
            <div class="flex justify-end pb-1">
               <Button
                 size="small"
                 :disabled="!inputText.trim()"
                 @click="doSend"
                 class="!px-4 !py-1.5 !text-xs !font-bold"
               >
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
/**
 * 聊天核心视图
 * 负责消息列表展示、输入交互与多选逻辑
 */
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import { useMessageStore } from '@/stores/message'
import { useSessionStore } from '@/stores/session'
import { bot } from '@/api'
import { determineMsgType } from '@/utils/msg-parser'
import { MsgType } from '@/types'

// Components
import MsgBubble from '@/components/MsgBubble.vue'
import ContextMenu, { type MenuItem } from '@/components/ContextMenu.vue'
import InputTool from '@/components/InputHelper.vue'

defineOptions({ name: 'ChatView' })

const router = useRouter()
const route = useRoute()
const toast = useToast()

const messageStore = useMessageStore()
const sessionStore = useSessionStore()

// --- State ---
const id = computed(() => (route.params.id as string) || '')
const session = computed(() => sessionStore.getSession(id.value))
const list = computed(() => messageStore.messages)
const isGroup = computed(() => session.value?.type === 'group' || id.value.length > 5)

const inputText = ref('')
const scrollRef = ref<HTMLElement>()
const inputRef = ref<HTMLTextAreaElement>()

// Local UI State
const isMultiSelect = ref(false)
const selectedIds = ref<number[]>([])
const replyTarget = ref<ChatMsg | null>(null)
const showHistory = ref(false) // 暂未使用，保留扩展

const toggleSelect = (msgId: number) => {
  const idx = selectedIds.value.indexOf(msgId)
  if (idx > -1) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(msgId)
}

// --- Actions ---
/** 滚动消息列表到底部 */
const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) {
    // 使用 smooth 滚动可能在大量消息时体验不佳，视情况调整
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
}

/** 监听滚动事件，触发历史消息拉取 */
const onScroll = (e: Event) => {
  const el = e.target as HTMLElement
  if (el.scrollTop < 50 && id.value) messageStore.fetchCloudHistory(id.value)
}

/** 执行消息发送 */
const doSend = () => {
  if (!inputText.value.trim()) return
  messageStore.sendMessage(id.value, inputText.value, replyTarget.value?.message_id)
  inputText.value = ''
  replyTarget.value = null
}

/** 插入文本到输入框 */
const onInsert = (str: string) => {
  inputText.value += str
  inputRef.value?.focus()
}

/** 发送戳一戳消息 */
const onPoke = (uid: number) => {
  if (isGroup.value) bot.groupPoke(Number(id.value), uid)
  else bot.friendPoke(uid)
  messageStore.receiveMessage(id.value, {
    post_type: 'message',
    message_id: -Math.random(), // 临时ID
    time: Date.now() / 1000,
    message_type: isGroup.value ? 'group' : 'private',
    sender: { user_id: 0, nickname: '我' }, // 简单构造
    message: [{ type: 'text', data: { text: `你戳了戳 ${uid}` } }],
    status: 'success',
    isSystem: true
  } as any)
}

/** 跳转至合并转发页面 */
const goToForward = () => {
  if (selectedIds.value.length === 0) return
  router.push({
    path: `/${id.value}/forward`,
    query: { ids: selectedIds.value.join(',') }
  })
}

// --- Context Menu ---
const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const contextMsg = ref<ChatMsg | null>(null)

const menuOpts = computed<MenuItem[]>(() => {
  // Msg Menu
  return [
    { label: '引用', key: 'reply', icon: 'i-ri-reply-line' },
    { label: '转发', key: 'forward', icon: 'i-ri-share-forward-line' },
    { label: '多选', key: 'select', icon: 'i-ri-check-double-line' },
    { label: '撤回', key: 'recall', icon: 'i-ri-arrow-go-back-line', danger: true }
  ]
})

/** 处理消息右键菜单 */
const onContextMenu = (e: MouseEvent, msg: ChatMsg) => {
  if (isMultiSelect.value) return
  contextMsg.value = msg
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

/** 处理菜单项点击事件 */
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
      messageStore.recallMessage(msg.message_id)
      bot.deleteMsg(msg.message_id).catch(() => toast.add({ severity: 'error', summary: '撤回失败', life: 3000 }))
      break
  }
}

/** 获取消息的简短摘要 */
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

// --- Watchers ---
watch(
  () => id.value,
  async (newId) => {
    if (newId) {
      // 切换会话状态
      isMultiSelect.value = false
      replyTarget.value = null
      inputText.value = ''
      
      // 加载会话数据
      await messageStore.openSession(newId)
      
      // 滚动到底部
      scrollToBottom()
    }
  },
  { immediate: true }
)

watch(
  () => list.value.length,
  (n, o) => {
    if (n > o) scrollToBottom()
  }
)
</script>

