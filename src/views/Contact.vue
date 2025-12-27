<template>
  <div class="ui-flex-col-full overflow-hidden bg-transparent">
    <!-- 顶部固定操作区 -->
    <div class="flex-none px-3 pt-3 pb-2 flex flex-col gap-2 z-20">
      <!-- 系统通知入口 -->
      <div v-if="!keyword">
        <!-- 平板模式 -->
        <div
          v-if="isTablet"
          title="系统通知"
          class="h-10 w-full ui-flex-center rounded-2xl cursor-pointer ui-ia group border"
          :class="[
            route.path === '/notice'
              ? '!bg-primary !text-white shadow-md border-transparent'
              : 'bg-background-dim/30 border-background-dim/20 text-foreground-sub hover:bg-background-dim/50 hover:text-foreground-main'
          ]"
          @click="router.push('/notice')"
        >
          <div
            class="text-xl transition-colors"
            :class="[
              noticeCount > 0 ? 'i-ri-notification-3-fill' : 'i-ri-notification-3-line',
              route.path === '/notice' ? '' : (noticeCount > 0 ? 'text-primary' : 'text-current')
            ]"
          />
          <div
            v-if="noticeCount > 0"
            class="absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full bg-red-500 text-white text-[9px] font-bold ui-flex-center border-2 leading-none z-10 border-background-sub"
          >
            {{ noticeCount > 99 ? '99+' : noticeCount }}
          </div>
        </div>
        <!-- 桌面/移动模式 -->
        <div
          v-else
          class="h-12 ui-flex-x px-3 gap-3 rounded-2xl cursor-pointer border ui-ia group"
          :class="[
            route.path === '/notice'
              ? '!bg-primary !text-white shadow-md border-transparent'
              : 'bg-background-dim/30 border-background-dim/20 text-foreground-sub hover:bg-background-dim/50 hover:text-foreground-main'
          ]"
          @click="router.push('/notice')"
        >
          <div
            class="w-8 h-8 rounded-full ui-flex-center shrink-0 shadow-sm transition-colors"
            :class="[
              route.path === '/notice'
                ? 'bg-white/20 text-white'
                : 'bg-white dark:bg-black/20 text-primary'
            ]"
          >
            <div class="i-ri-notification-3-fill text-lg" />
          </div>
          <div class="flex-1 font-bold text-sm transition-colors">系统通知</div>
          <div v-if="noticeCount > 0" class="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full shadow-sm">
            {{ noticeCount }}
          </div>
          <div
            class="i-ri-arrow-right-s-line transition-all"
            :class="route.path === '/notice' ? 'text-white/70' : 'text-foreground-sub/50 group-hover:text-foreground-main/70'"
          />
        </div>
      </div>
      <!-- 好友/群组 切换 -->
      <div
        class="flex select-none bg-background-dim/30 p-1 rounded-2xl transition-all border border-background-dim/20"
        :class="isTablet ? 'flex-col gap-1' : 'flex-row'"
      >
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="flex-1 ui-flex-center text-sm font-bold rounded-xl cursor-pointer ui-trans ui-dur-fast"
          :class="[
            currentTab === tab.key
              ? '!bg-background-sub text-primary shadow-sm ring-1 ring-black/5 dark:ring-white/10'
              : 'text-foreground-sub hover:text-foreground-main hover:bg-background-sub/50',
            isTablet ? 'py-1.5 text-xs' : 'py-1.5'
          ]"
          @click="currentTab = tab.key"
        >
          {{ tab.label }}
        </div>
      </div>
    </div>
    <!-- 滚动列表区域 -->
    <div class="flex-1 min-h-0 overflow-y-auto ui-scrollbar relative scroll-smooth px-2 pb-2">
      <!-- 场景 A: 好友列表 -->
      <template v-if="currentTab === 'friend'">
        <!-- 分组展示 -->
        <template v-if="friendCategories.length > 0">
          <div v-for="cat in filteredCategories" :key="cat.categoryId" class="select-none mb-1 last:mb-0">
            <!-- 分组标题栏 -->
            <div
              class="sticky top-0 z-10 ui-flex-x px-2 py-2 cursor-pointer bg-background-sub/95 backdrop-blur hover:bg-background-dim/30 rounded-2xl transition-colors group border-b border-transparent hover:border-background-dim/50"
              :class="isTablet ? 'flex-col justify-center gap-0.5' : 'gap-2'"
              @click="toggleCategory(cat.categoryId)"
            >
              <div
                class="i-ri-arrow-right-s-fill text-foreground-sub transition-transform duration-200 shrink-0 group-hover:text-primary"
                :class="{ 'rotate-90': expandedCats.includes(cat.categoryId) || keyword }"
              />
              <span v-if="!isTablet" class="text-xs font-bold text-foreground-sub group-hover:text-foreground-main flex-1 truncate">
                {{ cat.categoryName }}
              </span>
              <span class="text-[10px] text-foreground-dim font-mono group-hover:text-foreground-sub transition-colors">
                {{ isTablet ? cat.categoryMbCount : `${cat.onlineCount}/${cat.categoryMbCount}` }}
              </span>
            </div>
            <!-- 分组好友项 -->
            <div v-show="expandedCats.includes(cat.categoryId) || keyword" class="pl-1 pr-1" :class="isTablet ? 'pt-1' : 'pl-2'">
              <div
                v-for="friend in cat.buddyList"
                :key="friend.user_id"
                class="ui-flex-x gap-3 p-2 rounded-2xl group relative overflow-hidden ui-ia-hover"
                :class="isTablet ? 'justify-center' : ''"
                @click="router.push(`/${friend.user_id}`)"
              >
                <!-- 选中指示条 -->
                <div class="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-primary rounded-r-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <Avatar
                  shape="circle"
                  :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${friend.user_id}`"
                  class="w-9 h-9 shrink-0 bg-background-dim border border-background-dim/50 shadow-sm"
                />
                <div v-if="!isTablet" class="ui-flex-truncate">
                  <div class="text-sm font-medium text-foreground-main truncate group-hover:text-primary transition-colors">
                    {{ friend.remark || friend.nickname }}
                  </div>
                  <div class="text-[11px] text-foreground-sub truncate font-mono opacity-60">
                    {{ friend.nickname }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
        <!-- 平铺展示 -->
        <template v-else>
          <div
            v-for="friend in filteredFlatFriends"
            :key="friend.user_id"
            class="ui-flex-x gap-3 p-2 rounded-2xl group relative ui-ia-hover"
            :class="isTablet ? 'justify-center' : ''"
            @click="router.push(`/${friend.user_id}`)"
          >
            <Avatar
              shape="circle"
              :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${friend.user_id}`"
              class="w-9 h-9 shrink-0 bg-background-dim border border-background-dim/50 shadow-sm"
            />
            <div v-if="!isTablet" class="ui-flex-truncate">
              <div class="text-sm font-medium text-foreground-main truncate group-hover:text-primary transition-colors">
                {{ friend.remark || friend.nickname }}
              </div>
              <div class="text-[11px] text-foreground-sub truncate font-mono opacity-60">
                {{ friend.nickname }}
              </div>
            </div>
          </div>
        </template>
      </template>
      <!-- 场景 B: 群组列表 -->
      <template v-else>
        <div
          v-for="group in filteredGroups"
          :key="group.group_id"
          class="ui-flex-x gap-3 p-2 rounded-2xl group relative ui-ia-hover"
          :class="isTablet ? 'justify-center' : ''"
          @click="router.push(`/${group.group_id}`)"
        >
          <Avatar
            shape="circle"
            :image="`https://p.qlogo.cn/gh/${group.group_id}/${group.group_id}/0`"
            class="w-9 h-9 shrink-0 bg-background-dim border border-background-dim/50 shadow-sm"
          />
          <div v-if="!isTablet" class="ui-flex-truncate">
            <div class="text-sm font-medium text-foreground-main truncate group-hover:text-primary transition-colors">
              {{ group.group_remark ? `${group.group_remark}` : group.group_name }}
            </div>
            <div class="text-[11px] text-foreground-sub truncate font-mono opacity-60">
              {{ group.group_id }}
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import Avatar from 'primevue/avatar'
import { useContactStore } from '@/stores/contact'
import { bot } from '@/api'
import type { FriendCategory } from '@/types'

