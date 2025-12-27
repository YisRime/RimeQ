<template>
  <!-- 根容器 -->
  <div
    class="ui-flex-col-full overflow-hidden select-none text-foreground-main font-sans ui-trans ui-dur-normal bg-background-main p-2 gap-2"
    :style="rootStyle"
  >
    <!-- 背景遮罩 -->
    <div
      v-if="settingStore.config.backgroundImg"
      class="ui-abs-full bg-background-main/90 dark:bg-background-main/80 backdrop-blur-sm -z-10"
      :style="`backdrop-filter: blur(${settingStore.config.backgroundBlur}px);`"
    />
    <!-- 布局容器 -->
    <div
      class="flex flex-1 overflow-hidden relative"
      :class="isMobile ? 'gap-0' : 'gap-2'"
    >
      <!-- 左侧导航栏 -->
      <aside
        class="flex flex-col shrink-0 bg-background-sub shadow-sm border border-background-dim/50 ui-trans ui-dur-normal z-30 overflow-hidden relative rounded-2xl"
        :class="[isMobile ? 'w-full' : (isTablet ? 'w-[72px]' : 'w-80'), isMobile && isContentMode ? '!w-0 !opacity-0 !border-none' : '']"
      >
        <!-- 侧边栏 -->
        <header
          class="h-16 shrink-0 relative flex items-center border-b border-background-dim/30 transition-colors"
          :class="isTablet ? 'w-[72px]' : 'w-full'"
        >
          <!-- 头像与状态 -->
          <div class="w-[72px] h-full shrink-0 ui-flex-center">
            <div class="relative group cursor-pointer" @click="showMenu = !showMenu">
              <Avatar
                :image="userAvatar"
                shape="circle"
                class="shrink-0 ring-2 ring-transparent group-hover:ring-primary/50 ui-trans ui-dur-fast w-10 h-10 bg-background-dim"
              />
              <div
                class="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background-sub ui-trans ui-dur-fast"
                :class="settingStore.isLogged ? 'bg-green-500' : 'bg-background-dim'"
              />
            </div>
          </div>
          <!-- 菜单与搜索 (平板模式隐藏) -->
          <div v-if="!isTablet" class="ui-flex-truncate ui-flex-x gap-2 pr-3">
            <div
              class="ui-flex-x justify-start gap-1 shrink-0 ui-trans ui-dur-normal overflow-hidden"
              :class="showMenu ? 'w-[108px] opacity-100' : 'w-0 opacity-0'"
            >
              <Button
                v-for="btn in navButtons"
                :key="btn.path"
                v-tooltip.bottom="btn.label"
                :icon="btn.icon"
                text rounded severity="secondary"
                class="!w-8 !h-8 !p-0 ui-trans ui-dur-fast"
                :class="route.path === btn.path ? '!bg-primary !text-primary-content shadow-sm' : '!text-foreground-sub hover:!bg-primary/10 hover:!text-primary'"
                @click="router.push(btn.path)"
              />
            </div>
            <IconField class="w-full">
              <InputIcon class="i-ri-search-line text-foreground-sub" />
              <InputText
                v-model="searchKeyword"
                placeholder="搜索"
                class="w-full !h-9 !text-sm !bg-background-dim/50 focus:!bg-background-dim !border-transparent focus:!border-primary/50 !rounded-lg !pl-9"
                :pt="{ root: { class: 'ui-trans ui-dur-fast' } }"
              />
            </IconField>
          </div>
        </header>
        <!-- 垂直菜单 (仅平板模式显示) -->
        <div
          v-if="isTablet"
          class="flex flex-col items-center gap-2 bg-background-sub/50 backdrop-blur-sm z-20 w-full ui-trans ui-dur-normal overflow-hidden"
          :class="showMenu ? 'max-h-[200px] opacity-100 py-3 border-b border-background-dim/30' : 'max-h-0 opacity-0 py-0 border-none'"
        >
          <Button
            v-for="btn in navButtons"
            :key="btn.path"
            v-tooltip.right="btn.label"
            :icon="btn.icon"
            text rounded severity="secondary"
            class="!w-9 !h-9 !p-0 ui-trans ui-dur-fast"
            :class="route.path === btn.path ? '!bg-primary !text-primary-content shadow-sm' : '!text-foreground-sub hover:!bg-primary/10 hover:!text-primary'"
            @click="router.push(btn.path)"
          />
        </div>
        <!-- 导航列表 -->
        <div class="flex-1 overflow-hidden relative bg-background-sub w-full">
          <div class="size-full relative" :class="isTablet ? 'min-w-[72px]' : 'min-w-[320px]'">
            <router-view v-slot="{ Component }" name="nav">
              <keep-alive>
                <component :is="Component" :keyword="searchKeyword" />
              </keep-alive>
            </router-view>
          </div>
        </div>
      </aside>
      <!-- 中间主内容区 -->
      <main
        class="flex-1 min-w-0 flex flex-col overflow-hidden bg-background-sub shadow-sm border border-background-dim/50 relative z-20 ui-trans ui-dur-normal rounded-2xl"
        :class="[isMobile && !isContentMode ? '!w-0 !min-w-0 !flex-none !opacity-0 !border-none' : '']"
      >
        <!-- 标题栏 -->
        <header
          v-if="pageTitle"
          class="h-16 shrink-0 border-b border-background-dim/50 bg-background-sub/95 backdrop-blur ui-flex-between px-4 z-20 select-none transition-all"
        >
          <div class="flex items-center gap-3 h-full overflow-hidden">
            <div
              v-if="showBackButton"
              class="w-8 h-8 rounded-full ui-flex-center ui-ia hover:bg-background-dim/50 text-foreground-main bg-background-dim/30 shrink-0"
              @click="handleBack"
            >
              <div class="i-ri-arrow-left-s-line text-lg" />
            </div>
            <span class="font-bold text-lg text-foreground-main truncate">{{ pageTitle }}</span>
          </div>
          <!-- 群组快捷入口 -->
          <div v-if="isGroup" class="flex items-center gap-1 text-foreground-dim">
             <Button v-tooltip.bottom="'群精华'" icon="i-ri-star-line" text rounded class="!w-9 !h-9 !text-foreground-sub hover:!text-primary" @click="router.push(`/${chatId}/essence`)" />
             <Button v-tooltip.bottom="'群公告'" icon="i-ri-megaphone-line" text rounded class="!w-9 !h-9 !text-foreground-sub hover:!text-primary" @click="router.push(`/${chatId}/notice`)" />
             <Button v-tooltip.bottom="'群文件'" icon="i-ri-folder-open-line" text rounded class="!w-9 !h-9 !text-foreground-sub hover:!text-primary" @click="router.push(`/${chatId}/file`)" />
             <Button v-tooltip.bottom="'群成员'" icon="i-ri-group-line" text rounded class="!w-9 !h-9 !text-foreground-sub hover:!text-primary" @click="router.push(`/${chatId}/member`)" />
          </div>
        </header>
        <!-- 内容路由视图 -->
        <div class="ui-flex-col-full relative overflow-hidden ui-flex-truncate">
          <router-view v-slot="{ Component }">
            <keep-alive :include="['ChatView', 'SettingsView', 'ContactView']">
              <component :is="Component" :key="route.path" class="size-full" />
            </keep-alive>
          </router-view>
          <MediaViewer
            :model-value="!!route.query.view"
            :src="String(route.query.view || '')"
            @update:model-value="(v) => !v && router.replace({ query: { ...route.query, view: undefined } })"
          />
        </div>
      </main>
      <!-- 右侧扩展侧边栏 -->
      <router-view v-slot="{ Component }" name="sidebar">
        <Transition
          enter-active-class="transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.5,1)]"
          leave-active-class="transition-all duration-300 ease-[cubic-bezier(0.25,0.8,0.5,1)]"
          :enter-from-class="isMobile ? 'translate-x-full' : 'translate-x-0 w-0 opacity-0'"
          :leave-to-class="isMobile ? 'translate-x-full' : 'translate-x-0 w-0 opacity-0'"
        >
          <aside
            v-if="Component"
            class="bg-background-sub z-[60] overflow-hidden flex flex-col border border-background-dim/50 shadow-xl ui-trans ui-dur-normal rounded-2xl"
            :class="[isMobile ? 'absolute inset-y-0 right-0 w-full' : 'static w-[320px] shadow-sm z-0']"
          >
            <div class="size-full md:w-[320px] flex-shrink-0 ui-trans ui-dur-normal">
              <component :is="Component" class="size-full" />
            </div>
          </aside>
        </Transition>
      </router-view>

    </div>
    <!-- 全局组件 -->
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

