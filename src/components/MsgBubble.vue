<template>
  <!-- 系统提示消息 -->
  <div v-if="isSystem" class="ui-flex-center my-1 w-full select-none">
    <div class="bg-background-dim/20 ui-text-foreground-dim text-[11px] px-3 py-0.5 rounded-full">
      {{ systemPreviewText }}
    </div>
  </div>

  <!-- 常规消息容器 -->
  <div
    v-else
    :id="'msg-' + msg.message_id"
    class="flex gap-2.5 w-full group/row relative box-border transition-all duration-200"
    :class="[isMe ? 'flex-row-reverse' : 'flex-row', { 'opacity-60': selectionMode && !isSelected }]"
    @contextmenu.prevent="emit('contextmenu', $event, msg)"
    @click="onBubbleClick"
  >
    <!-- 多选勾选框 -->
    <div v-if="selectionMode" class="ui-flex-center px-1">
      <div
        class="w-5 h-5 rounded-full border-2 ui-border-background-dim ui-flex-center ui-trans ui-dur-fast"
        :class="isSelected ? 'bg-primary border-primary' : 'bg-transparent'"
      >
        <div v-if="isSelected" class="i-ri-check-line text-primary-content text-xs" />
      </div>
    </div>

    <!-- 头像 -->
    <div class="shrink-0 flex flex-col justify-start pt-0.5">
      <Avatar
        shape="circle"
        :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${msg.sender.user_id}`"
        class="!w-9 !h-9 cursor-pointer hover:scale-105 active:scale-95 ui-trans ui-dur-fast select-none bg-background-sub shadow-sm border border-background-dim/30"
        @dblclick="emit('poke', msg.sender.user_id)"
      />
    </div>

    <!-- 消息主体 -->
    <div class="flex flex-col max-w-[75%] md:max-w-[65%] min-w-[60px]" :class="isMe ? 'items-end' : 'items-start'">
      <!-- 发送者昵称与角色 (他人) -->
      <div v-if="!isMe" class="ui-flex-x gap-1.5 mb-1 ml-1 select-none leading-none">
        <span class="text-xs text-foreground-sub/80">{{ msg.sender.card || msg.sender.nickname }}</span>
        <span v-if="msg.sender.role === 'owner'" class="text-[10px] px-1 rounded-sm bg-yellow-100 text-yellow-600 font-bold opacity-90">群主</span>
        <span v-if="msg.sender.role === 'admin'" class="text-[10px] px-1 rounded-sm bg-green-100 text-green-600 font-bold opacity-90">管理</span>
        <!-- 撤回提示 (右侧) -->
        <span v-if="isRecalled" class="text-[10px] ui-text-foreground-dim flex items-center gap-0.5 ml-2">
          <div class="i-ri-arrow-go-back-line text-[10px]" />
          已撤回
        </span>
      </div>

      <!-- 气泡容器 (统一处理圆角和阴影) -->
      <div
        class="relative shadow-sm ui-trans ui-dur-fast flex flex-col overflow-hidden bg-transparent"
        :class="[
          isMe ? 'rounded-[18px] rounded-tr-sm' : 'rounded-[18px] rounded-tl-sm',
          selectionMode ? 'cursor-default' : ''
        ]"
      >
        <!-- 引用回复 (置顶) -->
        <div
          v-if="replyDetail"
          class="px-3.5 py-2 text-xs flex flex-col gap-0.5 select-none cursor-pointer border-b backdrop-blur-sm transition-colors relative z-10"
          :class="isMe ? 'bg-primary-dark/10 border-white/10 text-white/90 hover:bg-primary-dark/20' : 'bg-black/5 dark:bg-white/5 border-black/5 text-foreground-sub hover:bg-black/10'"
          @click.stop="scrollToMsg(replyDetail.id)"
        >
           <div class="flex items-center gap-1 font-bold" :class="isMe ? 'text-white' : 'text-primary'">
             <div class="i-ri-reply-fill text-xs" />
             <span>{{ replyDetail.sender }}</span>
           </div>
           <span class="truncate max-w-[200px] opacity-80">{{ replyDetail.text }}</span>
        </div>

        <!-- 内容分块渲染 -->
        <div class="flex flex-col items-start w-full">
          <template v-for="(group, gIdx) in groupedSegments" :key="gIdx">

            <!-- 类型A：内联组 (文本/表情/At) -> 应用气泡背景色和Padding -->
            <div
              v-if="group.type === 'inline'"
              class="px-3.5 py-2.5 break-words leading-relaxed text-[15px] max-w-full flex flex-wrap items-end gap-1 w-full"
              :class="isMe ? 'bg-primary text-white' : 'bg-white dark:bg-[#2A2A2A] text-foreground-main'"
              style="word-break: break-word;"
            >
              <template v-for="(seg, sIdx) in group.segments" :key="sIdx">
                <component
                  v-if="forceMarkdown && seg.type === 'text'"
                  :is="getElementComponent('markdown')"
                  :segment="{ type: 'markdown', data: { content: seg.data.text } }"
                />
                <component
                  v-else
                  :is="getElementComponent(seg.type)"
                  :segment="seg"
                />
              </template>
            </div>

            <!-- 类型B：块级组 (图片/视频/卡片等) -> 无Padding，占满宽度 -->
            <div
              v-else
              class="w-full"
              :class="[
                /* 给部分透明背景的块级元素加个底色，防止看不清 */
                ['record', 'file'].includes(group.segments[0].type) && (isMe ? 'bg-primary text-white' : 'bg-white dark:bg-[#2A2A2A] text-foreground-main')
              ]"
            >
              <component
                :is="getElementComponent(group.segments[0].type)"
                :segment="group.segments[0]"
                class="!my-0 !rounded-none !max-w-full block"
              />
            </div>

          </template>
        </div>

        <!-- 多选模式下的点击遮罩 (修复无法多选的问题) -->
        <div v-if="selectionMode" class="absolute inset-0 z-50 cursor-pointer bg-transparent" />
      </div>

      <!-- 我发送的消息的撤回提示 (下方) -->
      <div v-if="isMe && isRecalled" class="text-[10px] ui-text-foreground-dim mt-1 flex justify-end items-center gap-1 mr-1">
        <div class="i-ri-arrow-go-back-line" />
        已撤回
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Avatar from 'primevue/avatar'
import { useSettingStore } from '@/stores/setting'
import { useMessageStore } from '@/stores/message'
import { getTextPreview } from '@/utils/format'
import { getElementComponent } from './elements'
import type { Message, Segment } from '@/types'

const settingStore = useSettingStore()
const messageStore = useMessageStore()

const props = defineProps<{
  msg: Message
  selectionMode?: boolean
  isSelected?: boolean
  forceMarkdown?: boolean
}>()

const emit = defineEmits<{
  (e: 'contextmenu', ev: MouseEvent, msg: Message): void
  (e: 'poke', uid: number): void
  (e: 'select', msgId: number): void
}>()

// 判断角色
const isMe = computed(() => props.msg.sender.user_id === settingStore.user?.user_id)
const isSystem = computed(() => props.msg.sender.user_id === 10000)
const isRecalled = computed(() => !!(props.msg as any).recalled)

// 系统消息预览文本
const systemPreviewText = computed(() => {
  if (!isSystem.value) return ''
  return getTextPreview(props.msg.message)
})

// 解析引用回复详情
const replyDetail = computed(() => {
  const replySeg = props.msg.message.find(s => s.type === 'reply')
  if (!replySeg || !replySeg.data.id) return null

  const idStr = String(replySeg.data.id)
  const found = messageStore.messages.find(m => String(m.message_id) === idStr)

  if (parseInt(idStr) < 0) {
     return { id: idStr, sender: '我', text: found ? getTextPreview(found.message) : '[本地消息]' }
  }

  return {
    id: idStr,
    sender: found?.sender.card || found?.sender.nickname || '未知用户',
    text: found ? getTextPreview(found.message) : '引用消息'
  }
})

// 滚动到引用消息
const scrollToMsg = (id: string | null) => {
    if (!id) return
    const el = document.getElementById(`msg-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// 交互
