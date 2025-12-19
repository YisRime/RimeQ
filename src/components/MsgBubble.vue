<template>
  <!-- 1. 系统消息 / 撤回提示 -->
  <div v-if="isSystem" class="flex-center my-4 w-full select-none">
    <div class="bg-dim text-sub text-xs px-3 py-1 rounded-full shadow-sm">
      {{ rawText }}
    </div>
  </div>

  <!-- 2. 常规消息 -->
  <div
    v-else
    class="flex gap-3 mb-4 w-full group/row relative"
    :class="isMe ? 'flex-row-reverse' : 'flex-row'"
    @contextmenu.prevent="emit('contextmenu', $event, msg)"
  >
    <!-- 头像 -->
    <div class="flex-shrink-0 flex flex-col justify-start mt-1">
      <Avatar
        shape="circle"
        :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${msg.sender.user_id}`"
        size="large"
        class="shadow-sm cursor-pointer hover:scale-105 my-trans select-none bg-sub"
        @dblclick="emit('poke', msg.sender.user_id)"
      />
    </div>

    <!-- 消息体容器 -->
    <div class="flex flex-col max-w-[75%] md:max-w-[60%] min-w-[60px]" :class="isMe ? 'items-end' : 'items-start'">
      <!-- 昵称 (非自己时显示) -->
      <div v-if="!isMe" class="flex-x gap-2 mb-1 ml-1 select-none">
        <span class="text-xs text-sub font-medium">
          {{ msg.sender.card || msg.sender.nickname }}
        </span>
        <!-- 身份标识 -->
        <span v-if="msg.sender.role === 'owner'" class="text-[10px] px-1.5 rounded bg-yellow-100 text-yellow-600"
          >群主</span
        >
        <span v-if="msg.sender.role === 'admin'" class="text-[10px] px-1.5 rounded bg-green-100 text-green-600"
          >管理员</span
        >
      </div>

      <!-- 气泡主体 -->
      <div
        class="relative rounded-2xl shadow-sm border my-trans overflow-hidden group-hover/row:shadow-md"
        :class="bubbleClass"
      >
        <!-- A. 纯文本/表情/At -->
        <div v-if="msgType === MsgType.Text" class="text-sm leading-6 break-words whitespace-pre-wrap">
          <span v-html="formattedHtml" />
        </div>

        <!-- B. 图片 -->
        <div v-else-if="msgType === MsgType.Image" class="relative">
          <img
            :src="mediaUrl"
            class="max-w-[300px] max-h-[300px] min-w-[100px] rounded-lg cursor-pointer bg-dim block"
            loading="lazy"
            @click.stop="previewImage"
          />
        </div>

        <!-- C. 语音 -->
        <div v-else-if="msgType === MsgType.Record" class="flex-x gap-2 px-2 py-1 select-none">
          <div
            class="w-8 h-8 rounded-full bg-white/20 flex-center cursor-pointer hover:bg-white/30 my-trans"
            @click="playAudio"
          >
            <div class="i-ri-play-fill" />
          </div>
          <span class="text-xs">语音消息</span>
          <audio ref="audioRef" :src="mediaUrl" class="hidden" />
        </div>

        <!-- D. 文件 -->
        <div
          v-else-if="msgType === MsgType.File"
          class="flex-x gap-3 p-1 min-w-[200px] cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 my-trans rounded"
          @click="downloadFile"
        >
          <div class="w-10 h-10 bg-white/20 rounded flex-center text-xl">
            <div class="i-ri-file-line" />
          </div>
          <div class="flex-truncate">
            <div class="text-sm truncate">{{ fileInfo.name }}</div>
            <div class="text-xs opacity-70">{{ formatFileSize(fileInfo.size) }}</div>
          </div>
        </div>

        <!-- E. 视频 -->
        <div v-else-if="msgType === MsgType.Video" class="max-w-[300px]">
          <video :src="mediaUrl" controls class="w-full rounded-lg bg-black" />
        </div>

        <!-- F. 回复 (简易渲染) -->
        <div v-else-if="msgType === MsgType.Reply" class="flex flex-col">
          <div class="text-xs opacity-60 mb-1 border-l-2 border-current pl-2">引用回复</div>
          <div>{{ rawText }}</div>
        </div>

        <!-- G. Markdown -->
        <div v-else-if="msgType === MsgType.Markdown" class="text-sm overflow-hidden p-1">
          <div class="markdown-body" v-html="markdownContent" />
        </div>

        <!-- H. 卡片消息 (JSON/XML) -->
        <div
          v-else-if="[MsgType.Json, MsgType.Xml, MsgType.Card].includes(msgType)"
          class="flex gap-3 items-center min-w-[200px]"
        >
          <div v-if="cardInfo?.preview" class="w-12 h-12 flex-shrink-0">
            <img :src="cardInfo.preview" class="w-full h-full object-cover rounded" />
          </div>
          <div v-else class="w-12 h-12 flex-shrink-0 bg-dim rounded flex-center">
            <div class="i-ri-article-line text-xl opacity-50" />
          </div>
          <div class="flex-truncate flex flex-col">
            <div class="text-sm font-bold truncate">{{ cardInfo?.title || '卡片消息' }}</div>
            <div class="text-xs opacity-70 truncate">{{ cardInfo?.desc || '点击查看详情' }}</div>
          </div>
        </div>

        <!-- I. 默认 -->
        <div v-else class="text-sm text-dim italic px-2">[暂不支持的消息类型: {{ msgType }}]</div>

        <!-- 发送状态 -->
        <div v-if="isMe && msg.status === 'sending'" class="absolute -left-6 top-1/2 -translate-y-1/2">
          <div class="i-ri-loader-4-line animate-spin text-dim text-xs" />
        </div>
        <div
          v-if="isMe && msg.status === 'fail'"
          class="absolute -left-6 top-1/2 -translate-y-1/2 text-red-500 cursor-pointer"
          title="发送失败"
        >
          <div class="i-ri-error-warning-fill" />
        </div>
      </div>

      <!-- 撤回提示 -->
      <div v-if="msg.recalled" class="text-[10px] text-dim mt-1 flex-x gap-1">
        <div class="i-ri-arrow-go-back-line" />
        已撤回
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useToast } from 'primevue/usetoast'
import Avatar from 'primevue/avatar'
import { useAccountsStore } from '@/stores/accounts'
import { useInterfaceStore } from '@/stores/interface'
import { MsgType } from '@/types'
import { determineMsgType, parseMsgList } from '@/utils/msg-parser'
import { formatText } from '@/utils/text'
import { formatFileSize } from '@/utils/format'
import { bot } from '@/api'

const props = defineProps<{ msg: any }>() // ChatMsg 类型
const emit = defineEmits<{
  (e: 'contextmenu', ev: MouseEvent, msg: any): void
  (e: 'poke', uid: number): void
}>()

const toast = useToast()
const accountsStore = useAccountsStore()
const interfaceStore = useInterfaceStore()
const audioRef = ref<HTMLAudioElement>()

// Computed
const isMe = computed(() => props.msg.sender.user_id === accountsStore.user?.user_id)
const isSystem = computed(() => !!props.msg.isSystem || props.msg.message_type === 'system')

// 使用 msg-parser 的能力
const parsedMsg = computed(() => parseMsgList(props.msg.message))
const msgType = computed(() => determineMsgType(parsedMsg.value))

const rawText = computed(() => parsedMsg.value.text)

// 处理普通文本的 HTML 渲染 (At/Face/Text)
const formattedHtml = computed(() => {
  let html = ''
  props.msg.message.forEach((s: any) => {
    if (s.type === 'text') html += formatText(s.data.text)
    else if (s.type === 'at')
      html += `<span class="text-blue-500 font-medium select-none">@${s.data.name || s.data.qq}</span> `
    else if (s.type === 'face') html += `[表情]` // 如果有表情图片转换逻辑可以在这里加
  })
  return html
})

// 提取 Markdown 内容
const markdownContent = computed(() => {
  return parsedMsg.value.markdown || parsedMsg.value.raw.find((s: any) => s.type === 'markdown')?.data?.content || ''
})

// 提取卡片信息
const cardInfo = computed(() => {
  return parsedMsg.value.card
})

// 媒体 URL 提取
const mediaUrl = computed(() => {
  // 优先找 image/video/record
  const s = props.msg.message.find((i: any) => ['image', 'video', 'record'].includes(i.type))
  return s ? s.data.url || s.data.file : ''
})

// 文件信息提取
const fileInfo = computed(() => {
  const s = props.msg.message.find((i: any) => i.type === 'file')
  return s ? { name: s.data.name, size: Number(s.data.size) } : { name: '未知文件', size: 0 }
})

// 气泡样式计算
const bubbleClass = computed(() => {
  // 图片/视频去掉背景和内边距，使其贴合
  if ([MsgType.Image, MsgType.Video].includes(msgType.value)) {
    return 'p-0 bg-transparent border-none shadow-none'
  }

  // 卡片/Markdown 通常需要一点背景
  if ([MsgType.Card, MsgType.Json, MsgType.Xml, MsgType.Markdown].includes(msgType.value)) {
    return 'px-3 py-2 bg-sub text-main border-dim rounded-lg'
  }

  // 常规气泡颜色
  if (isMe.value) {
    return 'px-3 py-2 bg-primary text-white border-transparent rounded-tr-sm'
  }
  return 'px-3 py-2 bg-sub text-main border-dim rounded-tl-sm'
})

// Actions
const previewImage = () => {
  if (mediaUrl.value) {
    interfaceStore.openViewer(mediaUrl.value)
  }
}

const playAudio = () => {
  audioRef.value?.play()
}

const downloadFile = async () => {
  // 如果是卡片消息点击，尝试跳转 URL
  if ([MsgType.Card, MsgType.Json, MsgType.Xml].includes(msgType.value) && cardInfo.value?.url) {
    window.open(cardInfo.value.url, '_blank')
    return
  }

  const fileSeg = props.msg.message.find((s: any) => s.type === 'file')
  const groupId = props.msg.group_id
  if (groupId && fileSeg) {
    try {
      toast.add({ severity: 'info', summary: '获取下载地址...', life: 2000 })
      const res = await bot.getGroupFileUrl(groupId, fileSeg.data.file_id, fileSeg.data.busid)
      if (res.url) window.open(res.url)
    } catch {
      toast.add({ severity: 'error', summary: '获取失败', life: 3000 })
    }
  }
}
</script>

<style scoped>
/* === Markdown 样式下沉 === */
/* 使用 :deep() 穿透，因为内容通常是 v-html 动态渲染的 */
:deep(.markdown-body) {
  font-size: 0.875rem; /* text-sm */
  line-height: 1.5;
}

:deep(.markdown-body) p {
  margin-bottom: 0.5rem;
}

:deep(.markdown-body) p:last-child {
  margin-bottom: 0;
}

:deep(.markdown-body) a {
  color: var(--n-primary-color);
  text-decoration: underline;
  cursor: pointer;
}

:deep(.markdown-body) ul,
:deep(.markdown-body) ol {
  padding-left: 1.2em;
  margin-bottom: 0.5em;
}

:deep(.markdown-body) li {
  list-style: disc;
}

:deep(.markdown-body) img {
  max-width: 100%;
  border-radius: 4px;
  margin: 4px 0;
}

:deep(.markdown-body) code {
  background-color: rgba(125, 125, 125, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
}
</style>
