<template>
  <div class="flex h-full w-full relative overflow-hidden bg-main">
    <!-- === 主聊天窗口 === -->
    <main class="flex-1 h-full min-w-0 relative flex flex-col">
      <!-- 空状态 -->
      <div v-if="!id" class="flex-center flex-col h-full text-dim opacity-50">
        <div class="i-ri-message-3-line text-6xl mb-4" />
        <span class="text-lg">选择一个聊天开始对话</span>
      </div>

      <!-- 会话区域 -->
      <div v-else class="flex flex-col h-full bg-main relative my-trans" :style="bgStyle">
        <div
          v-if="bgStyle"
          class="absolute inset-0 bg-white/80 dark:bg-black/80 backdrop-blur-sm z-0 pointer-events-none"
          :style="`backdrop-filter: blur(${accountStore.config.value.bgBlur}px);`"
        />

        <!-- 头部 -->
        <header
          class="h-14 border-b border-dim bg-sub/90 backdrop-blur flex-between px-4 z-10 flex-shrink-0 cursor-default"
          @contextmenu.prevent="onHeaderContext"
        >
          <div class="flex-x gap-3 overflow-hidden">
            <div
              class="md:hidden i-ri-arrow-left-s-line text-xl cursor-pointer hover:text-primary text-main"
              @click="router.push('/')"
            />
            <div class="flex flex-col overflow-hidden">
              <span class="font-bold text-lg text-main truncate">{{ session?.name || id }}</span>
              <span v-if="session?.type === 'group'" class="text-[10px] text-dim truncate">{{ id }}</span>
            </div>
          </div>
          <!-- 移除更多按钮 -->
        </header>

        <!-- 消息列表 -->
        <div id="msgPan" ref="scrollRef" class="flex-1 overflow-y-auto p-4 my-scrollbar scroll-smooth z-0" @scroll="onScroll">
          <div v-if="chatStore.historyLoading.value[id]" class="flex-center py-4">
            <div class="i-ri-loader-4-line animate-spin text-dim" />
          </div>
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

        <!-- 多选工具栏 -->
        <transition name="slide-up">
          <div v-if="isMultiSelect" class="absolute bottom-6 left-1/2 -translate-x-1/2 bg-sub shadow-2xl rounded-full px-6 py-3 flex-x gap-6 border border-dim z-50 select-none">
            <div class="text-sm font-bold border-r pr-6 border-dim text-main">已选 {{ selectedIds.length }} 项</div>
            <div class="i-ri-share-forward-line text-xl cursor-pointer hover:text-primary my-trans" @click="goToForward" />
            <div class="i-ri-close-line text-xl cursor-pointer hover:text-sub my-trans" @click="isMultiSelect = false" />
          </div>
        </transition>

        <!-- 输入区 -->
        <div v-if="!isMultiSelect" class="flex flex-col h-auto bg-sub border-t border-dim z-10 relative">
          <div v-if="replyTarget" class="px-4 py-2 bg-dim flex-between text-xs text-sub border-b border-dim">
            <div class="truncate max-w-[80%]">回复 <span class="font-bold">@{{ replyTarget.sender.nickname }}</span> : {{ getSummary(replyTarget) }}</div>
            <div class="i-ri-close-circle-fill cursor-pointer hover:text-red-500" @click="replyTarget = null" />
          </div>
          <InputTool :session-id="id" @insert="onInsert" />
          <div class="flex-1 px-4 pb-2 flex flex-col min-h-[120px]">
            <textarea
              ref="inputRef"
              v-model="inputText"
              class="flex-1 w-full bg-transparent resize-none outline-none text-sm leading-6 my-scrollbar placeholder-dim text-main py-2"
              placeholder="发送消息 (Ctrl+Enter 发送)"
              @keydown.enter.ctrl.prevent="doSend"
            />
            <div class="flex justify-end pb-1">
              <Button size="small" :disabled="!inputText.trim()" @click="doSend">发送</Button>
            </div>
          </div>
        </div>

        <!-- 通用右键菜单 -->
        <ContextMenu v-model:show="showMenu" :x="menuX" :y="menuY" :options="menuOpts" @select="onMenuSelect" />
      </div>
    </main>

    <!-- === 右侧面板 (子路由) === -->
    <aside v-if="hasSidebar" class="border-l border-dim bg-sub fixed inset-0 z-50 md:static md:w-[360px] md:z-auto md:flex-shrink-0">
      <router-view name="sidebar" />
    </aside>
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
import { useConfirm } from 'primevue/useconfirm'
import Button from 'primevue/button'
import { accountStore, chatStore, type ChatMsg } from '@/utils/storage'
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
const confirm = useConfirm()

