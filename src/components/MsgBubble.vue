<template>
  <!-- 系统提示消息 -->
  <div v-if="isSystem" class="ui-flex-center my-4 w-full select-none">
    <div class="ui-bg-background-dim ui-text-foreground-sub text-xs px-3 py-1 rounded-full shadow-sm">
      {{ rawText }}
    </div>
  </div>

  <!-- 常规聊天消息 -->
  <div
    v-else
    class="flex gap-3 mb-4 w-full group/row relative px-4 box-border"
    :class="[isMe ? 'flex-row-reverse' : 'flex-row', { 'opacity-60': selectionMode }]"
    @contextmenu.prevent="emit('contextmenu', $event, msg)"
    @click="onBubbleClick"
  >
    <!-- 多选勾选框 -->
    <div v-if="selectionMode" class="ui-flex-center px-2">
      <div
        class="w-5 h-5 rounded-full border-2 ui-border-background-dim ui-flex-center ui-trans ui-dur-fast"
        :class="isSelected ? 'bg-primary border-primary' : 'bg-transparent'"
      >
        <div v-if="isSelected" class="i-ri-check-line text-primary-content text-xs" />
      </div>
    </div>

    <!-- 头像 -->
    <div class="flex-shrink-0 flex flex-col justify-start mt-1">
      <Avatar
        shape="circle"
        :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${msg.sender.user_id}`"
        size="large"
        class="shadow-sm cursor-pointer hover:scale-105 ui-trans ui-dur-fast select-none ui-bg-background-sub"
        @dblclick="emit('poke', msg.sender.user_id)"
      />
    </div>

    <!-- 消息主体 -->
    <div class="flex flex-col max-w-[75%] md:max-w-[60%] min-w-[60px]" :class="isMe ? 'items-end' : 'items-start'">
      <!-- 发送者昵称与角色 (非本人消息) -->
      <div v-if="!isMe" class="ui-flex-x gap-2 mb-1 ml-1 select-none">
        <span class="text-xs ui-text-foreground-sub font-medium">{{ msg.sender.card || msg.sender.nickname }}</span>
        <span v-if="msg.sender.role === 'owner'" class="text-[10px] px-1.5 rounded bg-yellow-100 text-yellow-600"
          >群主</span
        >
        <span v-if="msg.sender.role === 'admin'" class="text-[10px] px-1.5 rounded bg-green-100 text-green-600"
          >管理员</span
        >
      </div>

      <!-- 消息气泡 -->
      <div
        class="relative rounded-2xl shadow-sm border ui-trans ui-dur-fast overflow-hidden group-hover/row:shadow-md"
        :class="bubbleClass"
      >
        <!-- 文本消息 -->
        <div v-if="msgType === MsgType.Text" class="text-sm leading-6 break-words whitespace-pre-wrap">
          <span v-html="formattedHtml" />
        </div>

        <!-- 图片消息 -->
        <div v-else-if="msgType === MsgType.Image" class="relative">
          <img
            :src="mediaUrl"
            class="max-w-[300px] max-h-[300px] min-w-[100px] rounded-lg cursor-pointer ui-bg-background-dim block"
            loading="lazy"
            @click.stop="previewImage"
          />
        </div>

        <!-- 语音消息 -->
        <div v-else-if="msgType === MsgType.Record" class="ui-flex-x gap-2 px-2 py-1 select-none">
          <div
            class="w-8 h-8 rounded-full bg-white/20 ui-flex-center ui-ia hover:bg-white/30"
            @click="playAudio"
          >
            <div class="i-ri-play-fill" />
          </div>
          <span class="text-xs">语音消息</span>
          <audio ref="audioRef" :src="mediaUrl" class="hidden" />
        </div>

        <!-- 文件消息 -->
        <div v-else-if="msgType === MsgType.File" class="ui-flex-x gap-3 p-1 min-w-[200px] ui-ia-hover rounded">
          <div class="w-10 h-10 bg-white/20 rounded ui-flex-center text-xl"><div class="i-ri-file-line" /></div>
          <div class="ui-flex-truncate">
            <div class="text-sm truncate">{{ fileInfo.name }}</div>
            <div class="text-xs opacity-70">{{ formatSize(fileInfo.size) }}</div>
          </div>
        </div>

        <!-- 回复消息 -->
        <div v-else-if="msgType === MsgType.Reply" class="flex flex-col">
          <div class="text-xs opacity-60 mb-1 border-l-2 border-current pl-2">引用回复</div>
          <div>{{ rawText }}</div>
        </div>

        <!-- Markdown 消息 -->
        <div v-else-if="msgType === MsgType.Markdown" class="text-sm overflow-hidden p-1">
          <div class="markdown-body" v-html="markdownContent" />
        </div>

        <!-- 卡片消息 (JSON/XML) -->
        <div
          v-else-if="[MsgType.Json, MsgType.Xml].includes(msgType)"
          class="flex gap-3 items-center min-w-[200px]"
        >
          <div v-if="cardInfo?.preview" class="w-12 h-12 flex-shrink-0">
            <img :src="cardInfo.preview" class="w-full h-full object-cover rounded" />
          </div>
          <div class="ui-flex-truncate flex flex-col">
            <div class="text-sm font-bold truncate">{{ cardInfo?.title || '卡片消息' }}</div>
            <div class="text-xs opacity-70 truncate">{{ cardInfo?.desc || '点击查看详情' }}</div>
          </div>
        </div>

        <!-- 不支持的消息类型 -->
        <div v-else class="text-sm ui-text-foreground-dim italic px-2">[不支持的消息: {{ msgType }}]</div>

        <!-- 发送中状态指示器 -->
        <div v-if="isMe && msg.status === 'sending'" class="absolute -left-6 top-1/2 -translate-y-1/2">
          <div class="i-ri-loader-4-line animate-spin ui-text-foreground-dim text-xs" />
        </div>
      </div>

      <!-- 已撤回提示 -->
      <div v-if="msg.recalled" class="text-[10px] ui-text-foreground-dim mt-1 ui-flex-x gap-1">
        <div class="i-ri-arrow-go-back-line" />
        已撤回
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import { useSettingStore } from '@/stores/setting'
import type { ChatMsg } from '@/utils/msg-parser'
import { MsgType } from '@/types'
import { determineMsgType, parseMsgList, formatText } from '@/utils/msg-parser'

// Pinia store
const settingStore = useSettingStore()

// Props 和 Emits 定义
const props = defineProps<{
  msg: ChatMsg
  selectionMode?: boolean
  isSelected?: boolean
}>()
const emit = defineEmits<{
  (e: 'contextmenu', ev: MouseEvent, msg: ChatMsg): void
  (e: 'poke', uid: number): void
  (e: 'select', msgId: number): void
}>()

// Vue-Router 实例
const router = useRouter()
// 语音播放器引用
const audioRef = ref<HTMLAudioElement>()

// 判断消息是否由当前用户发送
const isMe = computed(() => props.msg.sender.user_id === settingStore.user?.user_id)
// 判断是否为系统消息
const isSystem = computed(() => !!props.msg.isSystem)

// 解析消息内容
const parsedMsg = computed(() => parseMsgList(props.msg.message))
// 获取消息类型
const msgType = computed(() => determineMsgType(parsedMsg.value))
// 获取纯文本内容
const rawText = computed(() => parsedMsg.value.text)

// 格式化包含 CQ 码的文本为 HTML
const formattedHtml = computed(() => {
  let html = ''
  props.msg.message.forEach((s) => {
    if (s.type === 'text') html += formatText(s.data.text!)
    else if (s.type === 'at')
      html += `<span class="text-blue-500 font-medium select-none">@${s.data.name || s.data.qq}</span> `
    else if (s.type === 'face') html += `[表情]`
  })
  return html
})

// Markdown 和卡片消息相关计算属性
const markdownContent = computed(() => parsedMsg.value.markdown || '')
const cardInfo = computed(() => parsedMsg.value.card)
// 媒体和文件消息相关计算属性
const mediaUrl = computed(() => parsedMsg.value.images[0] || '')
const fileInfo = computed(() => parsedMsg.value.files[0] || { name: '未知文件', size: 0 })

// 计算气泡的动态样式类
const bubbleClass = computed(() => {
  if ([MsgType.Image, MsgType.Video].includes(msgType.value)) return 'p-0 bg-transparent border-none shadow-none'
  if ([MsgType.Json, MsgType.Xml, MsgType.Markdown].includes(msgType.value))
    return 'px-3 py-2 ui-bg-background-sub ui-text-foreground-main ui-border-background-dim rounded-lg'
  if (isMe.value) return 'px-3 py-2 bg-primary text-primary-content border-transparent rounded-tr-sm'
  return 'px-3 py-2 ui-bg-background-sub ui-text-foreground-main ui-border-background-dim rounded-tl-sm'
})

// 格式化文件大小
const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024,
    sizes = ['B', 'KB', 'MB', 'GB'],
    i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

// 处理气泡点击事件（用于多选模式）
const onBubbleClick = () => {
  if (props.selectionMode) emit('select', props.msg.message_id)
}

// 预览图片
const previewImage = () => {
  if (mediaUrl.value) router.push({ query: { ...router.currentRoute.value.query, view: mediaUrl.value } })
}

// 播放语音
const playAudio = () => audioRef.value?.play()
</script>

<style scoped>
/* Markdown 渲染样式 */
:deep(.markdown-body) {
  font-size: 0.875rem;
  line-height: 1.5;
}
:deep(.markdown-body) a {
  color: var(--primary-color);
  text-decoration: underline;
}
</style>
