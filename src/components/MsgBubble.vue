<template>
  <!-- 系统提示消息 -->
  <div v-if="isSystem" class="ui-flex-center my-2 w-full select-none">
    <div class="bg-background-dim/20 ui-text-foreground-dim text-[11px] px-3 py-0.5 rounded-full">
      {{ processed.previewText }}
    </div>
  </div>

  <!-- 常规消息容器 -->
  <div
    v-else
    class="flex gap-2.5 w-full group/row relative box-border"
    :class="[isMe ? 'flex-row-reverse' : 'flex-row', { 'opacity-60': selectionMode }]"
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
      <!-- 发送者昵称与角色 -->
      <div v-if="!isMe" class="ui-flex-x gap-1.5 mb-1 ml-1 select-none leading-none">
        <span class="text-xs text-foreground-sub/80">{{ msg.sender.card || msg.sender.nickname }}</span>
        <span v-if="msg.sender.role === 'owner'" class="text-[10px] px-1 rounded-sm bg-yellow-100 text-yellow-600 font-bold opacity-90">群主</span>
        <span v-if="msg.sender.role === 'admin'" class="text-[10px] px-1 rounded-sm bg-green-100 text-green-600 font-bold opacity-90">管理</span>
      </div>

      <!-- 消息气泡 -->
      <!-- 动态类名：纯图片时移除背景色，实现通透效果 -->
      <div
        class="relative shadow-sm ui-trans ui-dur-fast overflow-hidden flex flex-col"
        :class="processed.isPureImage ? 'bg-transparent shadow-none' : bubbleClass"
      >
        <!-- 引用回复 (置顶显示) -->
        <div
          v-if="processed.replyId"
          class="mb-1.5 pb-1 border-b border-black/10 dark:border-white/10 opacity-80 text-xs flex flex-col gap-0.5 select-none bg-black/5 dark:bg-white/5 -mx-3.5 -mt-2 px-3.5 pt-2 rounded-t-lg cursor-pointer hover:bg-black/10 transition-colors"
          @click.stop="scrollToMsg(processed.replyId)"
        >
           <div class="flex items-center gap-1 text-primary font-bold">
             <div class="i-ri-reply-fill text-xs"></div>
             <span>{{ processed.replyDetail?.sender || '未知用户' }}</span>
           </div>
           <span class="truncate max-w-[200px] text-foreground-sub">{{ processed.replyDetail?.text || '引用消息' }}</span>
        </div>

        <!-- 混合内容渲染区域 -->
        <!-- items-end 保证文字和表情底对齐; flex-wrap 保证自动换行 -->
        <div class="flex flex-wrap items-end gap-1 break-words leading-relaxed text-[15px] max-w-full" style="word-break: break-word;">

          <template v-for="(seg, index) in processed.segments" :key="index">

            <!-- 文本 -->
            <span
              v-if="seg.type === 'text'"
              class="whitespace-pre-wrap align-middle"
              v-html="formatTextToHtml(seg.text || '')"
            ></span>

            <!-- 表情 (Face) -->
            <span v-else-if="seg.type === 'face'" class="inline-block align-middle mx-0.5" :title="`表情 ${seg.faceId}`">
               <img v-if="getFaceUrl(seg.faceId)" :src="getFaceUrl(seg.faceId)" class="w-6 h-6 inline-block align-bottom" />
               <span v-else class="text-xs bg-black/10 px-1 rounded">[表情:{{ seg.faceId }}]</span>
            </span>

            <!-- At (提及) -->
            <span
              v-else-if="seg.type === 'at'"
              class="text-primary font-bold select-none cursor-pointer hover:underline mx-0.5 px-1 rounded bg-primary/10 align-middle text-sm py-0.5"
              @click.stop
            >@{{ seg.atName || seg.atUid }}</span>

            <!-- 图片 / MFace -->
            <!-- 增加 referrerpolicy="no-referrer" 防止 NTQQ 链接报 403 -->
            <div
              v-else-if="seg.type === 'image' || seg.type === 'mface'"
              class="block my-1 rounded-lg overflow-hidden max-w-full relative group/img"
            >
              <img
                :src="seg.url"
                class="max-w-full max-h-[360px] min-w-[50px] min-h-[50px] object-cover cursor-pointer bg-background-dim/50 block"
                referrerpolicy="no-referrer"
                loading="lazy"
                @click.stop="previewImage(seg.url)"
                @error="handleImgError($event, seg)"
              />
              <!-- 加载失败占位 -->
              <div class="hidden absolute inset-0 bg-gray-200 dark:bg-gray-800 text-xs text-gray-500 flex-center flex-col gap-1 p-2 text-center img-error-placeholder min-h-[80px] min-w-[80px]">
                <div class="i-ri-image-off-line text-xl"></div>
                <span>图片加载失败</span>
                <a :href="seg.url" target="_blank" class="text-primary hover:underline text-[10px]" @click.stop>尝试打开</a>
              </div>
            </div>

            <!-- 视频 -->
            <div v-else-if="seg.type === 'video'" class="block my-1 rounded-lg overflow-hidden max-w-full relative w-full">
               <video :src="seg.url" controls class="max-w-full max-h-[320px] bg-black rounded-lg block" referrerpolicy="no-referrer"></video>
            </div>

            <!-- 语音 (Record) -->
            <div v-else-if="seg.type === 'record'" class="flex items-center gap-2 px-2 py-1 my-1 rounded-full bg-black/5 dark:bg-white/10 cursor-pointer hover:bg-black/10 transition-colors w-fit select-none" title="播放语音">
                <div class="i-ri-voiceprint-line text-lg text-primary"></div>
                <span class="text-xs">语音消息</span>
                <!-- 这里暂时没有实现实际播放逻辑，仅做 UI 展示 -->
            </div>

            <!-- 文件 -->
            <div v-else-if="seg.type === 'file'" class="w-full flex items-center gap-3 p-3 bg-white/80 dark:bg-black/20 rounded-xl border border-black/5 my-1 cursor-pointer hover:bg-white/90 transition-colors shadow-sm">
               <div class="w-10 h-10 bg-primary/10 text-primary rounded-lg ui-flex-center text-xl shrink-0">
                 <div class="i-ri-file-line"></div>
               </div>
               <div class="flex-1 min-w-0 flex flex-col">
                  <span class="text-sm font-bold truncate">{{ seg.fileName }}</span>
                  <span class="text-[10px] opacity-60">{{ seg.fileSize }}</span>
               </div>
            </div>

            <!-- 卡片 (Card) -->
            <div v-else-if="seg.type === 'card'" class="w-full my-1 max-w-xs">
                <div class="flex flex-col bg-white/90 dark:bg-[#333] rounded-lg border border-black/5 dark:border-white/5 overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                     @click.stop="openLink(seg.url)">
                    <!-- 标题区 -->
                    <div class="px-3 py-2 border-b border-black/5 flex items-center gap-2 bg-gray-50/50 dark:bg-white/5">
                        <div v-if="seg.preview && !seg.preview.startsWith('http')" class="w-4 h-4 rounded-full bg-primary/20 flex-center text-[10px] text-primary shrink-0">
                            <div class="i-ri-share-line"></div>
                        </div>
                        <img v-else-if="seg.preview" :src="seg.preview" class="w-4 h-4 rounded-full object-cover shrink-0" />
                        <span class="text-xs font-bold truncate flex-1">{{ seg.title || '卡片消息' }}</span>
                    </div>
                    <!-- 内容区 -->
                    <div class="p-3 flex gap-3">
                        <div class="flex-1 min-w-0 flex flex-col gap-1">
                            <span class="text-xs line-clamp-3 text-foreground-sub leading-relaxed">{{ seg.desc || seg.text }}</span>
                        </div>
                        <img v-if="seg.preview && seg.preview.startsWith('http')" :src="seg.preview" class="w-16 h-16 rounded object-cover bg-black/5 shrink-0" />
                    </div>
                    <!-- 底部来源 -->
                    <div v-if="seg.source" class="px-3 py-1 bg-black/5 dark:bg-white/5 text-[10px] text-foreground-dim flex items-center gap-1">
                        <div class="i-ri-link-m"></div>
                        <span>{{ seg.source }}</span>
                    </div>
                </div>
            </div>

            <!-- 合并转发 (Forward) -->
            <div v-else-if="seg.type === 'forward'" class="w-full my-1 max-w-xs">
                <div class="flex flex-col bg-white/90 dark:bg-[#333] rounded-lg border border-black/5 dark:border-white/5 overflow-hidden shadow-sm cursor-pointer hover:bg-white dark:hover:bg-[#3a3a3a] transition-colors">
                    <div class="px-3 py-2 border-b border-black/5 font-bold text-sm truncate bg-gray-50/50 dark:bg-white/5">
                        {{ seg.title || '聊天记录' }}
                    </div>
                    <div class="p-3 flex flex-col gap-1 text-xs text-foreground-sub">
                        <div v-for="(node, i) in seg.nodes" :key="i" class="truncate opacity-80">
                            <span>{{ node.sender }}: </span>
                            <span>{{ node.text }}</span>
                        </div>
                        <div v-if="!seg.nodes?.length" class="italic opacity-50">查看转发消息</div>
                    </div>
                    <div class="px-3 py-1 bg-black/5 dark:bg-white/5 text-[10px] text-foreground-dim border-t border-black/5">
                        查看 {{ seg.count || '' }} 条转发消息
                    </div>
                </div>
            </div>

            <!-- Markdown -->
            <div v-else-if="seg.type === 'markdown'" class="w-full markdown-body text-sm" v-html="seg.text"></div>

            <!-- 未知 -->
            <span v-else class="text-xs opacity-50 bg-red-500/10 text-red-500 px-1 rounded">[未知: {{ seg.type }}]</span>

          </template>
        </div>
      </div>

      <!-- 已撤回提示 -->
      <div v-if="msg.recalled" class="text-[11px] ui-text-foreground-dim mt-1 ui-flex-x gap-1 ml-1">
        <div class="i-ri-arrow-go-back-line" />
        已撤回
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import Avatar from 'primevue/avatar'
import { useSettingStore } from '@/stores/setting'
import { EmojiUtils } from '@/utils/emoji'
import { processMessageChain, formatTextToHtml } from '@/utils/handler'
import type { IMessage } from '@/types'

