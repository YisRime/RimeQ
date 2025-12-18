<template>
  <div class="h-full w-full flex flex-col bg-white dark:bg-gray-900">
    <div class="md:hidden h-14 flex items-center px-4 border-b border-gray-100 dark:border-gray-800">
      <div class="i-ri-arrow-left-s-line text-xl mr-2 cursor-pointer" @click="goBack" />
      <span class="font-bold">精华消息</span>
    </div>

    <n-scrollbar class="flex-1 p-4">
      <n-empty v-if="loading && list.length === 0" description="加载中..." />
      <n-empty v-if="!loading && list.length === 0" description="暂无精华消息" />

      <div v-else class="flex flex-col gap-3">
        <div
          v-for="item in list"
          :key="item.msg_id || item.message_id"
          class="bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:shadow-sm transition-shadow cursor-pointer"
          @click="item.msg_id && jumpToMsg(String(item.msg_id))"
        >
          <div class="flex items-center gap-2 mb-2">
            <n-avatar :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${item.sender_id}`" round size="small" />
            <span class="text-xs font-bold text-gray-700 dark:text-gray-300">{{ item.sender_nick }}</span>
            <span class="text-[10px] text-gray-400">{{
              item.sender_time ? formatTime(item.sender_time * 1000) : ''
            }}</span>
          </div>

          <div class="text-sm text-gray-600 dark:text-gray-400 pl-8 line-clamp-3">
            {{ item.msg_content ? parseContent(item.msg_content) : '' }}
          </div>

          <div class="mt-2 text-[10px] text-gray-400 text-right flex items-center justify-end gap-1">
            <div class="i-ri-star-fill text-yellow-400" />
            由 {{ item.add_digest_nick }} 设置
          </div>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NScrollbar, NAvatar, NEmpty } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import { botApi } from '@/api'
import { formatTime } from '@/utils/format'

const props = defineProps<{ groupId?: string }>()

defineOptions({
  name: 'EssencePanel'
})

const route = useRoute()
const router = useRouter()

const groupId = computed(() => (route.params.id as string) || props.groupId || '')

const goBack = () => router.back()

const list = ref<any[]>([])
const loading = ref(false)

const loadEssence = async () => {
  loading.value = true
  try {
    const res = await botApi.getEssenceMsgList(Number(groupId.value))
    list.value = res
  } catch (e) {
    console.error('加载精华消息失败', e)
    list.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  if (groupId.value) loadEssence()
})

const parseContent = (content: Array<{ type: string; data: Record<string, unknown> }>) =>
  content
    .map((c) => {
      if (c.type === 'text') return c.data.text
      if (c.type === 'image') return '[图片]'
      return '[其他]'
    })
    .join('')

const jumpToMsg = (msgId: string) => {
  console.log('Jump to', msgId)
}
</script>
