<template>
  <div class="ui-flex-col-full overflow-hidden bg-transparent">
    <!-- 顶部固定操作区 -->
    <div class="flex-none px-3 pt-3 pb-2 flex flex-col gap-2 z-20">
      <!-- 系统通知入口 -->
      <div v-if="!keyword">
        <!-- 平板模式 -->
        <div
          title="验证消息"
          class="h-10 w-full ui-flex-center rounded-2xl cursor-pointer ui-ia border hidden md:flex xl:hidden relative"
          :class="[
            route.path === '/request'
              ? 'bg-primary text-primary shadow-sm border-transparent'
              : 'bg-background-sub/30 backdrop-blur border-border-main/20 text-foreground-sub hover:bg-background-sub/50 hover:text-foreground-main'
          ]"
          @click="router.push('/request')"
        >
          <div
            class="text-xl transition-colors"
            :class="[
              noticeCount > 0 ? 'i-ri-notification-3-fill' : 'i-ri-notification-3-line',
              route.path === '/request' ? '' : (noticeCount > 0 ? 'text-primary' : 'text-current')
            ]"
          />
          <Badge
            v-if="noticeCount > 0"
            :value="noticeCount"
            severity="danger"
            class="absolute -top-1 -right-1 !text-[9px] !h-4 !min-w-4 border-2 border-background-sub"
          />
        </div>
        <!-- 桌面/移动模式 -->
        <div
          class="h-12 ui-flex-x px-3 gap-3 rounded-2xl cursor-pointer border ui-ia flex md:hidden xl:flex"
          :class="[
            route.path === '/request'
              ? 'bg-primary text-primary shadow-sm border-transparent'
              : 'bg-background-sub/30 backdrop-blur border-border-main/20 text-foreground-sub hover:bg-background-sub/50 hover:text-foreground-main'
          ]"
          @click="router.push('/request')"
        >
          <div
            class="w-8 h-8 rounded-full ui-flex-center shrink-0 shadow-sm transition-colors"
            :class="[
              route.path === '/request'
                ? 'bg-primary text-primary'
                : 'bg-background-sub/50 text-primary'
            ]"
          >
            <div class="i-ri-notification-3-fill text-lg" />
          </div>
          <div class="flex-1 font-bold text-sm transition-colors text-foreground-sub">验证消息</div>
          <Badge v-if="noticeCount > 0" :value="noticeCount" severity="danger" />
          <div
            class="i-ri-arrow-right-s-line transition-all"
            :class="route.path === '/request' ? 'text-primary/70' : 'text-foreground-dim group-hover:text-foreground-sub'"
          />
        </div>
      </div>
      <!-- 好友/群组 切换 -->
      <div
        class="flex select-none bg-background-sub/30 backdrop-blur p-1 rounded-2xl transition-all border border-border-main/20 flex-row md:flex-col md:gap-1 xl:flex-row"
      >
        <div
          v-for="tab in tabs"
          :key="tab.key"
          class="flex-1 ui-flex-center font-bold rounded-xl cursor-pointer ui-trans ui-dur-fast py-1.5 text-sm md:text-xs xl:text-sm"
          :class="[
            currentTab === tab.key
              ? 'bg-background-sub/70 text-primary shadow-sm'
              : 'text-foreground-sub hover:text-foreground-main hover:bg-background-sub/40',
          ]"
          @click="currentTab = tab.key"
        >
          {{ tab.label }}
        </div>
      </div>
    </div>
    <!-- 滚动列表区域 -->
    <div class="flex-1 min-h-0 overflow-y-auto ui-scrollbar relative scroll-smooth px-3 pb-2">
      <!-- 场景 A: 好友列表 -->
      <template v-if="currentTab === 'friend'">
        <Accordion :value="expandedCats" multiple class="flex flex-col gap-1">
          <AccordionPanel
            v-for="cat in filteredCategories"
            :key="cat.categoryId"
            :value="cat.categoryId"
            class="!border-none"
          >
            <AccordionHeader
              class="!p-2 !bg-transparent hover:!bg-background-sub/20 !border-none !rounded-2xl transition-colors group !flex items-center gap-2"
            >
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <span class="text-xs font-bold text-foreground-sub group-hover:text-foreground-main truncate">
                  {{ cat.categoryName }}
                </span>
                <Badge
                  :value="isTablet ? cat.categoryMbCount : `${cat.onlineCount}/${cat.categoryMbCount}`"
                  severity="secondary"
                  class="!text-[9px] !h-3.5 !bg-transparent !text-foreground-dim"
                />
              </div>
            </AccordionHeader>
            <AccordionContent :pt="{ content: { class: '!p-1 !bg-transparent' } }">
              <div class="flex flex-col gap-0.5">
                <div
                  v-for="friend in cat.buddyList"
                  :key="friend.user_id"
                  class="ui-flex-x gap-3 p-2 rounded-xl cursor-pointer hover:bg-background-sub/30 ui-trans group/item"
                  @click="router.push(`/${friend.user_id}`)"
                >
                  <Avatar
                    shape="circle"
                    :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${friend.user_id}`"
                    class="w-9 h-9 shrink-0 bg-background-sub/50 border border-border-main/40 shadow-sm"
                  />
                  <div class="ui-flex-truncate">
                    <div class="text-sm font-medium text-foreground-main truncate group-hover/item:text-primary transition-colors">
                      {{ friend.remark || friend.nickname }}
                    </div>
                    <div class="text-[10px] text-foreground-dim font-mono opacity-50">{{ friend.user_id }}</div>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionPanel>
        </Accordion>
      </template>
      <!-- 场景 B: 群组列表 -->
      <template v-else>
        <VirtualScroller :items="filteredGroups" :item-size="50" class="size-full ui-scrollbar" :pt="{ content: { class: '!w-full' } }" >
          <template #item="{ item: group }">
            <div
              class="ui-flex-x gap-3 p-2 rounded-2xl group relative hover:bg-background-sub/30 ui-trans ui-dur-fast md:justify-center xl:justify-start cursor-pointer"
              @click="router.push(`/${group.group_id}`)"
            >
              <Avatar
                shape="circle"
                :image="`https://p.qlogo.cn/gh/${group.group_id}/${group.group_id}/0`"
                class="w-9 h-9 shrink-0 bg-background-sub/50 border border-border-main/40 shadow-sm"
              />
              <div class="ui-flex-truncate block md:hidden xl:block">
                <div class="text-sm font-medium text-foreground-main truncate group-hover:text-primary transition-colors">
                  {{ group.group_remark ? `${group.group_remark} (${group.group_name})` : group.group_name }}
                </div>
                <div class="text-[11px] text-foreground-dim truncate font-mono opacity-60 flex items-center gap-1.5">
                  <span>{{ group.group_id }}</span>
                  <Badge :value="`${group.member_count}/${group.max_member_count}`" severity="secondary" class="!text-[9px] !h-3.5 !bg-transparent !px-0" />
                </div>
              </div>
            </div>
          </template>
        </VirtualScroller>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, inject } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Avatar, Badge, Accordion, AccordionPanel, AccordionHeader, AccordionContent, VirtualScroller } from 'primevue'
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core'
import { useContactStore } from '@/stores'
import { type GroupInfo, SearchKey } from '@/types'

