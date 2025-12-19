<template>
  <div class="flex-col-full bg-sub">
    <div class="flex-1 overflow-y-auto my-scrollbar">
      <Accordion :value="['friends', 'groups']" multiple class="p-2">
        <!-- 新朋友入口 -->
        <div class="flex-x gap-3 p-3 mb-2 rounded-xl cursor-pointer my-hover my-trans" @click="router.push('/notice')">
          <div class="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex-center text-orange-500">
            <div class="i-ri-user-add-line text-xl" />
          </div>
          <div class="flex-truncate">
            <span class="font-medium text-base text-main">新朋友</span>
          </div>
          <div class="i-ri-arrow-right-s-line text-dim" />
        </div>

        <!-- 好友列表 -->
        <AccordionPanel value="friends">
          <AccordionHeader>
            <div class="flex-between w-full">
              <span class="text-main">好友</span>
              <span class="text-xs text-dim">{{ filteredFriends.length }}</span>
            </div>
          </AccordionHeader>
          <AccordionContent>
            <div class="flex flex-col gap-1">
              <div
                v-for="friend in filteredFriends"
                :key="friend.user_id"
                class="flex-x gap-3 p-2.5 my-hover cursor-pointer rounded-lg my-trans"
                @click="toChat(friend.user_id)"
              >
                <Avatar shape="circle" :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${friend.user_id}`" />
                <div class="flex-truncate">
                  <div class="text-sm font-medium text-main truncate">
                    {{ friend.remark || friend.nickname }}
                  </div>
                  <div v-if="friend.remark" class="text-xs text-dim truncate">
                    {{ friend.nickname }}
                  </div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>

        <!-- 群组列表 -->
        <AccordionPanel value="groups">
          <AccordionHeader>
            <div class="flex-between w-full">
              <span class="text-main">群组</span>
              <span class="text-xs text-dim">{{ filteredGroups.length }}</span>
            </div>
          </AccordionHeader>
          <AccordionContent>
            <div class="flex flex-col gap-1">
              <div
                v-for="group in filteredGroups"
                :key="group.group_id"
                class="flex-x gap-3 p-2.5 my-hover cursor-pointer rounded-lg my-trans"
                @click="toChat(group.group_id)"
              >
                <Avatar shape="circle" :image="`https://p.qlogo.cn/gh/${group.group_id}/${group.group_id}/0`" />
                <div class="flex-truncate">
                  <div class="text-sm font-medium text-main truncate">
                    {{ group.group_name }}
                  </div>
                  <div class="text-xs text-dim truncate">{{ group.member_count || 0 }}人</div>
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionPanel>
      </Accordion>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionContent from 'primevue/accordioncontent'
import Avatar from 'primevue/avatar'
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

const toChat = (id: number) => router.push(`/${id}`)

onMounted(() => {
  // 如果没有数据，尝试同步一次
  if (contactsStore.friends.length === 0) {
    contactsStore.syncData()
  }
})
</script>
