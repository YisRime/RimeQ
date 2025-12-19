<template>
  <div class="flex flex-col h-full w-full bg-white dark:bg-gray-900">
    <n-scrollbar class="flex-1">
      <div class="px-2 py-2 flex flex-col gap-1">
        <!-- 群收纳箱 (当开启了"气泡排序-用户优先"时显示) -->
        <template v-if="assistList.length > 0">
          <div
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

          <!-- 收纳箱展开内容 -->
          <n-collapse-transition :show="showAssist">
            <div class="pl-4 border-l-2 border-gray-100 dark:border-gray-800 ml-5 my-1 flex flex-col gap-1">
              <div
                v-for="session in assistList"
                :key="session.id"
                class="group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 select-none"
                :class="isActive(session.id) ? 'bg-primary/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"
                @click="onSelect(session.id)"
              >
                <!-- 头像 -->
                <div class="relative flex-shrink-0">
                  <n-avatar
                    round
                    :size="40"
                    :src="session.avatar"
                    class="bg-white dark:bg-gray-700 border border-gray-100 dark:border-gray-700"
                    fallback-src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"
                  />
                  <div
                    v-if="session.unread > 0"
                    class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900"
                  />
                </div>

                <!-- 信息 -->
                <div class="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div class="flex justify-between items-center">
                    <span
                      class="font-medium truncate text-sm"
                      :class="isActive(session.id) ? 'text-primary' : 'text-gray-800 dark:text-gray-100'"
                    >
                      {{ session.name }}
                    </span>
                    <span class="text-[10px] flex-shrink-0 ml-2 text-gray-400">
                      {{ formatTime(session.time) }}
                    </span>
                  </div>
                  <div class="truncate text-xs text-gray-400">
                    {{ session.preview || '暂无消息' }}
                  </div>
                </div>
              </div>
            </div>
          </n-collapse-transition>
        </template>

        <!-- 普通会话列表 -->
        <div
          v-for="session in displayList"
          :key="session.id"
          class="group relative flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all duration-200 select-none"
          :class="isActive(session.id) ? 'bg-primary/10' : 'hover:bg-gray-100 dark:hover:bg-gray-800'"
          @click="onSelect(session.id)"
        >
          <!-- 头像与红点 -->
          <div class="relative flex-shrink-0">
            <n-avatar
              round
              :size="44"
              :src="session.avatar"
              class="bg-white dark:bg-gray-700 shadow-sm border border-gray-100 dark:border-gray-700"
              fallback-src="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png"
            />

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
                :class="isActive(session.id) ? 'text-primary' : 'text-gray-800 dark:text-gray-100'"
              >
                {{ session.name }}
              </span>
              <span
                class="text-[10px] flex-shrink-0 ml-2"
                :class="isActive(session.id) ? 'text-primary/70' : 'text-gray-400 group-hover:text-gray-500'"
              >
                {{ formatTime(session.time) }}
              </span>
            </div>

            <div
              class="truncate text-[13px]"
              :class="[
                isActive(session.id) ? 'text-primary/80' : 'text-gray-400 group-hover:text-gray-500',
                { 'font-medium text-gray-600 dark:text-gray-300': session.unread > 0 }
              ]"
            >
              {{ session.preview || '暂无消息' }}
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
import { useContactsStore } from '@/stores/contacts'
// import { useSettingsStore } from '@/stores/settings' // 如果有相关配置可以使用
import { formatTime } from '@/utils/format'

defineOptions({ name: 'SessionBar' })

const props = defineProps<{ keyword?: string }>()

const route = useRoute()
const router = useRouter()
const contactsStore = useContactsStore()
// const settingsStore = useSettingsStore()

const showAssist = ref(false)

const isActive = (id: string) => route.params.id === id
const onSelect = (id: string) => router.push(`/chats/${id}`)
const toggleAssist = () => (showAssist.value = !showAssist.value)

// 基础过滤
const filteredSessions = computed(() => {
  let list = contactsStore.sessions
  if (props.keyword) {
    const k = props.keyword.toLowerCase()
    list = list.filter((s) => s.name.toLowerCase().includes(k) || s.id.includes(k))
  }
  return list
})

// 此处演示简单的分类逻辑，如果 SettingsStore 里有 bubble_sort_user 配置，可在此判断
// 假设这里我们默认不启用“群收纳”，直接返回所有列表。
// 如果你想启用群收纳，可以解开下面的注释并使用 settingsStore
const enableGroupAssist = false // settingsStore.config.bubbleSortUser

const displayList = computed(() => {
  if (!enableGroupAssist) return filteredSessions.value
  return filteredSessions.value.filter((s) => s.type !== 'group')
})

const assistList = computed(() => {
  if (!enableGroupAssist) return []
  return filteredSessions.value.filter((s) => s.type === 'group')
})

const assistUnread = computed(() => assistList.value.reduce((acc, cur) => acc + (cur.unread || 0), 0))
</script>
