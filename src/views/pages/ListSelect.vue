<template>
  <div class="flex flex-col h-full w-full bg-main border-r border-dim">
    <!-- 头部：取消按钮和标题 -->
    <div class="flex-x gap-3 p-4 border-b border-dim h-14 box-border">
      <div class="p-1.5 rounded-lg cursor-pointer my-hover my-trans" @click="interfaceStore.stopForward()">
        <div class="i-ri-arrow-left-line text-lg text-sub" />
      </div>
      <span class="font-bold text-base flex-1">选择转发目标</span>
    </div>

    <!-- 搜索框 -->
    <div class="p-3 border-b border-dim">
      <div class="relative">
        <div class="absolute left-3 top-1/2 -translate-y-1/2 i-ri-search-line text-sub" />
        <InputText v-model="keyword" placeholder="搜索会话..." class="w-full pl-10" size="small" />
      </div>
    </div>

    <!-- 会话列表 -->
    <div class="flex-1 p-2 overflow-y-auto my-scrollbar">
      <div v-if="filteredSessions.length === 0" class="flex-center h-40 text-sub">
        <span class="text-xs">未找到匹配会话</span>
      </div>

      <div v-else class="flex flex-col gap-1">
        <div
          v-for="s in filteredSessions"
          :key="s.id"
          class="flex-x gap-3 p-2 rounded-lg cursor-pointer my-trans my-hover"
          :class="{ 'bg-primary/10': selectedId === s.id }"
          @click="selectedId = s.id"
        >
          <Avatar shape="circle" :image="s.avatar" size="large" />
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-main truncate">{{ s.name }}</div>
            <div class="text-xs text-sub truncate">{{ s.type === 'group' ? '群组' : '好友' }}</div>
          </div>
          <div v-if="selectedId === s.id" class="i-ri-checkbox-circle-fill text-primary text-xl" />
        </div>
      </div>
    </div>

    <!-- 底部确认 -->
    <div class="flex justify-end gap-3 p-4 border-t border-dim bg-main">
      <Button size="small" @click="interfaceStore.stopForward()">取消</Button>
      <Button severity="primary" size="small" :disabled="!selectedId || sending" :loading="sending" @click="handleSend">
        发送 ({{ count }})
      </Button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import InputText from 'primevue/inputtext'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useContactsStore } from '@/stores/contacts'
import { useInterfaceStore } from '@/stores/interface'
import { useMessagesStore } from '@/stores/messages'
import { bot } from '@/api'
import type { ForwardNode } from '@/types'

defineOptions({ name: 'ForwardBar' })

const router = useRouter()
const toast = useToast()

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

    toast.add({ severity: 'success', summary: '转发成功', life: 3000 })
    interfaceStore.stopForward() // 退出转发模式
  } catch (e: any) {
    console.error(e)
    toast.add({ severity: 'error', summary: e.message || '转发失败', life: 3000 })
  } finally {
    sending.value = false
  }
}
</script>
