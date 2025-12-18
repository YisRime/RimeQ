<template>
  <div class="flex flex-col h-full w-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
    <!-- 头部区域 -->
    <div class="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
      <div
        class="p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="handleCancel"
      >
        <div class="i-ri-arrow-left-line text-xl text-gray-600 dark:text-gray-300" />
      </div>
      <span class="font-bold text-lg flex-1">选择转发目标</span>
    </div>

    <!-- 搜索框 -->
    <div class="p-4 border-b border-gray-200 dark:border-gray-800">
      <n-input v-model:value="keyword" placeholder="搜索会话或联系人" clearable size="medium">
        <template #prefix><div class="i-ri-search-line text-gray-400" /></template>
      </n-input>
    </div>

    <!-- 标签页切换 -->
    <n-tabs v-model:value="activeTab" type="line" class="flex-1 overflow-hidden px-4" animated>
      <!-- 最近会话 -->
      <n-tab-pane name="sessions" tab="最近会话" class="h-full">
        <n-scrollbar class="h-full py-2">
          <div v-if="filteredSessions.length === 0" class="flex flex-col items-center justify-center h-full">
            <div class="i-ri-inbox-line text-5xl text-gray-300 dark:text-gray-600 mb-2" />
            <span class="text-sm text-gray-400">暂无匹配的会话</span>
          </div>

          <div v-else class="flex flex-col gap-1">
            <div
              v-for="session in filteredSessions"
              :key="session.peerId"
              class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
              :class="{ 'bg-primary/10': selectedId === session.peerId }"
              @click="handleSelect(session.peerId)"
            >
              <n-avatar :src="session.avatar" round :size="40" />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ session.name }}</div>
                <div class="text-xs text-gray-400 truncate">{{ session.lastMsg || '暂无消息' }}</div>
              </div>
              <div v-if="selectedId === session.peerId" class="i-ri-checkbox-circle-fill text-primary text-xl" />
            </div>
          </div>
        </n-scrollbar>
      </n-tab-pane>

      <!-- 联系人 -->
      <n-tab-pane name="contacts" tab="联系人" class="h-full">
        <n-scrollbar class="h-full py-2">
          <div v-if="filteredContacts.length === 0" class="flex flex-col items-center justify-center h-full">
            <div class="i-ri-user-line text-5xl text-gray-300 dark:text-gray-600 mb-2" />
            <span class="text-sm text-gray-400">暂无匹配的联系人</span>
          </div>

          <n-collapse v-else display-directive="show" :default-expanded-names="['friends', 'groups']" class="border-0">
            <!-- 好友列表 -->
            <n-collapse-item title="好友" name="friends">
              <template #header-extra>
                <span class="text-xs text-gray-400">{{ filteredFriends.length }}</span>
              </template>
              <div class="flex flex-col gap-1">
                <div
                  v-for="friend in filteredFriends"
                  :key="friend.user_id"
                  class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                  :class="{ 'bg-primary/10': selectedId === String(friend.user_id) }"
                  @click="handleSelect(String(friend.user_id))"
                >
                  <!-- 好友头像需要拼接 -->
                  <n-avatar round :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${friend.user_id}`" size="medium" />
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate">{{ friend.remark || friend.nickname }}</div>
                  </div>
                  <div
                    v-if="selectedId === String(friend.user_id)"
                    class="i-ri-checkbox-circle-fill text-primary text-xl"
                  />
                </div>
              </div>
            </n-collapse-item>

            <!-- 群组列表 -->
            <n-collapse-item title="群组" name="groups">
              <template #header-extra>
                <span class="text-xs text-gray-400">{{ filteredGroups.length }}</span>
              </template>
              <div class="flex flex-col gap-1">
                <div
                  v-for="group in filteredGroups"
                  :key="group.group_id"
                  class="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:bg-gray-100 dark:hover:bg-gray-800"
                  :class="{ 'bg-primary/10': selectedId === String(group.group_id) }"
                  @click="handleSelect(String(group.group_id))"
                >
                  <n-avatar round :src="`https://p.qlogo.cn/gh/${group.group_id}/${group.group_id}/0`" size="medium" />
                  <div class="flex-1 min-w-0">
                    <div class="text-sm font-medium truncate">{{ group.group_name }}</div>
                  </div>
                  <div
                    v-if="selectedId === String(group.group_id)"
                    class="i-ri-checkbox-circle-fill text-primary text-xl"
                  />
                </div>
              </div>
            </n-collapse-item>
          </n-collapse>
        </n-scrollbar>
      </n-tab-pane>
    </n-tabs>

    <!-- 底部操作按钮 -->
    <div class="flex justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-800">
      <n-button @click="handleCancel">取消</n-button>
      <n-button type="primary" :disabled="!selectedId" @click="handleConfirm">发送</n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { NInput, NTabs, NTabPane, NScrollbar, NAvatar, NButton, NCollapse, NCollapseItem, useMessage } from 'naive-ui'
import { useContactStore } from '@/stores/contact'
import { useChatStore } from '@/stores/chat'
import { bot } from '@/api'
import type { ForwardNode } from '@/types'

defineOptions({ name: 'ForwardBar' })

const router = useRouter()
const contactStore = useContactStore()
const chatStore = useChatStore()
const message = useMessage()

const keyword = ref('')
const selectedId = ref<string>('')
const activeTab = ref<'sessions' | 'contacts'>('sessions')

// 会话列表
const sessions = computed(() => contactStore.contacts || [])
const filteredSessions = computed(() =>
  sessions.value.filter((s) => !keyword.value || s.name.toLowerCase().includes(keyword.value.toLowerCase()))
)

// 联系人列表
const filteredFriends = computed(() =>
  contactStore.friends.filter(
    (f) => !keyword.value || (f.remark || f.nickname).toLowerCase().includes(keyword.value.toLowerCase())
  )
)

const filteredGroups = computed(() =>
  contactStore.groups.filter((g) => !keyword.value || g.group_name.toLowerCase().includes(keyword.value.toLowerCase()))
)

const filteredContacts = computed(() => [...filteredFriends.value, ...filteredGroups.value])

// 选择目标
const handleSelect = (id: string) => {
  selectedId.value = id
}

// 取消转发
const handleCancel = () => {
  chatStore.cancelForward()
}

// 确认发送
const handleConfirm = async () => {
  if (!selectedId.value) return

  const targetId = Number(selectedId.value)
  const isGroup = selectedId.value.length > 5 // 简单判断

  // 从 Store 获取原始消息对象
  const currentSessionId = router.currentRoute.value.params.id as string
  const msgs = chatStore
    .getMessages(currentSessionId)
    .filter((m) => chatStore.forwardingState.messageIds.includes(m.message_id))

  if (msgs.length === 0) {
    message.warning('未选择任何消息')
    return
  }

  message.loading('正在转发...')

  try {
    // 构造 OneBot 标准的 Forward Node
    const nodes: ForwardNode[] = msgs.map((m) => ({
      type: 'node',
      data: {
        nickname: m.sender.nickname,
        user_id: m.sender.user_id,
        // 优先使用原始消息链，如果不存在则使用 content (可能需要转换)
        content: m.message
      }
    }))

    if (isGroup) {
      await bot.sendGroupForwardMsg(targetId, nodes)
    } else {
      await bot.sendPrivateForwardMsg(targetId, nodes)
    }

    message.success('转发成功')
    chatStore.cancelForward()
  } catch (e) {
    message.error('转发失败')
    console.error(e)
  }
}
</script>
