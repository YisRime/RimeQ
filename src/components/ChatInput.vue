<template>
  <div class="relative flex flex-col shrink-0 z-20 bg-transparent border-t border-border/10">
    <!-- 表情面板 -->
    <div
      v-if="activeTab"
      ref="panelRef"
      class="absolute bottom-full left-0 mb-2 ml-2 z-50 origin-bottom-left"
      v-motion
      :initial="{ opacity: 0, y: 20, scale: 0.95 }"
      :enter="{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }"
      :leave="{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 150 } }"
    >
      <div class="w-80 h-64 flex flex-col overflow-hidden rounded-2xl shadow-2xl border border-border/20 backdrop-blur-2xl backdrop-saturate-150 bg-background-sub/80">
        <div class="flex-1 overflow-y-auto ui-scrollbar p-2">
          <div class="flex flex-col gap-1">
            <!-- 普通表情 -->
            <template v-if="activeTab === 'face'">
              <div class="grid grid-cols-8 gap-1">
                <div
                  v-for="item in QFace.getList('face')"
                  :key="item.id"
                  class="aspect-square rounded cursor-pointer ui-trans hover:bg-background-sub/50"
                  :title="item.name"
                  @click="insertImage(item.assets.static); focus()"
                >
                  <img :src="item.assets.static" class="size-full object-contain pointer-events-none" loading="lazy" />
                </div>
              </div>
              <div class="ui-flex-x gap-1 px-1 py-1 opacity-60">
                <div class="h-px bg-background-dim flex-1" />
                <span class="text-[10px] text-foreground-dim font-bold uppercase tracking-wider">Emoji</span>
                <div class="h-px bg-background-dim flex-1" />
              </div>
              <div class="grid grid-cols-8 gap-1">
                <div
                  v-for="item in QFace.getList('emoji')"
                  :key="item.id"
                  class="aspect-square rounded ui-flex-center text-xl cursor-pointer ui-trans hover:bg-background-sub/50"
                  :title="item.name"
                  @click="insertText(item.id); focus()"
                >
                  {{ item.id }}
                </div>
              </div>
            </template>
            <!-- 超级表情 -->
            <template v-else-if="activeTab === 'super'">
              <template v-for="group in superGroups" :key="group.id">
                <div class="flex flex-col gap-1">
                  <div class="ui-flex-x gap-1 px-1 py-1 opacity-60">
                    <div class="h-px bg-background-dim flex-1" />
                    <span class="text-[10px] text-foreground-dim font-bold uppercase tracking-wider">{{ group.name }}</span>
                    <div class="h-px bg-background-dim flex-1" />
                  </div>
                  <div class="grid grid-cols-5 gap-1">
                    <div
                      v-for="item in group.items"
                      :key="item.id"
                      class="relative aspect-square p-1.5 rounded-xl cursor-pointer ui-trans hover:bg-background-sub/50"
                      :title="item.name"
                      @mouseenter="loadLottie(item.id, item.assets.lottie)"
                      @mouseleave="unloadLottie(item.id)"
                      @click="handleFace(item)"
                    >
                      <img v-show="hoveringId !== item.id" :src="item.assets.static" class="size-full object-contain pointer-events-none" loading="lazy" />
                      <div v-show="hoveringId === item.id" :ref="el => el ? lottieRefs.set(item.id, el as HTMLElement) : lottieRefs.delete(item.id)" class="size-full pointer-events-none" />
                    </div>
                  </div>
                </div>
              </template>
            </template>
            <!-- 收藏表情 -->
            <template v-else-if="activeTab === 'collection'">
              <div v-if="collections.length" class="grid grid-cols-5 gap-1">
                <div
                  v-for="(url, idx) in collections"
                  :key="idx"
                  class="aspect-square p-1.5 rounded-xl cursor-pointer ui-trans hover:bg-background-sub/50 overflow-hidden"
                  @click="insertImage(url); focus()"
                >
                  <img :src="url" class="size-full object-contain pointer-events-none" loading="lazy" referrerpolicy="no-referrer" />
                </div>
              </div>
              <div v-else class="h-56 ui-flex-y gap-2 text-foreground-dim opacity-60">
                <div class="i-ri-star-smile-line text-4xl" />
                <span class="text-xs">暂无收藏</span>
              </div>
            </template>
            <!-- 本地表情 -->
            <template v-else-if="activeTab === 'local'">
              <div v-if="localFiles.length" class="grid grid-cols-5 gap-1">
                <div
                  v-for="(item, idx) in localFiles"
                  :key="idx"
                  class="aspect-square p-1.5 rounded-xl cursor-pointer ui-trans hover:bg-background-sub/50 overflow-hidden"
                  :title="item.file.name"
                  @click="handleUpload('img', item.file)"
                >
                  <img :src="item.url" class="size-full object-contain pointer-events-none" loading="lazy" />
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </div>
    <!-- 转发面板 -->
    <div
      v-if="isForwarding && isMultiSelect"
      class="absolute bottom-full left-0 right-0 mx-auto w-[550px] h-[520px] mb-2 origin-bottom"
      v-motion
      :initial="{ opacity: 0, y: 20, scale: 0.95 }"
      :enter="{ opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }"
      :leave="{ opacity: 0, y: 20, scale: 0.95, transition: { duration: 150 } }"
    >
      <div class="flex flex-col h-full overflow-hidden rounded-2xl shadow-2xl border border-border/20 backdrop-blur-2xl backdrop-saturate-150 bg-background-sub/80">
         <ForwardSelect/>
      </div>
    </div>
    <!-- 工具栏 -->
    <div ref="toolbarRef" class="ui-flex-between px-3 pt-2 pb-1 gap-2 select-none">
      <!-- 左侧按钮 -->
      <div class="ui-flex-x gap-1.5">
        <Button
          v-for="btn in leftButtons"
          :key="btn.id"
          v-tooltip.top="btn.tip"
          :icon="btn.icon"
          rounded text
          class="!w-8 !h-8 !p-0 !border-none ui-trans hover:!bg-background-sub/50 active:scale-95"
          :class="activeTab === btn.id ? '!bg-primary !text-primary-content shadow-sm' : '!text-foreground-sub hover:!text-foreground-main'"
          @click="toggleTab(btn.id)"
        />
        <div class="w-px h-4 bg-border mx-1 opacity-50"></div>
        <Button icon="i-ri-image-line text-lg" rounded text class="!w-8 !h-8 !p-0 !border-none !text-foreground-sub hover:!bg-background-sub/50 hover:!text-foreground-main ui-trans active:scale-95" @click="imgInput?.click()" />
        <Button icon="i-ri-file-line text-lg" rounded text class="!w-8 !h-8 !p-0 !border-none !text-foreground-sub hover:!bg-background-sub/50 hover:!text-foreground-main ui-trans active:scale-95" @click="fileInput?.click()" />
      </div>
      <!-- 右侧按钮 -->
      <div class="ui-flex-x gap-2">
        <div
          v-if="isMultiSelect"
          class="ui-flex-x gap-2 max-w-[200px]"
          v-motion
          :initial="{ opacity: 0, scale: 0.9 }"
          :enter="{ opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } }"
          :leave="{ opacity: 0, scale: 0.9, transition: { duration: 150 } }"
        >
          <div
            v-tooltip.top="'选择目标'"
            class="h-7 px-3 rounded-full bg-primary text-primary-content text-xs font-bold ui-flex-center gap-2 shadow-sm whitespace-nowrap cursor-pointer hover:bg-primary-hover ui-trans"
            @click="isForwarding = !isForwarding"
          >
            <div class="i-ri-check-double-line" />
            <span>已选 {{ messageStore.selectedIds.length }}</span>
            <div :class="isForwarding ? 'i-ri-arrow-down-s-line' : 'i-ri-arrow-up-s-line'" class="text-xs opacity-80" />
          </div>
          <Button v-tooltip.top="'退出'" icon="i-ri-close-line text-lg" text rounded class="!w-7 !h-7 shrink-0 !border-none !text-foreground-sub hover:!text-primary hover:!bg-background-sub/30" @click="messageStore.setMultiSelect(); isForwarding = false" />
        </div>
        <Button
          :icon="isExpanded ? 'i-ri-contract-up-down-line text-lg' : 'i-ri-expand-up-down-line text-lg'"
          text rounded
          class="!w-8 !h-8 !p-0 shrink-0 ui-trans active:scale-95"
          :class="isExpanded ? '!text-primary !bg-primary/10' : '!text-foreground-sub hover:!bg-background-sub/50 hover:!text-foreground-main'"
          @click="isExpanded = !isExpanded"
        />
      </div>
    </div>
    <!-- 输入框 -->
    <div class="px-3 pb-3">
      <div
        class="relative w-full flex flex-col rounded-2xl overflow-hidden ui-trans bg-background-sub/20 border border-transparent focus-within:bg-background-sub/80 focus-within:shadow-[0_0_0_2px_var(--primary-active)] focus-within:border-primary/20"
        :class="isExpanded ? 'h-[50vh]' : 'h-auto min-h-[48px] max-h-[160px]'"
        @click="focus"
        @keydown.backspace="!editor?.getText() && messageStore.replyTarget && messageStore.setReplyTarget(null)"
      >
        <div
          v-if="messageStore.replyTarget"
          class="mx-1.5 mt-2 px-3 py-1.5 rounded-lg border border-border/10 bg-background-sub/40 ui-flex-between shrink-0 select-none"
          v-motion
          :initial="{ opacity: 0, y: -10, height: 0, marginBottom: 0 }"
          :enter="{ opacity: 1, y: 0, height: 'auto', marginBottom: 8, transition: { type: 'spring', stiffness: 300, damping: 30 } }"
          :leave="{ opacity: 0, y: -10, height: 0, marginBottom: 0, transition: { duration: 200 } }"
        >
          <div class="ui-flex-x gap-2 overflow-hidden pr-2 text-xs">
            <div class="w-1 h-3 rounded-full bg-primary shrink-0" />
            <div class="ui-flex-truncate">
              <span class="text-foreground-sub">回复 </span>
              <span class="font-bold text-foreground-main">{{ messageStore.replyTarget.sender.nickname }}</span>
              <span class="opacity-60 ml-1 truncate">{{ getTextPreview(messageStore.replyTarget.message, messageStore.replyTarget.group_id) }}</span>
            </div>
          </div>
          <div class="i-ri-close-line text-sm cursor-pointer text-foreground-dim hover:text-primary ui-trans" @click.stop="messageStore.setReplyTarget(null)" />
        </div>
        <editor-content
          :editor="editor"
          class="chat-editor flex-1 w-full px-4 py-3 pr-12 text-sm leading-6 text-foreground-main caret-primary ui-scrollbar overflow-y-auto flex flex-col justify-center placeholder:text-foreground-dim"
        />
        <!-- 发送按钮 -->
        <div class="absolute bottom-1.5 right-1.5 z-10">
          <div v-if="isMultiSelect" class="flex items-center gap-2">
            <Button v-tooltip.top="'逐条转发'" icon="i-ri-chat-forward-line text-lg" rounded class="!w-8 !h-8 !border-none shadow-sm ui-trans active:scale-95" :class="(!messageStore.selectedIds.length || !messageStore.forwardTargets.length) ? '!bg-background-dim !text-foreground-dim cursor-not-allowed' : '!bg-primary !text-primary-content hover:!bg-primary-hover shadow-primary/30'" :disabled="!messageStore.selectedIds.length || !messageStore.forwardTargets.length" @click.stop="executeForward('single')" />
            <Button v-tooltip.top="'合并转发'" icon="i-ri-share-forward-fill text-lg" rounded class="!w-8 !h-8 !border-none shadow-sm ui-trans active:scale-95" :class="(!messageStore.selectedIds.length || !messageStore.forwardTargets.length) ? '!bg-background-dim !text-foreground-dim cursor-not-allowed' : '!bg-primary !text-primary-content hover:!bg-primary-hover shadow-primary/30'" :disabled="!messageStore.selectedIds.length || !messageStore.forwardTargets.length" @click.stop="executeForward('merge')" />
          </div>
          <Button v-else icon="i-ri-send-plane-fill text-lg" rounded class="!w-9 !h-9 !border-none shadow-sm ui-trans active:scale-95 transition-all" :class="isEmpty ? '!bg-background-dim !text-foreground-dim cursor-not-allowed opacity-50' : '!bg-primary !text-primary-content hover:!bg-primary-hover shadow-primary/30'" :disabled="isEmpty" @click.stop="executeSend" />
        </div>
      </div>
    </div>
    <input ref="imgInput" type="file" accept="image/*" class="hidden" @change="e => handleUpload('img', e)">
    <input ref="fileInput" type="file" class="hidden" @change="e => handleUpload('file', e)">
    <!-- 表情弹窗 -->
    <Dialog v-model:visible="gameDialog.visible" modal dismissable-mask :header="'选择结果'" :style="{ width: 'auto' }">
        <div class="flex gap-2 justify-center">
        <template v-if="gameDialog.type === 'dice'">
          <Button v-for="i in 6" :key="i" :label="String(i)" severity="secondary" outlined class="!w-9 !h-9 !p-0 !rounded-xl !border-border hover:!border-primary hover:!bg-primary/5 transition-all font-bold" @click="postSegment([{ type: 'dice', data: { result: i } }])" />
        </template>
        <template v-else>
           <Button v-for="opt in [{v:1, l:'布', i:'🖐'}, {v:2, l:'剪刀', i:'✌'}, {v:3, l:'石头', i:'✊'}]" :key="opt.v" severity="secondary" outlined class="!px-2.5 !py-1.5 !h-auto flex-col gap-0.5 !rounded-xl !border-border hover:!border-primary hover:!bg-primary/5 transition-all min-w-[3.5rem]" @click="postSegment([{ type: 'rps', data: { result: opt.v } }])">
            <div class="text-lg leading-none filter drop-shadow-sm">{{ opt.i }}</div>
            <span class="text-[10px] font-bold opacity-80">{{ opt.l }}</span>
          </Button>
        </template>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onBeforeUnmount, reactive, shallowRef } from 'vue'
