<template>
  <div class="ui-flex-col-full bg-transparent overflow-hidden">
    <!-- 滚动容器 -->
    <div class="flex-1 overflow-y-auto ui-scrollbar p-3 flex flex-col gap-6 scroll-smooth">
      <!-- 请求列表 -->
      <section v-if="requests.length > 0" class="flex gap-1 relative shrink-0 min-h-[60px]">
        <!-- 左侧列表 -->
        <div class="flex-1 min-w-0">
          <TransitionGroup
            tag="div"
            class="flex flex-col gap-2"
            enter-active-class="ui-trans ui-dur-fast"
            leave-active-class="ui-trans ui-dur-fast"
            enter-from-class="opacity-0 -translate-x-4"
            leave-to-class="opacity-0 -translate-x-4"
          >
            <div
              v-for="item in requests"
              :key="item.flag"
              class="group relative bg-background-sub hover:bg-background-dim/40 rounded-2xl p-3 shadow-sm border border-transparent hover:border-background-dim/50 ui-trans ui-dur-fast flex items-center gap-4 overflow-hidden"
            >
              <!-- 头像 -->
              <div class="shrink-0">
                <Avatar
                  :image="getAvatar(item)"
                  shape="circle"
                  class="!w-12 !h-12 border border-background-dim bg-background-dim shadow-sm"
                />
              </div>
              <!-- 文本信息 -->
              <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div class="text-base font-bold text-foreground-main truncate">
                   {{ getRequest(item) }}
                </div>
                <!-- 验证消息 -->
                <div v-if="item.comment" class="text-xs text-foreground-sub truncate flex items-center gap-1.5 bg-background-dim/30 w-fit px-2 py-0.5 rounded-lg">
                  <div class="i-ri-chat-quote-line shrink-0 text-[10px] opacity-70" />
                  <span>{{ item.comment }}</span>
                </div>
              </div>
              <!-- 右侧选项 -->
              <div class="shrink-0 flex items-center gap-4">
                 <!-- 按钮组 -->
                 <div class="flex items-center gap-2 opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 ui-trans ui-dur-fast">
                   <Button
                      v-tooltip.top="'通过'"
                      icon="i-ri-check-line"
                      rounded
                      class="!w-9 !h-9 !p-0 !text-green-600 !bg-background-main hover:!bg-green-50 !border !border-background-dim shadow-sm transition-all"
                      :loading="!!processing[item.flag]"
                      @click="handleRequest(item, true)"
                   />
                   <Button
                      v-tooltip.top="'拒绝'"
                      icon="i-ri-close-line"
                      rounded
                      class="!w-9 !h-9 !p-0 !text-red-500 !bg-background-main hover:!bg-red-50 !border !border-background-dim shadow-sm transition-all"
                      :loading="!!processing[item.flag]"
                      @click="handleRequest(item, false)"
                   />
                   <Button
                      v-tooltip.top="'忽略'"
                      icon="i-ri-eye-off-line"
                      rounded
                      class="!w-9 !h-9 !p-0 !text-foreground-sub !bg-background-main hover:!bg-background-dim !border !border-background-dim shadow-sm transition-all"
                      @click="contactStore.removeRequest(item)"
                   />
                 </div>
                 <!-- 时间 -->
                 <div class="text-xs font-bold text-foreground-dim/60 font-mono whitespace-nowrap min-w-[40px] text-right">
                    {{ formatTime(item.time * 1000) }}
                 </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
        <!-- 右侧指示条 -->
        <div
          class="w-6 shrink-0 rounded-2xl border border-transparent hover:border-primary/10 cursor-pointer group/bar transition-all duration-300 relative flex justify-center"
          @click="contactStore.removeRequest({} as any, true)"
        >
           <div class="sticky top-1/2 -translate-y-1/2 h-fit py-2 flex flex-col items-center gap-1.5 text-[10px]">
              <span class="font-bold text-primary/50 group-hover/bar:text-primary transition-colors select-none" style="writing-mode: vertical-rl; letter-spacing: 2px;">
                请求
              </span>
              <span class="font-bold text-primary/80 group-hover/bar:text-primary transition-colors select-none" style="writing-mode: vertical-rl; text-orientation: upright;">
                {{ requests.length }}
              </span>
              <div class="i-ri-delete-bin-line text-primary/50 group-hover/bar:text-primary text-sm transition-all opacity-0 group-hover/bar:opacity-100" />
           </div>
        </div>
      </section>
      <!-- 系统通知 -->
      <section v-if="notices.length > 0" class="flex gap-1 relative shrink-0 min-h-[60px]">
        <!-- 左侧列表 -->
        <div class="flex-1 min-w-0">
          <TransitionGroup
            tag="div"
            class="flex flex-col gap-2"
            enter-active-class="ui-trans ui-dur-fast"
            leave-active-class="ui-trans ui-dur-fast"
            enter-from-class="opacity-0 -translate-x-4"
            leave-to-class="opacity-0 -translate-x-4"
          >
            <div
              v-for="(item, idx) in notices"
              :key="item.time + '_' + idx"
              class="group relative bg-background-sub hover:bg-background-dim/40 rounded-2xl p-3 shadow-sm border border-transparent hover:border-background-dim/50 ui-trans ui-dur-fast flex items-center gap-4 overflow-hidden"
            >
              <!-- 头像 -->
              <div class="shrink-0">
                 <Avatar
                  :image="getAvatar(item)"
                  shape="circle"
                  class="!w-12 !h-12 border border-background-dim bg-background-dim shadow-sm"
                />
              </div>
              <!-- 文本信息 -->
              <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
                <div class="text-sm font-bold text-foreground-main truncate">
                  {{ getNotice(item) }}
                </div>
              </div>
              <!-- 右侧选项 -->
              <div class="shrink-0 flex items-center gap-4">
                <div class="opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 ui-trans ui-dur-fast">
                  <Button
                    v-tooltip.top="'删除'"
                    icon="i-ri-close-line"
                    rounded
                    class="!w-9 !h-9 !p-0 !text-foreground-sub !bg-background-main hover:!text-red-500 hover:!bg-red-50 !border !border-background-dim shadow-sm transition-all"
                    @click="contactStore.removeNotice(item)"
                  />
                </div>
                <!-- 时间 -->
                <div class="text-xs font-bold text-foreground-dim/60 font-mono whitespace-nowrap min-w-[40px] text-right">
                  {{ formatTime(item.time * 1000) }}
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
        <!-- 右侧指示条 -->
        <div
          class="w-6 shrink-0 rounded-2xl border border-transparent hover:border-foreground-dim/10 cursor-pointer group/bar transition-all duration-300 relative flex justify-center"
          @click="contactStore.removeNotice({} as any, true)"
        >
           <div class="sticky top-1/2 -translate-y-1/2 h-fit py-2 flex flex-col items-center gap-1.5 text-[10px]">
              <span class="font-bold text-foreground-dim/50 group-hover/bar:text-foreground-main transition-colors select-none" style="writing-mode: vertical-rl; letter-spacing: 2px;">
                通知
              </span>
              <span class="font-bold text-foreground-dim/80 group-hover/bar:text-foreground-main transition-colors select-none" style="writing-mode: vertical-rl; text-orientation: upright;">
                {{ notices.length }}
              </span>
              <div class="i-ri-delete-bin-line text-foreground-dim/50 group-hover/bar:text-foreground-main text-sm transition-all opacity-0 group-hover/bar:opacity-100" />
           </div>
        </div>
      </section>
      <!-- 空状态 -->
      <div v-if="requests.length === 0 && notices.length === 0" class="flex flex-col items-center justify-center py-32 text-foreground-dim select-none opacity-60">
        <div class="w-24 h-24 rounded-3xl bg-background-dim/30 ui-flex-center mb-6">
           <div class="i-ri-notification-off-line text-4xl" />
        </div>
        <span class="text-base font-bold">暂无新消息</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useToast, Avatar, Button } from 'primevue'
