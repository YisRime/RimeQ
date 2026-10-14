<template>
  <div class="ui-flex-col-full bg-transparent relative select-none">
    <!-- 顶部导航栏 -->
    <header class="h-14 shrink-0 px-3 border-b border-white/5 flex items-center gap-3 z-30 bg-transparent backdrop-blur-md">
      <Button v-tooltip.bottom="'返回'" icon="i-ri-arrow-left-s-line" text rounded class="!w-8 !h-8 !text-foreground-sub shrink-0" @click="router.back()" />
      <div class="flex-1 min-w-0 flex items-center gap-2">
        <span class="font-bold text-base text-foreground-main truncate">群精华</span>
        <Badge :value="items.length" severity="secondary" class="!text-[10px] !h-4 !min-w-6" />
      </div>
    </header>
    <!-- 列表区域 -->
    <div class="flex-1 min-h-0 bg-transparent relative w-full overflow-hidden">
      <!-- 加载中 -->
      <div v-if="loading" class="h-full ui-flex-center">
        <ProgressSpinner />
      </div>
      <div v-else-if="items.length > 0" class="size-full overflow-y-auto ui-scrollbar">
        <div v-for="item in items" :key="item.message_id" class="w-full px-3 py-2">
          <div class="relative bg-background-sub/20 backdrop-blur-md border border-white/10 rounded-xl shadow-sm group hover:shadow-md ui-trans flex flex-col overflow-hidden">
            <div class="flex items-center gap-3 p-3 pb-2">
              <!-- 头像 -->
              <Avatar
                :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${item.sender_id}`"
                shape="circle"
                class="!w-8 !h-8 bg-background-sub/30 shrink-0 cursor-pointer border border-white/10"
                @click.stop="router.push(`/${item.sender_id}`)"
              />
              <!-- 昵称 -->
              <div class="flex-1 min-w-0 font-bold text-sm text-foreground-main truncate">
                {{ item.sender_nick }}
              </div>
              <!-- 删除按钮 -->
              <div v-if="canManage" class="absolute top-3 left-3 z-20 opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100">
                <Button
                  v-tooltip.left="'删除'"
                  icon="i-ri-delete-bin-line"
                  text rounded severity="danger"
                  class="!w-8 !h-8 !bg-background-sub/80 shadow-sm border border-red-200/20 hover:!bg-red-500/10"
                  @click.stop="handleDelete(item)"
                />
              </div>
              <!-- 操作信息 -->
              <div class="flex flex-col items-end shrink-0 text-[10px] text-foreground-dim font-mono leading-tight">
                <span>{{ formatTime(item.operator_time * 1000) }}</span>
                <div class="flex items-center gap-0.5 mt-0.5">
                  <div class="i-ri-star-fill text-yellow-500 text-[9px]" />
                  <span class="max-w-[80px] truncate">{{ item.operator_nick }}</span>
                </div>
              </div>
            </div>
            <!-- 消息内容 -->
            <div class="text-sm text-foreground-main">
              <ElementRenderer
                :segments="item.content"
                :group-id="groupId"
              />
            </div>
          </div>
        </div>
      </div>
      <!-- 空状态 -->
      <div v-else class="h-full ui-flex-center flex-col text-foreground-dim opacity-50 gap-2">
        <div class="i-ri-star-line text-4xl" />
        <span class="text-xs">暂无精华</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button, Avatar, useToast, useConfirm, Badge, ProgressSpinner } from 'primevue'
import { bot } from '@/api'
import { formatTime } from '@/utils/format'
import ElementRenderer from '@/components/ElementRenderer.vue'
import { useContactStore, useSettingStore } from '@/stores'

// 全局 Hooks
const router = useRouter()
const route = useRoute()
const toast = useToast()
const confirm = useConfirm()
const contactStore = useContactStore()
const settingStore = useSettingStore()

// 状态数据
const groupId = computed(() => Number(route.params.id))
const items = ref<any[]>([])
const loading = ref(false)

// 计算属性：当前用户信息
const myInfo = computed(() => {
  const uid = settingStore.user?.user_id
  return uid ? contactStore.getMember(groupId.value, uid) : undefined
})
// 计算属性：是否管理权限
const canManage = computed(() => ['owner', 'admin'].includes(myInfo.value?.role || ''))

// 删除精华消息
const handleDelete = (item: any) => {
  confirm.require({
    message: '确定要删除这条精华吗？', header: '删除精华', icon: 'i-ri-error-warning-line text-red-500', acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await bot.deleteEssenceMsg(item.message_id)
        const index = items.value.findIndex(i => i.message_id === item.message_id)
        if (index > -1) items.value.splice(index, 1)
      } catch (e) {
        toast.add({ severity: 'error', summary: '删除失败', detail: String(e), life: 3000 })
      }
    }
  })
}

// 组件挂载
onMounted(async () => {
  if (groupId.value) {
    loading.value = true
    try {
      const res = await bot.getEssenceMsgList(groupId.value)
      items.value = (res || []).sort((a, b) => b.operator_time - a.operator_time)
    } catch (e) {
      toast.add({ severity: 'error', summary: '加载精华列表失败', detail: String(e), life: 3000 })
    } finally {
      loading.value = false
    }
  }
})
</script>
