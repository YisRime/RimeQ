<template>
  <div class="h-full w-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800">
    <!-- Header (移动端) -->
    <div class="md:hidden h-14 flex items-center px-4 border-b border-gray-100 dark:border-gray-800">
      <div class="i-ri-arrow-left-s-line text-xl mr-2 cursor-pointer" @click="router.back()" />
      <span class="font-bold">详情信息</span>
    </div>

    <n-scrollbar class="flex-1">
      <!-- 头部卡片 -->
      <div class="flex flex-col items-center gap-3 py-8 border-b border-gray-100 dark:border-gray-800">
        <n-avatar :size="80" :src="info?.avatar" round class="shadow-lg border-4 border-white dark:border-gray-800" />
        <div class="text-center px-4 w-full">
          <div class="text-xl font-bold truncate text-gray-800 dark:text-gray-100">{{ info?.name }}</div>
          <div class="text-gray-400 text-sm mt-1 flex items-center justify-center gap-2">
            <span>{{ info?.id }}</span>
            <div
              class="i-ri-file-copy-line cursor-pointer hover:text-primary transition-colors"
              @click="copy(info?.id)"
            />
          </div>
        </div>
      </div>

      <!-- 群成员预览 (仅群组) -->
      <div v-if="info?.type === 'group'" class="py-4 border-b border-gray-100 dark:border-gray-800">
        <div class="flex justify-between items-center mb-3 px-4">
          <span class="font-bold text-gray-600 dark:text-gray-300">成员 ({{ members.length }})</span>
        </div>

        <div class="grid grid-cols-5 gap-y-4 gap-x-2 px-4">
          <div
            v-for="m in displayMembers"
            :key="m.user_id"
            class="flex flex-col items-center gap-1 cursor-pointer group relative"
            @click="router.push(`/${m.user_id}`)"
          >
            <!-- 身份标识 -->
            <div
              v-if="['owner', 'admin'].includes(m.role || '')"
              class="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white dark:border-gray-900 z-10 flex items-center justify-center text-[8px]"
              :class="m.role === 'owner' ? 'bg-yellow-400 text-white' : 'bg-green-500 text-white'"
            >
              <div :class="m.role === 'owner' ? 'i-ri-vip-crown-fill' : 'i-ri-shield-star-fill'" />
            </div>

            <n-avatar
              :size="40"
              :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${m.user_id}`"
              round
              class="group-hover:ring-2 ring-primary/50 transition-all"
            />
            <span class="text-[10px] text-gray-500 truncate w-full text-center group-hover:text-primary">
              {{ m.card || m.nickname }}
            </span>
          </div>

          <!-- 查看更多 -->
          <div
            class="flex flex-col items-center gap-1 cursor-pointer opacity-60 hover:opacity-100"
            @click="showAllMembers = true"
          >
            <div
              class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500"
            >
              <div class="i-ri-more-fill text-xl" />
            </div>
            <span class="text-[10px] text-gray-500">更多</span>
          </div>
        </div>
      </div>

      <!-- 功能菜单 -->
      <div class="py-4 flex flex-col gap-1 px-4">
        <div
          v-for="item in menuItems"
          :key="item.label"
          class="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors group"
          @click="onMenuAction(item)"
        >
          <div class="flex items-center gap-3">
            <div :class="[item.icon, 'text-gray-400 group-hover:text-primary transition-colors text-lg']" />
            <span class="text-gray-700 dark:text-gray-200 text-sm">{{ item.label }}</span>
          </div>
          <div class="i-ri-arrow-right-s-line text-gray-300" />
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="flex flex-col gap-3 p-4 border-t border-gray-100 dark:border-gray-800 mt-4">
        <n-button v-if="!isCurrent" type="primary" block @click="router.push(`/${id}`)"> 发消息 </n-button>
        <n-button type="error" ghost block @click="handleDelete">
          {{ info?.type === 'group' ? '退出群聊' : '删除好友' }}
        </n-button>
      </div>
    </n-scrollbar>

    <!-- 全部成员弹窗 -->
    <n-modal v-model:show="showAllMembers" preset="card" title="群成员" class="w-[500px] max-w-[90vw] h-[70vh]">
      <n-input v-model:value="memberSearch" placeholder="搜索成员..." class="mb-4" clearable>
        <template #prefix><div class="i-ri-search-line" /></template>
      </n-input>

      <n-scrollbar class="h-[calc(70vh-100px)]">
        <div class="flex flex-col gap-2">
          <div
            v-for="m in filteredMembers"
            :key="m.user_id"
            class="flex items-center gap-3 p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
            @click="
              router.push(`/${m.user_id}`)
              showAllMembers = false
            "
          >
            <n-avatar :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${m.user_id}`" round size="small" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium">{{ m.card || m.nickname }}</span>
                <span v-if="m.role === 'owner'" class="text-[10px] bg-yellow-100 text-yellow-600 px-1 rounded"
                  >群主</span
                >
                <span v-if="m.role === 'admin'" class="text-[10px] bg-green-100 text-green-600 px-1 rounded">管理</span>
              </div>
              <div class="text-xs text-gray-400">{{ m.user_id }}</div>
            </div>
          </div>
        </div>
      </n-scrollbar>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NAvatar, NButton, NScrollbar, NModal, NInput, useMessage, useDialog } from 'naive-ui'
