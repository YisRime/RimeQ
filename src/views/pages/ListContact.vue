<template>
  <div class="flex flex-col h-full w-full bg-white dark:bg-gray-900">
    <n-scrollbar class="flex-1">
      <n-collapse display-directive="show" :default-expanded-names="['friends', 'groups']" class="p-2">
        <!-- 新朋友入口 -->
        <div
          class="flex items-center gap-3 p-3 mb-2 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
          @click="router.push('/contacts/new-friends')"
        >
          <div
            class="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center text-orange-500"
          >
            <div class="i-ri-user-add-line text-xl" />
          </div>
          <div class="flex-1 min-w-0">
            <span class="font-medium text-base text-gray-700 dark:text-gray-200">新朋友</span>
          </div>
          <div class="i-ri-arrow-right-s-line text-gray-400" />
        </div>

        <!-- 好友列表 -->
        <n-collapse-item title="好友" name="friends">
          <template #header-extra>
            <span class="text-xs text-gray-400">{{ filteredFriends.length }}</span>
          </template>

          <div class="flex flex-col gap-1">
            <div
              v-for="friend in filteredFriends"
              :key="friend.user_id"
              class="flex items-center gap-3 p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-lg transition-colors"
              @click="toChat(friend.user_id)"
            >
              <n-avatar
                round
                :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${friend.user_id}`"
                size="medium"
                fallback-src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"
              />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {{ friend.remark || friend.nickname }}
                </div>
                <div v-if="friend.remark" class="text-xs text-gray-400 truncate">
                  {{ friend.nickname }}
                </div>
              </div>
            </div>
          </div>
        </n-collapse-item>

        <!-- 群组列表 -->
        <n-collapse-item title="群组" name="groups">
          <template #header-extra>
            <span class="text-xs text-gray-400">{{ filteredGroups.length }}</span>
          </template>

          <div class="flex flex-col gap-1">
            <div
              v-for="group in filteredGroups"
              :key="group.group_id"
              class="flex items-center gap-3 p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer rounded-lg transition-colors"
              @click="toChat(group.group_id)"
            >
              <n-avatar
                round
                :src="`https://p.qlogo.cn/gh/${group.group_id}/${group.group_id}/0`"
                size="medium"
                fallback-src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"
              />
              <div class="flex-1 min-w-0">
                <div class="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                  {{ group.group_name }}
                </div>
                <div class="text-xs text-gray-400 truncate">{{ group.member_count || 0 }}人</div>
              </div>
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
import { useContactsStore } from '@/stores/contacts'

defineOptions({ name: 'ContactBar' })

const props = defineProps<{ keyword?: string }>()
const router = useRouter()
const contactsStore = useContactsStore()

const filteredFriends = computed(() => {
  if (!props.keyword) return contactsStore.friends
  const k = props.keyword.toLowerCase()
  return contactsStore.friends.filter(
    (f) =>
      (f.remark || '').toLowerCase().includes(k) ||
      f.nickname.toLowerCase().includes(k) ||
      String(f.user_id).includes(k)
  )
})

const filteredGroups = computed(() => {
  if (!props.keyword) return contactsStore.groups
  const k = props.keyword.toLowerCase()
  return contactsStore.groups.filter((g) => g.group_name.toLowerCase().includes(k) || String(g.group_id).includes(k))
})

const toChat = (id: number) => router.push(`/chats/${id}`)

onMounted(() => {
  // 如果没有数据，尝试同步一次
  if (contactsStore.friends.length === 0) {
    contactsStore.syncData()
  }
})
</script>
