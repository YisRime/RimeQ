<template>
  <div class="flex-col-full bg-sub">
    <div class="flex-1 overflow-y-auto my-scrollbar">
      <Accordion :value="['friends', 'groups']" multiple class="p-2 contact-accordion">
        <!-- 新朋友入口 -->
        <div
          class="flex-x gap-3 p-2 lg:p-3 mb-2 rounded-xl cursor-pointer my-hover my-trans group"
          :class="'justify-start md:justify-center lg:justify-start'"
          @click="router.push('/notice')"
        >
          <div class="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/50 flex-center text-orange-500 shrink-0">
            <div class="i-ri-user-add-line text-lg lg:text-xl" />
          </div>
          <div class="flex-truncate block md:hidden lg:block">
            <span class="font-medium text-sm lg:text-base text-main">新朋友</span>
          </div>
          <div class="i-ri-arrow-right-s-line text-dim block md:hidden lg:block" />
        </div>

        <!-- Friends List -->
        <AccordionPanel value="friends">
          <AccordionHeader>
            <div class="flex-between w-full pr-4 block md:hidden lg:flex">
              <span class="text-main font-bold">好友</span>
              <span class="text-xs text-dim">{{ filteredFriends.length }}</span>
            </div>
            <div class="hidden md:block lg:hidden text-center w-full">
              <div class="i-ri-user-smile-line text-dim" />
            </div>
          </AccordionHeader>
          <AccordionPanelContent>
            <div class="flex flex-col gap-1">
              <div
                v-for="friend in filteredFriends"
                :key="friend.user_id"
                class="flex-x gap-3 p-2 lg:p-2.5 my-hover cursor-pointer rounded-lg my-trans"
                :class="'justify-start md:justify-center lg:justify-start'"
                @click="toChat(friend.user_id)"
                @contextmenu.prevent="onContextMenu($event, friend.user_id, 'friend')"
              >
                <!-- Avatar -->
                <div class="w-10 h-10 shrink-0">
                  <Avatar
                    shape="circle"
                    :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${friend.user_id}`"
                    class="w-full h-full"
                  />
                </div>
                <!-- Text -->
                <div class="flex-truncate block md:hidden lg:block">
                  <div class="text-sm font-medium text-main truncate">{{ friend.remark || friend.nickname }}</div>
                  <div v-if="friend.remark" class="text-xs text-dim truncate">{{ friend.nickname }}</div>
                </div>
              </div>
            </div>
          </AccordionPanelContent>
        </AccordionPanel>

        <!-- Groups List -->
        <AccordionPanel value="groups">
          <AccordionHeader>
            <div class="flex-between w-full pr-4 block md:hidden lg:flex">
              <span class="text-main font-bold">群组</span>
              <span class="text-xs text-dim">{{ filteredGroups.length }}</span>
            </div>
            <div class="hidden md:block lg:hidden text-center w-full">
              <div class="i-ri-group-line text-dim" />
            </div>
          </AccordionHeader>
          <AccordionPanelContent>
            <div class="flex flex-col gap-1">
              <div
                v-for="group in filteredGroups"
                :key="group.group_id"
                class="flex-x gap-3 p-2 lg:p-2.5 my-hover cursor-pointer rounded-lg my-trans"
                :class="'justify-start md:justify-center lg:justify-start'"
                @click="toChat(group.group_id)"
                @contextmenu.prevent="onContextMenu($event, group.group_id, 'group')"
              >
                <!-- Avatar -->
                <div class="w-10 h-10 shrink-0">
                  <Avatar
                    shape="circle"
                    :image="`https://p.qlogo.cn/gh/${group.group_id}/${group.group_id}/0`"
                    class="w-full h-full"
                  />
                </div>
                <!-- Text -->
                <div class="flex-truncate block md:hidden lg:block">
                  <div class="text-sm font-medium text-main truncate">{{ group.group_name }}</div>
                  <div class="text-xs text-dim truncate">{{ group.member_count || 0 }}人</div>
                </div>
              </div>
            </div>
          </AccordionPanelContent>
        </AccordionPanel>
      </Accordion>
    </div>
    <ContextMenu v-model:show="showMenu" :x="menuX" :y="menuY" :options="menuOpts" @select="onMenuSelect" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import Accordion from 'primevue/accordion'
import AccordionPanel from 'primevue/accordionpanel'
import AccordionHeader from 'primevue/accordionheader'
import AccordionPanelContent from 'primevue/accordioncontent'
import Avatar from 'primevue/avatar'
import { dataStore } from '@/utils/storage'
import ContextMenu, { type MenuItem } from '@/components/ContextMenu.vue'

defineOptions({ name: 'ContactView' })

const props = defineProps<{ keyword?: string }>()
const router = useRouter()

const filteredFriends = computed(() => {
  const list = dataStore.friends.value
  if (!props.keyword) return list
  const k = props.keyword.toLowerCase()
  return list.filter(
    (f) =>
      (f.remark || '').toLowerCase().includes(k) ||
      f.nickname.toLowerCase().includes(k) ||
      String(f.user_id).includes(k)
  )
})

const filteredGroups = computed(() => {
  const list = dataStore.groups.value
  if (!props.keyword) return list
  const k = props.keyword.toLowerCase()
  return list.filter((g) => g.group_name.toLowerCase().includes(k) || String(g.group_id).includes(k))
})

const toChat = (id: number) => router.push(`/${id}`)

onMounted(() => {
  if (dataStore.friends.value.length === 0) dataStore.syncData()
})

const showMenu = ref(false)
const menuX = ref(0)
const menuY = ref(0)
const targetId = ref<number>(0)
const menuOpts: MenuItem[] = [{ label: '发消息', key: 'chat', icon: 'i-ri-message-3-line' }]

const onContextMenu = (e: MouseEvent, id: number, type: 'friend' | 'group') => {
  targetId.value = id
  menuX.value = e.clientX
  menuY.value = e.clientY
  showMenu.value = true
}

const onMenuSelect = (key: string) => {
  if (key === 'chat' && targetId.value) toChat(targetId.value)
}
</script>

<style scoped>
@media (min-width: 768px) and (max-width: 1024px) {
  :deep(.p-accordion-header) {
    padding: 0.5rem !important;
    justify-content: center;
  }
  :deep(.p-accordion-content) {
    padding: 0.5rem 0 !important;
  }
  :deep(.p-accordion-toggle-icon) {
    display: none;
  }
}
</style>