const settingStore = useSettingStore()
const router = useRouter()

const props = defineProps<{
  msg: IMessage
  selectionMode?: boolean
  isSelected?: boolean
}>()

const emit = defineEmits<{
  (e: 'contextmenu', ev: MouseEvent, msg: IMessage): void
  (e: 'poke', uid: number): void
  (e: 'select', msgId: number): void
}>()

// 判断角色
const isMe = computed(() => props.msg.sender.user_id === settingStore.user?.user_id)
const isSystem = computed(() => props.msg.sender.user_id === 10000)

// 核心处理
const processed = computed(() => processMessageChain(props.msg))

// 气泡样式
const bubbleClass = computed(() => {
  if (isMe.value) {
    return 'px-3.5 py-2.5 bg-primary text-white rounded-[18px] rounded-tr-sm shadow-sm shadow-primary/20 border border-primary/20'
  }
  return 'px-3.5 py-2.5 bg-white dark:bg-[#2A2A2A] text-foreground-main rounded-[18px] rounded-tl-sm border border-black/5 dark:border-white/5'
})

// 处理图片错误
const handleImgError = (e: Event, seg: any) => {
  const img = e.target as HTMLImageElement
  // 隐藏坏图，显示占位符
  img.style.display = 'none'
  const container = img.parentElement
  const placeholder = container?.querySelector('.img-error-placeholder')
  if (placeholder) {
    placeholder.classList.remove('hidden')
    placeholder.classList.add('flex')
  }
}

// 获取表情图片
const getFaceUrl = (id?: number) => {
  if (id === undefined) return ''
  return EmojiUtils.getNormalUrl(id)
}

// 预览图片
const previewImage = (url?: string) => {
  if (url && !props.selectionMode) {
    router.push({ query: { ...router.currentRoute.value.query, view: url } })
  }
}

// 打开外部链接
const openLink = (url?: string) => {
    if (url) window.open(url, '_blank')
}

// 滚动到引用消息 (简单实现，需配合 Store 查找 DOM)
const scrollToMsg = (id: string | null) => {
    if (!id) return
    const el = document.getElementById(`msg-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

// 交互
const onBubbleClick = () => {
  if (props.selectionMode) emit('select', props.msg.message_id)
}
</script>

<style scoped>
/* 确保链接可点击且有下划线 */
:deep(a) {
  text-decoration: underline;
  cursor: pointer;
}
/* 确保图片加载失败时的占位符样式 */
.img-error-placeholder {
  display: none; /* 默认隐藏，JS 控制显示 */
}
</style>
