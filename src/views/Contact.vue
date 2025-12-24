<template>
  <div class="flex flex-col h-full w-full bg-sub overflow-hidden">
    <!-- 顶部固定区域 -->
    <div class="flex-none px-2 pt-3 pb-2 flex flex-col gap-2 z-20 bg-sub">
      <!-- 系统通知 -->
      <div
        v-if="!keyword"
        class="relative bg-main rounded-lg border border-dim/60 shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group overflow-hidden select-none"
        :class="isTablet ? 'h-12 flex items-center justify-center' : 'p-3 flex items-center gap-3'"
        @click="router.push('/notice')"
      >
        <div class="relative w-9 h-9 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-500 shrink-0 group-hover:scale-105 transition-transform">
          <div class="i-ri-notification-3-fill text-lg" />
          <div v-if="noticeCount > 0 && !isTablet" class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-main animate-pulse" />
        </div>
        <div v-if="isTablet && noticeCount > 0" class="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-main" />
        <template v-if="!isTablet">
          <div class="flex-1 font-bold text-main text-sm">系统通知</div>
          <div class="flex items-center gap-2">
            <span v-if="noticeCount > 0" class="text-xs text-white bg-red-500 px-1.5 py-0.5 rounded-full shadow-sm">{{ noticeCount }}</span>
            <div class="i-ri-arrow-right-s-line text-sub group-hover:translate-x-0.5 transition-transform" />
          </div>
        </template>
      </div>
      <!-- 列表切换 -->
      <div
        class="flex select-none bg-dim/50 p-1 rounded-lg transition-all"
        :class="isTablet ? 'flex-col gap-1' : 'flex-row'"
      >
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="flex-1 text-center text-sm font-medium rounded-md cursor-pointer transition-all duration-200 flex items-center justify-center hover:text-main"
          :class="[
            currentTab === tab.key ? 'text-primary bg-main shadow-sm' : 'text-sub',
            isTablet ? 'py-2 text-xs' : 'py-1.5'
          ]"
          @click="currentTab = tab.key"
        >
          {{ tab.label }}
        </div>
      </div>
    </div>
    <!-- 滚动列表区域 -->
    <div class="flex-1 min-h-0 px-2 pb-2">
      <div class="h-full bg-sub rounded-lg border border-dim/60 shadow-sm overflow-hidden flex flex-col">
        <div class="flex-1 overflow-y-auto my-scrollbar relative scroll-smooth">
          <!-- 好友列表 -->
          <template v-if="currentTab === 'friend'">
            <!-- A: 分组展示 -->
            <template v-if="friendCategories.length > 0">
              <div v-for="cat in filteredCategories" :key="cat.categoryId" class="select-none">
                <!-- 分组标题 -->
                <div
                  class="sticky top-0 z-10 flex items-center gap-2 bg-dim/95 backdrop-blur-sm border-y border-dim/50 cursor-pointer hover:bg-dim transition-colors"
                  :class="isTablet ? 'justify-center py-2' : 'px-3 py-2'"
                  @click="toggleCategory(cat.categoryId)"
                >
                  <div
                    class="i-ri-arrow-right-s-fill text-sub transition-transform duration-200 shrink-0"
                    :class="{ 'rotate-90': expandedCats.includes(cat.categoryId) || keyword }"
                  />
                  <span v-if="!isTablet" class="text-xs font-bold text-main truncate flex-1">{{ cat.categoryName }}</span>
                  <span class="text-[10px] text-sub font-mono opacity-80">
                    {{ isTablet ? cat.categoryMbCount : `${cat.onlineCount}/${cat.categoryMbCount}` }}
                  </span>
                </div>
                <!-- 分组内容 -->
                <div v-show="expandedCats.includes(cat.categoryId) || keyword">
                  <div
                    v-for="friend in cat.buddyList"
                    :key="friend.user_id"
                    class="flex items-center gap-3 cursor-pointer hover:bg-dim/50 transition-colors border-b border-dim/30 last:border-none group"
                    :class="isTablet ? 'justify-center py-2' : 'px-3 py-2.5'"
                    @click="router.push(`/${friend.user_id}`)"
                  >
                    <Avatar
                      shape="circle"
                      :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${friend.user_id}`"
                      class="w-9 h-9 shrink-0 bg-dim border border-dim/50"
                    />
                    <div v-if="!isTablet" class="flex-1 min-w-0 overflow-hidden">
                      <div class="text-sm font-medium text-main truncate group-hover:text-primary transition-colors">
                        {{ friend.remark || friend.nickname }}
                      </div>
                      <div class="text-[11px] text-sub truncate mt-0.5 font-mono opacity-70">
                        {{ friend.nickname }} ({{ friend.user_id }})
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </template>
            <!-- B: 平铺展示 -->
            <template v-else>
               <div
                v-for="friend in filteredFlatFriends"
                :key="friend.user_id"
                class="flex items-center gap-3 cursor-pointer hover:bg-dim/50 transition-colors border-b border-dim/30 last:border-none group"
                :class="isTablet ? 'justify-center py-2' : 'px-3 py-2.5'"
                @click="router.push(`/${friend.user_id}`)"
              >
                <Avatar
                  shape="circle"
                  :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${friend.user_id}`"
                  class="w-9 h-9 shrink-0 bg-dim border border-dim/50"
                />
                <div v-if="!isTablet" class="flex-1 min-w-0 overflow-hidden">
                  <div class="text-sm font-medium text-main truncate group-hover:text-primary transition-colors">
                    {{ friend.remark || friend.nickname }}
                  </div>
                  <div class="text-[11px] text-sub truncate mt-0.5 font-mono opacity-70">
                    {{ friend.nickname }} ({{ friend.user_id }})
                  </div>
                </div>
              </div>
            </template>
          </template>
          <!-- 群组列表 -->
          <template v-else>
            <div
              v-for="group in filteredGroups"
              :key="group.group_id"
              class="flex items-center gap-3 cursor-pointer hover:bg-dim/50 transition-colors border-b border-dim/30 last:border-none group"
              :class="isTablet ? 'justify-center py-2' : 'px-3 py-2.5'"
              @click="router.push(`/${group.group_id}`)"
            >
              <Avatar
                shape="circle"
                :image="`https://p.qlogo.cn/gh/${group.group_id}/${group.group_id}/0`"
                class="w-9 h-9 shrink-0 bg-dim border border-dim/50"
              />
              <div v-if="!isTablet" class="flex-1 min-w-0 overflow-hidden">
                <div class="text-sm font-medium text-main truncate group-hover:text-primary transition-colors">
                  {{ group.group_remark ? `${group.group_remark} (${group.group_name})` : group.group_name }}
                </div>
                <div class="text-[11px] text-sub truncate mt-0.5 font-mono opacity-70">
                  {{ group.group_id }} ({{ group.member_count }}/{{ group.max_member_count }})
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import Avatar from 'primevue/avatar'
import { dataStore } from '@/utils/storage'
import { bot } from '@/api'
import type { FriendCategory } from '@/types'

