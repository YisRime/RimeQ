<template>
  <div class="flex h-full w-full relative overflow-hidden bg-gray-50 dark:bg-black">
    <!-- 主聊天区域 -->
    <main class="flex-1 h-full min-w-0 relative flex flex-col">
      <!-- 空状态 -->
      <div v-if="!id" class="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
        <div class="i-ri-message-3-line text-6xl mb-4"></div>
        <span class="text-lg">选择一个聊天开始对话</span>
      </div>

      <!-- 聊天窗口 -->
      <div
        v-else
        class="flex flex-col h-full w-full bg-[#f2f2f2] dark:bg-[#101010] relative transition-all duration-300"
        :style="bgStyle"
      >
        <!-- 背景模糊遮罩 -->
        <div
          v-if="bgStyle"
          class="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-0 pointer-events-none"
          :style="`backdrop-filter: blur(${settingsStore.config.bgBlur}px);`"
        ></div>

        <!-- 顶部 Header -->
        <header
          class="h-14 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur flex items-center justify-between px-4 z-10 flex-shrink-0"
        >
          <div class="flex items-center gap-3 overflow-hidden">
            <!-- 移动端返回 (切换到联系人列表视图) -->
            <div
              class="md:hidden i-ri-arrow-left-s-line text-xl cursor-pointer hover:text-primary"
              @click="router.push('/')"
            />

            <div class="flex flex-col overflow-hidden">
              <span class="font-bold text-lg text-gray-800 dark:text-gray-100 truncate">
                {{ session?.name || id }}
              </span>
              <span v-if="session?.type === 'group'" class="text-[10px] text-gray-500 truncate">
                {{ id }}
              </span>
            </div>
          </div>

          <!-- 右侧操作 -->
          <div
            class="i-ri-more-2-fill cursor-pointer text-xl text-gray-500 hover:text-primary transition-colors"
            @click="toggleSidebar"
          />
        </header>

        <!-- 消息列表 -->
        <div
          id="msgPan"
          ref="scrollRef"
          class="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth z-0"
          @scroll="onScroll"
        >
          <!-- 加载 Loading -->
          <div v-if="messagesStore.loading[id]" class="flex justify-center py-4">
            <div class="i-ri-loader-4-line animate-spin text-gray-400" />
          </div>

          <!-- 消息气泡 -->
          <MsgBubble
            v-for="(msg, index) in list"
            :key="msg.message_id || index"
            :msg="msg"
            @contextmenu="onContextMenu"
            @poke="onPoke"
          />
        </div>

        <!-- 多选模式工具栏 -->
        <transition name="slide-up">
          <div
            v-if="interfaceStore.multiSelect"
            class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 border border-gray-200 dark:border-gray-700 z-50 select-none"
          >
            <div class="text-sm font-bold border-r pr-6 border-gray-200 dark:border-gray-600">
              已选 {{ interfaceStore.selectedIds.length }} 项
            </div>

            <n-tooltip trigger="hover">
              <template #trigger>
                <div
                  class="i-ri-share-forward-line text-xl cursor-pointer hover:text-primary"
                  @click="handleBatchForward"
                />
              </template>
              合并转发
            </n-tooltip>

            <n-tooltip trigger="hover">
              <template #trigger>
                <div
                  class="i-ri-close-line text-xl cursor-pointer hover:text-gray-500"
                  @click="interfaceStore.stopMulti()"
                />
              </template>
              退出多选
            </n-tooltip>
          </div>
        </transition>

        <!-- 底部输入区域 -->
        <div
          v-if="!interfaceStore.multiSelect"
          class="flex flex-col h-auto bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-10 relative"
        >
          <!-- 引用回复提示 -->
          <div
            v-if="interfaceStore.replyTarget"
            class="px-4 py-2 bg-gray-50 dark:bg-gray-800 flex justify-between items-center text-xs text-gray-500 border-b border-gray-100 dark:border-gray-700"
          >
            <div class="truncate max-w-[80%]">
              回复 <span class="font-bold">@{{ interfaceStore.replyTarget.sender.nickname }}</span> :
              {{ getSummary(interfaceStore.replyTarget) }}
            </div>
            <div
              class="i-ri-close-circle-fill cursor-pointer hover:text-red-500"
              @click="interfaceStore.setReply(null)"
            />
          </div>

          <!-- 工具栏 -->
          <InputTool :session-id="id" @insert="onInsert" />

          <!-- 输入框 -->
          <div class="flex-1 px-4 pb-2 flex flex-col min-h-[120px]">
            <textarea
              ref="inputRef"
              v-model="text"
              class="flex-1 w-full bg-transparent resize-none outline-none text-sm leading-6 custom-scrollbar placeholder-gray-400 py-2"
              placeholder="发送消息 (Ctrl+Enter 发送)"
              @keydown.enter.ctrl.prevent="doSend"
            ></textarea>

            <div class="flex justify-end pb-1">
              <n-button size="small" type="primary" :disabled="!text.trim()" @click="doSend"> 发送 </n-button>
            </div>
          </div>
        </div>

        <!-- 右键菜单 -->
        <ContextMenu v-model:show="showMenu" :x="menuX" :y="menuY" :options="menuOpts" @select="onMenuSelect" />
      </div>
    </main>

    <!-- 右侧侧边栏 (路由视图) -->
    <aside
      v-if="hasSidebar"
      class="border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 fixed inset-0 z-50 md:static md:w-[360px] md:z-auto md:flex-shrink-0"
    >
      <router-view name="sidebar" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NButton, NTooltip, useMessage } from 'naive-ui'
