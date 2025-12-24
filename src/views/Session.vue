<template>
  <div class="flex-col-full bg-sub">
    <!-- 滚动区域 -->
    <div class="flex-1 overflow-y-auto my-scrollbar">
      <div class="px-2 py-1 lg:py-2 flex flex-col gap-0.5 lg:gap-1">

        <!-- 会话项 -->
        <div
          v-for="session in filteredSessions"
          :key="session.id"
          class="group relative flex items-center gap-3 p-2 lg:p-3 rounded-xl cursor-pointer transition-all duration-200 select-none"
          :class="[
            isActive(session.id) ? 'bg-primary/10' : 'hover:bg-dim',
            'justify-start md:justify-center lg:justify-start'
          ]"
          @click="onSelect(session.id)"
          @contextmenu.prevent="onContextMenu($event, session)"
        >
          <!-- 头像与未读数 -->
          <div class="relative flex-shrink-0 w-10 h-10">
            <Avatar
              shape="circle"
              :image="session.avatar"
              class="bg-white dark:bg-gray-700 shadow-sm border border-dim w-full h-full"
            />

            <div
              v-if="session.unread > 0"
              class="absolute -top-1 -right-1 bg-red-500 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900 z-10"
              :class="[
                'min-w-[16px] h-[16px] px-0.5',
                'md:w-2.5 md:h-2.5 md:min-w-0 md:p-0',
                'lg:min-w-[16px] lg:h-[16px] lg:px-0.5'
              ]"
            >
              <span class="text-[10px] text-white font-bold leading-none transform translate-y-[0.5px] block md:hidden lg:block">
                {{ session.unread > 99 ? '99+' : session.unread }}
              </span>
            </div>
          </div>

          <!-- 文本信息 (中屏隐藏) -->
          <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5 block md:hidden lg:block">
            <div class="flex items-center justify-between">
              <span
                class="font-medium truncate text-[14px] lg:text-[15px] leading-tight transition-colors"
                :class="isActive(session.id) ? 'text-primary' : 'text-main'"
              >
                {{ session.name }}
              </span>
              <span
                class="text-[10px] flex-shrink-0 ml-2 transition-colors"
                :class="isActive(session.id) ? 'text-primary/70' : 'text-dim group-hover:text-sub'"
              >
                {{ formatTime(session.time) }}
              </span>
            </div>

            <div
              class="truncate text-[12px] lg:text-[13px] transition-colors"
              :class="[
                isActive(session.id) ? 'text-primary/80' : 'text-dim group-hover:text-sub',
                { 'font-medium text-sub': session.unread > 0 }
              ]"
            >
              {{ session.preview || '暂无消息' }}
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredSessions.length === 0" class="py-20 text-center text-dim text-sm block md:hidden lg:block">
          暂无聊天会话
        </div>

      </div>
    </div>

    <!-- 右键菜单 -->
    <ContextMenu v-model:show="showMenu" :x="menuX" :y="menuY" :options="menuOpts" @select="onMenuSelect" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Avatar from 'primevue/avatar'
import { useConfirm } from 'primevue/useconfirm'
import { dataStore, type Session } from '@/utils/storage'
import ContextMenu, { type MenuItem } from '@/components/ContextMenu.vue'

defineOptions({ name: 'SessionView' })

const props = defineProps<{ keyword?: string }>()
const router = useRouter()
const route = useRoute()
const confirm = useConfirm()

const isActive = (id: string) => route.params.id === id
const onSelect = (id: string) => router.push(`/${id}`)

const filteredSessions = computed(() => {
  let list = dataStore.sessions.value
  if (props.keyword) {
    const k = props.keyword.toLowerCase()
    list = list.filter((s) => s.name.toLowerCase().includes(k) || s.id.includes(k))
  }
  return list
})

function formatTime(timestamp?: number): string {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return '昨天'
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const contextSession = ref<Session | null>(null)

const menuOpts: MenuItem[] = [{ label: '删除会话', key: 'delete', icon: 'i-ri-delete-bin-line', danger: true }]

const onContextMenu = (e: MouseEvent, session: Session) => {
  contextSession.value = session
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

const onMenuSelect = (key: string) => {
  if (!contextSession.value) return
  if (key === 'delete') {
    const id = contextSession.value.id
    confirm.require({
      message: '确定要删除该会话吗？',
      header: '删除会话',
      icon: 'i-ri-error-warning-line',
      accept: () => {
        dataStore.removeSession(id)
        if (isActive(id)) router.push('/')
      }
    })
  }
}
</script>
