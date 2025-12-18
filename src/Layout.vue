<template>
  <div class="flex h-full w-full bg-gray-50 dark:bg-black text-slate-900 dark:text-slate-100 overflow-hidden">
    <!-- 左侧: 侧边栏 -->
    <aside
      class="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800"
    >
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

      <!-- 列表区域 (Session/Contact/Forward) -->
      <div class="flex-1 overflow-hidden">
        <keep-alive>
          <component :is="currentComponent" :keyword="searchKeyword" />
        </keep-alive>
      </div>
    </aside>

    <!-- 右侧: 内容区域 -->
    <main class="flex-1 h-full overflow-hidden">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['ChatView', 'Options']">
          <transition name="fade" mode="out-in">
            <component :is="Component" class="h-full w-full" />
          </transition>
        </keep-alive>
      </router-view>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NAvatar, NInput, NTooltip } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import { useChatStore } from '@/stores/chat'

// 注意：这里需要修正导入路径，因为 Layout.vue 在 src 根目录
import SessionBar from '@/views/pages/ListSession.vue'
import ContactBar from '@/views/pages/ListContact.vue'
import ForwardBar from '@/views/pages/ListSelect.vue'

defineOptions({
  name: 'Layout'
})

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const chatStore = useChatStore()

// --- 侧边栏逻辑 ---
const searchKeyword = ref('')
const currentMode = ref<'chat' | 'contact'>('chat')

const userAvatar = computed(() => authStore.loginInfo?.avatar || '')

// 监听路由变化自动切换模式
watch(
  () => route.path,
  (newPath) => {
    if (newPath.startsWith('/contacts')) currentMode.value = 'contact'
    else if (newPath.startsWith('/chats')) currentMode.value = 'chat'
  },
  { immediate: true }
)

// 动态切换显示的组件
const currentComponent = computed(() => {
  // 如果处于转发模式，优先显示 ForwardBar
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
  // 切换模式时跳转路由
  if (next === 'chat') router.push('/chats')
  else if (next === 'contact') router.push('/contacts') // 假设有默认的 contacts 路由，或保持当前
}

const onOptions = () => router.push('/options')
</script>

<style scoped>
/* 右侧内容切换动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
