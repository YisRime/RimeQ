<template>
  <div class="flex flex-col h-full w-full">
    <n-scrollbar class="flex-1">
      <div class="px-2 pb-2 flex flex-col gap-1">
        <div
          v-if="assistList.length > 0"
          class="group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
          @click="toggleAssist"
        >
          <n-badge :value="assistUnread" :max="99" :hidden="assistUnread === 0">
            <div
              class="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-500"
            >
              <div class="i-ri-archive-line text-xl" />
            </div>
          </n-badge>
          <div class="flex-1 min-w-0 flex flex-col justify-center gap-1">
            <div class="flex justify-between items-baseline">
              <span class="font-medium text-base text-gray-700 dark:text-gray-200">群收纳箱</span>
            </div>
            <div class="text-sm text-gray-400 truncate pr-4">包含 {{ assistList.length }} 个群组</div>
          </div>
          <div
            class="i-ri-arrow-right-s-line text-gray-400 transform transition-transform"
            :class="{ 'rotate-90': showAssist }"
          />
        </div>

        <n-collapse-transition :show="showAssist">
          <div class="pl-4 border-l-2 border-gray-100 dark:border-gray-800 ml-5 my-1">
            <div
              v-for="session in assistList"
              :key="session.peerId"
              class="group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 select-none"
              :class="isActive(session.peerId) ? 'bg-primary/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"
              @click="onSelect(session.peerId)"
            >
              <!-- 头像与未读红点 -->
              <div class="relative flex-shrink-0">
                <n-avatar
                  round
                  :size="44"
                  :src="session.avatar"
                  class="bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-700"
                  :fallback-src="defaultAvatar"
                />

                <!-- 未读红点 -->
                <div
                  v-if="session.unread > 0"
                  class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-gray-900 z-10"
                >
                  <span class="text-[10px] text-white font-bold leading-none transform translate-y-[0.5px]">
                    {{ session.unread > 99 ? '99+' : session.unread }}
                  </span>
                </div>
              </div>

              <!-- 文本信息 -->
              <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
                <div class="flex justify-between items-center">
                  <span
                    class="font-medium truncate text-[15px] leading-tight"
                    :class="isActive(session.peerId) ? 'text-primary' : 'text-gray-800 dark:text-gray-100'"
                  >
                    {{ session.name }}
                  </span>
                  <span
                    class="text-[10px] flex-shrink-0 ml-2"
                    :class="isActive(session.peerId) ? 'text-primary/70' : 'text-gray-400 group-hover:text-gray-500'"
                  >
                    {{ formatTime(session.time) }}
                  </span>
                </div>

                <div
                  class="truncate text-[13px]"
                  :class="[
                    isActive(session.peerId) ? 'text-primary/80' : 'text-gray-400 group-hover:text-gray-500',
                    { 'font-medium': session.unread > 0 }
                  ]"
                >
                  {{ session.lastMsg || '暂无消息' }}
                </div>
              </div>
            </div>
          </div>
        </n-collapse-transition>

        <div
          v-for="session in displayList"
          :key="session.peerId"
          class="group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 select-none"
          :class="isActive(session.peerId) ? 'bg-primary/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"
          @click="onSelect(session.peerId)"
        >
          <!-- 头像与未读红点 -->
          <div class="relative flex-shrink-0">
            <n-avatar
              round
              :size="44"
              :src="session.avatar"
              class="bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-700"
              :fallback-src="defaultAvatar"
            />

            <!-- 未读红点 -->
            <div
              v-if="session.unread > 0"
              class="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1 border-2 border-white dark:border-gray-900 z-10"
            >
              <span class="text-[10px] text-white font-bold leading-none transform translate-y-[0.5px]">
                {{ session.unread > 99 ? '99+' : session.unread }}
              </span>
            </div>
          </div>

          <!-- 文本信息 -->
          <div class="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
            <div class="flex justify-between items-center">
              <span
                class="font-medium truncate text-[15px] leading-tight"
                :class="isActive(session.peerId) ? 'text-primary' : 'text-gray-800 dark:text-gray-100'"
              >
                {{ session.name }}
              </span>
              <span
                class="text-[10px] flex-shrink-0 ml-2"
                :class="isActive(session.peerId) ? 'text-primary/70' : 'text-gray-400 group-hover:text-gray-500'"
              >
                {{ formatTime(session.time) }}
              </span>
            </div>

            <div
              class="truncate text-[13px]"
              :class="[
                isActive(session.peerId) ? 'text-primary/80' : 'text-gray-400 group-hover:text-gray-500',
                { 'font-medium': session.unread > 0 }
              ]"
            >
              {{ session.lastMsg || '暂无消息' }}
            </div>
          </div>
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { NScrollbar, NBadge, NCollapseTransition, NAvatar } from 'naive-ui'
import { useContactStore } from '@/stores/contact'
import { useOptionStore } from '@/stores/option'
import { formatTime } from '@/utils/format'

defineOptions({
  name: 'SessionBar'
})

const props = defineProps<{ keyword?: string }>()

const route = useRoute()
const router = useRouter()
const contactStore = useContactStore()
const optionStore = useOptionStore()

const showAssist = ref(false)
const defaultAvatar = 'https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png'

const isActive = (id: string) => route.params.id === id

const onSelect = (id: string) => router.push(`/chats/${id}`)

const toggleAssist = () => {
  showAssist.value = !showAssist.value
}

const filteredSessions = computed(() => {
  let list = contactStore.contacts
  if (props.keyword) list = list.filter((s) => s.name.includes(props.keyword!) || s.peerId.includes(props.keyword!))
  return list
})

const displayList = computed(() => {
  if (!optionStore.config.bubble_sort_user) return filteredSessions.value
  return filteredSessions.value.filter((s) => s.type !== 'group')
})

const assistList = computed(() => {
  if (!optionStore.config.bubble_sort_user) return []
  return filteredSessions.value.filter((s) => s.type === 'group')
})

const assistUnread = computed(() => assistList.value.reduce((acc, cur) => acc + (cur.unread || 0), 0))
</script>
