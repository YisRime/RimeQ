<template>
  <!-- PrimeVue 容器：使用 CSS 变量注入 -->
  <div class="size-full" :style="cssVars" :class="{ dark: settingsStore.config.darkMode }">
    <!-- 2. 主布局容器：使用 UnoCSS 语义类 -->
    <div class="size-full flex bg-main text-main overflow-hidden">
      <!-- === 左侧导航栏 === -->
      <!-- bg-sub: 次级背景 (侧边栏) | border-dim: 副色调边框 -->
      <aside class="w-80 flex-shrink-0 flex-col bg-sub border-r border-dim my-trans">
        <!-- 头部搜索与操作 -->
        <div v-if="accountsStore.isLogged" class="flex-x gap-3 p-4 border-b border-dim">
          <!-- 用户头像 -->
          <Avatar
            :image="userAvatar"
            shape="circle"
            size="large"
            class="cursor-pointer hover:ring-2 ring-primary/50 my-trans select-none"
            @click="router.push('/settings')"
          />

          <!-- 搜索框 -->
          <div class="flex-1 relative">
            <div class="i-ri-search-line text-dim absolute left-3 top-1/2 -translate-y-1/2" />
            <InputText
              v-model="searchKeyword"
              placeholder="搜索..."
              class="w-full rounded-full pl-10 !bg-dim border-0 text-sm h-8"
            />
          </div>

          <!-- 模式切换按钮 -->
          <Button
            :icon="isChatMode ? 'i-ri-group-line' : 'i-ri-message-3-line'"
            rounded
            text
            :title="isChatMode ? '联系人' : '消息'"
            :pt="{
              root: { class: 'w-8 h-8 p-0' },
              icon: { class: 'text-lg' }
            }"
            @click="toggleMode"
          />
        </div>

        <!-- 列表区域 (Session/Contact) -->
        <div class="flex-1 overflow-hidden relative">
          <!-- 转发模式 -->
          <ForwardBar v-if="interfaceStore.forwardMode.active" />
          <!-- 正常列表 -->
          <router-view v-else v-slot="{ Component }" name="nav">
            <keep-alive>
              <component :is="Component" :keyword="searchKeyword" />
            </keep-alive>
          </router-view>
        </div>
      </aside>

      <!-- === 右侧主聊天区 === -->
      <!-- bg-main: 主背景色 (聊天窗口) -->
      <main class="flex-1 h-full overflow-hidden bg-main relative">
        <router-view v-slot="{ Component }">
          <transition name="view-fade" mode="out-in">
            <keep-alive :include="['ChatView', 'SettingsView']">
              <component :is="Component" class="size-full" />
            </keep-alive>
          </transition>
        </router-view>
      </main>
    </div>

    <!-- 全局浮层组件 -->
    <MediaViewer v-model="interfaceStore.viewer.show" :src="interfaceStore.viewer.url" />

    <!-- PrimeVue 全局服务 -->
    <Toast position="top-right" />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Avatar from 'primevue/avatar'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'

// Store
import { useSettingsStore } from './stores/settings'
import { useInterfaceStore } from './stores/interface'
import { useAccountsStore } from './stores/accounts'

// Components
import MediaViewer from './components/MediaViewer.vue'
import ForwardBar from '@/views/pages/ListSelect.vue'

const router = useRouter()
const route = useRoute()
const settingsStore = useSettingsStore()
const interfaceStore = useInterfaceStore()
const accountsStore = useAccountsStore()

const searchKeyword = ref('')

/**
 * 核心：CSS 变量注入系统
 * 映射到 uno.config.ts 中的 theme.colors
 */
const cssVars = computed(() => {
  const isDark = settingsStore.config.darkMode
  const primary = settingsStore.config.themeColor || '#7abb7e'

  return {
    '--primary-color': primary,
    // 背景三级层级
    '--color-main': isDark ? '#101014' : '#ffffff', // 主聊天背景
    '--color-sub': isDark ? '#18181c' : '#f9fafb', // 侧边栏背景
    '--color-dim': isDark ? '#242429' : '#f0f2f5', // 悬停/分割线/输入框

    // 文字颜色
    '--text-main': isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(0, 0, 0, 0.88)',
    '--text-sub': isDark ? 'rgba(255, 255, 255, 0.65)' : 'rgba(0, 0, 0, 0.65)',
    '--text-dim': isDark ? 'rgba(255, 255, 255, 0.45)' : 'rgba(0, 0, 0, 0.45)'
  }
})

/**
 * 状态逻辑
 */
const isChatMode = computed(() => route.name?.toString().startsWith('Chat') ?? false)
const userAvatar = computed(() =>
  accountsStore.user ? `https://q1.qlogo.cn/g?b=qq&s=0&nk=${accountsStore.user.user_id}` : ''
)

const toggleMode = () => {
  if (!accountsStore.isLogged) return
  if (isChatMode.value) {
    router.push('/contact')
  } else {
    router.push('/')
  }
  searchKeyword.value = ''
}

onMounted(() => {
  settingsStore.applyStyle()
})
</script>

<style>
/* === 全局微调 === */

/* 核心：为所有涉及颜色的属性开启平滑过渡 */
* {
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease,
    color 0.3s ease;
}

html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  /* 解决移动端点击高亮 */
  -webkit-tap-highlight-color: transparent;
}

/* 视图切换动画 (带有一点缩放感) */
.view-fade-enter-active,
.view-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.view-fade-enter-from {
  opacity: 0;
  transform: scale(0.98);
}

.view-fade-leave-to {
  opacity: 0;
  transform: scale(1.02);
}

/* 禁止拖拽图片 */
img {
  -webkit-user-drag: none;
  user-select: none;
}
</style>