import { Button, useToast, Dialog } from 'primevue'
import { EditorContent } from '@tiptap/vue-3'
import { onClickOutside } from '@vueuse/core'
import type { AnimationItem } from 'lottie-web'
import { bot } from '@/api'
import { useMessageStore, useSettingStore, useSessionStore, useContactStore } from '@/stores'
import { useChatEditor } from '@/utils/editor'
import { QFace } from '@/utils/qface'
import { getTextPreview } from '@/utils/format'
import { uploadFile, uploadMedia } from '@/utils/file'
import { SegType, type Segment, type NodeSegment } from '@/types'
import ForwardSelect from './ForwardSelect.vue'

defineOptions({ name: 'ChatInput' })

const props = defineProps<{ chatId: number; isGroup: boolean }>()
const emit = defineEmits<{ (e: 'send'): void }>()

// 全局 Hooks
const toast = useToast()
const messageStore = useMessageStore()
const settingStore = useSettingStore()
const sessionStore = useSessionStore()
const contactStore = useContactStore()

// UI 界面状态
const activeTab = ref<string | null>(null)
const isExpanded = ref(false)
const isForwarding = ref(false)
const hoveringId = ref<string | null>(null)
const imgInput = ref<HTMLInputElement>()
const fileInput = ref<HTMLInputElement>()
const panelRef = ref<HTMLElement>()
const toolbarRef = ref<HTMLElement>()

