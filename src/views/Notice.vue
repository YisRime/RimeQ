<template>
  <div class="h-full w-full bg-gray-50 dark:bg-black flex flex-col">
    <!-- Header -->
    <header
      class="h-14 border-b border-gray-200 dark:border-gray-800 bg-white/90 dark:bg-gray-900/90 backdrop-blur flex items-center justify-between px-4 flex-shrink-0 z-10"
    >
      <div class="flex items-center gap-3">
        <div class="md:hidden i-ri-arrow-left-s-line text-xl cursor-pointer" @click="router.back()" />
        <div class="i-ri-notification-line text-primary" />
        <span class="font-bold text-lg text-gray-800 dark:text-gray-100">系统通知</span>
      </div>

      <div class="text-xs text-gray-500">共 {{ contactsStore.notices.length }} 条</div>
    </header>

    <!-- 列表 -->
    <n-scrollbar class="flex-1">
      <div class="p-4 flex flex-col gap-3">
        <n-empty v-if="contactsStore.notices.length === 0" description="暂无新通知" class="mt-20" />

        <div
          v-for="(item, idx) in contactsStore.notices"
          :key="idx"
          class="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 flex gap-4 hover:shadow-sm transition-shadow"
        >
          <!-- 头像 -->
          <n-avatar round :size="48" :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${item.user_id}`" />

          <div class="flex-1 min-w-0">
            <!-- 标题栏 -->
            <div class="flex justify-between items-start gap-2">
              <div class="flex items-center gap-2">
                <span class="font-bold text-gray-800 dark:text-gray-200">
                  {{ getTitle(item) }}
                </span>
                <span
                  class="px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full"
                >
                  {{ item.sub_type }}
                </span>
              </div>
              <span class="text-xs text-gray-400 flex-shrink-0">
                {{ formatTime(item.time * 1000) }}
              </span>
            </div>

            <!-- 详情 -->
            <div class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              <span class="text-primary font-medium">{{ item.user_id }}</span>
              <span class="mx-1">
                {{ getDescription(item) }}
              </span>
              <span v-if="item.group_id" class="text-gray-500"> (群: {{ item.group_id }}) </span>
            </div>

            <!-- 验证消息 -->
            <div
              v-if="item.comment"
              class="text-xs text-gray-500 mt-2 bg-gray-50 dark:bg-gray-900 p-2 rounded border border-gray-100 dark:border-gray-700"
            >
              {{ item.comment }}
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 mt-3">
              <n-button size="small" :disabled="processing[idx]" @click="handleRequest(item, idx, false)">
                拒绝
              </n-button>
              <n-button size="small" type="primary" :loading="processing[idx]" @click="handleRequest(item, idx, true)">
                同意
              </n-button>
            </div>
          </div>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { NScrollbar, NEmpty, NAvatar, NButton, useMessage } from 'naive-ui'
import { useContactsStore } from '@/stores/contacts'
import { bot } from '@/api'
import type { SystemNotice } from '@/types'
import { formatTime } from '@/utils/format'

defineOptions({ name: 'NoticeView' })

const router = useRouter()
const contactsStore = useContactsStore()
const message = useMessage()

// 简单的处理状态标记
const processing = ref<Record<number, boolean>>({})

// Helpers
const getTitle = (item: SystemNotice) => {
  return item.request_type === 'friend' ? '好友申请' : '群组通知'
}

const getDescription = (item: SystemNotice) => {
  if (item.request_type === 'friend') return '请求添加好友'
  if (item.sub_type === 'invite') return '邀请入群'
  return '申请入群'
}

// Actions
const handleRequest = async (item: SystemNotice, idx: number, approve: boolean) => {
  if (!item.flag) return

  processing.value[idx] = true
  try {
    if (item.request_type === 'friend') {
      await bot.setFriendAddRequest(item.flag, approve)
    } else {
      // group request: sub_type usually 'add' or 'invite'
      await bot.setGroupAddRequest(item.flag, item.sub_type || 'add', approve)
    }

    message.success(approve ? '已同意' : '已拒绝')

    // 处理完毕后从列表移除
    contactsStore.notices.splice(idx, 1)
    // 重置状态防止索引偏移导致的问题
    processing.value = {}
  } catch (e) {
    console.error(e)
    message.error('操作失败')
  } finally {
    if (processing.value[idx]) processing.value[idx] = false
  }
}
</script>
