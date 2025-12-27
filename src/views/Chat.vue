================ START FILE: C:\Users\YisRime\RimeQ\src\views\Chat.vue ================
<template>
  <div class="flex size-full relative overflow-hidden">
    <!-- 主聊天容器 -->
    <main class="flex-1 h-full min-w-0 relative ui-flex-col-full">
      <!-- 空状态：未选择会话时显示 -->
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
          <!-- 顶部加载 Loading -->
          <div v-if="messageStore.isLoading" class="ui-flex-center py-6">
            <div class="i-ri-loader-4-line animate-spin text-primary text-2xl" />
          </div>

          <!-- 消息气泡渲染 -->
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

        <!-- 底部输入与操作组件 (封装了输入框与多选栏) -->
        <ChatInput
          v-model="inputText"
          :is-multi-select="isMultiSelect"
          :selected-count="selectedIds.length"
          :reply-target="replyTarget"
          :session-id="id"
          @send="doSend"
          @cancel-multi="cancelMultiSelect"
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
import type { ChatMsg } from '@/utils/msg-parser'
import MsgBubble from '@/components/MsgBubble.vue'
import ContextMenu, { type MenuItem } from '@/components/ContextMenu.vue'
import ChatInput from '@/components/ChatInput.vue'

defineOptions({ name: 'ChatView' })

// 路由与状态库实例
const router = useRouter()
const route = useRoute()
const toast = useToast()
const messageStore = useMessageStore()
const sessionStore = useSessionStore()

// 基础会话数据计算
const id = computed(() => (route.params.id as string) || '')
const session = computed(() => sessionStore.getSession(id.value))
const list = computed(() => messageStore.messages)
const isGroup = computed(() => session.value?.type === 'group' || id.value.length > 5)

// 界面交互状态
const inputText = ref('')
const scrollRef = ref<HTMLElement>()
const isMultiSelect = ref(false)
const selectedIds = ref<number[]>([])
const replyTarget = ref<ChatMsg | null>(null)
const showHistory = ref(false)

// 右键菜单状态
const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const contextMsg = ref<ChatMsg | null>(null)

// --- 方法实现 ---

// 切换单条消息的选中状态
const toggleSelect = (msgId: number) => {
  const idx = selectedIds.value.indexOf(msgId)
  if (idx > -1) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(msgId)
}

// 退出多选模式
const cancelMultiSelect = () => {
  isMultiSelect.value = false
  selectedIds.value = []
}

// 滚动至消息列表底部
const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.scrollTop = scrollRef.value.scrollHeight
  }
}

// 监听滚动事件：触顶加载历史
const onScroll = (e: Event) => {
  const el = e.target as HTMLElement
  if (el.scrollTop < 50 && id.value) messageStore.fetchCloudHistory(id.value)
}

// 发送消息逻辑
const doSend = () => {
  if (!inputText.value.trim()) return
  messageStore.sendMessage(id.value, inputText.value, replyTarget.value?.message_id)
  inputText.value = ''
  replyTarget.value = null
}

// 处理文件上传 (占位逻辑)
const handleFileUpload = async (file: File) => {
  toast.add({ severity: 'info', summary: '正在上传...', detail: file.name, life: 2000 })
  // 实际开发中需调用 API 上传文件并发送消息
}

// 双击头像戳一戳
const onPoke = (uid: number) => {
  if (isGroup.value) bot.groupPoke(Number(id.value), uid)
  else bot.friendPoke(uid)
}

// 跳转至多选转发页面
const goToForward = () => {
  if (selectedIds.value.length === 0) return
  router.push({
    path: `/${id.value}/forward`,
    query: { ids: selectedIds.value.join(',') },
  })
}

// 右键菜单配置
const menuOpts = computed<MenuItem[]>(() => [
  { label: '引用', key: 'reply', icon: 'i-ri-reply-line' },
  { label: '转发', key: 'forward', icon: 'i-ri-share-forward-line' },
  { label: '多选', key: 'select', icon: 'i-ri-check-double-line' },
  { label: '撤回', key: 'recall', icon: 'i-ri-arrow-go-back-line', danger: true },
])

// 呼出右键菜单
const onContextMenu = (e: MouseEvent, msg: ChatMsg) => {
  if (isMultiSelect.value) return
  contextMsg.value = msg
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

// 处理右键菜单项点击
const onMenuSelect = (key: string) => {
  if (!contextMsg.value) return
  const msg = contextMsg.value
  switch (key) {
    case 'reply':
      replyTarget.value = msg
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
        .then(() => messageStore.recallMessage(msg.message_id))
        .catch(() => toast.add({ severity: 'error', summary: '撤回失败', life: 3000 }))
      break
  }
}

// --- 状态监听 ---

// 切换会话 ID 时重置状态
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

// 消息列表长度变化时自动滚动
watch(
  () => list.value.length,
  (n, o) => {
    if (n > o) scrollToBottom()
  }
)
</script>
================ END FILE ================
