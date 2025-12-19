<template>
  <div class="flex flex-col h-full w-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
    <!-- 头部：取消按钮和标题 -->
    <div class="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800 h-14 box-border">
      <div
        class="p-1.5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="interfaceStore.stopForward()"
      >
        <div class="i-ri-arrow-left-line text-lg text-gray-600 dark:text-gray-300" />
      </div>
      <span class="font-bold text-base flex-1">选择转发目标</span>
    </div>

    <!-- 搜索框 -->
    <div class="p-3 border-b border-gray-200 dark:border-gray-800">
      <n-input v-model:value="keyword" placeholder="搜索会话..." clearable size="small">
        <template #prefix><div class="i-ri-search-line text-gray-400" /></template>
      </n-input>
    </div>

    <!-- 会话列表 -->
    <n-scrollbar class="flex-1 p-2">
      <div v-if="filteredSessions.length === 0" class="flex flex-col items-center justify-center h-40 text-gray-400">
        <span class="text-xs">未找到匹配会话</span>
      </div>

      <div v-else class="flex flex-col gap-1">
        <div
          v-for="s in filteredSessions"
          :key="s.id"
          class="flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
          :class="{ 'bg-primary/10': selectedId === s.id }"
          @click="selectedId = s.id"
        >
          <n-avatar
            round
            :src="s.avatar"
            size="medium"
            fallback-src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"
          />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ s.name }}</div>
            <div class="text-xs text-gray-400 truncate">{{ s.type === 'group' ? '群组' : '好友' }}</div>
          </div>
          <div v-if="selectedId === s.id" class="i-ri-checkbox-circle-fill text-primary text-xl" />
        </div>
      </div>
    </n-scrollbar>

    <!-- 底部确认 -->
    <div class="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <n-button size="small" @click="interfaceStore.stopForward()">取消</n-button>
      <n-button type="primary" size="small" :disabled="!selectedId || sending" :loading="sending" @click="handleSend">
        发送 ({{ count }})
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NInput, NScrollbar, NAvatar, NButton, useMessage } from 'naive-ui'
import { useContactsStore } from '@/stores/contacts'
import { useInterfaceStore } from '@/stores/interface'
import { useMessagesStore } from '@/stores/messages'
import { bot } from '@/api'
import type { ForwardNode } from '@/types'

defineOptions({ name: 'ForwardBar' })

const router = useRouter()
const message = useMessage()

// Stores
const contactsStore = useContactsStore()
const interfaceStore = useInterfaceStore()
const messagesStore = useMessagesStore()

const keyword = ref('')
const selectedId = ref('')
const sending = ref(false)

// 待转发的消息数量
const count = computed(() => interfaceStore.forwardMode.ids.length)

// 过滤会话列表
const filteredSessions = computed(() => {
  let list = contactsStore.sessions
  if (keyword.value) {
    const k = keyword.value.toLowerCase()
    list = list.filter((s) => s.name.toLowerCase().includes(k) || s.id.includes(k))
  }
  return list
})

const handleSend = async () => {
  if (!selectedId.value) return
  sending.value = true

  try {
    // 1. 找到当前聊天窗口的 ID (即消息来源)
    // 注意：如果是从 A 聊天切到转发界面，路由参数 params.id 还是 A
    const sourcePeerId = router.currentRoute.value.params.id as string
    if (!sourcePeerId) throw new Error('无法确定消息来源')

    // 2. 从 messagesStore 获取原始消息对象
    const allMsgs = messagesStore.getList(sourcePeerId)
    const targetMsgs = allMsgs.filter((m) => interfaceStore.forwardMode.ids.includes(m.message_id))

    if (targetMsgs.length === 0) throw new Error('未找到有效消息')

    // 3. 构造 Forward Nodes
    const nodes: ForwardNode[] = targetMsgs.map((m) => ({
      type: 'node',
      data: {
        nickname: m.sender.nickname,
        user_id: m.sender.user_id,
        content: m.message // 原始 MessageSegment[]
      }
    }))

    // 4. 调用 API
    const targetId = Number(selectedId.value)
    // 简单判断 ID 长度，大于 5 位且非 10000 开头一般是群，或者根据 session type 判断
    const session = contactsStore.getSession(selectedId.value)
    const isGroup = session?.type === 'group' || selectedId.value.length > 5

    if (isGroup) {
      await bot.sendGroupForwardMsg(targetId, nodes)
    } else {
      await bot.sendPrivateForwardMsg(targetId, nodes)
    }

    message.success('转发成功')
    interfaceStore.stopForward() // 退出转发模式
  } catch (e: any) {
    console.error(e)
    message.error(e.message || '转发失败')
  } finally {
    sending.value = false
  }
}
</script>
