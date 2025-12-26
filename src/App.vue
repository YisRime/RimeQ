<template>
  <!-- 根容器 -->
  <div
    class="flex-col-full overflow-hidden select-none text-main font-sans my-trans bg-main p-2 md:p-3 gap-2 md:gap-3"
    :style="rootStyle"
  >
    <!-- 全局背景覆盖 -->
    <div
      v-if="settingStore.config.backgroundImg"
      class="absolute inset-0 bg-main/90 dark:bg-main/80 backdrop-blur-sm -z-10"
      :style="`backdrop-filter: blur(${settingStore.config.backgroundBlur}px);`"
    />
    <!-- 主布局容器 -->
    <div class="flex-col-full md:flex-row overflow-hidden relative gap-2 md:gap-3">
      <!-- 左侧侧边栏 (Aside) -->
      <aside
        v-show="!isMobile || !isContentMode"
        class="flex flex-col shrink-0 bg-sub rounded-2xl md:rounded-3xl shadow-sm border border-dim/50 my-trans z-30 overflow-hidden relative"
        :class="isTablet ? 'w-[72px]' : 'w-full xl:w-80'"
      >
        <!-- 顶部交互区 -->
        <header class="h-16 shrink-0 relative flex items-center border-b border-dim/30 transition-colors">
          <div class="w-[72px] h-full shrink-0 flex-center">
            <div class="relative group cursor-pointer" @click="toggleMenu">
              <Avatar
                :image="userAvatar"
                shape="circle"
                class="shrink-0 ring-2 ring-transparent group-hover:ring-primary/50 my-trans w-10 h-10 bg-dim"
              />
              <div
                class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-sub my-trans transition-colors"
                :class="settingStore.isLogged ? 'bg-green-500' : 'bg-dim'"
              />
            </div>
          </div>
          <!-- 交互区域 (Tablet 隐藏) -->
          <div v-if="!isTablet" class="flex-truncate flex-x gap-2 pr-3">
            <!-- 导航按钮组 -->
            <div
              class="my-squeeze flex-x justify-start gap-1 shrink-0"
              :class="showMenu ? 'w-[108px] opacity-100' : 'w-0 opacity-0'"
            >
              <Button
                v-for="btn in navButtons"
                :key="btn.path"
                v-tooltip.bottom="btn.label"
                :icon="btn.icon"
                text
                rounded
                severity="secondary"
                :class="[
                  route.path === btn.path
                    ? '!bg-primary !text-primary-content shadow-sm'
                    : '!text-sub hover:!bg-primary/10 hover:!text-primary'
                ]"
                class="!w-8 !h-8 !p-0 my-trans"
                @click="navigate(btn.path)"
              />
            </div>
            <!-- 搜索框 -->
            <div class="flex-truncate">
              <IconField class="w-full">
                <InputIcon class="i-ri-search-line text-sub" />
                <InputText
                  v-model="searchKeyword"
                  placeholder="搜索"
                  class="w-full !h-9 !text-sm !bg-dim/50 focus:!bg-dim !border-transparent focus:!border-primary/50 !rounded-lg !pl-9"
                  :pt="{ root: { class: 'my-trans' } }"
                />
              </IconField>
            </div>
          </div>
        </header>
        <!-- 垂直菜单 (仅 Tablet 模式) -->
        <div
          v-if="isTablet"
          class="my-squeeze flex-y gap-2 bg-sub/50 backdrop-blur-sm z-20 w-full"
          :class="showMenu ? 'max-h-[200px] opacity-100 py-3 border-b border-dim/30' : 'max-h-0 opacity-0 py-0 border-none'"
        >
          <Button
            v-for="btn in navButtons"
            :key="btn.path"
            v-tooltip.right="btn.label"
            :icon="btn.icon"
            text
            rounded
            severity="secondary"
            :class="[
              route.path === btn.path
                ? '!bg-primary !text-primary-content shadow-sm'
                : '!text-sub hover:!bg-primary/10 hover:!text-primary'
            ]"
            class="!w-9 !h-9 !p-0 my-trans"
            @click="navigate(btn.path)"
          />
        </div>
        <!-- 列表内容区 -->
        <div class="flex-1 overflow-hidden relative w-full bg-sub">
          <router-view v-slot="{ Component }" name="nav">
            <keep-alive>
              <component :is="Component" :keyword="searchKeyword" />
            </keep-alive>
          </router-view>
        </div>
      </aside>
      <!-- 右侧主内容区 (Main) -->
      <main
        v-show="!isMobile || isContentMode"
        class="flex-col-full overflow-hidden bg-sub rounded-2xl md:rounded-3xl shadow-sm border border-dim/50 relative z-20"
      >
        <!-- 右侧 Header 栏 -->
        <header
          v-if="pageTitle"
          class="h-16 shrink-0 border-b border-dim/50 bg-sub/95 backdrop-blur flex items-center justify-between px-4 z-20 select-none transition-all"
        >
          <div class="flex items-center gap-3 h-full overflow-hidden">
            <div
              v-if="showBackButton"
              class="w-8 h-8 rounded-full flex-center cursor-pointer hover:bg-dim/50 active:scale-95 transition-all text-main bg-dim/30 shrink-0"
              @click="handleBack"
            >
              <div class="i-ri-arrow-left-s-line text-lg" />
            </div>
            <div class="flex items-center gap-2 overflow-hidden">
               <span class="font-bold text-lg text-main truncate">{{ pageTitle }}</span>
            </div>
          </div>
          <div v-if="isGroup" class="flex items-center gap-1 text-dim">
             <Button v-tooltip.bottom="'群精华'" icon="i-ri-star-line" text rounded class="!w-9 !h-9 !text-sub hover:!text-primary" @click="router.push(`/${chatId}/essence`)" />
             <Button v-tooltip.bottom="'群公告'" icon="i-ri-megaphone-line" text rounded class="!w-9 !h-9 !text-sub hover:!text-primary" @click="router.push(`/${chatId}/notice`)" />
             <Button v-tooltip.bottom="'群文件'" icon="i-ri-folder-open-line" text rounded class="!w-9 !h-9 !text-sub hover:!text-primary" @click="router.push(`/${chatId}/file`)" />
             <Button v-tooltip.bottom="'群成员'" icon="i-ri-group-line" text rounded class="!w-9 !h-9 !text-sub hover:!text-primary" @click="router.push(`/${chatId}/member`)" />
          </div>
        </header>
        <div class="flex-col-full relative overflow-hidden flex-truncate">
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
              class="z-[60] border-l border-dim bg-sub shadow-none absolute inset-y-0 right-0 w-full md:w-[360px] xl:static xl:w-[320px] xl:z-auto"
            />
          </Transition>
        </router-view>
      </main>
    </div>
    <!-- 全局交互组件 -->
    <Toast position="top-left" />
    <ConfirmDialog />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import { useSettingStore } from '@/stores/setting'
