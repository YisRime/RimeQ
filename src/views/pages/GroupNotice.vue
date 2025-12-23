<template>
  <div class="h-full w-full flex flex-col bg-main">
    <div class="md:hidden h-14 flex-x px-4 border-b border-dim">
      <div class="i-ri-arrow-left-s-line text-xl mr-2 cursor-pointer" @click="goBack" />
      <span class="font-bold">群公告</span>
    </div>

    <div class="flex-1 p-4 overflow-y-auto my-scrollbar">
      <div class="flex flex-col gap-4">
        <div
          v-for="(item, idx) in list"
          :key="idx"
          class="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-4 rounded-xl relative overflow-hidden"
        >
          <div class="absolute top-0 right-0 p-2 opacity-10"><div class="i-ri-pushpin-line text-4xl" /></div>
          <div class="font-bold text-main mb-2 truncate pr-8">
            {{ item.msg?.text || '无标题' }}
          </div>
          <div class="text-sm text-sub whitespace-pre-wrap leading-6">{{ item.msg?.text }}</div>
          <div class="mt-4 pt-3 border-t border-yellow-200/50 flex-between text-xs text-sub">
            <span>发布者: {{ item.u }}</span
            ><span>{{ item.t ? formatTime(item.t * 1000) : '' }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { bot } from '@/api'

const formatTime = (timestamp?: number): string => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
}

const props = defineProps<{ groupId?: string }>()

defineOptions({
  name: 'NoticePanel'
})

const route = useRoute()
const router = useRouter()

const groupId = computed(() => (route.params.id as string) || props.groupId || '')

const goBack = () => router.back()

const list = ref<any[]>([])

const loadNotices = async () => {
  try {
    const notices = await bot.getGroupNotice(Number(groupId.value))
    list.value = notices
  } catch (e) {
    console.error('加载群公告失败', e)
    list.value = []
  }
}

onMounted(() => {
  if (groupId.value) loadNotices()
})
</script>
