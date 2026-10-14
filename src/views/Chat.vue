<template>
  <div class="ui-flex-col-full relative overflow-hidden bg-transparent">
    <!-- 主体区域 -->
    <main class="ui-flex-col-full min-w-0 relative">
      <!-- 空状态 -->
      <div v-if="!id" class="ui-flex-y size-full text-foreground-dim select-none pb-20">
        <div class="w-24 h-24 rounded-3xl bg-background-sub/40 backdrop-blur-md shadow-lg ui-flex-center mb-6 text-primary border border-border-main/20">
          <div class="i-ri-chat-smile-2-fill text-5xl drop-shadow-sm" />
        </div>
        <h2 class="text-xl font-bold text-foreground-sub mb-2 tracking-wide">RimeQ</h2>
        <p class="text-xs opacity-60">选择联系人开始聊天</p>
      </div>
      <!-- 活跃会话区域 -->
      <div v-else class="ui-flex-col-full relative">
        <!-- 标题栏 -->
        <header class="h-16 shrink-0 border-b border-border/10 bg-transparent ui-flex-between px-4 z-20 select-none ui-trans">
          <div class="ui-flex-x gap-3 h-full overflow-hidden">
            <div
              v-if="isMobile"
              class="w-8 h-8 rounded-full ui-flex-center ui-ia hover:bg-background-sub/50 text-foreground-main bg-background-sub/20 shrink-0"
              @click="handleBack"
            >
              <div class="i-ri-arrow-left-s-line text-lg" />
            </div>
            <span class="font-bold text-lg text-foreground-main truncate">{{ pageTitle }}</span>
          </div>
          <!-- 群组快捷入口 -->
          <div v-if="isGroup" class="ui-flex-x gap-1 text-foreground-sub">
             <Button v-for="act in groupActions" :key="act.path" v-tooltip.bottom="act.label" :icon="act.icon" text rounded class="!w-9 !h-9 !text-foreground-sub hover:!text-primary hover:!bg-background-sub/50" @click="router.push(`/${id}/${act.path}`)" />
          </div>
        </header>
        <!-- 消息列表滚动区 -->
        <div
          id="msgPan"
          ref="scrollRef"
          class="flex-1 overflow-y-auto px-3 md:px-4 ui-scrollbar relative"
          @scroll="onScroll"
        >
          <!-- 消息加载指示 -->
          <div v-if="isLoading" class="ui-flex-center py-4 h-12 shrink-0">
            <ProgressSpinner />
          </div>
          <!-- 消息流容器 -->
          <div
            v-if="virtualizer.getVirtualItems().length > 0"
            class="relative w-full"
            :style="{ height: `${virtualizer.getTotalSize()}px`, 'overflow-anchor': 'auto' }"
          >
            <!-- 虚拟列表 -->
            <div
              v-for="virtualRow in virtualizer.getVirtualItems()"
              :key="list[virtualRow.index]?.message_id ?? virtualRow.index"
              :ref="el => virtualizer.measureElement(el as HTMLElement)"
              class="absolute top-0 left-0 w-full"
              :data-index="virtualRow.index"
              :style="{ transform: `translateY(${virtualRow.start}px)` }"
            >
              <MsgBubble
                v-if="list[virtualRow.index]"
                :msg="list[virtualRow.index]!"
                :selection-mode="messageStore.isMultiSelect"
                :is-selected="messageStore.selectedIds.includes(list[virtualRow.index]!.message_id)"
                :force-markdown="markdownId.has(list[virtualRow.index]!.message_id)"
                :show-raw="rawJsonId.has(list[virtualRow.index]!.message_id)"
                :on-context-menu="onContextMenu"
                :on-poke="onPoke"
                :on-toggle-select="chatCtx.onToggleSelect"
                :on-insert-mention="onInsertMention"
              />
            </div>
          </div>
        </div>
        <!-- 回到底部按钮 -->
        <div
          v-if="showScrollBtn"
          class="absolute bottom-25 right-5 cursor-pointer bg-primary/90 backdrop-blur text-primary-content text-xs px-3 py-2 rounded-full shadow-lg hover:bg-primary-hover active:scale-95 ui-trans ui-flex-x gap-1 select-none z-10 border border-border-main/20"
          v-motion
          :initial="{ opacity: 0, y: 10, scale: 0.9 }"
          :enter="{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }"
          :leave="{ opacity: 0, y: 10, scale: 0.9, transition: { duration: 200 } }"
          @click="scrollToBottom()"
        >
          <div class="i-ri-arrow-down-double-line" />
          <span v-if="newMsgCount > 0" class="font-bold">{{ newMsgCount }}</span>
        </div>
        <!-- 底部输入区域 -->
        <ChatInput
          ref="chatInputRef"
          :chat-id="id"
          :is-group="isGroup"
          @send="scrollToBottom()"
        />
        <!-- 右键菜单 -->
        <ContextMenu
          ref="contextMenu"
          :model="menuItems"
          :pt="{ root: { class: '!min-w-[128px] w-auto !bg-background-sub/80 !backdrop-blur-xl !border !border-border-main/30 !shadow-xl' } }"
        >
          <template #item="{ item, props }">
            <a
              v-bind="props.action"
              class="ui-flex-x gap-3 px-2 py-1.5 rounded-lg cursor-pointer select-none transition-colors group"
              :class="item.class || 'text-foreground-main hover:bg-primary/10 hover:text-primary'"
            >
              <span v-if="item.icon" :class="[item.icon, 'text-base opacity-80 shrink-0 group-hover:opacity-100']" />
              <span class="whitespace-nowrap text-sm font-medium flex-1">{{ item.label }}</span>
              <span v-if="item.items" class="i-ri-arrow-right-s-line text-base opacity-50 ml-auto" />
            </a>
          </template>
        </ContextMenu>
        <!-- 禁言设置弹窗 -->
        <Dialog v-model:visible="banDialog.visible" modal header="禁言时长" :style="{ width: '22rem' }">
          <div class="flex flex-col gap-4 py-2">
            <div class="ui-flex-between gap-2">
              <InputNumber v-model="banForm.d" :min="0" :max="30" show-buttons button-layout="vertical" suffix=" 天" input-class="!text-center !text-sm !p-1 w-full !bg-background-dim/50" class="flex-1" />
              <InputNumber v-model="banForm.h" :min="0" :max="23" show-buttons button-layout="vertical" suffix=" 时" input-class="!text-center !text-sm !p-1 w-full !bg-background-dim/50" class="flex-1" />
              <InputNumber v-model="banForm.m" :min="0" :max="59" show-buttons button-layout="vertical" suffix=" 分" input-class="!text-center !text-sm !p-1 w-full !bg-background-dim/50" class="flex-1" />
              <InputNumber v-model="banForm.s" :min="0" :max="59" show-buttons button-layout="vertical" suffix=" 秒" input-class="!text-center !text-sm !p-1 w-full !bg-background-dim/50" class="flex-1" />
            </div>
            <div class="flex gap-2">
               <Button label="解除" severity="success" outlined class="flex-1 !text-xs" @click="executeBan(0)" />
               <Button label="禁言" class="flex-1 !text-xs" :disabled="(banForm.d * 86400 + banForm.h * 3600 + banForm.m * 60 + banForm.s) === 0" @click="executeBan()" />
            </div>
          </div>
        </Dialog>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ContextMenu, useToast, Dialog, InputNumber, Button, ProgressSpinner } from 'primevue'
