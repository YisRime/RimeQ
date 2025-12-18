<template>
  <div class="flex flex-col h-full w-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
    <!-- 顶部操作栏 - 仅在非转发模式下显示 -->
    <div
      v-if="!chatStore.forwardingState.isActive"
      class="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800"
    >
      <n-tooltip placement="bottom">
        <template #trigger>
          <n-avatar
            round
            :src="userAvatar"
            size="medium"
            class="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
            @click="onOptions"
          />
        </template>
        设置
      </n-tooltip>

      <n-input v-model:value="searchKeyword" round placeholder="搜索..." size="small" class="flex-1">
        <template #prefix>
          <div class="i-ri-search-line text-gray-400" />
        </template>
      </n-input>

      <n-tooltip placement="bottom">
        <template #trigger>
          <div
            class="p-2 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            @click="toggleMode"
          >
            <div
              :class="[
                currentMode === 'chat' ? 'i-ri-group-line' : 'i-ri-message-3-line',
                'text-xl text-gray-600 dark:text-gray-300'
              ]"
            />
          </div>
        </template>
        {{ currentMode === 'chat' ? '联系人' : '消息' }}
      </n-tooltip>
    </div>

    <div class="flex-1 overflow-hidden">
      <keep-alive>
        <component :is="currentComponent" :keyword="searchKeyword" />
      </keep-alive>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NAvatar, NInput, NTooltip } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'
import SessionBar from './SessionBar.vue'
import ContactBar from './ContactBar.vue'
import ForwardBar from './ForwardBar.vue'

defineOptions({ name: 'Sidebar' })

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const chatStore = useChatStore()

const searchKeyword = ref('')
const currentMode = ref<'chat' | 'contact'>('chat')

watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith('/contacts')) currentMode.value = 'contact'
    else if (newPath.startsWith('/chats')) currentMode.value = 'chat'
  },
  { immediate: true }
)

const userAvatar = computed(() => authStore.loginInfo?.avatar || '')

// 动态切换显示的组件
const currentComponent = computed(() => {
  // 如果处于转发模式，显示 ForwardBar
  if (chatStore.forwardingState.isActive) {
    return ForwardBar
  }
  // 否则根据当前模式显示 SessionBar 或 ContactBar
  return currentMode.value === 'chat' ? SessionBar : ContactBar
})

const toggleMode = () => {
  const next = currentMode.value === 'chat' ? 'contact' : 'chat'
  currentMode.value = next
  searchKeyword.value = ''
  if (next === 'chat') router.push('/chats')
}

const onOptions = () => router.push('/options')
</script>
