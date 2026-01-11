<template>
  <!-- 提及列表容器 -->
  <div class="ui-bg-background-sub border ui-border-background-dim rounded-xl shadow-2xl overflow-hidden flex flex-col py-1 z-50 min-w-[240px] animate-fade-in">
    <!-- 列表滚动区 -->
    <div class="max-h-[320px] overflow-y-auto ui-scrollbar p-1.5 flex flex-col gap-1">
      <template v-if="items.length">
        <button
          v-for="(item, index) in items"
          :key="index"
          ref="itemRefs"
          class="group relative w-full text-left ui-flex-x gap-3 px-3 py-2.5 rounded-xl ui-trans"
          :class="index === selectedIndex ? 'bg-primary/10' : 'hover:bg-background-dim/50'"
          @click="selectItem(index)"
          @mouseenter="selectedIndex = index"
        >
          <!-- 头像 -->
          <div class="relative shrink-0">
            <img
              :src="item.avatar"
              class="w-10 h-10 rounded-full bg-background-dim object-cover border-2 ui-trans"
              :class="index === selectedIndex ? 'border-primary/20' : 'border-background-dim/50'"
              loading="lazy"
              alt="avatar"
            />
          </div>

          <!-- 信息区域 -->
          <div class="flex-1 flex flex-col min-w-0 gap-0.5">
            <!-- 第一行：昵称与身份 -->
            <div class="flex items-center gap-1.5">
              <span
                class="text-sm font-bold truncate ui-trans"
                :class="index === selectedIndex ? 'text-primary' : 'ui-text-foreground-main'"
              >
                {{ item.label }}
              </span>
              <!-- 群主标签 -->
              <span
                v-if="item.role === 'owner'"
                class="px-1.5 py-0.5 rounded-[6px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-[10px] font-bold leading-none shrink-0 border border-yellow-500/20"
              >
                群主
              </span>
              <!-- 管理员标签 -->
              <span
                v-if="item.role === 'admin'"
                class="px-1.5 py-0.5 rounded-[6px] bg-green-500/10 text-green-600 dark:text-green-400 text-[10px] font-bold leading-none shrink-0 border border-green-500/20"
              >
                管理
              </span>
            </div>

            <!-- 第二行：ID -->
            <span
              class="text-xs font-mono truncate ui-trans"
              :class="index === selectedIndex ? 'text-primary/70' : 'ui-text-foreground-dim'"
            >
              {{ item.id }}
            </span>
          </div>
        </button>
      </template>

      <!-- 空状态 -->
      <div v-else class="py-6 text-center flex flex-col items-center gap-2 ui-text-foreground-dim opacity-60">
        <div class="i-ri-user-search-line text-2xl" />
        <span class="text-xs">未找到匹配成员</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'

const props = defineProps<{
  items: any[]
  command: (payload: any) => void
}>()

// 选中索引
const selectedIndex = ref(0)
// 列表元素引用
const itemRefs = ref<HTMLElement[]>([])

// 监听列表变化重置索引
watch(() => props.items, () => {
  selectedIndex.value = 0
})

// 选中项处理
const selectItem = (index: number) => {
  const item = props.items[index]
  if (item) {
    props.command({ id: item.id, label: item.label })
  }
}

// 滚动到可视区域
const scrollToView = () => {
  nextTick(() => {
    const el = itemRefs.value[selectedIndex.value]
    if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  })
}

// 键盘事件处理
const onKeyDown = ({ event }: { event: KeyboardEvent }) => {
  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
    scrollToView()
    return true
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
    scrollToView()
    return true
  }
  if (event.key === 'Enter') {
    selectItem(selectedIndex.value)
    return true
  }
  return false
}

defineExpose({ onKeyDown })
</script>