import { useDebounceFn, useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { bot } from '@/api'
import { useMessageStore, useSessionStore, useContactStore, useSettingStore } from '@/stores'
import { getTextPreview } from '@/utils/format'
import { type Message } from '@/types'
import MsgBubble from '@/components/MsgBubble.vue'
import ChatInput from '@/components/ChatInput.vue'

defineOptions({ name: 'ChatView' })

// 全局实例
const route = useRoute()
const router = useRouter()
const toast = useToast()
const messageStore = useMessageStore()
const sessionStore = useSessionStore()
const contactStore = useContactStore()
const settingStore = useSettingStore()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')

// 会话上下文
const id = computed(() => Number(route.params.id) || 0) // 当前会话 ID
const session = computed(() => sessionStore.getSession(id.value)) // 当前会话对象
const list = computed(() => {
  if (settingStore.config.enableAntiRecall) return messageStore.messages
  return messageStore.messages.filter(msg => !(msg as any).recalled)
}) // 当前会话消息列表
const isGroup = computed(() => !!id.value && (session.value?.type === 'group' || contactStore.checkIsGroup(id.value))) // 当前会话是否为群聊

// 页面标题计算
const pageTitle = computed(() => {
  if (id.value) {
    let name: string
    if (isGroup.value) {
      name = contactStore.getGroupName(id.value)
    } else {
      name = contactStore.getUserName(id.value)
    }
    return name !== String(id.value) ? name : session.value?.name || id.value
  }
  return route.meta.title
})

const handleBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

const groupActions = [
  { label: '群精华', path: 'essence', icon: 'i-ri-star-line' },
  { label: '群公告', path: 'notice', icon: 'i-ri-megaphone-line' },
  { label: '群相册', path: 'album', icon: 'i-ri-gallery-line' },
  { label: '群文件', path: 'file', icon: 'i-ri-folder-open-line' },
  { label: '群信息', path: 'info', icon: 'i-ri-profile-line' },
]

// UI 状态
const contextMenu = ref() // 右键菜单实例
const contextMsg = ref<Message | null>(null) // 右键菜单目标消息
const markdownId = ref(new Set<number>()) // Markdown 渲染消息 ID
const rawJsonId = ref(new Set<number>()) // 原始数据渲染消息 ID
const banDialog = reactive({ visible: false, target: null as Message | null })
const banForm = reactive({ d: 0, h: 0, m: 10, s: 0 })

// DOM 引用
const scrollRef = ref<HTMLElement>() // 消息列表滚动容器
const chatInputRef = ref<InstanceType<typeof ChatInput>>() // 输入框组件引用

// 滚动状态
const isBottom = ref(true) // 是否位于底部
const isLoading = ref(false) // 是否加载中
const isFetching = ref(false) // 是否获取中
const newMsgCount = ref(0) // 新消息数量
const showScrollBtn = computed(() => !isBottom.value) // 是否显示底部按钮

// 虚拟滚动
const virtualizer = useVirtualizer(computed(() => ({
  getScrollElement: () => scrollRef.value || null,
  count: list.value.length,
  estimateSize: () => 120,
  overscan: 10,
})))

// 滚动触底
const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value && list.value.length > 0) virtualizer.value.scrollToIndex(list.value.length - 1, { align: 'end', behavior: 'auto' })
}

