<template>
  <div class="ui-flex-col-full bg-transparent relative select-none">
    <!-- 顶部导航栏 -->
    <header class="h-14 shrink-0 px-3 border-b border-white/5 flex items-center gap-3 z-30 bg-transparent backdrop-blur-md">
      <Button v-tooltip.bottom="'返回'" icon="i-ri-arrow-left-s-line" text rounded class="!w-8 !h-8 !text-foreground-sub shrink-0" @click="router.back()" />
      <div class="flex-1 min-w-0 flex items-center gap-2">
        <span class="font-bold text-base text-foreground-main truncate">群公告</span>
        <Badge :value="notices.length" severity="secondary" class="!text-[10px] !h-4 !min-w-6" />
      </div>
      <Button v-if="canPublish" v-tooltip.bottom="'新公告'" icon="i-ri-add-line" text rounded class="!w-8 !h-8 !text-foreground-sub hover:!text-primary" @click="openDialog()" />
    </header>
    <!-- 公告列表区域 -->
    <div class="flex-1 overflow-y-auto ui-scrollbar p-3 relative bg-transparent">
      <!-- 空状态 -->
      <div v-if="!notices.length" class="h-full ui-flex-center flex-col text-foreground-dim opacity-50 gap-2">
        <div class="i-ri-notification-off-line text-4xl" />
        <span class="text-xs">暂无公告</span>
      </div>
      <!-- 列表内容 -->
      <div v-else class="flex flex-col gap-3 pb-4">
        <div
          v-for="item in notices"
          :key="item.id"
          class="group relative bg-background-sub/30 backdrop-blur-md border border-white/10 rounded-xl p-3 shadow-sm hover:shadow-md ui-trans"
        >
          <!-- 头部信息 -->
          <div class="flex items-center gap-2 mb-2 relative z-10 h-6">
            <Avatar :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${item.sender_id}`" shape="circle" class="!w-6 !h-6 bg-background-sub/50 border border-white/10 shadow-sm shrink-0" />
            <div class="flex items-center gap-1.5 min-w-0 mr-auto">
              <span class="font-bold text-sm text-foreground-main truncate max-w-[100px] sm:max-w-[180px]">{{ contactStore.getUserName(item.sender_id, groupId) }}</span>
            </div>
            <div class="flex items-center gap-2 text-[12px] text-foreground-dim font-mono leading-none shrink-0">
              <div v-if="canOperate(item)" class="flex items-center gap-1 opacity-0 group-hover:opacity-100 ui-trans mr-1">
                 <div v-tooltip.top="'编辑'" class="i-ri-edit-line cursor-pointer hover:text-primary ui-trans" @click.stop="openDialog(item)" />
                 <div v-tooltip.top="'删除'" class="i-ri-delete-bin-line cursor-pointer hover:text-red-500 ui-trans" @click.stop="remove(item)" />
              </div>
              <span>{{ formatTime(item.publish_time * 1000) }}</span>
            </div>
          </div>
          <!-- 主要内容 -->
          <div class="relative mt-2 px-1">
            <div
              class="relative overflow-hidden transition-all duration-500 ease-in-out"
              :class="isExpanded(item.id) ? '' : 'max-h-[7.5rem]'"
            >
              <div class="text-sm text-foreground-main whitespace-pre-wrap leading-5 tracking-wide break-words select-text">
                {{ item.text }}
              </div>
              <div v-if="item.image?.url" class="mt-3 rounded-lg overflow-hidden bg-background-sub/10 border border-white/10 w-fit max-w-full">
                 <Image
                    :src="item.image.url"
                    preview
                    image-class="max-h-56 max-w-full object-contain cursor-pointer hover:opacity-90 block transition-opacity"
                    class="!flex"
                    referrerpolicy="no-referrer"
                    @error="item.image.url = ''"
                 />
              </div>
            </div>
            <!-- 遮罩 -->
            <div
              v-if="shouldExpand(item)"
              class="absolute inset-x-0 bottom-0 z-10 flex justify-center items-end transition-all duration-300 pointer-events-none"
              :class="isExpanded(item.id) ? 'h-8' : 'h-20 bg-gradient-to-t from-background-sub/40 from-10% to-transparent'"
            >
              <!-- 控制按钮 -->
              <div
                class="pointer-events-auto cursor-pointer w-7 h-7 rounded-full bg-background-sub/80 hover:bg-primary hover:text-white text-foreground-sub flex items-center justify-center transition-all shadow-sm backdrop-blur-sm active:scale-95 mb-0.5 border border-transparent hover:border-primary/20 opacity-0 group-hover:opacity-100"
                @click.stop="toggleExpand(item.id)"
              >
                <div
                  :class="isExpanded(item.id) ? 'i-ri-arrow-up-s-line' : 'i-ri-arrow-down-s-line'"
                  class="text-base"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 编辑 / 发布弹窗 -->
    <Dialog v-model:visible="ui.dialog" modal header="编辑公告" :style="{ width: '28rem' }">
      <div class="flex flex-col gap-3 pt-1">
        <!-- 文本输入 -->
        <Textarea v-model="form.content" placeholder="请输入内容(1-600字)..." rows="5" auto-resize class="w-full !text-sm !bg-background-dim/30 focus:!bg-background-dim !border-transparent resize-none rounded-xl p-3 ui-scrollbar transition-colors" />
        <!-- 控制区 -->
        <div class="flex gap-3 h-24">
          <!-- 选项组 -->
          <div class="flex flex-col justify-between flex-1 py-0.5">
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background-dim/30 cursor-pointer ui-trans select-none" @click="form.pinned = !form.pinned">
              <Checkbox v-model="form.pinned" binary class="pointer-events-none scale-75" />
              <span class="text-xs text-foreground-main">设为置顶公告</span>
            </div>
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background-dim/30 cursor-pointer ui-trans select-none" @click="form.confirm = !form.confirm">
              <Checkbox v-model="form.confirm" binary class="pointer-events-none scale-75" />
              <span class="text-xs text-foreground-main">需成员确认收到</span>
            </div>
            <div class="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-background-dim/30 cursor-pointer ui-trans select-none" @click="form.popup = !form.popup">
              <Checkbox v-model="form.popup" binary class="pointer-events-none scale-75" />
              <span class="text-xs text-foreground-main">使用弹窗展示公告</span>
            </div>
          </div>
          <!-- 图片上传 -->
          <div
            class="relative aspect-square h-full rounded-xl border-2 border-dashed border-background-dim hover:border-primary/50 ui-flex-center cursor-pointer ui-trans overflow-hidden group/upload bg-background-dim/5"
            @click="fileInput?.click()"
          >
            <img v-if="form.imgPreview" :src="form.imgPreview" class="size-full object-cover" />
            <div v-else class="flex flex-col items-center gap-1 text-foreground-dim group-hover/upload:text-primary ui-trans">
              <div class="i-ri-image-add-line text-xl" />
              <span class="text-[10px]">图片</span>
            </div>
            <div
              v-if="form.imgPreview"
              class="absolute top-1 right-1 p-0.5 bg-black/50 hover:bg-red-500 text-white rounded-full cursor-pointer backdrop-blur-sm ui-trans"
              @click.stop="form.imgPreview = ''"
            >
              <div class="i-ri-close-line text-xs" />
            </div>
          </div>
        </div>
        <!-- 底部按钮 -->
        <div class="flex justify-end gap-2 mt-1">
          <Button label="取消" text severity="secondary" size="small" @click="ui.dialog = false" />
          <Button label="发布" size="small" class="!px-4 font-bold" :loading="ui.loading" :disabled="!form.content.trim()" @click="submit" />
        </div>
      </div>
    </Dialog>
    <input ref="fileInput" type="file" accept="image/*" class="hidden" @change="handleFile">
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button, Avatar, useToast, useConfirm, Dialog, Textarea, Checkbox, Image } from 'primevue'
import { bot } from '@/api'
import { useContactStore, useSettingStore } from '@/stores'
import { formatTime } from '@/utils/format'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const confirm = useConfirm()
const contactStore = useContactStore()
const settingStore = useSettingStore()

// 数据状态
const groupId = computed(() => Number(route.params.id))
const notices = ref<any[]>([])
const fileInput = ref<HTMLInputElement>()
const editingId = ref<string | null>(null)
const expandedSet = ref<Set<string>>(new Set())

// UI 状态
const ui = reactive({ dialog: false, loading: false })
const form = reactive({ content: '', imgPreview: '', pinned: false, confirm: false, popup: false })

// 权限计算
const myInfo = computed(() => contactStore.members.get(groupId.value)?.find(m => m.user_id === settingStore.user?.user_id))
const canPublish = computed(() => ['owner', 'admin'].includes(myInfo.value?.role || ''))
const canOperate = (item: any) => canPublish.value || item.sender_id === settingStore.user?.user_id

// 展开逻辑判断
const shouldExpand = (item: any) => (item.image?.url) || (item.text?.length > 60) || (item.text?.split('\n').length > 3)
const isExpanded = (id: string) => expandedSet.value.has(id)
const toggleExpand = (id: string) => expandedSet.value.has(id) ? expandedSet.value.delete(id) : expandedSet.value.add(id)

// 解析公告数据
const parseNotice = (n: any) => {
  let text = n.message?.text || n.msg?.text || n.content || n.message || n.msg || ''
  if (typeof text === 'string' && text) {
    const txt = document.createElement('textarea')
    txt.innerHTML = text
    text = txt.value
  }
  const imgId = n.images?.[0]?.id || n.message?.image?.[0]?.id || n.msg?.image?.id || n.img
  let imgUrl = n.images?.[0]?.url || n.message?.image?.[0]?.url || n.msg?.image?.url || n.img
  if (imgId && (!imgUrl || !imgUrl.startsWith('http'))) imgUrl = `https://p.qlogo.cn/gdynamic/${imgId}/0/`
  return {
    id: n.id || n.fid || n.notice_id,
    sender_id: n.sender_id || n.u || n.user_id,
    publish_time: Number(n.publish_time || n.t || n.time || 0),
    text,
    image: imgUrl ? { id: imgId, url: imgUrl } : null,
    is_top: !!(n.pinned || n.is_sticky || n.is_top || n.is_pinned),
    confirm_required: !!(n.settings?.confirm_required || n.is_confirm)
  }
}

