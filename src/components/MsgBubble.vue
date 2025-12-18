<template>
  <!-- 场景1: 系统消息 / 撤回提示 (居中显示) -->
  <div v-if="msgType === MsgType.System" class="flex justify-center my-4 w-full select-none">
    <div class="bg-gray-200 dark:bg-gray-800 text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">
      <span v-if="rawText.includes('撤回')">
        {{ rawText }}
      </span>
      <span v-else>
        {{ rawText || '系统消息' }}
      </span>
    </div>
  </div>

  <!-- 场景2: 常规聊天消息 -->
  <div
    v-else
    class="flex gap-3 mb-4 w-full group/row relative"
    :class="isMe ? 'flex-row-reverse' : 'flex-row'"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- 头像 -->
    <div class="flex-shrink-0 flex flex-col justify-start mt-1">
      <n-avatar
        round
        :size="40"
        :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${msg.sender.user_id}`"
        class="shadow-sm cursor-pointer hover:scale-105 transition-transform duration-200 select-none bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
        @click.stop="emit('avatarClick', msg.sender.user_id)"
        @dblclick="handlePoke"
      />
    </div>

    <!-- 消息主体结构 -->
    <div class="flex flex-col max-w-[75%] md:max-w-[60%] min-w-[60px]" :class="isMe ? 'items-end' : 'items-start'">
      <!-- 昵称与头衔 (非自己时显示) -->
      <div v-if="!isMe" class="flex items-center gap-2 mb-1 ml-1 select-none">
        <span class="text-xs text-gray-500 font-medium cursor-pointer hover:underline">
          {{ msg.sender.card || msg.sender.nickname }}
        </span>
        <!-- 群头衔徽章 -->
        <span
          v-if="msg.sender.role === 'owner'"
          class="text-[10px] px-1.5 py-[1px] rounded bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 font-medium"
        >
          群主
        </span>
        <span
          v-if="msg.sender.role === 'admin'"
          class="text-[10px] px-1.5 py-[1px] rounded bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 font-medium"
        >
          管理员
        </span>
      </div>

      <!-- 消息气泡 -->
      <div
        class="relative rounded-2xl shadow-sm border transition-all duration-200 overflow-hidden group-hover/row:shadow-md"
        :class="[bubbleClass, { 'opacity-60 grayscale': (msg as any).isDeleted }]"
      >
        <!-- 文本消息 -->
        <div v-if="isTextMessage" class="text-sm leading-6 break-words whitespace-pre-wrap">
          <span v-html="formattedHtml"></span>
        </div>

        <!-- 图片消息 -->
        <div v-else-if="msgType === MsgType.Image" class="relative group">
          <img
            :src="imageUrl"
            class="max-w-[300px] max-h-[300px] min-w-[100px] rounded-lg cursor-pointer hover:brightness-95 transition-all bg-gray-100 dark:bg-gray-700"
            :class="{ 'opacity-50': imageLoading }"
            loading="lazy"
            @click="showImageViewer = true"
            @load="imageLoading = false"
          />
          <div v-if="imageLoading" class="absolute inset-0 flex items-center justify-center">
            <div class="i-ri-loader-4-line animate-spin text-gray-400 text-2xl" />
          </div>
        </div>

        <!-- 文件消息 -->
        <div
          v-else-if="msgType === MsgType.File"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 w-64 flex items-center gap-3 select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xl">
            <div class="i-ri-file-line" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {{ fileInfo.name }}
            </div>
            <div class="text-xs text-gray-400 mt-0.5">
              {{ formatFileSize(fileInfo.size) }}
            </div>
          </div>
          <div class="text-gray-400 hover:text-primary transition-colors">
            <div class="i-ri-download-line" @click.stop="downloadFile" />
          </div>
        </div>

        <!-- 引用/回复消息 -->
        <div v-else-if="msgType === MsgType.Reply" class="flex flex-col max-w-full">
          <div
            class="mb-1 pl-3 py-1 border-l-4 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 rounded-r text-xs text-gray-500 dark:text-gray-400 select-none"
          >
            <div class="font-bold flex items-center gap-1">
              <div class="i-ri-double-quotes-l text-[10px]" />
              引用回复
            </div>
          </div>
          <div class="text-sm">
            {{ rawText }}
          </div>
        </div>

        <!-- 视频/语音消息 -->
        <div v-else-if="msgType === MsgType.Video || msgType === MsgType.Record" class="media-msg w-full max-w-[300px]">
          <video
            v-if="msgType === MsgType.Video"
            :src="mediaUrl"
            controls
            class="w-full rounded-lg bg-black aspect-video object-contain"
          ></video>
          <div v-else class="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-full pr-4">
            <div class="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary">
              <div class="i-ri-play-fill" />
            </div>
            <audio ref="audioRef" :src="mediaUrl" controls class="h-8 w-[200px]" style="display: none"></audio>
            <div class="text-sm">语音消息</div>
            <n-button size="tiny" secondary @click="playAudio">播放</n-button>
          </div>
        </div>

        <!-- 合并转发消息 -->
        <div
          v-else-if="msgType === MsgType.Forward"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm select-none"
        >
          <div
            v-if="!isForwardExpanded"
            class="p-3 w-[280px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            @click="toggleForwardExpand"
          >
            <div class="font-bold text-sm mb-2 text-gray-800 dark:text-gray-200">合并转发</div>
            <div class="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
              <div v-for="(node, idx) in forwardPreview" :key="idx" class="truncate">
                {{ node }}
              </div>
            </div>
            <div
              class="border-t border-gray-100 dark:border-gray-700 pt-2 text-[10px] text-gray-400 flex justify-between items-center"
            >
              <span>点击查看详情</span>
              <div class="i-ri-arrow-down-s-line" />
            </div>
          </div>

          <div v-else class="flex flex-col max-w-[400px] w-full">
            <div
              class="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              @click="toggleForwardExpand"
            >
              <span class="font-bold text-sm text-gray-800 dark:text-gray-200">合并转发</span>
              <div class="i-ri-arrow-up-s-line text-gray-400" />
            </div>

            <div v-if="isLoadingForward" class="p-6 flex justify-center">
              <div class="i-ri-loader-4-line animate-spin text-gray-400 text-xl" />
            </div>

            <div v-else class="max-h-[400px] overflow-y-auto custom-scrollbar">
              <div
                v-for="(item, idx) in forwardDetailList"
                :key="idx"
                class="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div class="flex items-center gap-2 mb-2">
                  <n-avatar
                    :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${item.sender?.user_id || 0}`"
                    round
                    size="small"
                  />
                  <span class="text-xs font-bold text-gray-700 dark:text-gray-300">{{
                    item.sender?.nickname || '未知用户'
                  }}</span>
                </div>
                <div class="text-sm text-gray-600 dark:text-gray-400 pl-8 break-words whitespace-pre-wrap">
                  {{ item.content || '[消息]' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 默认/未知消息 -->
        <div v-else class="text-sm text-gray-400">[不支持的消息类型: {{ msgType }}]</div>

        <!-- 发送状态 (仅自己) -->
        <div v-if="isMe" class="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6">
          <div v-if="(msg as any).isSending" class="i-ri-loader-4-line animate-spin text-gray-400 text-sm" />
          <div
            v-if="(msg as any).isError"
            class="i-ri-error-warning-line text-red-500 cursor-pointer text-sm"
            title="发送失败"
          />
        </div>
      </div>

      <!-- 底部辅助信息: 防撤回提示 -->
      <div v-if="(msg as any).isDeleted" class="mt-1 text-[10px] text-red-400 px-1 select-none flex items-center gap-1">
        <div class="i-ri-shield-line" />
        已撤回
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { NAvatar, NButton, useMessage } from 'naive-ui'
import type { Message } from '@/types'
import { MsgType } from '@/types'
import { formatText } from '@/utils/text'
import { formatFileSize } from '@/utils/format'
import { bot } from '@/api'
import { useChatStore } from '@/stores/chat'
import { useAuthStore } from '@/stores/auth' // 新增
import { determineMsgType } from '@/utils/msg-parser'

defineOptions({ name: 'MsgBubble' })

const props = defineProps<{ msg: Message }>()
const emit = defineEmits<{
  (e: 'contextmenu', event: MouseEvent, msg: Message): void
  (e: 'avatarClick', userId: number): void
  (e: 'poke', userId: number): void
}>()

const message = useMessage()
const chatStore = useChatStore()
const authStore = useAuthStore() // 新增

// 状态
const imageLoading = ref(true)
const showImageViewer = ref(false)
const audioRef = ref<HTMLAudioElement | null>(null)

// 转发消息状态
const isForwardExpanded = ref(false)
const forwardDetailList = ref<
  Array<{
    sender?: { user_id: number; nickname: string }
    content: string
  }>
>([])
const isLoadingForward = ref(false)

// === 核心逻辑变更 ===

// 1. 判断是否是自己 (通过 Store 比对 ID)
const isMe = computed(() => {
  return props.msg.sender.user_id === authStore.loginInfo?.user_id
})

// 2. 动态计算消息类型 (API 类型中没有 type 字段了)
const msgType = computed(() => {
  // 如果是本地乐观更新的消息，可能暂时挂载了 type，但通常我们重新计算
  return determineMsgType(props.msg.message)
})

// 计算属性：从消息段中提取纯文本
const rawText = computed(() => {
  return props.msg.message
    .filter((s) => s.type === 'text')
    .map((s) => s.data.text)
    .join('')
})

// 文本消息判断
const isTextMessage = computed(() => {
  if (msgType.value === MsgType.Text) return true
  return props.msg.message.every((s) => ['text', 'face', 'at'].includes(s.type))
})

// 格式化的 HTML 文本
const formattedHtml = computed(() => {
  let html = ''
  props.msg.message.forEach((seg) => {
    if (seg.type === 'text') html += formatText(seg.data.text || '')
    else if (seg.type === 'at') html += `<span class="text-blue-500">@${seg.data.name || seg.data.qq}</span> `
    else if (seg.type === 'face') html += `[表情${seg.data.id}]`
  })
  return html
})

// 图片 URL
const imageUrl = computed(() => {
  const imgSeg = props.msg.message.find((s) => s.type === 'image')
  return imgSeg ? imgSeg.data.url || imgSeg.data.file : ''
})

// 文件信息
const fileInfo = computed(() => {
  const fileSeg = props.msg.message.find((s) => s.type === 'file')
  if (fileSeg) {
    return {
      name: fileSeg.data.name || fileSeg.data.file_name || '未知文件',
      size: Number(fileSeg.data.size || fileSeg.data.file_size || 0),
      id: fileSeg.data.file_id || fileSeg.data.id
    }
  }
  return { name: '未知文件', size: 0, id: '' }
})

// 媒体 URL (视频/语音)
const mediaUrl = computed(() => {
  const seg = props.msg.message.find((s) => s.type === 'video' || s.type === 'record')
  return seg ? seg.data.url || seg.data.file : ''
})

// 转发预览
const forwardPreview = computed(() => ['查看聊天记录详情'])

// 气泡样式
const bubbleClass = computed(() => {
  const transparentTypes = [MsgType.Image, MsgType.Video, MsgType.Forward]
  if (transparentTypes.includes(msgType.value)) {
    return 'p-0 bg-transparent border-none shadow-none'
  }
  if (msgType.value === MsgType.File) {
    return 'p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
  }
  if (isMe.value) {
    return 'px-3 py-2 bg-primary text-white border-transparent rounded-tr-sm'
  } else {
    return 'px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-100 dark:border-gray-700 rounded-tl-sm'
  }
})

// 方法
const handleContextMenu = (e: MouseEvent) => {
  emit('contextmenu', e, props.msg)
}

const handlePoke = () => {
  emit('poke', props.msg.sender.user_id)
}

const downloadFile = () => {
  message.info('开始获取文件下载链接...')
  const group_id = props.msg.group_id
  if (group_id && fileInfo.value.id) {
    bot
      .getGroupFileUrl(group_id, fileInfo.value.id)
      .then((res) => {
        if (res.url) window.open(res.url, '_blank')
      })
      .catch(() => message.error('获取下载链接失败'))
  }
}

const playAudio = () => {
  audioRef.value?.play()
}

// 切换转发消息展开状态
const toggleForwardExpand = async () => {
  if (!isForwardExpanded.value && forwardDetailList.value.length === 0) {
    await loadForwardDetail()
  }
  isForwardExpanded.value = !isForwardExpanded.value
}

// 加载转发消息详情
const loadForwardDetail = async () => {
  const forwardSeg = props.msg.message.find((s) => s.type === 'forward')
  const resId = forwardSeg?.data.id || (props.msg as any).res_id

  if (!resId) return

  isLoadingForward.value = true
  try {
    const result = await bot.getForwardMsg(resId)
    if (result && result.message) {
      forwardDetailList.value = result.message.map((node: any) => {
        return {
          sender: {
            user_id: node.data.user_id,
            nickname: node.data.nickname
          },
          content: typeof node.data.content === 'string' ? node.data.content : '[复杂消息]'
        }
      })
    }
  } catch (e) {
    console.error('Load forward failed', e)
    message.error('加载详情失败')
  } finally {
    isLoadingForward.value = false
  }
}
</script>