defineOptions({ name: 'ContactView' })

const props = defineProps<{ keyword?: string }>()
const router = useRouter()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isTablet = breakpoints.between('md', 'xl')

// 状态管理
const tabs = [
  { key: 'friend', label: '好友' },
  { key: 'group', label: '群组' }
] as const
const currentTab = ref<'friend' | 'group'>('friend')
const friendCategories = ref<FriendCategory[]>([])
const expandedCats = ref<number[]>([])

const noticeCount = computed(() => dataStore.notices.value.length)

// 过滤分组
const filteredCategories = computed(() => {
  const k = (props.keyword || '').toLowerCase().trim()
  if (!k) return friendCategories.value
  return friendCategories.value
    .map(cat => ({
      ...cat,
      buddyList: cat.buddyList.filter(f =>
        (f.remark || '').toLowerCase().includes(k) ||
        f.nickname.toLowerCase().includes(k) ||
        String(f.user_id).includes(k)
      )
    }))
    .filter(cat => cat.buddyList.length > 0)
})

// 过滤好友
const filteredFlatFriends = computed(() => {
  const k = (props.keyword || '').toLowerCase().trim()
  const list = dataStore.friends.value
  if (!k) return list
  return list.filter(f =>
    (f.remark || '').toLowerCase().includes(k) ||
    f.nickname.toLowerCase().includes(k) ||
    String(f.user_id).includes(k)
  )
})

// 过滤群组
const filteredGroups = computed(() => {
  const k = (props.keyword || '').toLowerCase().trim()
  const list = dataStore.groups.value
  if (!k) return list
  return list.filter(g =>
    g.group_name.toLowerCase().includes(k) ||
    String(g.group_id).includes(k)
  )
})

// 切换展开状态
const toggleCategory = (id: number) => {
  const idx = expandedCats.value.indexOf(id)
  if (idx > -1) expandedCats.value.splice(idx, 1)
  else expandedCats.value.push(id)
}

// 初始化
onMounted(async () => {
  // 获取分组
  if (friendCategories.value.length === 0) {
    try {
      const res = await bot.getFriendsWithCategory()
      if (Array.isArray(res) && res.length > 0) {
        friendCategories.value = res
      } else {
        throw new Error('Empty Category List')
      }
    } catch (e) {
      console.error('[Contact] 加载分组列表失败:', e)
      // 获取好友
      if (dataStore.friends.value.length === 0) {
        try {
          const flatList = await bot.getFriendList()
          dataStore.friends.value = flatList
        } catch (err) {
          console.error('[Contact] 加载好友列表失败:', err)
        }
      }
    }
  }
})

// 监听 Tab 切换
watch(currentTab, async (val) => {
  if (val === 'group' && dataStore.groups.value.length === 0) {
    try {
      const list = await bot.getGroupList()
      dataStore.groups.value = list
    } catch (e) {
      console.error('[Contact] 加载群组列表失败', e)
    }
  }
})
</script>
