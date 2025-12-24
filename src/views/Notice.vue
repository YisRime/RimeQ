<template>
  <div class="flex-col-full bg-sub">
    <!-- 顶部导航栏 -->
    <header class="h-14 border-b border-dim bg-main/90 backdrop-blur flex-x px-3 shrink-0 z-10 gap-2">
      <div class="p-1 -ml-1 rounded-full hover:bg-dim cursor-pointer md:hidden transition-colors" @click="router.back()">
        <div class="i-ri-arrow-left-s-line text-2xl text-sub" />
      </div>
      <div class="i-ri-notification-3-line text-lg text-primary" />
      <span class="font-bold text-base text-main">系统通知</span>
    </header>
    <!-- 通知列表区域 -->
    <div class="flex-1 overflow-y-auto my-scrollbar p-2 md:p-3">
      <TransitionGroup name="list" tag="div" class="flex flex-col gap-2">
        <div
          v-for="(item, idx) in list"
          :key="item.flag || idx"
          class="bg-main rounded-lg p-3 border border-dim shadow-sm hover:shadow-md my-trans relative overflow-hidden group"
        >
          <!-- 侧边状态指示条 -->
          <div class="absolute left-0 top-0 bottom-0 w-1" :class="getBorderColor(item)" />
          <div class="flex-x gap-3 pl-2 text-sm">
            <Avatar :image="getAvatar(item)" shape="circle" class="border border-dim bg-sub shrink-0 !w-9 !h-9" />
            <div class="flex-1 min-w-0 flex flex-wrap items-center gap-1.5 leading-tight">
              <!-- 用户名称 -->
              <span class="font-bold text-main">{{ getName((item.user_id as number), (item as any).requester_nick) }}</span>
              <span class="text-xs text-dim font-mono">({{ item.user_id }})</span>
              <!-- 行为描述 -->
              <span class="text-sub shrink-0 mx-1">{{ getActionText(item) }}</span>
              <!-- 关联群组 -->
              <template v-if="item.group_id">
                <span class="font-bold text-main">{{ getGroupName(item.group_id, (item as any).group_name) }}</span>
                <span class="text-xs text-dim font-mono">({{ item.group_id }})</span>
              </template>
              <!-- 时间戳 -->
              <span class="ml-auto text-[10px] text-dim whitespace-nowrap pl-2">
                {{ formatTime(item.time) }}
              </span>
            </div>
          </div>
          <!-- 分割线 -->
          <div class="h-px bg-dim/50 ml-2 my-2" />
          <div class="flex-between pl-2 gap-4">
            <div class="flex-1 min-w-0 text-xs text-sub break-words">
              <span v-if="item.comment" class="opacity-80">附加信息: {{ item.comment }}</span>
              <span v-else class="italic opacity-50">无附加信息</span>
            </div>
            <!-- 操作按钮 -->
            <SplitButton
              label="同意"
              icon="i-ri-check-line"
              size="small"
              class="!h-8 [&>.p-button]:!px-3 [&>.p-button]:!text-xs shadow-sm shadow-primary/20"
              :model="getActionModel(item)"
              :loading="!!processing[item.flag || idx]"
              @click="handle(item, true)"
            />
          </div>
        </div>
      </TransitionGroup>
      <!-- 空列表状态 -->
      <div v-if="list.length === 0" class="flex-center flex-col py-20 text-dim select-none">
        <div class="w-16 h-16 bg-dim/30 rounded-full flex-center mb-3">
          <div class="i-ri-notification-off-line text-2xl opacity-50" />
        </div>
        <span class="text-xs">暂无新消息</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from 'primevue/usetoast'
import Avatar from 'primevue/avatar'
import SplitButton from 'primevue/splitbutton'
import { dataStore } from '@/utils/storage'
import { bot } from '@/api'
import type { SystemNotice } from '@/types'

defineOptions({ name: 'NoticeView' })

const router = useRouter()
const toast = useToast()

const processing = ref<Record<string, boolean>>({})
const nameCache = reactive({ user: {} as Record<number, string>, group: {} as Record<number, string> })

const list = computed(() => dataStore.notices.value.filter(i => i.post_type === 'request'))

// 时间格式化
const formatTime = (ts: number) => {
  const d = new Date(ts * 1000)
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

// 获取侧边栏颜色
const getBorderColor = (i: SystemNotice) =>
  i.request_type === 'friend' ? 'bg-green-500' : (i.sub_type === 'invite' ? 'bg-blue-500' : 'bg-orange-500')

// 头像显示
const getAvatar = (i: SystemNotice) =>
  (i.request_type === 'group' && i.sub_type === 'add')
    ? `https://q1.qlogo.cn/g?b=qq&s=0&nk=${i.user_id}`
    : (i.group_id ? `https://p.qlogo.cn/gh/${i.group_id}/${i.group_id}/0` : `https://q1.qlogo.cn/g?b=qq&s=0&nk=${i.user_id}`)

// 生成描述
const getActionText = (i: SystemNotice) =>
  i.request_type === 'friend' ? '请求添加好友' : (i.sub_type === 'invite' ? '邀请你加入' : '申请加入')

// 获取用户名
const getName = (uid: number, nick?: string) => {
  if (nick) return nick
  if (nameCache.user[uid]) return nameCache.user[uid]
  bot.getStrangerInfo(uid).then(res => nameCache.user[uid] = res.nickname).catch(() => nameCache.user[uid] = `${uid}`)
  return `${uid}`
}

// 获取群名称
const getGroupName = (gid: number, name?: string) => {
  if (name) return name
  if (nameCache.group[gid]) return nameCache.group[gid]
  bot.getGroupInfo(gid).then(res => nameCache.group[gid] = res.group_name).catch(() => nameCache.group[gid] = `群 ${gid}`)
  return `群 ${gid}`
}

// 操作菜单
const getActionModel = (item: SystemNotice) => [
  { label: '拒绝', icon: 'i-ri-close-line', command: () => handle(item, false) },
  { label: '忽略', icon: 'i-ri-eye-off-line', command: () => remove(item) }
]

// 移除通知项
const remove = (item: SystemNotice) => {
  const idx = dataStore.notices.value.indexOf(item)
  if (idx > -1) dataStore.notices.value.splice(idx, 1)
}

// 提交处理请求
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
    remove(item)
  } catch (e) {
    toast.add({ severity: 'error', summary: '操作失败', detail: e, life: 3000 })
  } finally {
    delete processing.value[key]
  }
}
</script>