import { useContactsStore } from '@/stores/contacts'
import { bot } from '@/api'
import { useClipboard } from '@vueuse/core'

defineOptions({ name: 'PanelChatInfo' })

const route = useRoute()
const router = useRouter()
const contactsStore = useContactsStore()
const message = useMessage()
const dialog = useDialog()
const { copy: copyText } = useClipboard()

const id = computed(() => (route.params.id as string) || '')
const info = computed(() => contactsStore.getSession(id.value))
const isCurrent = computed(() => route.path === `/${id.value}`)

const members = ref<any[]>([])
const showAllMembers = ref(false)
const memberSearch = ref('')

// 菜单配置
const menuItems = computed(() => {
  const base = []
  if (info.value?.type === 'group') {
    base.push(
      { label: '群文件', icon: 'i-ri-folder-open-line', action: 'files' },
      { label: '群公告', icon: 'i-ri-megaphone-line', action: 'notice' },
      { label: '精华消息', icon: 'i-ri-star-line', action: 'essence' }
    )
  }
  return base
})

// 获取成员列表
const loadData = async () => {
  if (info.value?.type === 'group') {
    const list = await contactsStore.getMembers(Number(id.value))
    members.value = list
  }
}

watch(id, loadData, { immediate: true })

const displayMembers = computed(() => members.value.slice(0, 14))
const filteredMembers = computed(() => {
  const k = memberSearch.value.toLowerCase()
  if (!k) return members.value
  return members.value.filter(
    (m) =>
      String(m.user_id).includes(k) ||
      (m.nickname || '').toLowerCase().includes(k) ||
      (m.card || '').toLowerCase().includes(k)
  )
})

const onMenuAction = (item: any) => {
  router.push(`/${id.value}/${item.action}`)
}

const copy = (txt?: string) => {
  if (txt) {
    copyText(txt)
    message.success('已复制')
  }
}

const handleDelete = () => {
  const isGroup = info.value?.type === 'group'
  dialog.warning({
    title: isGroup ? '退出群聊' : '删除好友',
    content: '确定执行此操作吗？数据将无法恢复。',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        if (isGroup) await bot.setGroupLeave(Number(id.value))
        else await bot.deleteFriend(Number(id.value))

        message.success('操作成功')
        contactsStore.removeSession(id.value)
        router.push('/')
      } catch (e) {
        message.error('操作失败')
      }
    }
  })
}
</script>
