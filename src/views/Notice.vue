<template>
  <div class="ui-flex-col-full">
    <!-- 通知列表容器 -->
    <div class="flex-1 overflow-y-auto ui-scrollbar p-2 md:p-3">
      <TransitionGroup name="list" tag="div" class="flex flex-col gap-2">
        <div
          v-for="(item, idx) in list"
          :key="item.flag || idx"
          class="bg-background-sub rounded-2xl p-3 border border-background-dim/70 shadow-sm hover:border-background-dim hover:shadow-md ui-trans ui-dur-fast relative overflow-hidden group"
        >
          <!-- 侧边状态指示条 -->
          <div
            class="absolute left-0 top-0 bottom-0 w-1"
            :class="item.request_type === 'friend' ? 'bg-green-500' : (item.sub_type === 'invite' ? 'bg-blue-500' : 'bg-orange-500')"
          />
          <!-- 顶部信息 -->
          <div class="ui-flex-x gap-3 pl-2 text-sm">
            <Avatar :image="getAvatar(item)" shape="circle" class="border border-background-dim bg-background-sub shrink-0 !w-9 !h-9" />
            <div class="ui-flex-truncate flex flex-wrap items-center gap-1.5 leading-tight">
              <!-- 用户名称与 ID -->
              <span class="font-bold text-foreground-main">{{ contactStore.getFriendName((item.user_id as number), (item as any).requester_nick) }}</span>
              <span class="text-xs text-foreground-dim font-mono">({{ item.user_id }})</span>
              <!-- 行为描述 -->
              <span class="text-foreground-sub shrink-0 mx-1">
                {{ item.request_type === 'friend' ? '请求添加好友' : (item.sub_type === 'invite' ? '邀请你加入' : '申请加入') }}
              </span>
              <!-- 关联群组 -->
              <template v-if="item.group_id">
                <span class="font-bold text-foreground-main">{{ contactStore.getGroupName(item.group_id, (item as any).group_name) }}</span>
                <span class="text-xs text-foreground-dim font-mono">({{ item.group_id }})</span>
              </template>
              <!-- 时间戳 -->
              <span class="ml-auto text-[10px] text-foreground-dim whitespace-nowrap pl-2">
                {{ formatTime(item.time) }}
              </span>
            </div>
          </div>
          <!-- 分割线 -->
          <div class="h-px bg-background-dim/50 ml-2 my-2" />
          <!-- 底部信息 -->
          <div class="ui-flex-between pl-2 gap-4">
            <div class="ui-flex-truncate text-xs text-foreground-sub break-words">
              <span v-if="item.comment" class="opacity-80">附加信息: {{ item.comment }}</span>
              <span v-else class="italic opacity-50">无附加信息</span>
            </div>
            <!-- 操作按钮 -->
            <SplitButton
              label="同意"
              icon="i-ri-check-line"
              size="small"
              class="!h-8 [&>.p-button]:!px-3 [&>.p-button]:!text-xs shadow-sm shadow-primary/20"
              :model="[
                { label: '拒绝', icon: 'i-ri-close-line', command: () => handle(item, false) },
                { label: '忽略', icon: 'i-ri-eye-off-line', command: () => contactStore.removeNotice(item) }
              ]"
              :loading="!!processing[item.flag || idx]"
              @click="handle(item, true)"
            />
          </div>
        </div>
      </TransitionGroup>
      <!-- 空列表 -->
      <div v-if="list.length === 0" class="ui-flex-y py-20 text-foreground-dim select-none">
        <div class="w-16 h-16 bg-background-dim/30 rounded-full ui-flex-center mb-3">
          <div class="i-ri-notification-off-line text-2xl opacity-50" />
        </div>
        <span class="text-xs">暂无新消息</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import Avatar from 'primevue/avatar'
import SplitButton from 'primevue/splitbutton'
import { useContactStore } from '@/stores/contact'
import { bot } from '@/api'
import type { SystemNotice } from '@/types'

defineOptions({ name: 'NoticeView' })

const toast = useToast()
const contactStore = useContactStore()

const processing = ref<Record<string, boolean>>({})
const list = computed(() => contactStore.notices.filter(i => i.post_type === 'request'))

// 格式化时间显示
const formatTime = (ts: number) => {
  const d = new Date(ts * 1000)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

// 动态获取头像 URL
const getAvatar = (i: SystemNotice) =>
  (i.request_type === 'group' && i.sub_type === 'add')
    ? `https://q1.qlogo.cn/g?b=qq&s=0&nk=${i.user_id}`
    : (i.group_id ? `https://p.qlogo.cn/gh/${i.group_id}/${i.group_id}/0` : `https://q1.qlogo.cn/g?b=qq&s=0&nk=${i.user_id}`)

// 处理请求
const handle = async (item: SystemNotice, approve: boolean) => {
  if (!item.flag) return
  const key = item.flag
  processing.value[key] = true

  try {
    if (item.request_type === 'friend') {
      await bot.setFriendAddRequest(item.flag, approve)
    } else {
      await bot.setGroupAddRequest(item.flag, item.sub_type || 'add', approve)
    }
    toast.add({ severity: approve ? 'success' : 'info', summary: approve ? '已同意' : '已拒绝', life: 3000 })
    contactStore.removeNotice(item)
  } catch (e) {
    toast.add({ severity: 'error', summary: '操作失败', detail: e, life: 3000 })
  } finally {
    delete processing.value[key]
  }
}
</script>
