<template>
  <div class="flex-col-full bg-transparent">
    <!-- 滚动区域 -->
    <div class="flex-1 overflow-y-auto my-scrollbar p-2">
      <div class="flex flex-col gap-0.5">
        <!-- 会话列表项 -->
        <div
          v-for="session in filteredSessions"
          :key="session.id"
          class="group relative flex items-center gap-2.5 p-2 rounded-xl cursor-pointer select-none my-trans"
          :class="[
            isActive(session.id)
              ? 'bg-primary text-primary-content shadow-md shadow-primary/20'
              : 'hover:bg-dim/50'
          ]"
          @click="onSelect(session.id)"
        >
          <!-- 左侧：头像与 Tablet 模式角标 -->
          <div class="relative shrink-0 flex-center">
            <!-- 头像 w-12 (48px) -->
            <Avatar
              shape="circle"
              :image="session.avatar"
              class="w-12 h-12 bg-sub shadow-sm border border-dim"
            />
            <!-- Tablet 模式角标 (仅 md~xl 区间显示) -->
            <div
              v-if="session.unread > 0"
              class="hidden md:flex xl:hidden absolute -top-1 -right-1 min-w-[16px] h-[16px] px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex-center border-2 border-sub z-10 leading-none shadow-sm"
            >
              {{ session.unread > 99 ? '99+' : session.unread }}
            </div>
          </div>

          <!-- 右侧：文本内容 (Tablet 模式下隐藏，防止溢出) -->
          <div class="flex-1 min-w-0 flex flex-col gap-0.5 flex md:hidden xl:flex overflow-hidden">
            <!-- 第一行：名称 + 时间 -->
            <div class="flex-between">
              <span
                class="font-bold text-[14px] lg:text-[15px] truncate transition-colors"
                :class="isActive(session.id) ? 'text-white' : 'text-main'"
              >
                {{ getSessionName(session) }}
              </span>
              <span
                class="text-[10px] shrink-0 ml-2 transition-colors font-mono"
                :class="isActive(session.id) ? 'text-white/70' : 'text-dim group-hover:text-sub'"
              >
                {{ formatTime(session.time) }}
              </span>
            </div>

            <!-- 第二行：预览 + 未读数 -->
            <div class="flex-between items-end">
              <!-- 消息预览 -->
              <div
                class="flex-truncate overflow-hidden text-[12px] lg:text-[13px] flex-x gap-1 mr-2 transition-colors"
                :class="isActive(session.id) ? 'text-white/80' : 'text-sub group-hover:text-main'"
              >
                <!-- 发言人昵称 -->
                <span
                  v-if="false"
                  class="font-medium shrink-0 truncate max-w-[50%]"
                  :class="isActive(session.id) ? 'text-white' : 'text-primary'"
                >
                  <!-- {{ getLastSender(session.id) }}: -->
                </span>
                <!-- 消息内容 -->
                <span class="truncate opacity-90">{{ session.preview || '暂无消息' }}</span>
              </div>

              <!-- 常规模式角标 -->
              <div
                v-if="session.unread > 0"
                class="min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex-center leading-none shrink-0 shadow-sm border border-white/20"
              >
                {{ session.unread > 99 ? '99+' : session.unread }}
              </div>
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredSessions.length === 0" class="py-20 flex-col-full text-dim text-sm opacity-60">
          <div class="i-ri-chat-1-line text-4xl mb-2" />
          <div>暂无会话</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Avatar from 'primevue/avatar'
import { useSessionStore } from '@/stores/session'
import { useContactStore } from '@/stores/contact'
import type { Session } from '@/stores/session'

defineOptions({ name: 'SessionView' })

const props = defineProps<{ keyword?: string }>()
const router = useRouter()
const route = useRoute()

const sessionStore = useSessionStore()
const contactStore = useContactStore()

// --- State ---
const isActive = (id: string) => route.params.id === id
const onSelect = (id: string) => router.push(`/${id}`)

// 过滤会话列表
const filteredSessions = computed(() => {
  let list = sessionStore.sessions
  if (props.keyword) {
    const k = props.keyword.toLowerCase()
    list = list.filter((s) =>
      getSessionName(s).toLowerCase().includes(k) ||
      s.id.includes(k)
    )
  }
  return list
})

// --- Helpers ---

/** 获取会话显示名称 (优先从缓存获取最新群名/备注) */
const getSessionName = (session: Session) => {
  if (session.type === 'group' || session.id.length > 5) {
    const group = contactStore.groups.find(g => String(g.group_id) === session.id)
    if (group) return group.group_name
  } else {
    const friend = contactStore.friends.find(f => String(f.user_id) === session.id)
    if (friend) return friend.remark || friend.nickname
  }
  return session.name
}

// 格式化时间
function formatTime(timestamp?: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }

  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  }

  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' })
}
</script>