// 表情逻辑状态
const gameDialog = reactive({ visible: false, type: 'dice' as 'dice' | 'rps' })
const collections = ref<string[]>([])
const localFiles = shallowRef<{ file: File, url: string }[]>([])

// Lottie 资源管理
const lottieMap = new Map<string, AnimationItem>()
const lottieRefs = new Map<string, HTMLElement>()
const lottieCache = new Map<string, any>()
const loadingSet = new Set<string>()

// 点击外部关闭
onClickOutside(panelRef, () => activeTab.value = null, { ignore: [toolbarRef] })

// 计算属性
const isMultiSelect = computed(() => messageStore.isMultiSelect)
const isEmpty = computed(() => !editor.value || editor.value.isEmpty)

const superFaceGroups = [
  { id: 0, name: '特殊' }, { id: 1, name: '黄脸' }, { id: 2, name: '旺旺' },
  { id: 3, name: '喜花妮' }, { id: 4, name: '黄脸' }, { id: 5, name: '企鹅' }, { id: 6, name: '噗噗星人' }
]

// 预计算超级表情
const superGroups = computed(() =>
  superFaceGroups
    .map(g => ({ ...g, items: QFace.getList('super').filter(i => i.packId === g.id) }))
    .filter(g => g.items.length > 0)
)

