<template>
  <n-config-provider
    :theme="theme"
    :theme-overrides="themeOverrides"
    :locale="zhCN"
    :date-locale="dateZhCN"
    class="h-full"
  >
    <n-global-style />

    <n-loading-bar-provider>
      <n-message-provider>
        <n-notification-provider>
          <n-dialog-provider>
            <!-- 统一布局容器 -->
            <div class="flex h-full w-full bg-gray-50 dark:bg-black text-slate-900 dark:text-slate-100 overflow-hidden">
              <!-- === 左侧栏 === -->
              <aside
                class="w-80 flex-shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-colors"
              >
                <!-- 头部操作区：仅登录后显示 -->
                <div
                  v-if="accountsStore.isLogged && !interfaceStore.forwardMode.active"
                  class="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0"
                >
                  <n-tooltip placement="bottom">
                    <template #trigger>
                      <n-avatar
                        round
                        :src="userAvatar"
                        size="medium"
                        class="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all select-none"
                        @click="toOptions"
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
                            isChatMode ? 'i-ri-group-line' : 'i-ri-message-3-line',
                            'text-xl text-gray-600 dark:text-gray-300'
                          ]"
                        />
                      </div>
                    </template>
                    {{ isChatMode ? '切换到联系人' : '切换到消息' }}
                  </n-tooltip>
                </div>

                <!-- 列表区域 (Router View: nav) -->
                <!-- 未登录时，这里会渲染 SessionBar，因为数据为空，所以显示空白列表，符合需求 -->
                <div class="flex-1 overflow-hidden relative">
                  <!-- 转发模式覆盖 -->
                  <ForwardBar v-if="interfaceStore.forwardMode.active" />

                  <!-- 正常路由视图 -->
                  <router-view v-else name="nav" v-slot="{ Component }">
                    <keep-alive>
                      <component :is="Component" :keyword="searchKeyword" />
                    </keep-alive>
                  </router-view>
                </div>
              </aside>

              <!-- === 右侧内容区 === -->
              <main class="flex-1 h-full overflow-hidden bg-gray-50 dark:bg-black relative">
                <router-view v-slot="{ Component }">
                  <keep-alive :include="['ChatView', 'Options']">
                    <transition name="fade" mode="out-in">
                      <component :is="Component" class="h-full w-full" />
                    </transition>
                  </keep-alive>
                </router-view>
              </main>
            </div>

            <!-- 全局组件 -->
            <MediaViewer
              v-model="interfaceStore.viewer.show"
              :src="interfaceStore.viewer.url"
              :list="interfaceStore.viewer.list"
            />
          </n-dialog-provider>
        </n-notification-provider>
      </n-message-provider>
    </n-loading-bar-provider>
  </n-config-provider>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import {
  NConfigProvider,
  NGlobalStyle,
  NMessageProvider,
  NNotificationProvider,
  NDialogProvider,
  NLoadingBarProvider,
  NAvatar,
  NInput,
  NTooltip,
  darkTheme,
  zhCN,
  dateZhCN
} from 'naive-ui'

import { useSettingsStore } from './stores/settings'
import { useInterfaceStore } from './stores/interface'
import { useAccountsStore } from './stores/accounts'

import MediaViewer from './components/MediaViewer.vue'
import ForwardBar from '@/views/pages/ListSelect.vue'

// Store
const settingsStore = useSettingsStore()
const interfaceStore = useInterfaceStore()
const accountsStore = useAccountsStore()

// Router
const router = useRouter()
const route = useRoute()

// State
const searchKeyword = ref('')

// Computed
const theme = computed(() => (settingsStore.config.darkMode ? darkTheme : null))

const themeOverrides = computed(() => {
  const color = String(settingsStore.config.themeColor || '#7abb7e')
  return {
    common: {
      primaryColor: color,
      primaryColorHover: color,
      primaryColorPressed: color
    }
  }
})

const userAvatar = computed(() => accountsStore.user?.avatar || '')

const isChatMode = computed(() => {
  return route.path.startsWith('/chats') || route.path === '/'
})

// Methods
const toggleMode = () => {
  if (!accountsStore.isLogged) return
  if (isChatMode.value) {
    router.push('/contacts')
  } else {
    router.push('/chats')
  }
  searchKeyword.value = ''
}

const toOptions = () => router.push('/options')

onMounted(() => {
  settingsStore.applyStyle()
})
</script>

<style>
/* 基础样式重置 */
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  font-family:
    v-sans,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
