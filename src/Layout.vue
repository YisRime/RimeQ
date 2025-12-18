<template>
  <div class="flex h-full w-full bg-gray-50 dark:bg-black text-slate-900 dark:text-slate-100 overflow-hidden">
    <!-- 左侧:统一侧边栏 -->
    <aside class="w-80 flex-shrink-0">
      <Sidebar />
    </aside>

    <!-- 右侧:内容区域 -->
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
import Sidebar from '@/views/pages/Sidebar.vue'
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
