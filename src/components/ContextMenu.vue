<template>
  <!--
    移除 Teleport 和 fixed 定位，
    现在它只是一个普通的 div，将被 Tippy 抓取并放入弹出层中
  -->
  <div
    class="bg-sub rounded-xl shadow-2xl border border-dim min-w-[160px] flex flex-col select-none overflow-hidden"
    @contextmenu.prevent
  >
    <!-- 用户信息区 (如果提供了 user) -->
    <div v-if="user" class="border-b border-dim">
      <!-- 顶部背景 -->
      <div class="h-12 bg-gradient-to-r from-primary/20 to-primary/5" />

      <div class="px-4 pb-3 relative">
        <!-- 头像 -->
        <Avatar
          size="large"
          :image="user.avatar"
          shape="circle"
          class="absolute -top-6 left-3 border-3 border-sub shadow-md"
        />

        <div class="mt-6">
          <div class="flex-x gap-2">
            <span class="text-sm font-bold text-main truncate max-w-[120px]">{{ user.nickname }}</span>
            <div v-if="user.level" class="text-[9px] bg-yellow-100 text-yellow-600 px-1 rounded shrink-0">
              Lv.{{ user.level }}
            </div>
          </div>
          <div class="text-[10px] text-dim mt-0.5">
            {{ user.userId }}
          </div>
        </div>
      </div>
    </div>

    <!-- 菜单选项区 -->
    <div class="py-1">
      <div
        v-for="item in options"
        :key="item.key"
        class="px-3 py-2 mx-1 rounded-lg hover:bg-primary/10 hover:text-primary cursor-pointer text-sm text-main flex-x gap-3 my-trans transition-colors"
        :class="{ 'text-red-500 hover:bg-red-50 hover:text-red-600': item.danger }"
        @click="handleSelect(item.key)"
      >
        <div :class="item.icon" class="text-base w-5 text-center" />
        <span>{{ item.label }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Avatar from 'primevue/avatar'

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

// Props 大幅简化，不再需要坐标和显示控制
defineProps<{
  options: MenuItem[]
  user?: UserInfo
}>()

const emit = defineEmits<{
  (e: 'select', key: string): void
}>()

const handleSelect = (key: string) => {
  emit('select', key)
}
</script>
