<template>
  <!-- 根容器 -->
  <div
    class="ui-flex-col-full overflow-hidden select-none text-foreground-main font-sans ui-trans p-2 gap-2 bg-background-main"
    :style="rootStyle"
  >
    <!-- 背景遮罩 -->
    <div
      v-if="settingStore.config.backgroundImg"
      class="ui-abs-full bg-background-main/40 backdrop-blur-sm -z-10"
      :style="`backdrop-filter: blur(${settingStore.config.backgroundBlur}px);`"
    />
    <!-- 布局容器 -->
    <div class="flex flex-1 overflow-hidden relative gap-0 md:gap-3">
      <!-- 左侧导航栏 -->
      <aside
        class="flex flex-col shrink-0 bg-background-sub/40 backdrop-blur-2xl backdrop-saturate-150 shadow-lg border border-white/10 ui-trans z-30 overflow-hidden relative rounded-2xl w-full md:w-[72px] xl:w-80"
        :class="[isMobile && isContentMode ? '!w-0 !opacity-0 !border-none' : '']"
      >
        <!-- 侧边栏 -->
        <header class="h-16 shrink-0 relative ui-flex-x border-b border-border/20 transition-colors w-full md:w-[72px] xl:w-full">
          <div class="w-[72px] h-full shrink-0 ui-flex-center">
            <div class="relative group cursor-pointer" @click="showMenu = !showMenu">
              <Avatar
                :image="userAvatar"
                shape="circle"
                class="shrink-0 ring-2 ring-white/20 group-hover:ring-primary/50 ui-trans w-10 h-10 bg-background-sub/50"
              />
              <Badge
                class="absolute bottom-0 right-0 !w-3.5 !h-3.5 !min-w-0 border-2 border-background-sub ui-trans"
                :severity="settingStore.isLogged ? 'success' : 'secondary'"
              />
            </div>
          </div>
          <!-- 菜单与搜索 -->
          <div class="ui-flex-truncate ui-flex-x gap-2 pr-3 flex md:hidden xl:flex">
            <div
              class="ui-flex-x justify-start gap-1 shrink-0 ui-trans overflow-hidden"
              :class="showMenu ? 'w-[108px] opacity-100' : 'w-0 opacity-0'"
            >
              <Button
                v-for="btn in navButtons"
                :key="btn.path"
                v-tooltip.bottom="btn.label"
                :icon="btn.icon"
                text rounded severity="secondary"
                class="!w-8 !h-8 !p-0 ui-trans"
                :class="route.path === btn.path ? '!bg-primary !text-primary-content shadow-sm' : 'text-foreground-sub hover:!bg-primary/10 hover:!text-primary'"
                @click="router.push(btn.path)"
              />
            </div>
            <IconField class="w-full">
              <InputIcon class="i-ri-search-line text-foreground-sub" />
              <InputText
                v-model="searchKeyword"
                placeholder="搜索"
                class="w-full !h-9 text-sm !bg-background-dim/50 !border-transparent focus:!bg-background-sub/80 !rounded-lg !pl-9 ui-trans placeholder:text-foreground-dim text-foreground-main"
              />
            </IconField>
          </div>
        </header>
        <!-- 垂直菜单 (平板模式) -->
        <div
          class="flex-col items-center gap-2 bg-transparent z-20 w-full ui-trans overflow-hidden hidden md:flex xl:hidden"
          :class="showMenu ? 'max-h-[200px] opacity-100 py-3' : 'max-h-0 opacity-0 py-0'"
        >
          <Button
            v-for="btn in navButtons"
            :key="btn.path"
            v-tooltip.right="btn.label"
            :icon="btn.icon"
            text rounded severity="secondary"
            class="!w-10 !h-10 !p-0 ui-trans"
            :class="route.path === btn.path ? '!bg-primary !text-primary-content shadow-md' : 'text-foreground-sub hover:!bg-primary/10 hover:!text-primary'"
            @click="router.push(btn.path)"
          />
        </div>
        <!-- 导航列表 -->
        <div class="flex-1 overflow-hidden relative w-full ui-trans">
          <div class="size-full relative min-w-[320px] md:min-w-[72px] xl:min-w-[320px]">
            <router-view name="nav" />
          </div>
        </div>
      </aside>
      <!-- 主内容区 -->
      <main
        class="ui-flex-truncate flex flex-col overflow-hidden bg-background-sub/40 backdrop-blur-2xl backdrop-saturate-150 shadow-lg border border-white/10 relative z-20 ui-trans rounded-2xl"
        :class="[isMobile && !isContentMode ? '!w-0 !min-w-0 !flex-none !opacity-0 !border-none' : '']"
      >
        <!-- 路由视图 -->
        <div class="ui-flex-col-full relative overflow-hidden ui-flex-truncate">
          <router-view v-slot="{ Component }">
            <keep-alive :include="['ChatView', 'SettingsView', 'ContactView']">
              <component :is="Component" :key="viewKey" class="size-full" />
            </keep-alive>
          </router-view>
        </div>
      </main>
      <!-- 右侧侧边栏 -->
      <router-view v-slot="{ Component }" name="sidebar">
        <aside
          v-if="Component"
          class="bg-background-sub/40 backdrop-blur-2xl backdrop-saturate-150 z-[60] overflow-hidden flex flex-col border border-white/10 shadow-xl ui-trans rounded-2xl absolute inset-y-0 right-0 w-full md:static md:w-[320px] md:shadow-lg md:z-0"
          v-motion="sidebarMotion"
        >
          <component :is="Component" class="size-full" />
        </aside>
      </router-view>
    </div>
    <!-- 全局组件 -->
    <Toast position="top-left" />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Avatar, IconField, InputIcon, InputText, Button } from 'primevue'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import { useSettingStore } from '@/stores'