const onBubbleClick = () => {
  if (props.selectionMode) {
    if (settingStore.config.debugMode) console.log('[MsgBubble] Clicked', props.msg.message_id)
    emit('select', props.msg.message_id)
  }
}

/**
 * 消息分段逻辑
 * 将 Text/At/Face 归为 Inline 组（有背景色/Padding）
 * 其他（图片/视频/卡片）归为 Block 组（无 Padding，占满）
 */
interface SegmentGroup {
  type: 'inline' | 'block'
  segments: Segment[]
}

const groupedSegments = computed<SegmentGroup[]>(() => {
  const groups: SegmentGroup[] = []
  let currentInline: Segment[] = []

  // 定义内联元素类型（保留气泡样式的）
  const inlineTypes = ['text', 'at', 'face', 'unknown']
  // Markdown 特殊处理：如果强制开启或者是文本，视为内联以获得背景色；这里简化处理，视具体需求调整

  const flushInline = () => {
    if (currentInline.length > 0) {
      groups.push({ type: 'inline', segments: [...currentInline] })
      currentInline = []
    }
  }

  props.msg.message.forEach(seg => {
    if (seg.type === 'reply') return // 引用已单独处理

    // 判断是否为内联元素
    const isInline = inlineTypes.includes(seg.type)

    if (isInline) {
      currentInline.push(seg)
    } else {
      // 遇到块级元素，先结算之前的内联元素
      flushInline()
      // 块级元素单独成组
      groups.push({ type: 'block', segments: [seg] })
    }
  })

  flushInline()
  return groups
})
</script>
