<template>
  <div class="ui-flex-col-full bg-transparent overflow-hidden">
    <!-- 标题栏 -->
    <header class="h-16 shrink-0 border-b border-border/10 bg-transparent ui-flex-x px-4 z-20 select-none ui-trans">
      <div
        v-if="isMobile"
        class="w-8 h-8 rounded-full ui-flex-center ui-ia hover:bg-background-sub/50 text-foreground-main bg-background-sub/20 shrink-0 mr-3"
        @click="router.back()"
      >
        <div class="i-ri-arrow-left-s-line text-lg" />
      </div>
      <span class="font-bold text-lg text-foreground-main truncate">验证消息</span>
    </header>
    <!-- 滚动容器 -->
    <div class="flex-1 overflow-y-auto ui-scrollbar p-3 scroll-smooth">
      <!-- 请求列表 -->
      <div v-if="requests.length > 0" class="flex flex-col gap-2 pb-4">
        <div
          v-for="item in requests"
          :key="item.flag"
          class="group relative bg-background-sub/30 backdrop-blur hover:bg-background-sub/50 rounded-2xl p-3 shadow-sm border border-white/10 ui-trans flex items-center gap-4 overflow-hidden"
        >
          <!-- 头像 -->
          <div class="shrink-0">
            <Avatar
              :image="getAvatar(item)"
              shape="circle"
              class="!w-12 !h-12 border border-white/10 bg-background-sub/50 shadow-sm"
            />
          </div>
          <!-- 文本信息 -->
          <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
            <div class="text-base font-bold text-foreground-main truncate">
               {{ getRequest(item) }}
            </div>
            <!-- 验证消息 -->
            <div v-if="item.comment" class="text-xs text-foreground-sub truncate flex items-center gap-1.5 bg-background-sub/20 w-fit px-2 py-0.5 rounded-lg">
              <div class="i-ri-chat-quote-line shrink-0 text-[10px] opacity-70" />
              <span>{{ item.comment }}</span>
            </div>
          </div>
          <!-- 右侧选项 -->
          <div class="shrink-0 flex items-center gap-4">
             <!-- 按钮组 -->
             <div class="flex items-center gap-2 md:opacity-0 md:translate-x-4 md:group-hover:opacity-100 md:group-hover:translate-x-0 ui-trans">
               <Button
                  v-tooltip.top="'通过'"
                  icon="i-ri-check-line"
                  rounded
                  class="!w-9 !h-9 !p-0 !text-green-600 !bg-background-sub/60 hover:!bg-green-50/50 !border !border-white/10 shadow-sm transition-all"
                  @click="handleRequest(item, true)"
               />
               <Button
                  v-tooltip.top="'拒绝'"
                  icon="i-ri-close-line"
                  rounded
                  class="!w-9 !h-9 !p-0 !text-red-500 !bg-background-sub/60 hover:!bg-red-50/50 !border !border-white/10 shadow-sm transition-all"
                  @click="handleRequest(item, false)"
               />
               <Button
                  v-tooltip.top="'忽略'"
                  icon="i-ri-eye-off-line"
                  rounded
                  class="!w-9 !h-9 !p-0 !text-foreground-sub !bg-background-sub/60 hover:!bg-background-sub/80 !border !border-white/10 shadow-sm transition-all"
                  @click="contactStore.removeRequest(item)"
               />
             </div>
             <!-- 时间 -->
             <div class="text-xs font-bold text-foreground-dim font-mono whitespace-nowrap min-w-[40px] text-right hidden sm:block">
                {{ formatTime(item.time * 1000) }}
             </div>
          </div>
        </div>
      </div>
      <!-- 空状态 -->
      <div v-else class="flex flex-col items-center justify-center py-32 text-foreground-dim select-none opacity-60">
        <div class="w-24 h-24 rounded-3xl bg-background-sub/20 backdrop-blur ui-flex-center mb-6 border border-white/5">
           <div class="i-ri-notification-off-line text-4xl" />
        </div>
        <span class="text-base font-bold">暂无消息</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast, Avatar, Button } from 'primevue'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import { bot } from '@/api'
import { useContactStore } from '@/stores'
import { formatTime } from '@/utils/format'
import type { Request } from '@/types'

defineOptions({ name: 'RequestView' })

const router = useRouter()
const toast = useToast()
const contactStore = useContactStore()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')

// 排序列表
const requests = computed(() => [...contactStore.requests].sort((a, b) => b.time - a.time))

// 生成请求
const getRequest = (item: Request): string => {
  const userName = contactStore.getUserName(item.user_id, item.group_id, String(item.user_id))
  if (item.request_type === 'friend') return `${userName} 请求添加你为好友`
  const groupName = contactStore.getGroupName(item.group_id!, String(item.group_id))
  return item.sub_type === 'invite'
    ? `${userName} 邀请你加入 ${groupName}`
    : `${userName} 申请加入 ${groupName}`
}

// 获取头像
const getAvatar = (item: Request) => {
  if (item.request_type === 'group' && item.sub_type === 'invite')
    return `https://p.qlogo.cn/gh/${item.group_id}/${item.group_id}/0`
  return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${item.user_id}`
}

// 处理请求
const handleRequest = async (item: Request, approve: boolean) => {
  try {
    if (item.request_type === 'friend') {
      await bot.setFriendAddRequest(item.flag, approve)
    } else {
      await bot.setGroupAddRequest(item.flag, approve, '', item.sub_type || 'add')
    }
    toast.add({ severity: approve ? 'success' : 'info', summary: approve ? '已通过' : '已拒绝', life: 3000 })
    contactStore.removeRequest(item)
  } catch (e) {
    toast.add({ severity: 'error', summary: '操作失败', detail: e, life: 3000 })
  }
}
</script>