// 滚动事件监听
const onScroll = useDebounceFn(async (e: Event) => {
  const el = e.target as HTMLElement
  if (!el) return
  // 更新底部状态
  const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
  if (isAtBottom && !isBottom.value) newMsgCount.value = 0
  isBottom.value = isAtBottom
  // 加载历史消息
  if (el.scrollTop < 50 && !isFetching.value && list.value.length > 0 && messageStore.hasMore) {
      const oldScrollHeight = el.scrollHeight
      const oldScrollTop = el.scrollTop
      isFetching.value = true
      const fetchedCount = await messageStore.fetchHistory(id.value)
      if (fetchedCount > 0) {
        await nextTick()
        if (scrollRef.value) {
          const newScrollHeight = scrollRef.value.scrollHeight
          scrollRef.value.scrollTop = oldScrollTop + (newScrollHeight - oldScrollHeight)
        }
      }
      isFetching.value = false
  }
}, 100)

// 生命周期监听
watch(() => id.value, (newId) => {
  if (newId) {
    isLoading.value = true
    newMsgCount.value = 0
    messageStore.openSession(newId).then(() => {
      nextTick(() => {
        scrollToBottom()
        isLoading.value = false
      })
    })
    markdownId.value.clear()
    rawJsonId.value.clear()
    if (isGroup.value) contactStore.fetchGroupMembers(newId)
  }
}, { immediate: true })

// 消息列表监听
watch(() => list.value.length, async (newLen, oldLen) => {
  if (isLoading.value || isFetching.value) return
  if (!oldLen || newLen <= oldLen) return
  const lastMsg = list.value[newLen - 1]
  const isMe = lastMsg?.sender.user_id === settingStore.user?.user_id
  if (isMe || isBottom.value) {
    await scrollToBottom()
  } else {
    newMsgCount.value += (newLen - oldLen)
  }
})

// 发送戳一戳
const onPoke = (uid: number) => bot.sendPoke(uid, isGroup.value ? Number(id.value) : undefined)

// 插入提及
const onInsertMention = (mid: string, name: string) => {
  if (chatInputRef.value) chatInputRef.value.insertMention(mid, name)
}

// 点击右键菜单
const onContextMenu = (e: MouseEvent, msg: Message) => {
  if (messageStore.isMultiSelect) return
  contextMsg.value = msg
  contextMenu.value.show(e)
}

// 定义交互方法
const chatCtx = {
  onToggleSelect: (messageId: number) => {
    messageStore.setMultiSelect(messageId)
  },
  onReply: (msg: Message) => {
    messageStore.setReplyTarget(msg)
    chatInputRef.value?.focus()
  }
}

// 打开禁言弹窗
const openBanDialog = (msg: Message) => {
  banDialog.target = msg
  banForm.d = 0; banForm.h = 0; banForm.m = 10; banForm.s = 0;
  banDialog.visible = true
}

