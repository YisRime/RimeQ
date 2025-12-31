<template>
  <div class="bg-background-sub border border-background-dim rounded-lg shadow-xl overflow-hidden min-w-[12rem] flex flex-col p-1 z-50">
    <template v-if="items.length">
      <button
        v-for="(item, index) in items"
        :key="index"
        class="flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors w-full text-left"
        :class="index === selectedIndex ? 'bg-primary/10 text-primary' : 'hover:bg-background-dim text-foreground-main'"
        @click="selectItem(index)"
      >
        <img :src="item.avatar" class="w-6 h-6 rounded-full bg-background-dim object-cover border border-background-dim/50" />
        <span class="truncate flex-1">{{ item.label }}</span>
        <span class="text-xs text-foreground-dim font-mono opacity-50">{{ item.id }}</span>
      </button>
    </template>
    <div v-else class="p-2 text-xs text-foreground-dim text-center">没有找到成员</div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  items: any[]
  command: (payload: any) => void
}>()

const selectedIndex = ref(0)

watch(() => props.items, () => {
  selectedIndex.value = 0
})

const selectItem = (index: number) => {
  const item = props.items[index]
  if (item) {
    props.command({ id: item.id, label: item.label })
  }
}

const onKeyDown = ({ event }: { event: KeyboardEvent }) => {
  if (event.key === 'ArrowUp') {
    selectedIndex.value = (selectedIndex.value + props.items.length - 1) % props.items.length
    return true
  }
  if (event.key === 'ArrowDown') {
    selectedIndex.value = (selectedIndex.value + 1) % props.items.length
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