defineOptions({ name: 'ContactView' })

const router = useRouter()
const route = useRoute()
const contactStore = useContactStore()
const keyword = inject(SearchKey, ref(''))
const breakpoints = useBreakpoints(breakpointsTailwind)
const isTablet = breakpoints.between('md', 'xl')

// 状态管理
const tabs = [{ key: 'friend', label: '好友' }, { key: 'group', label: '群组' }] as const
const currentTab = ref<'friend' | 'group'>('friend')
const expandedCats = ref<number[]>([])

// 计算属性：通知数量
const noticeCount = computed(() => contactStore.requests.length)

// 监听展开
watch(
  [() => contactStore.friends, keyword],
  ([cats, k]) => {
    if (k.trim()) {
      expandedCats.value = cats.map(c => c.categoryId)
    } else if (expandedCats.value.length === 0 && cats.length > 0) {
      const firstCat = cats[0]
      if (firstCat) expandedCats.value = [firstCat.categoryId]
    }
  },
  { immediate: true }
)

// 列表过滤
function filterList<T extends Record<string, any>>(list: T[], keyword: string | undefined, fields: (keyof T)[]): T[] {
  const k = (keyword || '').toLowerCase().trim()
  if (!k) return list
  return list.filter(item =>
    fields.some(field =>
      String(item[field]).toLowerCase().includes(k)
    )
  )
}

// 过滤分组列表
const filteredCategories = computed(() => {
  if (!(keyword.value).trim()) return contactStore.friends
  return contactStore.friends
    .map(cat => ({ ...cat, buddyList: filterList(cat.buddyList, keyword.value, ['remark', 'nickname', 'user_id']) }))
    .filter(cat => cat.buddyList.length > 0)
})

// 过滤群组列表
const filteredGroups = computed(() => {
  return filterList<GroupInfo>(contactStore.groups, keyword.value, ['group_name', 'group_id'])
})
</script>
