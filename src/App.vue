<template>
  <!-- 根容器 -->
  <div
    class="size-full overflow-hidden select-none text-main bg-main font-sans transition-colors duration-300"
    :class="{ dark: accountStore.config.value.darkMode }"
  >
    <!-- 主布局容器 -->
    <div class="size-full flex overflow-hidden relative">
      <!-- 左侧侧边栏 (Aside) -->
      <aside
        v-show="!isMobile || !isContentMode"
        class="flex-col shrink-0 bg-sub border-r border-dim my-trans z-30 overflow-hidden"
        :class="isTablet ? 'w-[72px]' : 'w-full xl:w-80'"
      >
        <!-- 顶部交互区 -->
        <header class="h-16 shrink-0 relative flex-x px-4 border-b border-dim">
          <!-- 用户头像容器 -->
          <div class="shrink-0 flex-center w-10 xl:w-auto my-trans">
            <div class="relative group cursor-pointer shrink-0" @click="toggleMenu">
              <!-- 头像组件 -->
              <Avatar
                :image="userAvatar"
                shape="circle"
                class="bg-dim shrink-0 ring-2 ring-transparent group-hover:ring-primary/50 my-trans w-10 h-10"
              />
              <!-- 状态指示点 -->
              <div
                class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-sub my-trans transition-colors"
                :class="accountStore.isLogged ? 'bg-green-500' : 'bg-red-500'"
              />
            </div>
          </div>
          <!-- 交互区域 -->
          <div v-if="!isTablet" class="flex-1 h-10 ml-3 flex items-center overflow-hidden">
            <!-- 导航按钮组 -->
            <div
              class="my-squeeze flex items-center justify-start gap-2 shrink-0"
              :class="showMenu ? 'w-[144px] mr-2 opacity-100' : 'w-0 mr-0 opacity-0'"
            >
              <div
                v-for="btn in navButtons"
                :key="btn.path"
                class="w-10 h-10 rounded-lg flex-center my-trans text-xl shrink-0"
                :class="
                  route.path === btn.path ? 'bg-primary-soft text-primary' : 'text-sub hover:bg-dim hover:text-main'
                "
                :title="btn.label"
                @click="navigate(btn.path)"
              >
                <div :class="btn.icon" />
              </div>
            </div>
            <!-- 搜索框 -->
            <div
              class="h-full bg-dim rounded-lg flex-x px-3 text-dim focus-within:text-primary focus-within:ring-1 ring-primary/50 transition-all duration-300 ease-in-out flex-1 min-w-0"
            >
              <div class="i-ri-search-line mr-2 shrink-0" />
              <input
                v-model="searchKeyword"
                class="bg-transparent border-none outline-none text-sm text-main size-full placeholder-dim/70 min-w-0"
                placeholder="搜索..."
              />
            </div>
          </div>
        </header>
        <!-- 垂直菜单 (仅 Tablet 模式) -->
        <div
          v-if="isTablet"
          class="my-squeeze flex flex-col items-center"
          :class="
            showMenu ? 'max-h-[200px] opacity-100 py-2 border-b border-dim' : 'max-h-0 opacity-0 py-0 border-none'
          "
        >
          <div
            v-for="btn in navButtons"
            :key="btn.path"
            class="w-10 h-10 rounded-lg flex-center transition-colors duration-200 text-xl mb-1 last:mb-0 cursor-pointer"
            :class="route.path === btn.path ? 'text-primary bg-primary-soft' : 'text-sub hover:bg-dim hover:text-main'"
            :title="btn.label"
            @click="navigate(btn.path)"
          >
            <div :class="btn.icon" />
          </div>
        </div>
        <!-- 列表内容区 -->
        <div class="flex-1 overflow-hidden relative w-full">
          <router-view v-slot="{ Component }" name="nav">
            <keep-alive>
              <component :is="Component" :keyword="searchKeyword" />
            </keep-alive>
          </router-view>
        </div>
      </aside>
      <!-- 右侧主内容区 (Main) -->
      <main v-show="!isMobile || isContentMode" class="flex-1 h-full overflow-hidden bg-main relative z-20 flex w-full">
        <div class="flex-1 h-full relative overflow-hidden flex flex-col min-w-0">
          <!-- 核心路由视图 -->
          <router-view v-slot="{ Component }">
            <keep-alive :include="['ChatView', 'SettingsView', 'ContactView']">
              <component :is="Component" :key="route.path" class="size-full" />
            </keep-alive>
          </router-view>
          <!-- 媒体查看器 -->
          <MediaViewer
            :model-value="!!route.query.view"
            :src="String(route.query.view || '')"
            @update:model-value="closeViewer"
          />
        </div>
        <!-- 扩展侧边栏 (二级路由) -->
        <router-view v-slot="{ Component }" name="sidebar">
          <Transition
            enter-active-class="my-slide-active"
            leave-active-class="my-slide-active"
            enter-from-class="my-slide-hidden"
            leave-to-class="my-slide-hidden"
          >
            <component
              :is="Component"
              v-if="Component"
              class="z-[60] border-l border-dim bg-sub shadow-2xl fixed inset-0"
              :class="
                isMobile
                  ? ''
                  : 'md:absolute md:inset-y-0 md:right-0 md:w-[360px] xl:static xl:w-[320px] xl:shadow-none xl:z-auto'
              "
            />
          </Transition>
        </router-view>
      </main>
    </div>
    <!-- 全局交互组件 -->
    <Toast position="top-right" />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import { accountStore } from '@/utils/storage'