defineOptions({ name: 'ContactView' })

const router = useRouter()
const route = useRoute()
const contactStore = useContactStore()
const props = defineProps<{ keyword?: string }>()
const breakpoints = useBreakpoints(breakpointsTailwind)
const isTablet = breakpoints.between('md', 'xl')

// 状态管理
const tabs = [{ key: 'friend', label: '好友' }, { key: 'group', label: '群组' }] as const
const currentTab = ref<'friend' | 'group'>('friend')
const friendCategories = ref<FriendCategory[]>([])
const expandedCats = ref<number[]>([])

const noticeCount = computed(() => contactStore.notices.length)

// 过滤分组列表
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

// 过滤好友列表
const filteredFlatFriends = computed(() => {
  const k = (props.keyword || '').toLowerCase().trim()
  const list = contactStore.friends
  if (!k) return list
  return list.filter(f =>
    (f.remark || '').toLowerCase().includes(k) ||
    f.nickname.toLowerCase().includes(k) ||
    String(f.user_id).includes(k)
  )
})

// 过滤群组列表
const filteredGroups = computed(() => {
  const k = (props.keyword || '').toLowerCase().trim()
  const list = contactStore.groups
  if (!k) return list
  return list.filter(g =>
    g.group_name.toLowerCase().includes(k) ||
    String(g.group_id).includes(k)
  )
})

// 切换分组展开/折叠
const toggleCategory = (id: number) => {
  const idx = expandedCats.value.indexOf(id)
  if (idx > -1) expandedCats.value.splice(idx, 1)
  else expandedCats.value.push(id)
}

// 初始化数据加载
onMounted(async () => {
  if (friendCategories.value.length === 0) {
    try {
      const res = await bot.getFriendsWithCategory()
      if (Array.isArray(res) && res.length > 0) friendCategories.value = res
      else throw new Error('Empty Category List')
    } catch {
      if (contactStore.friends.length === 0) {
        bot.getFriendList().then(res => contactStore.friends = res || []).catch(() => {})
      }
    }
  }
})

// 按需加载群组
watch(currentTab, async (val) => {
  if (val === 'group' && contactStore.groups.length === 0) {
    bot.getGroupList().then(res => contactStore.groups = res || []).catch(() => {})
  }
})
</script>
