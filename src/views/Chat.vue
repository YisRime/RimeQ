<template>
  <div class="flex h-full w-full relative overflow-hidden bg-gray-50 dark:bg-black">
    <!-- 聊天内容区域 -->
    <main class="flex-1 h-full min-w-0 relative">
      <!-- 空状态 - 无会话选中 -->
      <div v-if="!id" class="flex flex-col items-center justify-center h-full text-gray-400 opacity-50">
        <div class="i-ri-message-3-line text-6xl mb-4"></div>
        <span class="text-lg">选择一个聊天开始对话</span>
      </div>

      <!-- 聊天窗口 - 有会话ID时显示 -->
      <div
        v-else
        class="flex flex-col h-full w-full bg-[#f2f2f2] dark:bg-[#101010] relative overflow-hidden transition-all duration-300"
        :style="bgStyle"
      >
        <!-- 背景遮罩 (模糊处理) -->
        <div
          v-if="bgStyle"
          class="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-0 pointer-events-none transition-all duration-300"
          :style="`backdrop-filter: blur(${optionStore.config.chat_background_blur}px);`"
        ></div>

        <!-- === Header Logic === -->
        <header
          class="h-14 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur flex items-center justify-between px-4 flex-shrink-0 z-10"
        >
          <div class="flex items-center gap-3 overflow-hidden">
            <!-- 移动端返回按钮 -->
            <div
              class="md:hidden i-ri-arrow-left-s-line text-xl p-2 -ml-2 cursor-pointer hover:text-primary"
              @click="goBack"
            />

            <div class="flex flex-col overflow-hidden">
              <span class="font-bold text-lg text-gray-800 dark:text-gray-100 leading-tight truncate">
                {{ currentSession?.name || id }}
              </span>
              <span v-if="currentSession?.type === 'group'" class="text-[10px] text-gray-500 truncate">
                {{ currentSession.peerId }}
              </span>
            </div>
          </div>

          <!-- 头部操作区 -->
          <div class="flex items-center gap-4 text-gray-500 flex-shrink-0">
            <div
              title="详情"
              class="i-ri-more-2-fill cursor-pointer hover:text-primary transition-colors px-2 text-xl"
              @click="toggleDetailSidebar"
            />
          </div>
        </header>

        <!-- === Message List Logic === -->
        <div
          id="msgPan"
          ref="scrollContainer"
          class="flex-1 overflow-y-auto p-4 custom-scrollbar scroll-smooth z-0 relative"
          @scroll="handleScroll"
        >
          <!-- 历史消息加载 Loading -->
          <div v-if="chatStore.isLoadingHistory" class="flex justify-center py-4">
            <div class="i-ri-loader-4-line animate-spin text-gray-400" />
          </div>

          <!-- 无消息状态 -->
          <div
            v-if="!chatStore.isLoadingHistory && messages.length === 0"
            class="flex flex-col items-center justify-center h-full text-gray-400 opacity-50"
          >
            <div class="i-ri-message-3-line text-4xl mb-2"></div>
            <span class="text-sm">暂无消息</span>
          </div>

          <!-- 消息循环渲染 -->
          <MsgBubble
            v-for="(msg, index) in messages"
            :key="msg.message_id || index"
            :msg="msg"
            @contextmenu="handleContextMenu"
            @avatar-click="handleAvatarClick"
            @poke="handlePoke"
          />
        </div>

        <!-- === Input Logic === -->

        <!-- 多选模式 -->
        <transition name="slide-up">
          <div
            v-if="isMultiSelectMode"
            class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white dark:bg-gray-800 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 border border-gray-200 dark:border-gray-700 z-50 select-none"
          >
            <div
              class="text-sm font-bold border-r pr-6 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200"
            >
              已选 {{ selectedIds.length }} 项
            </div>

            <div class="flex items-center gap-4">
              <n-tooltip trigger="hover">
                <template #trigger>
                  <div
                    class="i-ri-share-forward-line text-xl cursor-pointer hover:text-primary transition-colors"
                    @click="handleBatchForward"
                  />
                </template>
                合并转发
              </n-tooltip>

              <n-tooltip trigger="hover">
                <template #trigger>
                  <div
                    class="i-ri-delete-bin-line text-xl cursor-pointer hover:text-red-500 transition-colors"
                    @click="batchDelete"
                  />
                </template>
                批量删除
              </n-tooltip>

              <div class="w-[1px] h-4 bg-gray-200 dark:bg-gray-700"></div>

              <n-tooltip trigger="hover">
                <template #trigger>
                  <div
                    class="i-ri-close-line text-xl cursor-pointer hover:text-gray-500 transition-colors"
                    @click="exitMultiSelect"
                  />
                </template>
                退出多选
              </n-tooltip>
            </div>
          </div>
        </transition>

        <!-- 输入模式 -->
        <div
          v-if="!isMultiSelectMode"
          class="flex flex-col h-auto min-h-[160px] bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 relative"
        >
          <!-- Toolbar -->
          <InputTool :session-id="id" :disabled="false" @insert="handleInsert" @upload="handleUpload" />

          <!-- 文本输入区 -->
          <div class="flex-1 px-4 pb-2 relative flex flex-col">
            <textarea
              ref="textareaRef"
              v-model="inputValue"
              class="flex-1 w-full bg-transparent resize-none outline-none text-gray-800 dark:text-gray-200 text-sm leading-6 custom-scrollbar placeholder-gray-400 min-h-[80px]"
              placeholder="发送消息 (Ctrl+Enter 发送)"
              @keydown="handleKeydown"
            ></textarea>

            <!-- 发送按钮 -->
            <div class="flex justify-end pb-1">
              <n-button class="shadow-sm" type="primary" size="small" :disabled="!canSend" @click="handleSend">
                <template #icon>
                  <div class="i-ri-send-plane-line" />
                </template>
                发送
              </n-button>
            </div>
          </div>
        </div>

        <!-- === 各类侧边栏与弹窗 === -->

        <!-- 右键菜单 (Teleport) -->
        <ContextMenu v-model:show="showMenu" :x="menuX" :y="menuY" :options="menuOptions" @select="handleMenuSelect" />
      </div>
    </main>

    <!-- 右侧详情栏 (PC: 文档流; Mobile: 绝对定位覆盖) -->
    <aside
      v-if="hasSidebar"
      class="border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 fixed inset-0 z-50 md:static md:w-[360px] md:z-auto md:flex-shrink-0"
    >
      <router-view name="sidebar" />
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useMessage, useDialog, NButton, NTooltip } from 'naive-ui'
import { useContactStore } from '@/stores/contact'
import { useChatStore } from '@/stores/chat'
import { useOptionStore } from '@/stores/option'
import { bot } from '@/api'
import { copyToClipboard } from '@/utils/dom'
import type { Message } from '@/types'
import { MsgType } from '@/types'

