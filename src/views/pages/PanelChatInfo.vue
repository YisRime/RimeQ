<template>
  <div class="h-full w-full flex flex-col bg-main border-l border-dim">
    <!-- Header (移动端) -->
    <div class="md:hidden h-14 flex-x px-4 border-b border-dim">
      <div class="i-ri-arrow-left-s-line text-xl mr-2 cursor-pointer" @click="router.back()" />
      <span class="font-bold">详情信息</span>
    </div>

    <div class="flex-1 overflow-y-auto my-scrollbar">
      <!-- 头部卡片 -->
      <div class="flex flex-col items-center gap-3 py-8 border-b border-dim">
        <Avatar :image="info?.avatar" size="xlarge" shape="circle" class="shadow-lg border-4 border-main" />
        <div class="text-center px-4 w-full">
          <div class="text-xl font-bold truncate text-main">{{ info?.name }}</div>
          <div class="text-sub text-sm mt-1 flex-center gap-2">
            <span>{{ info?.id }}</span>
            <div class="i-ri-file-copy-line cursor-pointer hover:text-primary my-trans" @click="copy(info?.id)" />
          </div>
        </div>
      </div>

      <!-- 群成员预览 (仅群组) -->
      <div v-if="info?.type === 'group'" class="py-4 border-b border-dim">
        <div class="flex-between mb-3 px-4">
          <span class="font-bold text-sub">成员 ({{ members.length }})</span>
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
              class="absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-main z-10 flex-center text-[8px]"
              :class="m.role === 'owner' ? 'bg-yellow-400 text-white' : 'bg-green-500 text-white'"
            >
              <div :class="m.role === 'owner' ? 'i-ri-vip-crown-fill' : 'i-ri-shield-star-fill'" />
            </div>

            <Avatar
              :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${m.user_id}`"
              size="large"
              shape="circle"
              class="group-hover:ring-2 ring-primary/50 my-trans"
            />
            <span class="text-[10px] text-sub truncate w-full text-center group-hover:text-primary">
              {{ m.card || m.nickname }}
            </span>
          </div>

          <!-- 查看更多 -->
          <div
            class="flex flex-col items-center gap-1 cursor-pointer opacity-60 hover:opacity-100"
            @click="showAllMembers = true"
          >
            <div class="w-10 h-10 rounded-full bg-dim flex-center text-sub">
              <div class="i-ri-more-fill text-xl" />
            </div>
            <span class="text-[10px] text-sub">更多</span>
          </div>
        </div>
      </div>

      <!-- 功能菜单 -->
      <div class="py-4 flex flex-col gap-1 px-4">
        <div
          v-for="item in menuItems"
          :key="item.label"
          class="flex-between p-3 my-hover rounded-lg cursor-pointer my-trans group"
          @click="onMenuAction(item)"
        >
          <div class="flex-x gap-3">
            <div :class="[item.icon, 'text-sub group-hover:text-primary my-trans text-lg']" />
            <span class="text-main text-sm">{{ item.label }}</span>
          </div>
          <div class="i-ri-arrow-right-s-line text-dim" />
        </div>
      </div>

      <!-- 底部操作 -->
      <div class="flex flex-col gap-3 p-4 border-t border-dim mt-4">
        <Button v-if="!isCurrent" severity="primary" fluid @click="router.push(`/${id}`)"> 发消息 </Button>
        <Button severity="danger" outlined fluid @click="handleDelete">
          {{ info?.type === 'group' ? '退出群聊' : '删除好友' }}
        </Button>
      </div>
    </div>

    <!-- 全部成员弹窗 -->
    <Dialog
      v-model:visible="showAllMembers"
      modal
      header="群成员"
      class="w-[500px] max-w-[90vw]"
      :style="{ height: '70vh' }"
    >
      <div class="flex flex-col gap-4 h-full">
        <div class="relative">
          <div class="absolute left-3 top-1/2 -translate-y-1/2 i-ri-search-line text-sub" />
          <InputText v-model="memberSearch" placeholder="搜索成员..." class="w-full pl-10" />
        </div>

        <div class="flex-1 overflow-y-auto my-scrollbar">
          <div class="flex flex-col gap-2">
            <div
              v-for="m in filteredMembers"
              :key="m.user_id"
              class="flex-x gap-3 p-2 my-hover rounded-lg cursor-pointer"
              @click="(router.push(`/${m.user_id}`), (showAllMembers = false))"
            >
              <Avatar :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${m.user_id}`" shape="circle" size="large" />
              <div class="flex-1 min-w-0">
                <div class="flex-x gap-2">
                  <span class="text-sm font-medium">{{ m.card || m.nickname }}</span>
                  <span v-if="m.role === 'owner'" class="text-[10px] bg-yellow-100 text-yellow-600 px-1 rounded"
                    >群主</span
                  >
                  <span v-if="m.role === 'admin'" class="text-[10px] bg-green-100 text-green-600 px-1 rounded"
                    >管理</span
                  >
                </div>
                <div class="text-xs text-sub">{{ m.user_id }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Button from 'primevue/button'
import Dialog from 'primevue/dialog'
import InputText from 'primevue/inputtext'
import { useToast } from 'primevue/usetoast'
import { useConfirm } from 'primevue/useconfirm'
import { useContactsStore } from '@/stores/contacts'
import { bot } from '@/api'
import { useClipboard } from '@vueuse/core'

defineOptions({ name: 'PanelChatInfo' })

const route = useRoute()
const router = useRouter()
const contactsStore = useContactsStore()
const toast = useToast()
const confirm = useConfirm()
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
    toast.add({ severity: 'success', summary: '已复制', life: 3000 })
  }
}

const handleDelete = () => {
  const isGroup = info.value?.type === 'group'
  confirm.require({
    message: '确定执行此操作吗?数据将无法恢复。',
    header: isGroup ? '退出群聊' : '删除好友',
    icon: 'pi pi-exclamation-triangle',
    rejectLabel: '取消',
    acceptLabel: '确定',
    accept: async () => {
      try {
        if (isGroup) await bot.setGroupLeave(Number(id.value))
        else await bot.deleteFriend(Number(id.value))

        toast.add({ severity: 'success', summary: '操作成功', life: 3000 })
        contactsStore.removeSession(id.value)
        router.push('/')
      } catch {
        toast.add({ severity: 'error', summary: '操作失败', life: 3000 })
      }
    }
  })
}
</script>