const leftButtons = [
  { id: 'face', icon: 'i-ri-emotion-line text-lg', tip: '普通表情' },
  { id: 'super', icon: 'i-ri-user-smile-line text-lg', tip: '超级表情' },
  { id: 'collection', icon: 'i-ri-star-smile-line text-lg', tip: '收藏表情' },
  { id: 'local', icon: 'i-ri-folder-image-line text-lg', tip: '本地表情' }
]

// 编辑器初始化
const { editor, focus, insertText, insertImage, insertMention, clear, getSegments } = useChatEditor({
  currentId: computed(() => String(props.chatId)),
  isGroup: computed(() => props.isGroup),
  onSend: executeSend,
  onFile: (f) => {
    const dt = new DataTransfer()
    dt.items.add(f)
    const e = { target: { files: dt.files, value: '' } } as unknown as Event
    handleUpload('file', e)
  }
})

// 暴露方法
defineExpose({ insertText, insertMention, focus })

// 切换面板
async function toggleTab(id: string) {
  if (activeTab.value === id) {
    activeTab.value = null
    return
  }
  activeTab.value = id
  if (id === 'local' && localFiles.value.length === 0) chooseLocalFolder()
  if (id === 'collection') if (collections.value.length === 0) collections.value = await bot.fetchCustomFace(1000)
}

