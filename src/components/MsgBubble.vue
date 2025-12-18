<template>
  <!-- 场景1: 系统消息 / 撤回提示 (居中显示) -->
  <div v-if="msg.type === 'system'" class="flex justify-center my-4 w-full select-none">
    <div class="bg-gray-200 dark:bg-gray-800 text-gray-500 text-xs px-3 py-1 rounded-full shadow-sm">
      <span v-if="typeof msg.content === 'object' && msg.content.sub_type === 'recall'">
        {{ msg.content.operator_name || '对方' }} 撤回了一条消息
      </span>
      <span v-else>
        {{ typeof msg.content === 'string' ? msg.content : msg.content.text || '系统消息' }}
      </span>
    </div>
  </div>

  <!-- 场景2: 常规聊天消息 -->
  <div
    v-else
    class="flex gap-3 mb-4 w-full group/row relative"
    :class="msg.isMe ? 'flex-row-reverse' : 'flex-row'"
    @contextmenu.prevent="handleContextMenu"
  >
    <!-- 头像 -->
    <div class="flex-shrink-0 flex flex-col justify-start mt-1">
      <n-avatar
        round
        :size="40"
        :src="msg.sender.avatar"
        class="shadow-sm cursor-pointer hover:scale-105 transition-transform duration-200 select-none bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700"
        @click.stop="emit('avatarClick', msg.sender.userId)"
        @dblclick="emit('poke', msg.sender.userId)"
      />
    </div>

    <!-- 消息主体结构 -->
    <div class="flex flex-col max-w-[75%] md:max-w-[60%] min-w-[60px]" :class="msg.isMe ? 'items-end' : 'items-start'">
      <!-- 昵称与头衔 (非自己时显示) -->
      <div v-if="!msg.isMe" class="flex items-center gap-2 mb-1 ml-1 select-none">
        <span class="text-xs text-gray-500 font-medium cursor-pointer hover:underline">
          {{ msg.sender.nickname }}
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
        :class="[bubbleClass, { 'opacity-60 grayscale': msg.isDeleted }]"
      >
        <!-- 动态渲染内容 - 全部整合到这里 -->

        <!-- 文本消息 -->
        <div v-if="isTextMessage" class="text-sm leading-6 break-words whitespace-pre-wrap">
          <span v-html="formattedHtml"></span>
        </div>

        <!-- 图片消息 -->
        <div v-else-if="msg.type === MsgType.Image" class="relative group">
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
          v-else-if="msg.type === MsgType.File"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 w-64 flex items-center gap-3 select-none cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <div class="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary text-xl">
            <div class="i-ri-file-line" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
              {{ fileContent?.files?.[0]?.name || '未知文件' }}
            </div>
            <div class="text-xs text-gray-400 mt-0.5">
              {{ formatFileSize(fileContent?.files?.[0]?.size || 0) }}
            </div>
          </div>
          <div class="text-gray-400 hover:text-primary transition-colors">
            <div class="i-ri-download-line" @click.stop="downloadFile" />
          </div>
        </div>

        <!-- 引用/回复消息 -->
        <div v-else-if="msg.type === MsgType.Reply" class="flex flex-col max-w-full">
          <div
            class="mb-1 pl-3 py-1 border-l-4 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-800/50 rounded-r text-xs text-gray-500 dark:text-gray-400 cursor-pointer hover:opacity-80 transition-opacity select-none"
            @click="jumpToOrigin"
          >
            <div class="font-bold flex items-center gap-1">
              <div class="i-ri-double-quotes-l text-[10px]" />
              {{ replyInfo.nickname }}
            </div>
            <div class="truncate max-w-[200px] mt-0.5">
              {{ replyInfo.content }}
            </div>
          </div>
          <div class="text-sm">
            {{ typeof msg.content === 'object' ? msg.content.text : msg.content }}
          </div>
        </div>

        <!-- 视频/语音消息 -->
        <div
          v-else-if="msg.type === MsgType.Video || msg.type === MsgType.Record"
          class="media-msg w-full max-w-[300px]"
        >
          <video
            v-if="msg.type === MsgType.Video"
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

        <!-- 表情包 (Super Emoji with Lottie) -->
        <div v-else-if="msg.type === MsgType.Face && isSuperEmoji" class="w-32 h-32">
          <div ref="lottieContainer" class="w-full h-full"></div>
        </div>

        <!-- 卡片消息 -->
        <div
          v-else-if="msg.type === MsgType.Card || msg.type === MsgType.Json || msg.type === MsgType.Xml"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 w-[280px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-all select-none shadow-sm"
          @click="handleCardClick"
        >
          <div class="font-bold text-sm mb-1 text-gray-800 dark:text-gray-200 line-clamp-2">
            {{ cardData.title }}
          </div>
          <div class="flex gap-3">
            <img
              v-if="cardData.preview"
              :src="cardData.preview"
              class="w-16 h-16 object-cover rounded bg-gray-100 flex-shrink-0"
            />
            <div class="flex-1 text-xs text-gray-500 dark:text-gray-400 line-clamp-3 leading-5 break-all">
              {{ cardData.desc }}
            </div>
          </div>
          <div class="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <img v-if="cardData.icon" :src="cardData.icon" class="w-3.5 h-3.5 rounded-full" />
            <span class="text-[10px] text-gray-400 truncate flex-1">{{ cardData.source || '应用消息' }}</span>
            <div class="i-ri-arrow-right-s-line text-gray-300 text-xs" />
          </div>
        </div>

        <!-- 合并转发消息 -->
        <div
          v-else-if="msg.type === MsgType.Forward"
          class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm select-none"
        >
          <!-- 折叠状态 - 显示预览 -->
          <div
            v-if="!isForwardExpanded"
            class="p-3 w-[280px] cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            @click="toggleForwardExpand"
          >
            <div class="font-bold text-sm mb-2 text-gray-800 dark:text-gray-200">合并转发</div>
            <div class="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400 mb-2">
              <div v-for="(node, idx) in forwardPreview" :key="idx" class="truncate">
                {{ node.sender }}: {{ node.content }}
              </div>
            </div>
            <div
              class="border-t border-gray-100 dark:border-gray-700 pt-2 text-[10px] text-gray-400 flex justify-between items-center"
            >
              <span>查看 {{ forwardCount }} 条转发</span>
              <div class="i-ri-arrow-down-s-line" />
            </div>
          </div>

          <!-- 展开状态 - 显示完整消息列表 -->
          <div v-else class="flex flex-col max-w-[400px] w-full">
            <!-- 头部 -->
            <div
              class="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              @click="toggleForwardExpand"
            >
              <span class="font-bold text-sm text-gray-800 dark:text-gray-200">合并转发 ({{ forwardCount }})</span>
              <div class="i-ri-arrow-up-s-line text-gray-400" />
            </div>

            <!-- 加载中 -->
            <div v-if="isLoadingForward" class="p-6 flex justify-center">
              <div class="i-ri-loader-4-line animate-spin text-gray-400 text-xl" />
            </div>

            <!-- 消息列表 -->
            <div v-else class="max-h-[400px] overflow-y-auto custom-scrollbar">
              <div
                v-for="(item, idx) in forwardDetailList"
                :key="idx"
                class="p-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <!-- 发送者信息 -->
                <div class="flex items-center gap-2 mb-2">
                  <n-avatar :src="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${item.sender?.userId || 0}`" round size="small" />
                  <span class="text-xs font-bold text-gray-700 dark:text-gray-300">{{
                    item.sender?.nickname || '未知用户'
                  }}</span>
                </div>

                <!-- 消息内容 -->
                <div class="text-sm text-gray-600 dark:text-gray-400 pl-8 break-words whitespace-pre-wrap">
                  {{ item.content || '[消息]' }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Markdown 消息 -->
        <div
          v-else-if="msg.type === MsgType.Markdown || hasMarkdown"
          class="markdown-body text-sm leading-6 break-words"
          v-html="markdownHtml"
        ></div>

        <!-- 默认/未知消息 -->
        <div v-else class="text-sm text-gray-400">[不支持的消息类型]</div>

        <!-- 发送状态 (仅自己) -->
        <div v-if="msg.isMe" class="absolute -left-8 top-1/2 -translate-y-1/2 flex items-center justify-center w-6 h-6">
          <div v-if="msg.isSending" class="i-ri-loader-4-line animate-spin text-gray-400 text-sm" />
          <div
            v-if="msg.isError"
            class="i-ri-error-warning-line text-red-500 cursor-pointer text-sm"
            title="发送失败"
          />
        </div>
      </div>

      <!-- 底部辅助信息: 防撤回提示 -->
      <div v-if="msg.isDeleted" class="mt-1 text-[10px] text-red-400 px-1 select-none flex items-center gap-1">
        <div class="i-ri-shield-line" />
        已撤回
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, nextTick } from 'vue'
import { NAvatar, NButton, useMessage } from 'naive-ui'
import type { Message } from '@/types'
import { MsgType } from '@/types'
import { formatText } from '@/utils/text'
import { formatFileSize } from '@/utils/format'
import { EmojiUtils } from '@/utils/emoji'
import { botApi } from '@/api'

defineOptions({
  name: 'MsgBubble'
})

const props = defineProps<{
  msg: Message
}>()

const emit = defineEmits<{
  (e: 'contextmenu', event: MouseEvent, msg: Message): void
  (e: 'avatarClick', userId: number): void
  (e: 'poke', userId: number): void
}>()

const message = useMessage()

// 状态
const imageLoading = ref(true)
const showImageViewer = ref(false)
const audioRef = ref<HTMLAudioElement | null>(null)
const lottieContainer = ref<HTMLElement | null>(null)

// 转发消息展开状态
const isForwardExpanded = ref(false)
const forwardDetailList = ref<
  Array<{
    sender?: { userId: number; nickname: string }
    content: string
  }>
>([])
const isLoadingForward = ref(false)

// 切换转发消息展开状态
const toggleForwardExpand = async () => {
  if (!isForwardExpanded.value && forwardDetailList.value.length === 0) {
    // 首次展开，需要加载详情
    await loadForwardDetail()
  }
  isForwardExpanded.value = !isForwardExpanded.value
}

// 加载转发消息详情
const loadForwardDetail = async () => {
  isLoadingForward.value = true
  try {
    // 从消息内容中提取转发ID (如果有)
    if (typeof props.msg.content === 'object' && 'id' in props.msg.content && props.msg.content.id) {
      const result = await botApi.getForwardMsg(props.msg.content.id as string)
      // 解析result中的消息列表
      if (result && Array.isArray(result)) {
        forwardDetailList.value = result.map((m: { user_id: number; nickname: string; content: any[] }) => ({
          sender: {
            userId: m.user_id || 0,
            nickname: m.nickname || '未知用户'
          },
          content: Array.isArray(m.content)
            ? m.content
                .map((seg: { type: string; data: { text?: string } }) =>
                  seg.type === 'text' ? seg.data.text : '[消息]'
                )
                .join('')
            : '[消息]'
        }))
      }
    } else {
      // 使用预览数据
      if (
        typeof props.msg.content === 'object' &&
        'content' in props.msg.content &&
        Array.isArray(props.msg.content.content)
      ) {
        forwardDetailList.value = props.msg.content.content.map(
          (node: { sender?: { userId?: number; nickname?: string }; content: string }) => ({
            sender: {
              userId: node.sender?.userId || 0,
              nickname: node.sender?.nickname || '未知用户'
            },
            content: typeof node.content === 'string' ? node.content : '[消息]'
          })
        )
      }
    }
  } catch (e) {
    console.error('[MsgBubble] Load forward detail failed', e)
    message.error('加载转发消息详情失败')
  } finally {
    isLoadingForward.value = false
  }
}

// 文本消息判断
const isTextMessage = computed(() => {
  if (props.msg.type === MsgType.Text) return true
  if (props.msg.type === MsgType.System) return false
  // 检查是否是其他特殊类型
  return ![
    MsgType.Image,
    MsgType.File,
    MsgType.Reply,
    MsgType.Video,
    MsgType.Record,
    MsgType.Face,
    MsgType.Card,
    MsgType.Json,
    MsgType.Xml,
    MsgType.Forward,
    MsgType.Markdown
  ].includes(props.msg.type)
})

// 格式化的 HTML 文本
const formattedHtml = computed(() => {
  if (typeof props.msg.content === 'string') {
    return formatText(props.msg.content)
  }
  if (typeof props.msg.content === 'object' && 'text' in props.msg.content) {
    return formatText(props.msg.content.text || '')
  }
  return ''
})

// 图片 URL
const imageUrl = computed(() => {
  if (typeof props.msg.content === 'object' && 'images' in props.msg.content) {
    return props.msg.content.images?.[0] || ''
  }
  return ''
})

// 文件内容
const fileContent = computed(() => {
  if (typeof props.msg.content === 'object') {
    return props.msg.content
  }
  return null
})

// 媒体 URL
const mediaUrl = computed(() => {
  if (typeof props.msg.content === 'object') {
    return props.msg.content.url || props.msg.content.file || ''
  }
  return ''
})

// 回复信息
const replyInfo = computed(() => {
  return {
    nickname: '未知用户',
    content: '点击跳转查看原消息'
  }
})

// Super Emoji 判断
const isSuperEmoji = computed(() => {
  if (props.msg.type !== MsgType.Face) return false
  const faceId = typeof props.msg.content === 'object' && 'id' in props.msg.content ? props.msg.content.id : 0
  return faceId >= 260 // Super Emoji ID 通常 >= 260
})

// 卡片数据
const cardData = computed(() => {
  const defaultCard = {
    title: '[卡片消息]',
    desc: '请在手机上查看',
    preview: '',
    icon: '',
    source: '',
    url: ''
  }

  try {
    const rawData = props.msg.content
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let parsedData = rawData as Record<string, any>
    if (typeof rawData === 'string' && (rawData.startsWith('{') || rawData.startsWith('['))) {
      parsedData = JSON.parse(rawData)
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meta = (parsedData.meta || {}) as Record<string, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detail = (meta.detail_1 || meta.news || Object.values(meta)[0] || {}) as Record<string, any>

    return {
      title: detail.title || parsedData.title || defaultCard.title,
      desc: detail.desc || detail.summary || parsedData.prompt || defaultCard.desc,
      preview: detail.preview || detail.cover || parsedData.preview || '',
      icon: detail.icon || parsedData.icon || '',
      source: detail.source || detail.tag || parsedData.app || 'App',
      url: detail.url || detail.jumpUrl || parsedData.url || ''
    }
  } catch {
    return defaultCard
  }
})

// 转发预览
const forwardPreview = computed(() => {
  if (
    typeof props.msg.content === 'object' &&
    'content' in props.msg.content &&
    Array.isArray(props.msg.content.content)
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return props.msg.content.content.slice(0, 3).map((node: any) => ({
      sender: node.sender?.nickname || '未知',
      content: typeof node.content === 'string' ? node.content : '[消息]'
    }))
  }
  return [{ sender: '聊天记录', content: '点击查看详情' }]
})

const forwardCount = computed(() => {
  if (
    typeof props.msg.content === 'object' &&
    'content' in props.msg.content &&
    Array.isArray(props.msg.content.content)
  ) {
    return props.msg.content.content.length
  }
  return '详情'
})

// Markdown 判断和渲染
const hasMarkdown = computed(() => {
  return typeof props.msg.content === 'object' && 'markdown' in props.msg.content
})

const markdownHtml = computed(() => {
  // 简化版 Markdown 渲染，实际项目中应使用 markdown-it
  if (typeof props.msg.content === 'object' && 'markdown' in props.msg.content) {
    return props.msg.content.markdown?.replace(/\n/g, '<br>')
  }
  return ''
})

// 气泡样式
const bubbleClass = computed(() => {
  const transparentTypes = [MsgType.Image, MsgType.Video, MsgType.Card, MsgType.Forward]
  if (transparentTypes.includes(props.msg.type)) {
    return 'p-0 bg-transparent border-none shadow-none'
  }

  if (props.msg.type === MsgType.File || props.msg.type === MsgType.Reply) {
    return 'p-0 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
  }

  if (props.msg.isMe) {
    return 'px-3 py-2 bg-primary text-white border-transparent rounded-tr-sm'
  } else {
    return 'px-3 py-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 border-gray-100 dark:border-gray-700 rounded-tl-sm'
  }
})

// Lottie 动画加载 (Step 3: 整合 Lottie 逻辑)
const loadLottieAnimation = async () => {
  if (!isSuperEmoji.value || !lottieContainer.value) return

  try {
    const lottie = await import('lottie-web')
    const faceId = typeof props.msg.content === 'object' && 'id' in props.msg.content ? props.msg.content.id : 0
    const animUrl = EmojiUtils.getSuperUrl(Number(faceId))

    const response = await fetch(animUrl)
    const animData = await response.json()

    lottie.default.loadAnimation({
      container: lottieContainer.value,
      renderer: 'svg',
      loop: false,
      autoplay: true,
      animationData: animData
    })
  } catch (e) {
    console.error('[Bubble] Load Lottie failed', e)
  }
}

// 方法
const handleContextMenu = (e: MouseEvent) => {
  emit('contextmenu', e, props.msg)
}

const downloadFile = () => {
  message.info('开始获取文件下载链接...')
}

const jumpToOrigin = () => {
  console.log('Jump to origin message')
}

const playAudio = () => {
  audioRef.value?.play()
}

const handleCardClick = () => {
  if (cardData.value.url) {
    window.open(cardData.value.url, '_blank')
  }
}

// 生命周期
onMounted(() => {
  if (isSuperEmoji.value) {
    nextTick(() => {
      loadLottieAnimation()
    })
  }
})

watch(
  () => props.msg,
  () => {
    if (isSuperEmoji.value) {
      nextTick(() => {
        loadLottieAnimation()
      })
    }
  },
  { deep: true }
)
</script>

<style scoped>
/* Markdown 样式 */
:deep(.markdown-body a) {
  color: #3b82f6;
  text-decoration: underline;
}
:deep(.markdown-body img) {
  max-width: 100%;
  border-radius: 4px;
}
:deep(.markdown-body code) {
  background: rgba(0, 0, 0, 0.1);
  padding: 2px 4px;
  border-radius: 4px;
  font-family: monospace;
}
:deep(.markdown-body pre) {
  background: #f1f5f9;
  padding: 8px;
  border-radius: 8px;
  overflow-x: auto;
}
.dark :deep(.markdown-body pre) {
  background: #1e293b;
}
.dark :deep(.markdown-body code) {
  background: rgba(255, 255, 255, 0.1);
}
</style>