import { useSessionStore } from '@/stores/session'
import { useContactStore } from '@/stores/contact'
import MediaViewer from '@/components/MediaViewer.vue'
import Avatar from 'primevue/avatar'
import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Tooltip from 'primevue/tooltip'

// 局部指令
const vTooltip = Tooltip

// 路由实例
const router = useRouter()
const route = useRoute()
const settingStore = useSettingStore()
const sessionStore = useSessionStore()
const contactStore = useContactStore()

// 响应式断点
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')
const isTablet = breakpoints.between('md', 'xl')

// 状态
const searchKeyword = ref('')
const showMenu = ref(false)

// 计算背景样式
const rootStyle = computed(() => {
  const bg = settingStore.config.backgroundImg
  return bg
    ? { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
    : { backgroundColor: 'var(--color-main)' }
})

const userAvatar = computed(() => {
  const uid = settingStore.user?.user_id
  return uid ? `https://q1.qlogo.cn/g?b=qq&s=0&nk=${uid}` : ''
})

const isContentMode = computed(() => route.path !== '/' && route.path !== '/contact')

const navButtons = [
  { label: '会话', path: '/', icon: 'i-ri-message-3-line text-xl' },
  { label: '好友', path: '/contact', icon: 'i-ri-contacts-book-line text-xl' },
  { label: '设置', path: '/settings', icon: 'i-ri-settings-3-line text-xl' }
]

const chatId = computed(() => route.params.id as string)
const session = computed(() => sessionStore.getSession(chatId.value))

const pageTitle = computed(() => {
  if (route.name === 'Login') return ''
  if (route.name === 'Chat' && chatId.value) {
    const group = contactStore.groups.find(g => String(g.group_id) === chatId.value)
    if (group) return group.group_name
    const friend = contactStore.friends.find(f => String(f.user_id) === chatId.value)
    if (friend) return friend.remark || friend.nickname
    if (session.value) return session.value.name
    return chatId.value
  }
  return (route.meta.title as string) || ''
})

const isGroup = computed(() => session.value?.type === 'group' || chatId.value?.length > 5)
const showBackButton = computed(() => isMobile.value || route.name !== 'Chat')

const toggleMenu = () => (showMenu.value = !showMenu.value)
const navigate = (path: string) => router.push(path)

const handleBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/')
}

const closeViewer = (show: boolean) => {
  if (!show) {
    const query = { ...route.query }
    delete query.view
    router.replace({ query })
  }
}
</script>

<style lang="scss">
/* 基础样式 */
html, body, #app {
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
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