// 发送消息
async function postSegment(segments: any[]) {
  gameDialog.visible = false
  try {
    await bot.sendMsg(props.isGroup ? 'group' : 'private', props.chatId, segments)
    emit('send')
  } catch (e) {
    toast.add({ severity: 'error', summary: '发送失败', detail: String(e), life: 3000 })
  }
}

// 处理表情点击
function handleFace(item: any) {
  activeTab.value = null
  if ((item.id === '358' || item.id === '359') && settingStore.config.enableCustomFace) {
    gameDialog.type = item.id === '358' ? 'dice' : 'rps'
    gameDialog.visible = true
    return
  }
  const type = item.id === '358' ? 'dice' : item.id === '359' ? 'rps' : 'face'
  const data = (item.id === '358' || item.id === '359')
    ? { result: Math.floor(Math.random() * (item.id === '358' ? 6 : 3)) + 1 } : { id: item.id }
  postSegment([{ type, data }])
}

// 选择本地文件夹
async function chooseLocalFolder() {
  // @ts-ignore showDirectoryPicker 无类型定义
  const dirHandle = await window.showDirectoryPicker()
  localFiles.value.forEach(i => URL.revokeObjectURL(i.url))
  const list: { file: File, url: string }[] = []
  const imageRegex = /\.(jpg|jpeg|png|gif|webp|bmp)$/i
  for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file' && imageRegex.test(entry.name)) {
        const file = await entry.getFile()
        list.push({ file, url: URL.createObjectURL(file) })
      }
  }
  localFiles.value = list
}

// 文件上传 / 图片插入
async function handleUpload(type: 'img' | 'file', payload: Event | File) {
  const file = payload instanceof Event ? (payload.target as HTMLInputElement).files?.[0] : payload
  if (!file) return
  if (payload instanceof Event) (payload.target as HTMLInputElement).value = ''
  try {
    if (type === 'img') {
      const fileUrl = await uploadMedia(file)
      insertImage(fileUrl)
      focus()
    } else {
      await uploadFile(props.isGroup ? 'group' : 'private', props.chatId, file)
      toast.add({ severity: 'success', summary: '上传成功', life: 3000 })
      emit('send')
    }
  } catch (err) {
    toast.add({ severity: 'error', summary: '上传失败', detail: err, life: 3000 })
  }
}

// Lottie 动画加载
async function loadLottie(id: string, url?: string) {
  if (!url) return
  hoveringId.value = id
  if (lottieMap.has(id) || loadingSet.has(id)) return
  loadingSet.add(id)
  try {
    const [lottie, animationData] = await Promise.all([
      import('lottie-web').then(m => m.default),
      lottieCache.get(id) || fetch(url).then(r => r.json()).then(data => lottieCache.set(id, data).get(id))
    ])
    if (hoveringId.value !== id) return
    const container = lottieRefs.get(id)
    if (container) {
      container.innerHTML = ''
      const anim = lottie.loadAnimation({ container, renderer: 'svg', loop: true, autoplay: true, animationData })
      lottieMap.set(id, anim)
    }
  } catch { /* 忽略错误 */ }
  finally {
    loadingSet.delete(id)
  }
}