const router = useRouter()
const route = useRoute()
const settingStore = useSettingStore()
const sessionStore = useSessionStore()
const contactStore = useContactStore()

// 响应式断点
const breakpoints = useBreakpoints(breakpointsTailwind)
const isMobile = breakpoints.smaller('md')
const isTablet = breakpoints.between('md', 'xl')

// 界面状态
const searchKeyword = ref('')
const showMenu = ref(false)

// 样式计算：根背景
const rootStyle = computed(() => {
  const bg = settingStore.config.backgroundImg
  return bg
    ? { backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
    : { backgroundColor: 'var(--color-main)' }
})

// 数据计算：当前用户信息
const userAvatar = computed(() => {
  const uid = settingStore.user?.user_id
  return uid ? `https://q1.qlogo.cn/g?b=qq&s=0&nk=${uid}` : ''
})

// 数据计算：当前上下文
const chatId = computed(() => route.params.id as string)
const session = computed(() => sessionStore.getSession(chatId.value))
const isGroup = computed(() => session.value?.type === 'group' || chatId.value?.length > 5)
const isContentMode = computed(() => route.path !== '/' && route.path !== '/contact')
const showBackButton = computed(() => isMobile.value || route.name !== 'Chat')

// 数据计算：页面标题
const pageTitle = computed(() => {
  if (route.name === 'Login') return ''
  if (chatId.value) {
    const group = contactStore.groups.find(g => String(g.group_id) === chatId.value)
    if (group) return group.group_name
    const friend = contactStore.friends.find(f => String(f.user_id) === chatId.value)
    if (friend) return friend.remark || friend.nickname
    if (session.value) return session.value.name
    return chatId.value
  }
  return (route.meta.title as string) || ''
})

// 静态配置：导航菜单
const navButtons = [
  { label: '会话', path: '/', icon: 'i-ri-message-3-line text-xl' },
  { label: '好友', path: '/contact', icon: 'i-ri-contacts-book-line text-xl' },
  { label: '设置', path: '/settings', icon: 'i-ri-settings-3-line text-xl' }
]

// 交互方法：返回处理
const handleBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/')
}
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
