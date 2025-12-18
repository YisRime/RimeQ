<template>
  <div class="h-full w-full flex flex-col bg-white dark:bg-gray-900">
    <div class="md:hidden h-14 flex items-center px-4 border-b border-gray-100 dark:border-gray-800">
      <div class="i-ri-arrow-left-s-line text-xl mr-2 cursor-pointer" @click="goBack" />
      <span class="font-bold">群公告</span>
    </div>

    <n-scrollbar class="flex-1 p-4">
      <div class="flex flex-col gap-4">
        <div
          v-for="(item, idx) in list"
          :key="idx"
          class="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 p-4 rounded-xl relative overflow-hidden"
        >
          <div class="absolute top-0 right-0 p-2 opacity-10"><div class="i-ri-pushpin-line text-4xl" /></div>
          <div class="font-bold text-gray-800 dark:text-gray-200 mb-2 truncate pr-8">
            {{ item.msg?.text || '无标题' }}
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-6">{{ item.msg?.text }}</div>
          <div class="mt-4 pt-3 border-t border-yellow-200/50 flex justify-between text-xs text-gray-400">
            <span>发布者: {{ item.u }}</span
            ><span>{{ item.t ? formatTime(item.t * 1000) : '' }}</span>
          </div>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NScrollbar } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import { botApi } from '@/api'
import { formatTime } from '@/utils/format'

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
    const notices = await botApi.getGroupNotice(Number(groupId.value))
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