// Lottie 动画卸载
function unloadLottie(id: string) {
  hoveringId.value = null
  const anim = lottieMap.get(id)
  if (anim) {
    anim.destroy()
    lottieMap.delete(id)
  }
}

// 执行转发
const executeForward = async (mode: 'merge' | 'single') => {
  const targetIds = messageStore.forwardTargets
  const messageIds = messageStore.selectedIds
  if (!targetIds.length || !messageIds.length) return
  try {
    const targetMsgs = messageStore.messages.filter((m) => messageIds.includes(m.message_id))
    if (mode === 'merge') {
      // 合并转发
      const nodes: Segment[] = targetMsgs.map((m) => ({
        type: 'node', data: { nickname: m.sender.nickname, user_id: m.sender.user_id, content: m.message }
      } as NodeSegment))
      await Promise.all(targetIds.map(async (targetId) => {
        const session = sessionStore.getSession(targetId)
        const isGroup = session?.type === 'group' || contactStore.checkIsGroup(targetId)
        if (isGroup) await bot.sendGroupForwardMsg(targetId, nodes)
        else await bot.sendPrivateForwardMsg(targetId, nodes)
      }))
    } else {
      // 逐条转发
      for (const msg of targetMsgs) {
        for (const targetIdStr of targetIds) {
          const targetId = Number(targetIdStr)
          const session = sessionStore.getSession(targetIdStr)
          const isGroup = session?.type === 'group' || contactStore.checkIsGroup(targetIdStr)
          await bot.forwardSingleMsg(isGroup ? 'group' : 'private', targetId, msg.message_id)
          await new Promise(r => setTimeout(r, 200))
        }
      }
    }
    messageStore.setMultiSelect()
    isForwarding.value = false
  } catch (e) {
    toast.add({ severity: 'error', summary: '转发失败', detail: e, life: 3000 })
  }
}

// 发送消息
async function executeSend() {
  if (isEmpty.value) return
  const segments = getSegments()
  // 添加回复节点
  if (messageStore.replyTarget) {
    segments.unshift({
      type: SegType.Reply,
      data: { id: String(messageStore.replyTarget.message_id) }
    })
  }
  if (!segments.length) return
  // 重置界面状态
  clear()
  messageStore.setReplyTarget(null)
  isExpanded.value = false
  // 发送消息
  await postSegment(segments)
  nextTick(focus)
}

// 引用变化自动聚焦
watch(() => messageStore.replyTarget, (target) => {
  if (target) focus()
})

// 多选模式重置状态
watch(isMultiSelect, (val) => {
  if (val) {
    activeTab.value = null
    isExpanded.value = false
  } else {
    isForwarding.value = false
  }
})

// 会话切换重置状态
watch(() => props.chatId, () => {
  isExpanded.value = false
  activeTab.value = null
  isForwarding.value = false
  messageStore.setReplyTarget(null)
})

// 清理资源
onBeforeUnmount(() => {
  lottieMap.forEach(anim => anim.destroy())
  lottieMap.clear()
  lottieRefs.clear()
  lottieCache.clear()
  loadingSet.clear()
  localFiles.value.forEach(i => URL.revokeObjectURL(i.url))
  localFiles.value = []
  editor.value?.destroy()
})
</script>

<style lang="scss">
/* Tiptap 编辑器 */
.chat-editor {
  .ProseMirror {
    outline: none;
    min-height: 24px;
    p { margin: 0; }
    /* 插入图片样式 */
    img {
      display: inline-block;
      max-width: 100%;
      max-height: 80px;
      object-fit: contain;
      border-radius: 8px;
      margin: 2px 0;
      vertical-align: bottom;
      /* 图片选中样式 */
      &.ProseMirror-selectednode {
        outline: 2px solid var(--primary-color);
      }
    }
    /* 提及 (@) 样式 */
    .mention {
      color: var(--primary-color);
      background-color: var(--primary-soft);
      border-radius: 4px;
      padding: 1px 4px;
      font-weight: 500;
    }
    /* 占位符样式 */
    p.is-editor-empty:first-child::before {
      content: attr(data-placeholder);
      float: left;
      color: var(--text-dim);
      pointer-events: none;
      height: 0;
    }
  }
}
</style>
