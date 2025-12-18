<template>
  <div class="h-full w-full flex flex-col bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800">
    <div class="md:hidden h-14 flex items-center px-4 border-b border-gray-100 dark:border-gray-800">
      <div class="i-ri-arrow-left-s-line text-xl mr-2 cursor-pointer" @click="goBack" />
      <span class="font-bold">{{ info?.name || '详情信息' }}</span>
    </div>

    <n-scrollbar class="flex-1">
      <div class="flex flex-col items-center gap-3 py-6 border-b border-gray-100 dark:border-gray-800">
        <n-avatar :size="80" :src="info?.avatar" round class="shadow-md border-4 border-white dark:border-gray-800" />
        <div class="text-center px-4 w-full">
          <div class="text-xl font-bold truncate">{{ info?.name }}</div>
          <div class="text-gray-400 text-sm mt-1 flex items-center justify-center gap-2">
            <span>{{ info?.peerId }}</span>
            <div
              class="i-ri-file-copy-line cursor-pointer hover:text-primary transition-colors"
              @click="copy(info?.peerId)"
            />
          </div>
        </div>
      </div>

      <div v-if="info?.type === 'group'" class="py-4 border-b border-gray-100 dark:border-gray-800">
        <div class="flex justify-between items-center mb-3 px-4">
          <span class="font-bold text-gray-600 dark:text-gray-300">成员 ({{ memberList.length }})</span>
        </div>

        <div class="grid grid-cols-5 gap-y-4 gap-x-2 px-4">
          <div
            v-for="m in displayMembers"
            :key="m.user_id"
            class="flex flex-col items-center gap-1 cursor-pointer group relative"
            :title="m.card || m.nickname"
            @click="onMember(m)"
          >
            <div
              v-if="m.role === 'owner' || m.role === 'admin'"
              class="absolute top-0 left-0 w-4 h-4 bg-yellow-500 rounded-full border-2 border-white z-10 flex items-center justify-center"
              :title="m.role === 'owner' ? '群主' : '管理员'"
            >
              <div :class="m.role === 'owner' ? 'i-ri-vip-crown-line' : 'i-ri-shield-star-line'" class="text-[8px]" />
            </div>
            <n-avatar :size="40" :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${m.user_id}`" round />
            <span class="text-[10px] text-gray-500 truncate w-full text-center group-hover:text-primary">{{
              m.card || m.nickname
            }}</span>
          </div>

          <div class="flex flex-col items-center gap-1 cursor-pointer hover:opacity-80" @click="openFullMemberList">
            <div
              class="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400"
            >
              <div class="i-ri-arrow-right-s-line" />
            </div>
            <span class="text-[10px] text-gray-500">查看更多</span>
          </div>
        </div>
      </div>

      <div class="py-4 flex flex-col gap-1 px-4">
        <div
          v-for="item in filteredMenuItems"
          :key="item.label"
          class="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors group"
          @click="onMenu(item)"
        >
          <div class="flex items-center gap-3">
            <div :class="[item.icon, 'text-gray-400 group-hover:text-primary transition-colors']" />
            <span class="text-gray-700 dark:text-gray-200">{{ item.label }}</span>
          </div>

          <template v-if="item.type === 'switch'">
            <n-switch v-model:value="item.value" size="small" @click.stop />
          </template>
          <template v-else>
            <div class="i-ri-arrow-right-s-line text-gray-300" />
          </template>
        </div>
      </div>

      <div class="flex flex-col gap-2 p-4 border-t border-gray-100 dark:border-gray-800">
        <n-button v-if="!isCurrentChat" type="primary" block @click="openChat">
          <template #icon>
            <div class="i-ri-message-3-line" />
          </template>
          发送消息
        </n-button>

        <n-button type="error" ghost block @click="onExit">
          {{ info?.type === 'group' ? '退出群聊' : '删除好友' }}
        </n-button>
      </div>
    </n-scrollbar>

    <n-modal v-model:show="showFullMemberModal" preset="card" title="成员列表" class="w-[600px] max-w-[90vw]">
      <div class="mb-4">
        <n-input v-model:value="fullMemberSearchKey" placeholder="搜索成员..." clearable>
          <template #prefix>
            <div class="i-ri-search-line" />
          </template>
        </n-input>
      </div>

      <n-scrollbar class="max-h-[60vh]">
        <div class="flex flex-col gap-2">
          <div
            v-for="m in filteredFullMembers"
            :key="m.user_id"
            class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer"
            @click="onMember(m)"
          >
            <n-avatar :size="40" :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${m.user_id}`" round />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2">
                <span class="font-medium truncate">{{ m.card || m.nickname }}</span>
                <n-tag v-if="m.role === 'owner'" type="warning" size="small">群主</n-tag>
                <n-tag v-else-if="m.role === 'admin'" type="info" size="small">管理员</n-tag>
                <n-tag v-if="m.shut_up_timestamp > 0" type="error" size="small">禁言</n-tag>
              </div>
              <div class="text-xs text-gray-400 mt-1">{{ m.user_id }}</div>
            </div>
            <div class="i-ri-arrow-right-s-line text-gray-300" />
          </div>
        </div>
      </n-scrollbar>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { NAvatar, NSwitch, NButton, NInput, NModal, NScrollbar, NTag, useMessage, useDialog } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import { useContactStore } from '@/stores/contact'