// Components
import MsgBubble from '@/components/MsgBubble.vue'
import ContextMenu, { type MenuItem } from '@/components/ContextMenu.vue'
import InputTool from '@/components/InputAssistance.vue'

defineOptions({
  name: 'ChatView'
})

const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()

const contactStore = useContactStore()
const chatStore = useChatStore()
const optionStore = useOptionStore()

// 从路由获取会话 ID
const id = computed(() => (route.params.id as string) || '')

const scrollContainer = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

// Context Menu State
const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const targetMsg = ref<Message | null>(null)

// Multi Select State
const isMultiSelectMode = ref(false)
const selectedIds = ref<string[]>([])

// Input State
const inputValue = ref('')

// Computed Data
const currentSession = computed(() => contactStore.getContact(id.value))
const messages = computed(() => chatStore.getMessages(id.value))
const hasSidebar = computed(() => route.matched.some((r) => r.components?.sidebar))
const bgStyle = computed(() =>
  optionStore.config.chat_background
    ? `background-image: url(${optionStore.config.chat_background}); background-size: cover; background-position: center;`
    : ''
)

const canSend = computed(() => {
  return inputValue.value.trim().length > 0
})

// --- 滚动逻辑 ---
const scrollToBottom = async () => {
  await nextTick()
  if (scrollContainer.value) {
    scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
  }
}

// 上拉加载更多
const handleScroll = (e: Event) => {
  const target = e.target as HTMLElement
  if (target.scrollTop < 50 && !chatStore.isLoadingHistory) {
    chatStore.getChatHistory(id.value)
  }
}

// 监听会话切换,加载历史记录
watch(
  () => id.value,
  (newId) => {
    if (newId) {
      chatStore.loadChatHistory(newId)
      contactStore.clearUnread(newId)
      scrollToBottom()
    }
  },
  { immediate: true }
)

