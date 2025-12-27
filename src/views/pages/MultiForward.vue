<template>
  <div class="flex flex-col h-full w-full bg-main border-r border-dim">
    <!-- Header -->
    <header class="flex-x gap-3 p-4 border-b border-dim h-14 box-border">
      <div class="p-1.5 rounded-2xl cursor-pointer my-hover my-trans" @click="router.back()">
        <div class="i-ri-arrow-left-line text-lg text-sub" />
      </div>
      <span class="font-bold text-base flex-1">选择转发目标</span>
    </header>

    <!-- Search -->
    <div class="p-3 border-b border-dim">
      <div class="relative">
        <div class="absolute left-3 top-1/2 -translate-y-1/2 i-ri-search-line text-sub" />
        <InputText v-model="keyword" placeholder="搜索会话..." class="w-full pl-10" size="small" />
      </div>
    </div>

    <!-- Session List -->
    <div class="flex-1 p-2 overflow-y-auto my-scrollbar">
      <div v-if="filteredSessions.length === 0" class="flex-center h-40 text-sub">
        <span class="text-xs">未找到匹配会话</span>
      </div>

      <div v-else class="flex flex-col gap-1">
        <div
          v-for="s in filteredSessions"
          :key="s.id"
          class="flex-x gap-3 p-2 rounded-2xl cursor-pointer my-trans my-hover"
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

    <!-- Footer -->
    <footer class="flex justify-end gap-3 p-4 border-t border-dim bg-main">
      <Button size="small" @click="router.back()">取消</Button>
      <Button severity="primary" size="small" :disabled="!selectedId || sending" :loading="sending" @click="handleSend">
        发送 ({{ count }})
      </Button>
    </footer>
  </div>
</template>

<script setup lang="ts">
/**
 * 转发选择面板
 * 从路由参数中读取待转发的消息 IDs
 */
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import InputText from 'primevue/inputtext'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useMessageStore } from '@/stores/message'
import { useSessionStore } from '@/stores/session'
import { bot } from '@/api'
import type { ForwardNode } from '@/types'

defineOptions({ name: 'MultiForward' })

const router = useRouter()
const route = useRoute()
const toast = useToast()

const messageStore = useMessageStore()
const sessionStore = useSessionStore()

const keyword = ref('')
const selectedId = ref('')
const sending = ref(false)

const id = computed(() => (route.params.id as string) || '')
const messageIds = computed(() =>
  String(route.query.ids || '')
    .split(',')
    .map(Number)
    .filter(Boolean)
)
const count = computed(() => messageIds.value.length)

const filteredSessions = computed(() => {
  let list = sessionStore.sessions
  if (keyword.value) {
    const k = keyword.value.toLowerCase()
    list = list.filter((s) => s.name.toLowerCase().includes(k) || s.id.includes(k))
  }
  return list
})

const handleSend = async () => {
  if (!selectedId.value || messageIds.value.length === 0) return
  sending.value = true

  try {
    const allMsgs = messageStore.messages
    const targetMsgs = allMsgs.filter((m) => messageIds.value.includes(m.message_id))

    if (targetMsgs.length === 0) throw new Error('未找到有效消息')

    const nodes: ForwardNode[] = targetMsgs.map((m) => ({
      type: 'node',
      data: {
        nickname: m.sender.nickname,
        user_id: m.sender.user_id,
        content: m.message
      }
    }))

    const targetId = Number(selectedId.value)
    const session = sessionStore.getSession(selectedId.value)
    const isGroup = session?.type === 'group' || selectedId.value.length > 5

    if (isGroup) await bot.sendGroupForwardMsg(targetId, nodes)
    else await bot.sendPrivateForwardMsg(targetId, nodes)

    toast.add({ severity: 'success', summary: '转发成功', life: 3000 })
    router.back()
  } catch (e: any) {
    console.error(e)
    toast.add({ severity: 'error', summary: e.message || '转发失败', life: 3000 })
  } finally {
    sending.value = false
  }
}
</script>
