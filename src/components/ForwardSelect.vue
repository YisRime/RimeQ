<template>
  <div class="ui-flex-col-full bg-transparent overflow-hidden">
    <!-- 搜索栏 -->
    <div class="shrink-0 px-3 pt-3 pb-1 ui-flex-x">
      <IconField class="flex-1">
        <InputIcon class="i-ri-search-line text-foreground-sub text-sm" />
        <InputText
          v-model="keyword"
          placeholder="搜索好友或群聊..."
          class="w-full !h-9 !text-sm !bg-background-sub/30 focus:!bg-background-sub/50 !border-transparent !rounded-xl !pl-9 ui-trans placeholder:text-foreground-dim text-foreground-main"
        />
      </IconField>
    </div>
    <!-- 主体双栏 -->
    <div class="flex-1 flex min-h-0 w-full p-3 gap-2 justify-center overflow-hidden">
      <!-- 源列表 -->
      <div class="flex-1 max-w-[260px] flex flex-col min-w-0 border border-white/10 rounded-2xl bg-background-sub/20 overflow-hidden">
        <div class="shrink-0 px-3 py-1.5 border-b border-white/5 flex justify-between items-center bg-background-sub/10">
          <span class="text-[11px] font-bold text-foreground-main">{{ keyword ? '搜索结果' : '最近会话' }}</span>
          <span class="text-[10px] text-foreground-dim font-mono opacity-60">{{ displaySource.length }}</span>
        </div>
        <div class="flex-1 overflow-y-auto ui-scrollbar p-1">
          <div v-if="displaySource.length === 0" class="ui-flex-y h-full opacity-30 text-foreground-dim py-8">
            <div class="i-ri-inbox-line text-xl" />
            <span class="text-[10px] mt-1">无结果</span>
          </div>
          <div
            v-for="item in displaySource" :key="item.id"
            class="group ui-flex-x gap-2.5 p-1.5 rounded-xl cursor-pointer hover:bg-primary/10 ui-trans"
            @click="moveItem(item, true)"
          >
            <Avatar :image="item.avatar" shape="circle" class="size-8 shrink-0 border border-white/10 shadow-sm" />
            <div class="flex-1 min-w-0 flex flex-col justify-center">
              <span class="text-xs font-medium text-foreground-main truncate">{{ item.name }}</span>
              <span class="text-[10px] text-foreground-dim font-mono opacity-50">{{ item.id }}</span>
            </div>
            <div class="i-ri-add-line text-primary opacity-0 group-hover:opacity-100 ui-trans shrink-0" />
          </div>
        </div>
      </div>
      <!-- 已选列表 -->
      <div class="flex-1 max-w-[260px] flex flex-col min-w-0 border border-white/10 rounded-2xl bg-background-sub/20 overflow-hidden">
        <div class="shrink-0 px-3 py-1.5 border-b border-white/5 flex justify-between items-center bg-background-sub/10">
          <span class="text-[11px] font-bold text-foreground-main">已选结果</span>
          <span class="text-[10px] text-foreground-dim font-mono opacity-60">{{ selectedItems.length }}</span>
        </div>
        <div class="flex-1 overflow-y-auto ui-scrollbar p-1">
          <div v-if="selectedItems.length === 0" class="ui-flex-y h-full opacity-30 text-foreground-dim py-8">
            <div class="i-ri-user-follow-line text-xl" />
            <span class="text-[10px] mt-1">未选择</span>
          </div>
          <div
            v-for="item in selectedItems" :key="item.id"
            class="group ui-flex-x gap-2.5 p-1.5 rounded-xl cursor-pointer ui-trans"
            @click="moveItem(item, false)"
          >
            <Avatar :image="item.avatar" shape="circle" class="size-8 shrink-0 border border-white/10 shadow-sm" />
            <div class="flex-1 min-w-0 flex flex-col justify-center">
              <span class="text-xs font-medium text-foreground-main truncate">{{ item.name }}</span>
              <span class="text-[10px] text-foreground-dim font-mono opacity-50">{{ item.id }}</span>
            </div>
            <div class="i-ri-close-line text-red-500 opacity-0 group-hover:opacity-100 ui-trans shrink-0" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { IconField, InputIcon, InputText, Avatar } from 'primevue'
import { useMessageStore, useSessionStore, useContactStore } from '@/stores'

// 转发目标接口
interface ForwardItem {
  id: number
  name: string
  avatar: string
  type: 'group' | 'private'
}

defineOptions({ name: 'ForwardSelect' })

// 初始化
const messageStore = useMessageStore()
const sessionStore = useSessionStore()
const contactStore = useContactStore()

// 响应式状态
const keyword = ref('') // 搜索关键字
const initialSnapshot = ref<ForwardItem[]>([]) // 会话列表
const selectedItems = ref<ForwardItem[]>([]) // 已选列表

// 计算列表池
const contactPool = computed<ForwardItem[]>(() => {
  // 好友映射
  const friends = contactStore.friends.flatMap(c => c.buddyList.map(f => ({
    id: f.user_id,
    name: f.remark || f.nickname,
    avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${f.user_id}`,
    type: 'private' as const
  })))
  // 群组映射
  const groups = contactStore.groups.map(g => ({
    id: g.group_id,
    name: g.group_remark || g.group_name,
    avatar: `https://p.qlogo.cn/gh/${g.group_id}/${g.group_id}/0`,
    type: 'group' as const
  }))
  // 建表去重
  const map = new Map<number, ForwardItem>()
  ;[...friends, ...groups].forEach(i => map.set(i.id, i))
  return Array.from(map.values())
})

// 计算显示列表
const displaySource = computed(() => {
  const selectedIds = new Set(selectedItems.value.map(i => i.id))
  const k = keyword.value.toLowerCase().trim()
  const base = k
    ? contactPool.value.filter(i => i.name.toLowerCase().includes(k))
    : initialSnapshot.value
  return base.filter(i => !selectedIds.has(i.id))
})

// 移动单项
const moveItem = (item: ForwardItem, toTarget: boolean) => {
  if (toTarget) {
    if (selectedItems.value.some(i => i.id === item.id)) return
    selectedItems.value = [...selectedItems.value, item]
  } else {
    selectedItems.value = selectedItems.value.filter(i => i.id !== item.id)
  }
}

// 监听列表变化
watch(selectedItems, () => {
  messageStore.forwardTargets = selectedItems.value.map(i => i.id)
})

// 初始化数据
onMounted(() => {
  initialSnapshot.value = sessionStore.sessions.map(s => {
    return {
      id: s.id,
      name: s.type === 'group' ? contactStore.getGroupName(s.id, s.name) : contactStore.getUserName(s.id, undefined, s.name),
      avatar: s.type === 'group' ? `https://p.qlogo.cn/gh/${s.id}/${s.id}/0` : `https://q1.qlogo.cn/g?b=qq&s=0&nk=${s.id}`,
      type: s.type === 'group' ? 'group' : 'private'
    }
  })
  if (messageStore.forwardTargets.length > 0) {
    const targetIds = new Set(messageStore.forwardTargets)
    selectedItems.value = contactPool.value.filter(i => targetIds.has(i.id))
  }
})
</script>
