<template>
  <!-- 1. 系统消息 / 撤回提示 -->
  <div v-if="isSystem" class="flex justify-center my-4 w-full select-none">
    <div class="bg-gray-200 dark:bg-gray-800 text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">
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
      <n-avatar
        round
        :size="40"
        :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${msg.sender.user_id}`"
        class="shadow-sm cursor-pointer hover:scale-105 transition-transform duration-200 select-none bg-white dark:bg-gray-800"
        @dblclick="emit('poke', msg.sender.user_id)"
      />
    </div>

    <!-- 消息体 -->
    <div class="flex flex-col max-w-[75%] md:max-w-[60%] min-w-[60px]" :class="isMe ? 'items-end' : 'items-start'">
      <!-- 昵称 (非自己时显示) -->
      <div v-if="!isMe" class="flex items-center gap-2 mb-1 ml-1 select-none">
        <span class="text-xs text-gray-500 font-medium">
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

      <!-- 气泡 -->
      <div
        class="relative rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden group-hover/row:shadow-md"
        :class="bubbleClass"
      >
        <!-- A. 纯文本/表情/At -->
        <div v-if="msgType === MsgType.Text" class="text-sm leading-6 break-words whitespace-pre-wrap">
          <span v-html="formattedHtml"></span>
        </div>

        <!-- B. 图片 -->
        <div v-else-if="msgType === MsgType.Image" class="relative">
          <img
            :src="mediaUrl"
            class="max-w-[300px] max-h-[300px] min-w-[100px] rounded-lg cursor-pointer bg-gray-100 dark:bg-gray-700 block"
            loading="lazy"
            @click.stop="previewImage"
          />
        </div>

        <!-- C. 语音 -->
        <div v-else-if="msgType === MsgType.Record" class="flex items-center gap-2 px-2 py-1 select-none">
          <div
            class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center cursor-pointer"
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
          class="flex items-center gap-3 p-1 min-w-[200px] cursor-pointer"
          @click="downloadFile"
        >
          <div class="w-10 h-10 bg-white/20 rounded flex items-center justify-center text-xl">
            <div class="i-ri-file-line" />
          </div>
          <div class="flex-1 min-w-0">
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

        <!-- G. 默认 -->
        <div v-else class="text-sm text-gray-400 italic">[暂不支持的消息类型: {{ msgType }}]</div>

        <!-- 发送状态 -->
        <div v-if="isMe && msg.status === 'sending'" class="absolute -left-6 top-1/2 -translate-y-1/2">
          <div class="i-ri-loader-4-line animate-spin text-gray-400 text-xs" />
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
      <div v-if="msg.recalled" class="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
        <div class="i-ri-arrow-go-back-line" />
        已撤回
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useMessage } from 'naive-ui'
import { useAccountsStore } from '@/stores/accounts'
import { useInterfaceStore } from '@/stores/interface'
import { MsgType } from '@/types'
import { determineMsgType } from '@/utils/msg-parser'
import { formatText } from '@/utils/text'
import { formatFileSize } from '@/utils/format'
import { bot } from '@/api'

const props = defineProps<{ msg: any }>() // ChatMsg 类型
const emit = defineEmits<{
  (e: 'contextmenu', ev: MouseEvent, msg: any): void
  (e: 'poke', uid: number): void
}>()

const toast = useMessage()
const accountsStore = useAccountsStore()
const interfaceStore = useInterfaceStore()
const audioRef = ref<HTMLAudioElement>()

// Computed
const isMe = computed(() => props.msg.sender.user_id === accountsStore.user?.user_id)
const isSystem = computed(() => !!props.msg.isSystem || props.msg.message_type === 'system')

const msgType = computed(() => determineMsgType(props.msg.message))

const rawText = computed(() => {
  return props.msg.message
    .filter((s: any) => s.type === 'text')
    .map((s: any) => s.data.text)
    .join('')
})

const formattedHtml = computed(() => {
  let html = ''
  props.msg.message.forEach((s: any) => {
    if (s.type === 'text') html += formatText(s.data.text)
    else if (s.type === 'at') html += `<span class="text-blue-500 font-medium">@${s.data.name || s.data.qq}</span> `
    else if (s.type === 'face') html += `[表情]`
  })
  return html
})

const mediaUrl = computed(() => {
  const s = props.msg.message.find((i: any) => ['image', 'video', 'record'].includes(i.type))
  return s ? s.data.url || s.data.file : ''
})

const fileInfo = computed(() => {
  const s = props.msg.message.find((i: any) => i.type === 'file')
  return s ? { name: s.data.name, size: Number(s.data.size) } : { name: '未知', size: 0 }
})

const bubbleClass = computed(() => {
  // 图片/视频去掉背景和内边距
  if ([MsgType.Image, MsgType.Video].includes(msgType.value)) {
    return 'p-0 bg-transparent border-none shadow-none'
  }
  // 气泡颜色
  if (isMe.value) {
    return 'px-3 py-2 bg-primary text-white border-transparent rounded-tr-sm'
  }
  return 'px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-100 dark:border-gray-700 rounded-tl-sm'
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
  const fileSeg = props.msg.message.find((s: any) => s.type === 'file')
  const groupId = props.msg.group_id
  if (groupId && fileSeg) {
    try {
      toast.loading('获取下载地址...')
      const res = await bot.getGroupFileUrl(groupId, fileSeg.data.file_id, fileSeg.data.busid)
      if (res.url) window.open(res.url)
    } catch {
      toast.error('获取失败')
    }
  }
}
</script>