// 执行禁言
const executeBan = async (duration?: number) => {
  if (!banDialog.target || !banDialog.target.group_id) return
  const finalDuration = duration ?? (banForm.d * 86400 + banForm.h * 3600 + banForm.m * 60 + banForm.s)
  try {
    await bot.setGroupBan(banDialog.target.group_id, banDialog.target.sender.user_id, finalDuration)
    toast.add({ severity: 'success', summary: finalDuration === 0 ? '已解禁' : '已禁言', life: 3000 })
  } catch (e) {
    toast.add({ severity: 'error', summary: '操作失败', detail: String(e), life: 3000 })
  }
  banDialog.visible = false
}
// 菜单选项
const menuItems = computed(() => {
  const m = contextMsg.value
  if (!m) return []
  const myRole = m.message_type === 'group' ? contactStore.members.get(Number(id.value))?.find(u => u.user_id === settingStore.user?.user_id)?.role || 'member' : 'owner'
  // 基础菜单
  const items: any[] = [
    { label: '+1', icon: 'i-ri-add-circle-line', command: () => bot.sendMsg(m.message_type, m.message_type === 'group' ? m.group_id! : m.user_id, m.message)},
    { label: '引用', icon: 'i-ri-reply-line', command: () => chatCtx.onReply(m) },
    { label: '转发', icon: 'i-ri-share-forward-line', command: () => chatCtx.onToggleSelect(m.message_id) },
  ]
  // 工具子菜单
  const toolMenu: any[] = []
  toolMenu.push({ label: '戳一戳', icon: 'i-ri-magic-line', command: () => onPoke(m.sender.user_id) })
  if (m.message.some(s => s.type === 'record')) {
    toolMenu.push({
      label: '转文字', icon: 'i-ri-voice-recognition-line',
      command: async () => {
        try {
          const res = bot.backend === 'NapCat'
            ? await bot.fetchPttText(m.message_id)
            : await bot.voiceMsgToText(m.message_id)
          if (res.text) toast.add({ severity: 'info', summary: '转文字结果', detail: res.text, life: 5000 })
        } catch (e) {
          toast.add({ severity: 'error', summary: '转文字失败', detail: String(e), life: 3000 })
        }
      }
    })
  }
  toolMenu.push({
    label: '复制', icon: 'i-ri-file-copy-line',
    command: () => {
      navigator.clipboard.writeText(getTextPreview(m.message))
      toast.add({ severity: 'success', summary: '已复制', life: 3000 })
    }
  })
  if (bot.backend === 'NapCat') {
    toolMenu.push({
      label: '收藏', icon: 'i-ri-star-line',
      command: () => {
        bot.createCollection(JSON.stringify(m.message), getTextPreview(m.message))
        toast.add({ severity: 'success', summary: '已收藏', life: 3000 })
      }
    })
  }
  const imgSeg = m.message.find(s => s.type === 'image')
  if (imgSeg?.data?.url) {
    toolMenu.push({
      label: '另存为', icon: 'i-ri-download-2-line',
      command: () => {
        const a = document.createElement('a')
        a.href = imgSeg.data.url!; a.download = `image_${m.message_id}`; a.target = '_blank';
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      }
    })
  }
  toolMenu.push({
      label: 'Markdown', icon: markdownId.value.has(m.message_id) ? 'i-ri-markdown-fill' : 'i-ri-markdown-line',
      command: () => markdownId.value.has(m.message_id) ? markdownId.value.delete(m.message_id) : markdownId.value.add(m.message_id)
  })
  // 管理子菜单
  const manageMenu: any[] = []
  if (m.sender.user_id === settingStore.user?.user_id || myRole !== 'member') {
    manageMenu.push({ label: '撤回', icon: 'i-ri-arrow-go-back-line', command: () => bot.deleteMsg(m.message_id) })
  }
  if (m.message_type === 'group' && myRole !== 'member') {
    if (!(m.sender.user_id === settingStore.user?.user_id)) {
      manageMenu.push({ label: '禁言', icon: 'i-ri-chat-off-line', command: () => openBanDialog(m) })
    }
    manageMenu.push({ label: '设为精华', icon: 'i-ri-star-line', command: () => bot.setEssenceMsg(m.message_id) })
  }
  manageMenu.push({
    label: 'Raw Data', icon: rawJsonId.value.has(m.message_id) ? 'i-ri-code-s-slash-fill' : 'i-ri-code-s-slash-line',
    command: () => rawJsonId.value.has(m.message_id) ? rawJsonId.value.delete(m.message_id) : rawJsonId.value.add(m.message_id)
  })
  // 整合菜单
  if (toolMenu.length > 0 || manageMenu.length > 0) items.push({ separator: true })
  if (toolMenu.length > 0) items.push({ label: '工具', icon: 'i-ri-apps-2-line', items: toolMenu })
  if (manageMenu.length > 0) items.push({ label: '管理', icon: 'i-ri-settings-3-line', items: manageMenu })

  return items
})
</script>