import { applyTheme } from '@/utils/theme'
import MediaViewer from '@/components/MediaViewer.vue'
import Avatar from 'primevue/avatar'

// 路由实例
const router = useRouter()
const route = useRoute()

// 响应式断点
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')
const isTablet = breakpoints.between('md', 'xl')
// const isDesktop = breakpoints.greaterOrEqual('xl') // 备用

// 本地状态
const searchKeyword = ref('') // 搜索关键字
const showMenu = ref(false) // 菜单展开状态

// 用户头像
const userAvatar = computed(() => {
  const uid = accountStore.user.value?.user_id
  return uid ? `https://q1.qlogo.cn/g?b=qq&s=0&nk=${uid}` : ''
})

// 是否"内容模式" (移动端路由切换)
const isContentMode = computed(() => {
  const p = route.path
  return p !== '/' && p !== '/contact'
})

// 导航按钮数据
const navButtons = [
  { label: '会话', path: '/', icon: 'i-ri-message-3-line' },
  { label: '好友', path: '/contact', icon: 'i-ri-contacts-book-line' },
  { label: '设置', path: '/settings', icon: 'i-ri-settings-3-line' }
]

// 切换菜单展开状态
const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

// 导航跳转
const navigate = (path: string) => {
  router.push(path)
}

// 关闭媒体查看器
const closeViewer = (show: boolean) => {
  if (!show) {
    const query = { ...route.query }
    delete query.view
    router.replace({ query })
  }
}

// 生命周期: 初始化主题
onMounted(() => {
  applyTheme()
})

// 监听配置: 重新应用主题
watch(
  () => [accountStore.config.value.themeColor, accountStore.config.value.darkMode],
  () => applyTheme(),
  { deep: true }
)
</script>

<style lang="scss">
/* 全局变量定义 - Light Mode */
:root {
  --color-main: #ffffff;
  --color-sub: #f3f4f6;
  --color-dim: #e5e7eb;

  --text-main: #1f2937;
  --text-sub: #4b5563;
  --text-dim: #9ca3af;
}

/* 全局变量定义 - Dark Mode */
.dark {
  --color-main: #111827;
  --color-sub: #1f2937;
  --color-dim: #374151;

  --text-main: #f9fafb;
  --text-sub: #d1d5db;
  --text-dim: #9ca3af;
}

/* 基础样式 */
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: var(--color-main);
  color: var(--text-main);
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
}

/* 禁止图片拖拽 */
img {
  -webkit-user-drag: none;
  user-select: none;
}
</style>
