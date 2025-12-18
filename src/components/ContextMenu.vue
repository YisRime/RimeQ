<template>
  <teleport to="body">
    <transition name="fade-fast">
      <div
        v-if="show"
        class="fixed z-[9999] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 min-w-[200px] flex flex-col select-none overflow-hidden"
        :style="{ top: y + 'px', left: x + 'px' }"
        @click.stop="close"
        @contextmenu.prevent
      >
        <!-- 用户信息区 (如果提供了 user) -->
        <div v-if="user" class="border-b border-gray-100 dark:border-gray-700">
          <!-- 顶部背景 -->
          <div class="h-16 bg-gradient-to-r from-primary/20 to-primary/5"></div>

          <div class="px-4 pb-4 relative">
            <!-- 头像 -->
            <n-avatar
              :size="48"
              :src="user.avatar"
              round
              class="absolute -top-8 left-4 border-3 border-white dark:border-gray-800 shadow-md"
            />

            <div class="mt-8">
              <div class="flex items-center gap-2">
                <span class="text-base font-bold text-gray-800 dark:text-gray-100">{{ user.nickname }}</span>
                <div v-if="user.level" class="text-[9px] bg-yellow-100 text-yellow-600 px-1 rounded">
                  Lv.{{ user.level }}
                </div>
              </div>
              <div class="text-xs text-gray-400 mt-0.5">
                {{ user.userId }}
              </div>
            </div>
          </div>
        </div>

        <!-- 菜单选项区 -->
        <div class="py-1.5">
          <div
            v-for="item in options"
            :key="item.key"
            class="px-4 py-2 hover:bg-primary/10 hover:text-primary cursor-pointer text-sm text-gray-700 dark:text-gray-200 flex items-center gap-3 transition-colors"
            :class="{ 'text-red-500 hover:bg-red-50 hover:text-red-600': item.danger }"
            @click.stop="handleSelect(item.key)"
          >
            <div :class="item.icon" class="text-base w-5 text-center" />
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>
    </transition>

    <!-- 透明遮罩，点击外部关闭 -->
    <div v-if="show" class="fixed inset-0 z-[9998]" @click="close" @contextmenu.prevent="close" />
  </teleport>
</template>

<script setup lang="ts">
import { NAvatar } from 'naive-ui'

export interface MenuItem {
  label: string
  key: string
  icon?: string
  danger?: boolean
}

export interface UserInfo {
  userId: number
  nickname?: string
  avatar?: string
  level?: number
}

defineProps<{
  show: boolean
  x: number
  y: number
  options: MenuItem[]
  user?: UserInfo // 可选的用户信息
}>()

const emit = defineEmits<{
  (e: 'update:show', val: boolean): void
  (e: 'select', key: string): void
}>()

const close = () => {
  emit('update:show', false)
}

const handleSelect = (key: string) => {
  emit('select', key)
  close()
}
</script>

<style scoped>
.fade-fast-enter-active,
.fade-fast-leave-active {
  transition:
    opacity 0.1s ease,
    transform 0.1s ease;
}
.fade-fast-enter-from,
.fade-fast-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
