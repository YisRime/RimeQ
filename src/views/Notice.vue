<template>
  <div class="h-full w-full bg-gray-50 dark:bg-black flex flex-col">
    <!-- 头部 Header -->
    <header
      class="h-14 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur flex items-center justify-between px-4 flex-shrink-0 z-10"
    >
      <div class="flex items-center gap-3 overflow-hidden">
        <!-- 移动端返回按钮 -->
        <div
          class="md:hidden i-ri-arrow-left-s-line text-xl p-2 -ml-2 cursor-pointer hover:text-primary"
          @click="goBack"
        />

        <div class="i-ri-notification-line text-primary" />
        <span class="font-bold text-lg text-gray-800 dark:text-gray-100 leading-tight">系统通知</span>
      </div>

      <!-- 未读数标记 -->
      <div v-if="contactStore.unreadNoticeCount() > 0" class="text-xs text-gray-500">
        {{ contactStore.unreadNoticeCount() }} 条未读
      </div>
    </header>

    <!-- 内容区域 -->
    <n-scrollbar class="flex-1">
      <div class="p-4 flex flex-col gap-3">
        <n-empty v-if="contactStore.notices.length === 0" description="暂无新通知" class="mt-20" />

        <div
          v-for="(item, idx) in contactStore.notices"
          :key="idx"
          class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex gap-4 transition-all hover:shadow-md"
        >
          <!-- 头像 -->
          <n-avatar round :size="48" :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${item.user_id}`" />

          <div class="flex-1 min-w-0">
            <!-- 标题和时间 -->
            <div class="flex justify-between items-start gap-2">
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-800 dark:text-gray-200">
                  {{ item.request_type === 'friend' ? '好友申请' : '群邀请' }}
                </span>
                <span
                  v-if="!item.status"
                  class="px-2 py-0.5 bg-red-500/10 text-red-600 dark:text-red-400 text-xs rounded-full"
                >
                  待处理
                </span>
              </div>
              <span class="text-xs text-gray-400 flex-shrink-0">{{ formatTime(item.time) }}</span>
            </div>

            <!-- 申请人信息 -->
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              <span class="text-primary font-medium">{{ item.nickname || `用户 ${item.user_id}` }}</span>
              <span class="mx-1">
                {{
                  item.sub_type === 'invite'
                    ? '邀请你加入群'
                    : item.request_type === 'friend'
                      ? '请求加为好友'
                      : '申请加入群聊'
                }}
              </span>
              <span v-if="item.group_id" class="text-gray-500">(群: {{ item.group_id }})</span>
            </div>

            <!-- 验证消息 -->
            <div
              v-if="item.comment"
              class="text-xs text-gray-500 mt-2 bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-700"
            >
              <span class="text-gray-400">验证消息：</span>{{ item.comment }}
            </div>

            <!-- 操作按钮 -->
            <div v-if="!item.status" class="flex justify-end gap-3 mt-3">
              <n-button size="small" :loading="loading" @click="handleRequest(item, false)">拒绝</n-button>
              <n-button size="small" type="primary" :loading="loading" @click="handleRequest(item, true)">
                同意
              </n-button>
            </div>
            <div v-else class="flex justify-end mt-3 text-sm">
              <span v-if="item.status === 'approve'" class="text-green-600 dark:text-green-400 flex items-center gap-1">
                <div class="i-ri-check-line" />
                已同意
              </span>
              <span v-else class="text-red-500 dark:text-red-400 flex items-center gap-1">
                <div class="i-ri-close-line" />
                已拒绝
              </span>
            </div>
          </div>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { NScrollbar, NEmpty, NAvatar, NButton, useMessage } from 'naive-ui'
import { useContactStore } from '@/stores/contact'
import type { SystemNotice } from '@/stores/contact'
import { botApi } from '@/api'
import { formatTime } from '@/utils/format'
import { useRouter } from 'vue-router'

const contactStore = useContactStore()
const message = useMessage()
const router = useRouter()
const loading = ref(false)

// 返回按钮逻辑（移动端使用）
const goBack = () => {
  const currentPath = router.currentRoute.value.path
  // 从联系人子页返回联系人列表
  if (currentPath.startsWith('/contacts/')) {
    router.push('/contacts')
  } else {
    router.push('/chats')
  }
}

const handleRequest = async (item: SystemNotice, approve: boolean) => {
  if (loading.value) return
  loading.value = true

  try {
    if (item.request_type === 'friend') {
      await botApi.setFriendAddRequest(item.flag, approve)
    } else {
      await botApi.setGroupAddRequest(item.flag, item.sub_type || 'add', approve)
    }
    contactStore.updateNoticeStatus(item.flag, approve ? 'approve' : 'reject')
    message.success(approve ? '已同意' : '已拒绝')
  } catch (e) {
    console.error('处理请求失败', e)
    message.error('操作失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>