import { bot } from '@/api'
import { useContactStore } from '@/stores'
import { formatTime } from '@/utils/format'
import type { Request, Notice } from '@/types'

defineOptions({ name: 'NoticeView' })

const toast = useToast()
const contactStore = useContactStore()
const processing = ref<Record<string, boolean>>({})

// 排序列表
const requests = computed(() => [...contactStore.requests].sort((a, b) => b.time - a.time))
const notices = computed(() => [...contactStore.notices.user].sort((a, b) => b.time - a.time))

// 获取头像
const getAvatar = (item: Request | Notice) => {
  const isInvite = 'request_type' in item && item.request_type === 'group' && item.sub_type === 'invite'
  if (isInvite) return `https://p.qlogo.cn/gh/${item.group_id}/${item.group_id}/0`
  const targetId = item.user_id || ('operator_id' in item ? item.operator_id : 0)
  if (targetId) return `https://q1.qlogo.cn/g?b=qq&s=0&nk=${targetId}`
  if (item.group_id) return `https://p.qlogo.cn/gh/${item.group_id}/${item.group_id}/0`
  return ''
}

// 生成请求
const getRequest = (item: Request): string => {
  const userName = contactStore.getUserName(item.user_id, String(item.user_id))
  if (item.request_type === 'friend') return `${userName} 请求添加你为好友`
  const groupName = contactStore.getGroupName(String(item.group_id), String(item.group_id))
  return item.sub_type === 'invite'
    ? `${userName} 邀请你加入 ${groupName}`
    : `${userName} 申请加入 ${groupName}`
}

// 生成通知
const getNotice = (n: Notice): string => {
  const op = contactStore.getUserName(Number(n.operator_id), String(n.operator_id))
  const user = contactStore.getUserName(Number(n.user_id), String(n.user_id))
  const group = contactStore.getGroupName(String(n.group_id), String(n.group_id))
  const templates: Record<string, string> = {
    group_increase: n.sub_type === 'invite' ? `${op} 邀请 ${user} 加入了 ${group}` : `${user} 加入了 ${group}`,
    group_decrease: n.sub_type === 'kick' ? `${user} 被 ${op} 移出了 ${group}` : `${user} 退出了 ${group}`,
    group_admin: `${user} 被${n.sub_type === 'set' ? '设为' : '取消'}了 ${group} 的管理员`
  }
  return templates[n.notice_type]!
}

// 处理请求
const handleRequest = async (item: Request, approve: boolean) => {
  const key = item.flag
  processing.value[key] = true
  try {
    if (item.request_type === 'friend') {
      await bot.setFriendAddRequest(item.flag, approve)
    } else {
      await bot.setGroupAddRequest(item.flag, item.sub_type ? 'invite' : 'add', approve)
    }
    toast.add({ severity: approve ? 'success' : 'info', summary: approve ? '已通过' : '已拒绝', life: 3000 })
    contactStore.removeRequest(item)
  } catch (e) {
    toast.add({ severity: 'error', summary: '操作失败', detail: String(e), life: 3000 })
  } finally {
    delete processing.value[key]
  }
}
</script>
