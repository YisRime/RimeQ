<template>
  <!-- 系统提示 -->
  <div v-if="isSystem" class="ui-flex-center w-full py-2 select-none">
    <div class="ui-bg-background-dim/30 ui-text-foreground-dim text-xs px-3 py-1 rounded-full backdrop-blur-sm">
      {{ systemPreview }}
    </div>
  </div>
  <!-- 常规消息 -->
  <div
    v-else
    :id="`msg-${msg.message_id}`"
    class="flex w-full mb-3 gap-3 relative group transition-opacity duration-200"
    :class="[
      isMe ? 'flex-row-reverse' : 'flex-row',
      selectionMode && !isSelected ? 'opacity-50' : 'opacity-100'
    ]"
    @contextmenu.prevent="emit('contextmenu', $event, msg)"
    @click="onBubbleClick"
  >
    <!-- 多选框 -->
    <div v-if="selectionMode" class="ui-flex-center shrink-0">
      <div
        class="size-5 rounded-full border-2 ui-flex-center ui-trans"
        :class="isSelected ? 'bg-primary border-primary' : 'border-background-dim bg-transparent'"
      >
        <div v-if="isSelected" class="i-ri-check-line text-primary-content text-xs" />
      </div>
    </div>
    <!-- 头像 -->
    <Avatar
      shape="circle"
      :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${msg.sender.user_id}`"
      class="size-10 shadow-sm border ui-border-background-dim shrink-0 ui-ia bg-background-sub"
      @dblclick="emit('poke', msg.sender.user_id)"
    />
    <!-- 内容 -->
    <div class="flex flex-col max-w-[75%] md:max-w-[65%] min-w-[60px]" :class="isMe ? 'items-end' : 'items-start'">
      <!-- 用户信息 -->
      <div
        class="ui-flex-x gap-2 mb-1 select-none leading-none"
        :class="isMe ? 'flex-row-reverse mr-1' : 'ml-1'"
      >
        <span class="text-xs font-medium ui-text-foreground-sub">{{ msg.sender.card || msg.sender.nickname }}</span>
        <span v-if="msg.sender.role === 'owner'" class="text-[10px] px-1.5 py-0.5 rounded-sm bg-yellow-500/10 text-yellow-600 font-bold">群主</span>
        <span v-if="msg.sender.role === 'admin'" class="text-[10px] px-1.5 py-0.5 rounded-sm bg-green-500/10 text-green-600 font-bold">管理</span>
        <span v-if="isRecalled" class="text-[10px] ui-text-foreground-dim flex items-center gap-1 bg-background-dim/50 px-1.5 py-0.5 rounded-sm">
          <div class="i-ri-arrow-go-back-line" /> 已撤回
        </span>
      </div>
      <!-- 气泡容器 -->
      <div
        class="relative flex flex-col overflow-hidden rounded-2xl shadow-sm ui-bg-background-sub ui-trans"
        :class="[
          selectionMode ? 'cursor-default' : '',
          (forceMarkdown || showRaw) ? 'rounded-b-none' : ''
        ]"
      >
        <!-- 回复区域 -->
        <div
          v-if="replyDetail"
          class="px-3 py-2 text-xs flex flex-col gap-0.5 select-none cursor-pointer border-b ui-border-background-dim/50 bg-background-dim/30 hover:bg-background-dim/50 ui-trans"
          @click.stop="scrollToMsg(replyDetail.id)"
        >
          <div class="ui-flex-x gap-1.5 font-bold ui-text-foreground-main">
            <div class="i-ri-reply-fill text-primary" />
            <span>{{ replyDetail.sender }}</span>
          </div>
          <span class="truncate max-w-[180px] ui-text-foreground-sub">{{ replyDetail.text }}</span>
        </div>
        <!-- 消息内容 -->
        <div class="w-full px-3 py-2 text-[15px] leading-relaxed ui-text-foreground-main">
          <template v-for="(seg, idx) in msg.message" :key="idx">
            <component
              :is="getElement(seg.type)"
              v-if="seg.type !== 'reply'"
              :segment="seg"
              :group-id="msg.group_id"
              @mention="(item: any) => emit('mention', item)"
            />
          </template>
        </div>
        <!-- 多选遮罩 -->
        <div v-if="selectionMode" class="absolute inset-0 z-10 bg-transparent cursor-pointer" />
      </div>
      <!-- 扩展面板容器 -->
      <div
        v-if="forceMarkdown || showRaw"
        class="w-full bg-background-dim/40 border-t border-background-dim/50 p-3 rounded-b-2xl backdrop-blur-sm relative animate-fade-in flex flex-col gap-3"
      >
        <!-- Markdown -->
        <div v-if="forceMarkdown" class="flex flex-col gap-2">
          <div class="text-[10px] text-primary font-bold uppercase tracking-widest ui-flex-x gap-1 opacity-80 select-none">
            <div class="i-ri-markdown-fill" /> Markdown
          </div>
          <component
            :is="getElement('markdown')"
            v-for="(seg, i) in msg.message"
            v-show="seg.type === 'text'"
            :key="`md-${i}`"
            :segment="{ type: 'markdown', data: { content: seg.data.text } }"
          />
        </div>
        <!-- Raw JSON -->
        <div v-if="showRaw" class="flex flex-col gap-2">
          <div class="text-[10px] text-primary font-bold uppercase tracking-widest ui-flex-x gap-1 opacity-80 select-none">
            <div class="i-ri-code-s-slash-line" /> Raw JSON
          </div>
          <div class="flex flex-col gap-2">
            <component
              :is="getElement('default')"
              v-for="(seg, i) in msg.message"
              :key="`raw-${i}`"
              :segment="seg"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Avatar } from 'primevue'
import { useSettingStore, useMessageStore } from '@/stores'
import { getTextPreview } from '@/utils/format'
import { getElement } from './elements'
import type { Message } from '@/types'

const settingStore = useSettingStore()
const messageStore = useMessageStore()

const props = defineProps<{
  msg: Message
  selectionMode?: boolean
  isSelected?: boolean
  forceMarkdown?: boolean
  showRaw?: boolean
}>()

const emit = defineEmits<{
  (e: 'contextmenu', ev: MouseEvent, msg: Message): void
  (e: 'poke', uid: number): void
  (e: 'select', msgId: number): void
  (e: 'mention', item: { id: string; name: string }): void
}>()

// UI 状态
const isMe = computed(() => props.msg.sender.user_id === settingStore.user?.user_id) // 是否当前用户
const isSystem = computed(() => props.msg.sender.user_id === 10000) // 是否系统通知
const isRecalled = computed(() => !!(props.msg as any).recalled) // 是否已被撤回

const systemPreview = computed(() => isSystem.value ? getTextPreview(props.msg.message, props.msg.group_id) : '') // 系统消息预览

// 引用消息详情
const replyDetail = computed(() => {
  const replySeg = props.msg.message.find(s => s.type === 'reply')
  if (!replySeg?.data?.id) return null
  const idStr = String(replySeg.data.id)
  const found = messageStore.messages.find(m => String(m.message_id) === idStr)

  return {
    id: idStr,
    sender: found?.sender.card || found?.sender.nickname || '未知用户',
    text: found ? getTextPreview(found.message, found.group_id) : '未知内容'
  }
})

// 引用消息跳转
const scrollToMsg = (id: string | null) => {
  if (!id) return
  const el = document.getElementById(`msg-${id}`)
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// 气泡点击事件
const onBubbleClick = () => {
  if (props.selectionMode) emit('select', props.msg.message_id)
}
</script>
