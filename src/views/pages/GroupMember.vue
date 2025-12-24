<template>
  <div class="h-full w-full flex flex-col bg-main">
    <!-- Header -->
    <header class="h-14 border-b border-dim bg-sub/90 backdrop-blur flex-x px-4 flex-shrink-0 z-10 gap-3">
      <div class="i-ri-arrow-left-s-line text-xl cursor-pointer hover:text-primary my-trans" @click="router.back()" />
      <span class="font-bold text-lg text-main">
        群成员
        <span v-if="loading" class="text-xs font-normal text-sub ml-1">(加载中...)</span>
        <span v-else class="text-xs font-normal text-sub ml-1">({{ members.length }})</span>
      </span>
    </header>

    <!-- Search -->
    <div class="p-4 border-b border-dim">
      <div class="relative">
        <div class="absolute left-3 top-1/2 -translate-y-1/2 i-ri-search-line text-dim" />
        <InputText v-model="keyword" placeholder="搜索成员..." class="w-full pl-10 !bg-dim border-0 rounded-lg h-10" />
      </div>
    </div>

    <!-- List -->
    <div class="flex-1 overflow-y-auto my-scrollbar p-2">
      <div class="flex flex-col gap-1">
        <div
          v-for="m in filteredMembers"
          :key="m.user_id"
          class="flex-x gap-3 p-3 my-hover rounded-xl cursor-pointer my-trans group"
          @click="router.push(`/${m.user_id}`)"
        >
          <Avatar :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${m.user_id}`" shape="circle" size="large" />
          <div class="flex-1 min-w-0">
            <div class="flex-x gap-2">
              <span class="text-sm font-bold text-main truncate">{{ m.card || m.nickname }}</span>
              <span
                v-if="m.role === 'owner'"
                class="text-[10px] bg-yellow-100 text-yellow-600 px-1.5 rounded-full font-bold"
                >群主</span
              >
              <span
                v-if="m.role === 'admin'"
                class="text-[10px] bg-green-100 text-green-600 px-1.5 rounded-full font-bold"
                >管理</span
              >
            </div>
            <div class="text-xs text-dim mt-0.5">{{ m.user_id }}</div>
          </div>
          <div class="i-ri-arrow-right-s-line text-dim opacity-0 group-hover:opacity-100 my-trans" />
        </div>

        <div v-if="!loading && filteredMembers.length === 0" class="py-20 text-center text-dim">
          {{ members.length === 0 ? '暂无群成员' : '未找到匹配的成员' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Avatar from 'primevue/avatar'
import InputText from 'primevue/inputtext'
import { bot } from '@/api'
import type { GroupMemberInfo } from '@/types'

defineOptions({ name: 'GroupMember' })

const router = useRouter()
const route = useRoute()
const keyword = ref('')
const members = ref<GroupMemberInfo[]>([])
const loading = ref(false)

const id = computed(() => (route.params.id as string) || '')

const filteredMembers = computed(() => {
  const k = keyword.value.toLowerCase().trim()
  if (!k) return members.value
  return members.value.filter(
    (m) =>
      String(m.user_id).includes(k) ||
      (m.nickname || '').toLowerCase().includes(k) ||
      (m.card || '').toLowerCase().includes(k)
  )
})

onMounted(async () => {
  if (!id.value) return
  loading.value = true
  try {
    const list = await bot.getGroupMemberList(Number(id.value))
    members.value = list
  } catch (e) {
    console.error('[GroupMember] 获取成员列表失败', e)
    members.value = []
  } finally {
    loading.value = false
  }
})
</script>
