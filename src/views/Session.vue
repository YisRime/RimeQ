<template>
  <!-- 会话列表容器 -->
  <div class="ui-flex-col-full bg-transparent">
    <!-- 滚动区域 -->
    <div class="flex-1 overflow-y-auto ui-scrollbar px-2 py-2">
      <div class="flex flex-col gap-1">
        <!-- 会话项 -->
        <div
          v-for="session in filteredSessions"
          :key="session.id"
          class="group relative rounded-xl cursor-pointer select-none overflow-hidden ui-trans ui-dur-normal p-2.5 md:p-2 xl:p-2.5"
          :class="[
            isActive(session.id)
              ? 'bg-primary text-primary-content shadow-md shadow-primary/20'
              : 'hover:ui-bg-background-dim/50 bg-transparent text-foreground-main'
          ]"
          @click="handleSessionClick(session.id)"
        >
          <!-- 内容布局 -->
          <div class="grid grid-cols-[auto_1fr] items-center ui-trans ui-dur-normal">
            <!-- 头像区域 -->
            <div class="relative ui-flex-center">
              <Avatar
                shape="circle"
                :image="session.avatar"
                class="shrink-0 select-none ui-trans ui-dur-normal !w-10 !h-10"
                :class="[
                  isActive(session.id)
                    ? 'ring-0 bg-transparent'
                    : 'border ui-border-background-dim/30 bg-background-sub'
                ]"
              />
              <!-- 未读角标 -->
              <div
                v-if="session.unread > 0"
                class="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold ui-flex-center border-2 z-10 shadow-sm pointer-events-none leading-none ui-trans ui-dur-normal"
                :class="isActive(session.id) ? 'border-primary' : 'border-background-sub'"
              >
                {{ session.unread > 99 ? '99+' : session.unread }}
              </div>
            </div>
            <!-- 文本信息 (平板模式隐藏) -->
            <div
              class="grid ui-trans ui-dur-normal ease-in-out grid-cols-[1fr] opacity-100 ml-3 md:grid-cols-[0fr] md:opacity-0 md:ml-0 xl:grid-cols-[1fr] xl:opacity-100 xl:ml-3"
            >
              <div class="overflow-hidden min-w-0 flex flex-col justify-center h-10">
                <!-- 顶部：名称 + 时间 -->
                <div class="ui-flex-between mb-0.5">
                  <span
                    class="text-[14px] font-medium truncate ui-trans ui-dur-fast"
                    :class="isActive(session.id) ? 'font-bold' : ''"
                  >
                    {{ getSessionName(session) }}
                  </span>
                  <span
                    class="text-xs shrink-0 ml-2 font-mono ui-trans ui-dur-fast"
                    :class="isActive(session.id) ? 'text-primary-content/80' : 'text-foreground-dim'"
                  >
                    {{ formatTime(session.time) }}
                  </span>
                </div>
                <!-- 底部：预览内容 -->
                <div class="ui-flex-x">
                  <span
                    class="truncate text-[12px] ui-trans ui-dur-fast"
                    :class="isActive(session.id) ? 'text-primary-content/70' : 'text-foreground-sub opacity-80'"
                  >
                    {{ session.preview }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Avatar } from 'primevue'
import { useSessionStore, useContactStore, type Session } from '@/stores'
import { formatTime } from '@/utils/format'

defineOptions({ name: 'SessionView' })

// 路由与状态管理
const router = useRouter()
const route = useRoute()
const props = defineProps<{ keyword?: string }>()
const sessionStore = useSessionStore()
const contactStore = useContactStore()

// 判断当前会话是否激活
const isActive = (id: string) => route.params.id === id

// 点击会话跳转
const handleSessionClick = (id: string) => {
  router.push(`/${id}`)
}

// 过滤会话列表 (支持搜索)
const filteredSessions = computed(() => {
  let list = sessionStore.sessions
  if (props.keyword) {
    const k = props.keyword.toLowerCase().trim()
    list = list.filter((s) =>
      getSessionName(s).toLowerCase().includes(k) || s.id.includes(k)
    )
  }
  return list
})

// 获取会话显示名称
const getSessionName = (session: Session) => {
  let name: string
  if (session.type === 'group' || contactStore.checkIsGroup(session.id)) {
    name = contactStore.getGroupName(session.id)
  } else {
    name = contactStore.getUserName(session.id)
  }
  return name === session.id ? session.name : name
}
</script>