// --- State ---
const id = computed(() => (route.params.id as string) || '')
const session = computed(() => chatStore.getSession(id.value))
const list = computed(() => chatStore.getMsgList(id.value))
const hasSidebar = computed(() => route.matched.some(r => r.components?.sidebar))
const isGroup = computed(() => session.value?.type === 'group' || id.value.length > 5)

const inputText = ref('')
const scrollRef = ref<HTMLElement>()
const inputRef = ref<HTMLTextAreaElement>()

// Local UI State
const isMultiSelect = ref(false)
const selectedIds = ref<number[]>([])
const replyTarget = ref<ChatMsg | null>(null)

const toggleSelect = (msgId: number) => {
  const idx = selectedIds.value.indexOf(msgId)
  if (idx > -1) selectedIds.value.splice(idx, 1)
  else selectedIds.value.push(msgId)
}

// --- Appearance ---
const bgStyle = computed(() => accountStore.config.value.bgImage ? `background-image: url(${accountStore.config.value.bgImage}); background-size: cover; background-position: center;` : '')

// --- Actions ---
/** 滚动消息列表到底部 */
const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) scrollRef.value.scrollTop = scrollRef.value.scrollHeight
}

/** 监听滚动事件，触发历史消息拉取 */
const onScroll = (e: Event) => {
  const el = e.target as HTMLElement
  if (el.scrollTop < 50 && id.value) chatStore.fetchHistory(id.value)
}

/** 执行消息发送 */
const doSend = () => {
  if (!inputText.value.trim()) return
  chatStore.sendMsg(id.value, inputText.value, replyTarget.value?.message_id)
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
  chatStore.addSystemMsg(id.value, `你戳了戳 ${uid}`)
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
const menuType = ref<'msg' | 'header'>('msg')
const contextMsg = ref<ChatMsg | null>(null)

const menuOpts = computed<MenuItem[]>(() => {
  if (menuType.value === 'header') {
    if (isGroup.value) {
      return [
        { label: '群成员', key: 'member', icon: 'i-ri-group-line' },
        { label: '群文件', key: 'file', icon: 'i-ri-folder-open-line' },
        { label: '群公告', key: 'notice', icon: 'i-ri-megaphone-line' },
        { label: '精华消息', key: 'essence', icon: 'i-ri-star-line' }
      ]
    } else {
      return [
        { label: '删除好友', key: 'delete_friend', icon: 'i-ri-delete-bin-line', danger: true }
      ]
    }
  }

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
  menuType.value = 'msg'
  contextMsg.value = msg
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

/** 处理头部右键菜单 */
const onHeaderContext = (e: MouseEvent) => {
  menuType.value = 'header'
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

/** 处理菜单项点击事件 */
const onMenuSelect = (key: string) => {
  // Header Actions
  if (menuType.value === 'header') {
    if (key === 'delete_friend') {
      confirm.require({
        message: '确定要删除该好友吗？',
        header: '删除好友',
        icon: 'i-ri-error-warning-line',
        accept: async () => {
          await bot.deleteFriend(Number(id.value))
          chatStore.removeSession(id.value)
          router.push('/')
        }
      })
    } else {
      router.push(`/${id.value}/${key}`)
    }
    return
  }

  // Msg Actions
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
      chatStore.recallMsg(id.value, msg.message_id)
      bot.deleteMsg(msg.message_id).catch(() => toast.add({ severity: 'error', summary: '撤回失败', life: 3000 }))
      break
  }
}

/** 获取消息的简短摘要 */
const getSummary = (msg: ChatMsg) => {
  const type = determineMsgType(msg.message)
  if (type === MsgType.Text) {
    const txt = msg.message.filter(s => s.type === 'text').map(s => s.data.text).join('')
    return txt.slice(0, 20) + (txt.length > 20 ? '...' : '')
  }
  return `[${type}]`
}

// --- Watchers ---
watch(() => id.value, (newId) => {
  if (newId) {
    chatStore.clearUnread(newId)
    isMultiSelect.value = false
    replyTarget.value = null
    chatStore.fetchHistory(newId).then(scrollToBottom)
  }
})

watch(() => list.value.length, (n, o) => { if (n > o) scrollToBottom() })
</script>