import { botApi } from '@/api'
import { useClipboard } from '@vueuse/core'

defineOptions({
  name: 'InfoPanel'
})

interface GroupMember {
  user_id: number
  nickname: string
  card?: string
  role: 'owner' | 'admin' | 'member'
  shut_up_timestamp: number
}
interface MenuItem {
  label: string
  icon: string
  type: 'link' | 'switch'
  value?: boolean
  action?: string
}

const props = defineProps<{ sessionId?: string }>()

const route = useRoute()
const router = useRouter()
const contactStore = useContactStore()
const message = useMessage()
const dialog = useDialog()
const { copy: copyText } = useClipboard()

const sessionId = computed(() => (route.params.id as string) || props.sessionId || '')
const info = computed(() => contactStore.getContact(sessionId.value))
const isCurrentChat = computed(() => route.params.id === sessionId.value)

const goBack = () => router.back()

const memberList = ref<GroupMember[]>([])
const showFullMemberModal = ref(false)
const fullMemberSearchKey = ref('')

const loadGroupMembers = async () => {
  if (info.value?.type !== 'group') return
  try {
    const members = await botApi.getGroupMemberList(Number(sessionId.value))
    memberList.value = (members as GroupMember[]).map((m) => ({
      user_id: m.user_id,
      nickname: m.nickname || String(m.user_id),
      card: m.card,
      role: m.role || 'member',
      shut_up_timestamp: m.shut_up_timestamp || 0
    }))
  } catch (e) {
    console.error('加载群成员失败', e)
    message.error('加载群成员失败')
    memberList.value = []
  }
}

onMounted(() => {
  if (sessionId.value && info.value?.type === 'group') loadGroupMembers()
})

const displayMembers = computed(() => memberList.value.slice(0, 14))

const filteredFullMembers = computed(() => {
  if (!fullMemberSearchKey.value) return memberList.value
  const key = fullMemberSearchKey.value.toLowerCase()
  return memberList.value.filter(
    (m) =>
      String(m.user_id).includes(key) ||
      m.nickname.toLowerCase().includes(key) ||
      (m.card && m.card.toLowerCase().includes(key))
  )
})

const menuItems = ref<MenuItem[]>([
  { label: '群文件', icon: 'i-ri-folder-open-line', type: 'link', action: 'files' },
  { label: '群公告', icon: 'i-ri-megaphone-line', type: 'link', action: 'notice' },
  { label: '精华消息', icon: 'i-ri-star-line', type: 'link', action: 'essence' },
  { label: '消息免打扰', icon: 'i-ri-notification-off-line', type: 'switch', value: false },
  { label: '置顶聊天', icon: 'i-ri-pushpin-line', type: 'switch', value: false }
])

const filteredMenuItems = computed(() =>
  info.value?.type === 'group'
    ? menuItems.value
    : menuItems.value.filter((item) => !['群文件', '群公告', '精华消息'].includes(item.label))
)

const copy = (text?: string) => {
  if (text) {
    copyText(text)
    message.success('已复制到剪贴板')
  }
}

const openFullMemberList = () => {
  showFullMemberModal.value = true
  fullMemberSearchKey.value = ''
}
const onMember = (member: GroupMember) => {
  router.push(`/chats/${member.user_id}`)
  showFullMemberModal.value = false
}

const onMenu = (item: MenuItem) => {
  if (item.type === 'switch') return
  switch (item.action) {
    case 'files':
      router.push(`/chats/${sessionId.value}/files`)
      break
    case 'notice':
      router.push(`/chats/${sessionId.value}/notice`)
      break
    case 'essence':
      router.push(`/chats/${sessionId.value}/essence`)
      break
    default:
      message.info(`功能: ${item.label}`)
  }
}

const openChat = () => {
  router.push(`/chats/${sessionId.value}`)
}

const onExit = () => {
  const isGroup = info.value?.type === 'group'
  const actionText = isGroup ? '退出群聊' : '删除好友'
  const warningText = isGroup ? '退出后将不再接收该群消息' : '删除后将清空聊天记录'
  dialog.warning({
    title: actionText,
    content: `确定要${actionText}吗？${warningText}`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        if (isGroup) {
          await botApi.setGroupLeave(Number(sessionId.value), false)
        } else {
          await botApi.deleteFriend(Number(sessionId.value))
        }
        message.success('操作成功')
        contactStore.removeContact(sessionId.value)
        if (isCurrentChat.value) router.push('/chats')
      } catch (error) {
        message.error('操作失败')
        console.error(error)
      }
    }
  })
}
</script>
