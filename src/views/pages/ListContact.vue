<template>
  <div class="flex flex-col h-full w-full">
    <n-scrollbar class="flex-1">
      <n-collapse display-directive="show" :default-expanded-names="['friends', 'groups']">
        <div
          class="flex items-center gap-3 p-3 mx-2 mt-2 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
          @click="onNewFriends"
        >
          <div
            class="w-11 h-11 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-500"
          >
            <div class="i-ri-user-add-line text-xl" />
          </div>
          <div class="flex-1 min-w-0">
            <span class="font-medium text-base text-gray-700 dark:text-gray-200">新朋友</span>
          </div>
          <div class="i-ri-arrow-right-s-line text-gray-400" />
        </div>

        <n-collapse-item title="好友" name="friends">
          <template #header-extra>
            <span class="text-xs text-gray-400">{{ filteredFriends.length }}</span>
          </template>

          <div
            v-for="friend in filteredFriends"
            :key="friend.user_id"
            class="flex items-center gap-3 p-3 mx-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-lg"
            @click="toChat(friend.user_id)"
          >
            <n-avatar round :src="friend.avatar" size="medium" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                {{ friend.remark || friend.nickname }}
              </div>
              <div v-if="friend.remark" class="text-xs text-gray-400 truncate">{{ friend.nickname }}</div>
            </div>
          </div>
        </n-collapse-item>

        <n-collapse-item title="群组" name="groups">
          <template #header-extra>
            <span class="text-xs text-gray-400">{{ filteredGroups.length }}</span>
          </template>

          <div
            v-for="group in filteredGroups"
            :key="group.group_id"
            class="flex items-center gap-3 p-3 mx-2 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-lg"
            @click="toChat(group.group_id)"
          >
            <n-avatar round :src="group.avatar" size="medium" />
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{{ group.group_name }}</div>
              <div class="text-xs text-gray-400 truncate">{{ group.member_count || 0 }}人</div>
            </div>
          </div>
        </n-collapse-item>
      </n-collapse>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NScrollbar, NCollapse, NCollapseItem, NAvatar } from 'naive-ui'
import { useContactStore } from '@/stores/contact'

defineOptions({
  name: 'ContactBar'
})

const props = defineProps<{ keyword?: string }>()

const router = useRouter()
const contactStore = useContactStore()

const filteredFriends = computed(() => {
  if (!props.keyword) return contactStore.friends
  const key = props.keyword.toLowerCase()
  return contactStore.friends.filter(
    (f) =>
      (f.remark || f.nickname).toLowerCase().includes(key) ||
      f.nickname.toLowerCase().includes(key) ||
      String(f.user_id).includes(key)
  )
})

const filteredGroups = computed(() => {
  if (!props.keyword) return contactStore.groups
  const key = props.keyword.toLowerCase()
  return contactStore.groups.filter((g) => g.group_name.toLowerCase().includes(key) || String(g.group_id).includes(key))
})

const toChat = (id: number) => router.push(`/chats/${id}`)
const onNewFriends = () => router.push('/contacts/new-friends')

onMounted(() => {
  if (contactStore.friends.length === 0 || contactStore.groups.length === 0) {
    contactStore.init()
  }
})
</script>