import { SearchKey } from '@/types'

const router = useRouter()
const route = useRoute()
const settingStore = useSettingStore()

// 响应式断点
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')

// 界面状态
const searchKeyword = ref('')
const showMenu = ref(false)

// 注入上下文
provide(SearchKey, searchKeyword)

// 样式计算：根背景
const rootStyle = computed(() => {
  const bg = settingStore.config.backgroundImg
  return bg ? { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' } : {}
})

// 数据计算：当前用户信息
const userAvatar = computed(() => {
  const uid = settingStore.user?.user_id
  return uid ? `https://q1.qlogo.cn/g?b=qq&s=0&nk=${uid}` : ''
})

// 数据计算：当前上下文
const isContentMode = computed(() => route.path !== '/' && route.path !== '/contact')

const viewKey = computed(() => route.params.id ? `chat-${route.params.id}` : route.path)

// 侧边栏动画配置
const sidebarMotion = computed(() => {
  if (isMobile.value) {
    return {
      initial: { x: '100%', opacity: 0 },
      enter: { x: '0%', opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 30 } },
      leave: { x: '100%', opacity: 0, transition: { duration: 300 } }
    }
  } else {
    return {
      initial: { width: 0, opacity: 0, x: 0 },
      enter: { width: 320, opacity: 1, x: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
      leave: { width: 0, opacity: 0, x: 0, transition: { duration: 300 } }
    }
  }
})

// 静态配置：导航菜单
const navButtons = [
  { label: '会话', path: '/', icon: 'i-ri-message-3-line text-xl' },
  { label: '好友', path: '/contact', icon: 'i-ri-contacts-book-line text-xl' },
  { label: '设置', path: '/settings', icon: 'i-ri-settings-3-line text-xl' }
]
</script>

<style lang="scss">
/* 全局基础重置 */
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
  color: var(--text-main);
  overscroll-behavior: none;
  -webkit-font-smoothing: antialiased;
}

/* 防止拖拽图片 */
img {
  -webkit-user-drag: none;
  user-select: none;
}
</style>
