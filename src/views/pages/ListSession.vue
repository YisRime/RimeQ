<template>
  <div class="flex-col-full bg-sub">
    <div class="flex-1 overflow-y-auto my-scrollbar">
      <div class="px-2 py-2 flex flex-col gap-1">
        <!-- 群收纳箱 (当开启了"气泡排序-用户优先"时显示) -->
        <template v-if="assistList.length > 0">
          <div
            class="group relative flex-x gap-3 p-3 rounded-xl cursor-pointer my-hover my-trans"
            @click="toggleAssist"
          >
            <Badge :value="assistUnread" :pt="{ root: { class: assistUnread === 0 ? 'hidden' : '' } }">
              <div class="w-11 h-11 rounded-full bg-blue-100 dark:bg-blue-900 flex-center text-blue-500">
                <div class="i-ri-archive-line text-xl" />
              </div>
            </Badge>

            <div class="flex-truncate flex flex-col justify-center gap-1">
              <div class="flex-between">
                <span class="font-medium text-base text-main">群收纳箱</span>
              </div>
              <div class="text-sm text-dim truncate pr-4">包含 {{ assistList.length }} 个群组</div>
            </div>

            <div class="i-ri-arrow-right-s-line text-dim transform my-trans" :class="{ 'rotate-90': showAssist }" />
          </div>

          <!-- 收纳箱展开内容 -->
          <transition name="expand">
            <div v-show="showAssist" class="pl-4 border-l-2 border-dim ml-5 my-1 flex flex-col gap-1 overflow-hidden">
              <div
                v-for="session in assistList"
                :key="session.id"
                class="group relative flex-x gap-3 p-3 rounded-xl cursor-pointer my-trans select-none"
                :class="isActive(session.id) ? 'bg-primary/10' : 'my-hover'"
                @click="onSelect(session.id)"
              >
                <!-- 头像 -->
                <div class="relative flex-shrink-0">
                  <Avatar
                    shape="circle"
                    size="large"
                    :image="session.avatar"
                    class="bg-white dark:bg-gray-700 border border-dim"
                  />
                  <div
                    v-if="session.unread > 0"
                    class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900"
                  />
                </div>

                <!-- 信息 -->
                <div class="flex-truncate flex flex-col gap-0.5">
                  <div class="flex-between">
                    <span
                      class="font-medium truncate text-sm"
                      :class="isActive(session.id) ? 'text-primary' : 'text-main'"
                    >
                      {{ session.name }}
                    </span>
                    <span class="text-[10px] flex-shrink-0 ml-2 text-dim">
                      {{ formatTime(session.time) }}
                    </span>
                  </div>
                  <div class="truncate text-xs text-dim">
                    {{ session.preview || '暂无消息' }}
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </template>

        <!-- 普通会话列表 -->
        <div
          v-for="session in displayList"
          :key="session.id"
          class="group relative flex-x gap-3 p-3 rounded-xl cursor-pointer my-trans select-none"
          :class="isActive(session.id) ? 'bg-primary/10' : 'my-hover'"
          @click="onSelect(session.id)"
        >
          <!-- 头像与红点 -->
          <div class="relative flex-shrink-0">
            <Avatar
              shape="circle"
              size="xlarge"
              :image="session.avatar"
              class="bg-white dark:bg-gray-700 shadow-sm border border-dim"
            />

            <div
              v-if="session.unread > 0"
              class="abs-center -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 rounded-full flex-center px-1 border-2 border-white dark:border-gray-900 z-10"
            >
              <span class="text-[10px] text-white font-bold leading-none transform translate-y-[0.5px]">
                {{ session.unread > 99 ? '99+' : session.unread }}
              </span>
            </div>
          </div>

          <!-- 文本信息 -->
          <div class="flex-truncate flex flex-col justify-center gap-0.5">
            <div class="flex-between">
              <span
                class="font-medium truncate text-[15px] leading-tight"
                :class="isActive(session.id) ? 'text-primary' : 'text-main'"
              >
                {{ session.name }}
              </span>
              <span
                class="text-[10px] flex-shrink-0 ml-2"
                :class="isActive(session.id) ? 'text-primary/70' : 'text-dim group-hover:text-sub'"
              >
                {{ formatTime(session.time) }}
              </span>
            </div>

            <div
              class="truncate text-[13px]"
              :class="[
                isActive(session.id) ? 'text-primary/80' : 'text-dim group-hover:text-sub',
                { 'font-medium text-sub': session.unread > 0 }
              ]"
            >
              {{ session.preview || '暂无消息' }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import Badge from 'primevue/badge'
import { useContactsStore } from '@/stores/contacts'
import { formatTime } from '@/utils/format'

defineOptions({ name: 'SessionBar' })

const props = defineProps<{ keyword?: string }>()

const route = useRoute()
const router = useRouter()
const contactsStore = useContactsStore()

const showAssist = ref(false)

const isActive = (id: string) => route.params.id === id
const onSelect = (id: string) => router.push(`/${id}`)
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

<style scoped>
.expand-enter-active,
.expand-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 1000px;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