// 监听消息列表变化
watch(
  () => messages.value.length,
  (newLen, oldLen) => {
    // 新消息或初次加载时滚动到底部
    if (newLen - oldLen === 1 || oldLen === 0) {
      scrollToBottom()
    }
  }
)

// 生命周期
onMounted(() => {
  if (id.value) {
    chatStore.loadChatHistory(id.value)
    contactStore.clearUnread(id.value)
    scrollToBottom()
  }
})

// --- Input 逻辑 ---
const handleInsert = (text: string) => {
  inputValue.value += text
  textareaRef.value?.focus()
}

const handleUpload = (file: File) => {
  console.log('Upload file:', file.name)
  // 实际项目中应该触发文件上传逻辑
}

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Enter' && e.ctrlKey) {
    e.preventDefault()
    handleSend()
  }
}

const handleSend = () => {
  if (!canSend.value) return
  chatStore.sendMessage(id.value, inputValue.value.trim())
  inputValue.value = ''
}

// --- 右键菜单逻辑 ---
const menuOptions = computed<MenuItem[]>(() => {
  if (!targetMsg.value) return []
  const opts: MenuItem[] = [
    { label: '复制', key: 'copy', icon: 'i-ri-file-copy-line' },
    { label: '引用回复', key: 'reply', icon: 'i-ri-reply-line' },
    { label: '转发', key: 'forward', icon: 'i-ri-share-forward-line' },
    { label: '多选', key: 'select', icon: 'i-ri-check-double-line' }
  ]
  if (targetMsg.value.isMe && !targetMsg.value.isDeleted && targetMsg.value.type !== MsgType.System) {
    opts.push({ label: '撤回', key: 'recall', icon: 'i-ri-arrow-go-back-line', danger: true })
  }
  return opts
})

const handleContextMenu = (e: MouseEvent, msg: Message) => {
  if (isMultiSelectMode.value) return

  targetMsg.value = msg
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

const handleMenuSelect = async (key: string) => {
  if (!targetMsg.value) return
  const msg = targetMsg.value

  switch (key) {
    case 'copy': {
      const text = typeof msg.content === 'string' ? msg.content : msg.content.text || ''
      if (text) {
        const success = await copyToClipboard(text)
        if (success) message.success('已复制')
        else message.error('复制失败')
      } else {
        message.info('该消息类型不支持复制')
      }
      break
    }
    case 'reply':
      chatStore.setReplyMessage(msg)
      break
    case 'recall':
      try {
        await bot.deleteMsg(msg.message_id)
        chatStore.deleteMessage(id.value, msg.message_id)
        message.success('已撤回')
      } catch {
        message.error('撤回失败')
      }
      break
    case 'forward':
      selectedIds.value = [msg.message_id]
      chatStore.startForward([msg.message_id], 'single')
      break
    case 'select':
      isMultiSelectMode.value = true
      selectedIds.value.push(msg.message_id)
      break
  }
}

// --- 多选 / 批量操作 ---
const exitMultiSelect = () => {
  isMultiSelectMode.value = false
  selectedIds.value = []
}

const batchDelete = () => {
  if (selectedIds.value.length === 0) return
  dialog.warning({
    title: '批量删除',
    content: `确定删除选中的 ${selectedIds.value.length} 条消息吗?(仅本地删除)`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      message.info('本地批量删除暂未实现')
      exitMultiSelect()
    }
  })
}

const handleBatchForward = () => {
  if (selectedIds.value.length === 0) return
  chatStore.startForward(selectedIds.value, 'batch')
}

// --- 头像点击 / 戳一戳 ---
const handleAvatarClick = (userId: number) => {
  // 用户信息现在通过 ContextMenu 显示，暂时无需单独处理
  console.log('Avatar clicked:', userId)
}

const handlePoke = (userId: number) => {
  const isGroup = id.value.length > 5
  if (isGroup) {
    bot.sendGroupPoke(Number(id.value), userId)
  } else {
    bot.sendFriendPoke(userId)
  }
  chatStore.pushSystemMessage(id.value, `你戳了戳 ${userId}`)
}

const goBack = () => {
  router.push('/chats')
}

const toggleDetailSidebar = () => {
  const currentPath = route.path
  if (currentPath.includes('/detail')) {
    router.push(`/chats/${id.value}`)
  } else {
    router.push(`/chats/${id.value}/detail`)
  }
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