// 加载列表
const loadNotices = async () => {
  if (!groupId.value) return
  try {
    const res = await bot.getGroupNotice(groupId.value)
    notices.value = res.map(parseNotice).sort((a: any, b: any) => (b.is_top - a.is_top) || (b.publish_time - a.publish_time))
  } catch (e) {
    toast.add({ severity: 'error', summary: '加载失败', detail:String(e), life: 3000 })
  }
}

// 打开弹窗
const openDialog = (item?: any) => {
  editingId.value = item?.id || null
  form.content = item?.text || ''
  form.imgPreview = item?.image?.url || ''
  Object.assign(form, { pinned: !!item?.is_top, confirm: !!item?.confirm_required, popup: false })
  ui.dialog = true
}

// 处理图片选择
const handleFile = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const r = new FileReader(); r.onload = (ev) => form.imgPreview = ev.target?.result as string; r.readAsDataURL(file)
  ;(e.target as HTMLInputElement).value = ''
}

// 提交公告
const submit = async () => {
  if (!form.content.trim()) return
  ui.loading = true
  try {
    if (editingId.value) await bot.delGroupNotice(groupId.value, editingId.value)
    await new Promise(r => setTimeout(r, 500))
    await bot.sendGroupNotice(
      groupId.value,
      form.content,
      form.imgPreview || undefined,
      form.pinned ? 1 : 0,
      form.confirm ? 1 : 0,
      form.popup ? 1 : 0
    )
    ui.dialog = false
    loadNotices()
  } catch (e) {
    toast.add({ severity: 'error', summary: '发布失败', detail: String(e), life: 3000 })
  }
  finally {
    ui.loading = false
  }
}

// 删除公告
const remove = (item: any) => {
  confirm.require({
    message: '确定要删除这条公告吗？', header: '删除公告', icon: 'i-ri-delete-bin-fill text-red-500', acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        await bot.delGroupNotice(groupId.value, item.id)
        const idx = notices.value.findIndex(n => n.id === item.id)
        if (idx > -1) notices.value.splice(idx, 1)
      } catch (e) {
        toast.add({ severity: 'error', summary: '删除失败', detail: String(e), life: 3000 })
      }
    }
  })
}

// 初始化
onMounted(() => {
  if (groupId.value) loadNotices()
})
</script>