import { useContactsStore } from '@/stores/contacts'
import { useMessagesStore } from '@/stores/messages'
import { useInterfaceStore } from '@/stores/interface'
import { useSettingsStore } from '@/stores/settings'
import { bot } from '@/api'
import type { Message } from '@/types'
import { determineMsgType } from '@/utils/msg-parser'
import { MsgType } from '@/types'

// Components
import MsgBubble from '@/components/MsgBubble.vue'
import ContextMenu, { type MenuItem } from '@/components/ContextMenu.vue'
import InputTool from '@/components/InputHelper.vue'

defineOptions({ name: 'ChatView' })

const router = useRouter()
const route = useRoute()
const toast = useMessage()

// Stores
const contactsStore = useContactsStore()
const messagesStore = useMessagesStore()
const interfaceStore = useInterfaceStore()
const settingsStore = useSettingsStore()

// State
const id = computed(() => (route.params.id as string) || '')
const session = computed(() => contactsStore.getSession(id.value))
const list = computed(() => messagesStore.getList(id.value))
const hasSidebar = computed(() => route.matched.some((r) => r.components?.sidebar))

// Background
const bgStyle = computed(() =>
  settingsStore.config.bgImage
    ? `background-image: url(${settingsStore.config.bgImage}); background-size: cover; background-position: center;`
    : ''
)

// Refs
const scrollRef = ref<HTMLElement>()
const inputRef = ref<HTMLTextAreaElement>()
const text = ref('')
const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const targetMsg = ref<Message | null>(null)

// --- Scroll Logic ---
const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
}

const onScroll = (e: Event) => {
  const el = e.target as HTMLElement
  // 触顶加载历史
  if (el.scrollTop < 50 && id.value) {
    messagesStore.fetchHistory(id.value)
  }
}

// Watchers
watch(
  () => id.value,
  async (newId) => {
    if (newId) {
      contactsStore.clearUnread(newId)
      // 重置交互状态
      interfaceStore.setReply(null)
      interfaceStore.stopMulti()

      await messagesStore.fetchHistory(newId)
      scrollToBottom()
    }
  }
)

watch(
  () => list.value.length,
  (newLen, oldLen) => {
    // 简单判断：只有新消息才自动滚动，历史加载保持位置(需更复杂逻辑，这里简化)
    if (newLen > oldLen) scrollToBottom()
  }
)

// --- Actions ---

const onInsert = (str: string) => {
  text.value += str
  inputRef.value?.focus()
}

const doSend = () => {
  if (!text.value.trim()) return
  messagesStore.sendMsg(id.value, text.value)
  text.value = ''
}

const onPoke = (uid: number) => {
  const isGroup = id.value.length > 5
  if (isGroup) {
    bot.sendGroupPoke(Number(id.value), uid)
  } else {
    bot.sendFriendPoke(uid)
  }
  messagesStore.addSystem(id.value, `你戳了戳 ${uid}`)
}

const toggleSidebar = () => {
  const path = route.path
  if (path.includes('/detail')) {
    router.push(`/${id.value}`)
  } else {
    router.push(`/${id.value}/detail`)
  }
}

const getSummary = (msg: Message) => {
  // 简易摘要生成
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

// --- Context Menu ---
const menuOpts = computed<MenuItem[]>(() => {
  return [
    { label: '引用', key: 'reply', icon: 'i-ri-reply-line' },
    { label: '转发', key: 'forward', icon: 'i-ri-share-forward-line' },
    { label: '多选', key: 'select', icon: 'i-ri-check-double-line' },
    { label: '撤回', key: 'recall', icon: 'i-ri-arrow-go-back-line', danger: true }
  ]
})

const onContextMenu = (e: MouseEvent, msg: Message) => {
  if (interfaceStore.multiSelect) return
  targetMsg.value = msg
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

const onMenuSelect = (key: string) => {
  if (!targetMsg.value) return
  const msg = targetMsg.value

  switch (key) {
    case 'reply':
      interfaceStore.setReply(msg)
      inputRef.value?.focus()
      break
    case 'forward':
      interfaceStore.startForward([msg.message_id], 'single')
      break
    case 'select':
      interfaceStore.startMulti(msg.message_id)
      break
    case 'recall':
      messagesStore.recallMsg(id.value, msg.message_id)
      bot.deleteMsg(msg.message_id).catch(() => toast.error('撤回失败'))
      break
  }
}

const handleBatchForward = () => {
  if (interfaceStore.selectedIds.length === 0) return
  interfaceStore.startForward(interfaceStore.selectedIds, 'batch')
}
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translate(-50%, 150%);
  opacity: 0;
}
</style>
