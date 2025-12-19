<template>
  <div class="h-full w-full bg-sub flex flex-col">
    <!-- Header -->
    <header class="h-14 border-b border-dim bg-main/90 backdrop-blur flex-between px-4 flex-shrink-0 z-10">
      <div class="flex-x gap-3">
        <div class="md:hidden i-ri-arrow-left-s-line text-xl cursor-pointer" @click="router.back()" />
        <div class="i-ri-notification-line text-primary" />
        <span class="font-bold text-lg text-main">系统通知</span>
      </div>

      <div class="text-xs text-sub">共 {{ contactsStore.notices.length }} 条</div>
    </header>

    <!-- 列表 -->
    <div class="flex-1 overflow-y-auto my-scrollbar">
      <div class="p-4 flex flex-col gap-3">
        <div v-if="contactsStore.notices.length === 0" class="text-center text-sub py-20">暂无新通知</div>

        <div
          v-for="(item, idx) in contactsStore.notices"
          :key="idx"
          class="bg-main p-4 rounded-xl border border-dim flex gap-4 hover:shadow-sm my-trans"
        >
          <!-- 头像 -->
          <Avatar shape="circle" size="xlarge" :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${item.user_id}`" />

          <div class="flex-1 min-w-0">
            <!-- 标题栏 -->
            <div class="flex-between gap-2">
              <div class="flex-x gap-2">
                <span class="font-bold text-main">
                  {{ getTitle(item) }}
                </span>
                <span
                  class="px-2 py-0.5 bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 text-xs rounded-full"
                >
                  {{ item.sub_type }}
                </span>
              </div>
              <span class="text-xs text-sub flex-shrink-0">
                {{ formatTime(item.time * 1000) }}
              </span>
            </div>

            <!-- 详情 -->
            <div class="text-sm text-sub mt-2">
              <span class="text-primary font-medium">{{ item.user_id }}</span>
              <span class="mx-1">
                {{ getDescription(item) }}
              </span>
              <span v-if="item.group_id" class="text-sub"> (群: {{ item.group_id }}) </span>
            </div>

            <!-- 验证消息 -->
            <div v-if="item.comment" class="text-xs text-sub mt-2 bg-sub p-2 rounded border border-dim">
              {{ item.comment }}
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 mt-3">
              <Button size="small" :disabled="processing[idx]" @click="handleRequest(item, idx, false)"> 拒绝 </Button>
              <Button
                size="small"
                severity="primary"
                :loading="processing[idx]"
                @click="handleRequest(item, idx, true)"
              >
                同意
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import { useToast } from 'primevue/usetoast'
import { useContactsStore } from '@/stores/contacts'
import { bot } from '@/api'
import type { SystemNotice } from '@/types'
import { formatTime } from '@/utils/format'

defineOptions({ name: 'NoticeView' })

const router = useRouter()
const contactsStore = useContactsStore()
const toast = useToast()

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

    toast.add({ severity: 'success', summary: approve ? '已同意' : '已拒绝', life: 3000 })

    // 处理完毕后从列表移除
    contactsStore.notices.splice(idx, 1)
    // 重置状态防止索引偏移导致的问题
    processing.value = {}
  } catch (e) {
    console.error(e)
    toast.add({ severity: 'error', summary: '操作失败', life: 3000 })
  } finally {
    if (processing.value[idx]) processing.value[idx] = false
  }
}
</script>
