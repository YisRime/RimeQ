<template>
  <div class="ui-flex-col-full bg-transparent relative select-none">
    <!-- 顶部导航 -->
    <header class="h-14 shrink-0 px-3 border-b border-white/5 flex items-center gap-3 z-30 bg-transparent backdrop-blur-md">
      <Button v-tooltip.bottom="'返回'" icon="i-ri-arrow-left-s-line" text rounded class="!w-8 !h-8 !text-foreground-sub shrink-0" @click="goBack" />
      <!-- 标题 -->
      <div class="flex-1 min-w-0 flex items-center gap-2">
        <span class="font-bold text-base text-foreground-main truncate">
          {{ data.current ? data.current.name : '群相册' }}
        </span>
        <Badge :value="data.current ? data.photos.length : data.albums.length" severity="secondary" class="!text-[10px] !h-4 !min-w-6" />
      </div>
      <!-- 操作按钮 -->
      <div class="flex gap-1">
        <Button v-if="data.current && backendType === 'LLOneBot'" v-tooltip.bottom="'删除相册'" icon="i-ri-delete-bin-line" text rounded severity="danger" class="!w-8 !h-8 !text-red-500 hover:!bg-red-500/10" @click="handleDelete('album', data.current!)" />
        <Button v-if="!data.current && backendType === 'LLOneBot'" v-tooltip.bottom="'新建相册'" icon="i-ri-folder-add-line" text rounded class="!w-8 !h-8 !text-foreground-sub hover:!text-primary" @click="ui.showCreate = true" />
        <Button v-if="data.current" v-tooltip.bottom="'上传'" icon="i-ri-upload-2-line" text rounded class="!w-8 !h-8 !text-foreground-sub hover:!text-primary" @click="fileInput?.click()" />
      </div>
    </header>
    <!-- 内容区域 -->
    <div class="flex-1 min-h-0 relative bg-transparent">
      <!-- 相册列表 -->
      <div v-if="!data.current" class="h-full overflow-y-auto ui-scrollbar p-3">
        <div v-if="ui.loading && !data.albums.length" class="h-full ui-flex-center">
          <ProgressSpinner />
        </div>
        <div v-else-if="data.albums.length" class="flex flex-col gap-3">
          <div
            v-for="album in data.albums"
            :key="album.album_id"
            class="group relative h-36 rounded-2xl overflow-hidden cursor-pointer border border-white/10 shadow-sm bg-background-sub/20"
            @click="openAlbum(album)"
          >
            <!-- 背景图 -->
            <template v-if="album.upload_number > 0">
              <img
                :src="getAlbumCover(album)"
                class="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110 opacity-80"
                referrerpolicy="no-referrer"
                loading="lazy"
              />
            </template>
            <template v-else>
              <div class="absolute inset-0 size-full bg-background-sub/10 ui-flex-center">
                <div class="i-ri-gallery-line text-4xl text-foreground-dim opacity-50" />
              </div>
            </template>
            <!-- 信息 -->
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
              <div class="mb-1">
                <span class="text-white font-bold text-base truncate shadow-sm">{{ album.name }}</span>
                <p v-if="album.desc" class="text-xs text-white/70 truncate shadow-sm m-0">{{ album.desc }}</p>
              </div>
              <div class="flex justify-between items-center text-[10px] text-white/80 font-mono">
                <span>{{ formatTime(album.last_upload_time * 1000)}}</span>
                <span>{{ album.upload_number }}</span>
              </div>
            </div>
          </div>
        </div>
        <!-- 空状态 -->
        <div v-else class="h-full ui-flex-center flex-col text-foreground-dim opacity-50 gap-2">
          <div class="i-ri-gallery-line text-4xl" />
          <span class="text-xs">暂无相册</span>
        </div>
      </div>
      <!-- 图片列表 -->
      <div v-else class="h-full overflow-y-auto ui-scrollbar p-0.5">
        <template v-if="data.photos.length">
           <div class="grid grid-cols-3 gap-0.5">
             <div
               v-for="(item, idx) in data.photos"
               :key="item.lloc"
               class="aspect-square relative cursor-pointer bg-background-sub/10 overflow-hidden group"
               @click="ui.activeIndex = idx"
             >
               <!-- 缩略图 -->
               <img
                 :src="getMediaUrl(item, 'thumb')"
                 class="size-full object-cover hover:opacity-90 transition-opacity"
                 loading="lazy"
                 referrerpolicy="no-referrer"
               />
               <div v-if="item.type === 1" class="ui-abs-center ui-flex-center text-white/80 drop-shadow-md">
                 <div class="i-ri-play-circle-line text-2xl" />
               </div>
             </div>
           </div>
           <!-- 底部锚点 -->
           <div ref="loadTrigger" class="h-12 w-full shrink-0 flex items-center justify-center">
              <ProgressSpinner v-if="ui.loading" />
           </div>
        </template>
        <div v-else-if="ui.loading" class="h-full ui-flex-center">
          <ProgressSpinner />
        </div>
        <div v-else class="h-full ui-flex-center flex-col text-foreground-dim opacity-50 gap-2">
           <div class="i-ri-image-line text-4xl" />
           <span class="text-xs">暂无图片</span>
        </div>
      </div>
    </div>
    <!-- 详情查看器 -->
    <div
      v-if="activeMedia"
      class="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col"
      v-motion
      :initial="{ opacity: 0 }"
      :enter="{ opacity: 1, transition: { duration: 200 } }"
      :leave="{ opacity: 0, transition: { duration: 200 } }"
      @click.self="closeViewer"
    >
      <!-- 顶部栏 -->
      <header class="absolute top-0 inset-x-0 h-14 flex items-center justify-between gap-3 px-4 z-20">
        <div class="flex-1 flex items-center gap-3 overflow-hidden text-white">
          <Avatar :image="`https://q1.qlogo.cn/g?b=qq&s=0&nk=${activeMedia.uploader}`" shape="circle" class="!w-8 !h-8 border border-white/20" />
          <div class="flex flex-col min-w-0">
            <span class="text-xs font-bold truncate">{{ contactStore.getUserName(activeMedia.uploader) }}</span>
            <span class="text-[10px] opacity-70 font-mono">{{ formatTime(activeMedia.upload_time * 1000) }}</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <Button v-tooltip.bottom="'下载'" icon="i-ri-download-line" text rounded class="!w-8 !h-8 !text-white/70 hover:!text-white hover:!bg-white/10" @click="downloadMedia(activeMedia)" />
          <Button v-if="backendType === 'NapCat' && canDeleteMedia" v-tooltip.bottom="'删除'" icon="i-ri-delete-bin-line" text rounded class="!w-8 !h-8 !text-white/70 hover:!text-red-400 hover:!bg-white/10" @click="handleDelete('photo', activeMedia!)" />
        </div>
      </header>
      <!-- 主体 -->
      <div
        class="flex-1 flex flex-col items-center justify-center overflow-hidden group/viewer"
        @click.self="closeViewer"
      >
        <!-- 切换按钮 -->
        <div
          v-if="ui.activeIndex > 0"
          class="absolute left-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full text-white/50 cursor-pointer hover:text-white hover:bg-black/20 transition-all opacity-0 group-hover/viewer:opacity-100"
          @click.stop="switchMedia(-1)"
        >
          <div class="i-ri-arrow-left-s-line text-2xl drop-shadow-md" />
        </div>
        <div
          v-if="ui.activeIndex < data.photos.length - 1"
          class="absolute right-2 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full text-white/50 cursor-pointer hover:text-white hover:bg-black/20 transition-all opacity-0 group-hover/viewer:opacity-100"
          @click.stop="switchMedia(1)"
        >
          <div class="i-ri-arrow-right-s-line text-2xl drop-shadow-md" />
        </div>
        <!-- 媒体 -->
        <div class="relative max-w-[90vw] max-h-[70vh]" @click.stop>
          <video
            v-if="activeMedia.type === 1"
            :key="activeMedia.lloc"
            :src="getMediaUrl(activeMedia, 'full')"
            controls
            autoplay
            loop
            playsinline
            webkit-playsinline
            class="max-w-full max-h-full object-contain"
            referrerpolicy="no-referrer"
          />
          <img
            v-else
            :src="getMediaUrl(activeMedia, 'full')"
            class="max-w-full max-h-full object-contain transition-transform duration-200"
            referrerpolicy="no-referrer"
            draggable="false"
          />
        </div>
        <!-- 页码 -->
        <div class="mt-2 text-white/80 font-mono text-xs bg-black/30 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10">
          {{ ui.activeIndex + 1 }} / {{ data.photos.length }}
        </div>
      </div>
      <!-- 底部互动栏 -->
      <div
        v-if="backendType === 'NapCat'"
        class="absolute bottom-0 inset-x-0 z-20 p-4 pt-12 bg-gradient-to-t from-black/70 to-transparent flex flex-col gap-3 max-h-[50vh] overflow-y-auto ui-scrollbar"
        @click.stop
      >
        <div class="flex flex-col">
           <!-- 图片描述 -->
           <p v-if="activeMedia.desc && activeMedia.desc.trim()" class="text-xs text-white/90 whitespace-pre-wrap leading-relaxed px-1 mb-2">
             {{ activeMedia.desc }}
           </p>
           <!-- 互动操作 -->
           <div class="flex justify-between items-center text-white/80 text-xs px-1">
              <span
                class="flex items-center gap-1.5 cursor-pointer hover:text-white"
                :class="activeMedia.like?.liked ? 'text-primary' : ''"
                @click="handleLike"
              >
                <i :class="activeMedia.like?.liked ? 'i-ri-thumb-up-fill' : 'i-ri-thumb-up-line'"/>
                {{ activeMedia.like?.count || 0 }}
              </span>
              <span class="flex items-center gap-1.5 cursor-pointer hover:text-white" @click="ui.showComment = !ui.showComment">
                <i class="i-ri-chat-1-line"/> {{ activeMedia.comment?.count || 0 }}
              </span>
           </div>
        </div>
         <!-- 评论输入 -->
         <div
           v-if="ui.showComment"
           class="flex gap-2 items-center shrink-0"
           v-motion
           :initial="{ opacity: 0, y: 10 }"
           :enter="{ opacity: 1, y: 0, transition: { duration: 200 } }"
           :leave="{ opacity: 0, y: 10, transition: { duration: 150 } }"
         >
           <div class="flex-1 h-8 bg-white/10 rounded-full flex items-center px-3 border border-white/10 focus-within:bg-white/20 focus-within:border-white/30 transition-colors">
             <input
               v-model="form.comment"
               placeholder="发表评论..."
               class="bg-transparent border-none outline-none text-xs text-white placeholder-white/40 w-full"
               @keyup.enter="sendComment"
             />
           </div>
           <div
             class="w-8 h-8 rounded-full ui-flex-center cursor-pointer transition-colors"
             :class="form.comment ? 'bg-primary text-white' : 'bg-white/10 text-white/30'"
             @click="sendComment"
           >
             <div class="i-ri-send-plane-fill text-xs" />
           </div>
         </div>
      </div>
    </div>
    <!-- 隐式文件输入 -->
    <input ref="fileInput" type="file" class="hidden" multiple accept="image/*,video/*" @change="handleUpload">
    <!-- 新建相册弹窗 -->
    <Dialog v-model:visible="ui.showCreate" modal header="新建相册" :style="{ width: '18rem' }">
      <div class="flex flex-col gap-3 pt-1">
        <InputText v-model="form.name" placeholder="名称" class="w-full !text-sm !bg-background-sub/50 !border-transparent !rounded-lg" autofocus />
        <InputText v-model="form.desc" placeholder="描述" class="w-full !text-sm !bg-background-sub/50 !border-transparent !rounded-lg" />
        <div class="flex justify-end gap-2 mt-2">
          <Button label="取消" text severity="secondary" size="small" @click="ui.showCreate = false" />
          <Button label="创建" size="small" :disabled="!form.name" @click="createAlbum" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useIntersectionObserver } from '@vueuse/core'
import { Button, Avatar, useToast, useConfirm, Dialog, InputText, Badge, ProgressSpinner } from 'primevue'
import { bot } from '@/api'
import { useContactStore, useSettingStore } from '@/stores'
import { formatTime } from '@/utils/format'
import type { GroupAlbum, GroupAlbumMedia } from '@/types'

// 核心 Hooks
const router = useRouter()
const route = useRoute()
const toast = useToast()
const confirm = useConfirm()
const contactStore = useContactStore()
const settingStore = useSettingStore()

// 常量与引用
const groupId = computed(() => Number(route.params.id))
const backendType = ref('')
const fileInput = ref<HTMLInputElement>()
const loadTrigger = ref<HTMLElement>()

// 缓存接口定义
interface CacheData {
  list: GroupAlbumMedia[]
  next: string
  hasMore: boolean
}
// 相册缓存
const photoCache = new Map<string, CacheData>()

// 响应式状态
const data = reactive({
  albums: [] as GroupAlbum[],
  photos: [] as GroupAlbumMedia[],
  current: null as GroupAlbum | null,
  nextAttachInfo: '',
  hasMore: false,
})

// UI 交互状态
const ui = reactive({
  loading: false,
  activeIndex: -1,
  showComment: false,
  showCreate: false,
})

// 表单数据
const form = reactive({ name: '', desc: '', comment: '' })

// 当前查看
const activeMedia = computed(() => ui.activeIndex >= 0 ? data.photos[ui.activeIndex] : null)

// 权限判断
const canDeleteMedia = computed(() => {
  if (!activeMedia.value) return false
  const uid = settingStore.user?.user_id
  const myInfo = contactStore.members.get(groupId.value)?.find(m => m.user_id === uid)
  return activeMedia.value.uploader === uid || myInfo?.role === 'owner' || myInfo?.role === 'admin'
})

// 加载更多
useIntersectionObserver(loadTrigger, ([entry]) => {
  if (entry?.isIntersecting && !ui.loading && data.hasMore) loadPhotos(true)
})

// 获取相册封面
const getAlbumCover = (album: GroupAlbum) => {
  const coverObj = album.cover
  if (coverObj && typeof coverObj === 'object') {
     const urlVal = coverObj.image?.default_url
     return (typeof urlVal === 'object' ? (urlVal as any).url : urlVal) || ''
  }
  return (album as any).cover_url || (album as any).url || ''
}

// 获取媒体文件
const getMediaUrl = (media: GroupAlbumMedia, type: 'thumb' | 'full' = 'full') => {
    if (media.type === 1) {
      if (type === 'thumb') {
         const cover = media.video?.cover?.default_url || media.image?.default_url || (media as any).url
         return (typeof cover === 'object' ? (cover as any).url : cover) || ''
      }
      return media.video?.url || (media as any).url || ''
    }
    if (type === 'thumb') {
      const thumb = media.image?.default_url || (media as any).url
      return (typeof thumb === 'object' ? (thumb as any).url : thumb) || ''
    }
    const large = (media.image?.photo_url || []).find(p => p.spec === 6)
    const largeUrl = large?.url
    if (largeUrl) return (typeof largeUrl === 'object' ? (largeUrl as any).url : largeUrl) || ''
    const defaultUrl = media.image?.default_url
    return (typeof defaultUrl === 'object' ? (defaultUrl as any).url : defaultUrl) || (media as any).url || ''
}

// 加载相册列表
const loadAlbums = async (force = false) => {
  if (data.albums.length > 0 && !force) return
  ui.loading = true
  try {
    const res: any = bot.backend === 'NapCat'
      ? await bot.getQunAlbumList(groupId.value)
      : await bot.getGroupAlbumList(groupId.value)
    const list: any[] = Array.isArray(res) ? res : (res.album_list || res.data || [])
    data.albums = list.map((item: any) => ({
      ...item,
      album_id: String(item.album_id),
      name: item.album_name || item.name,
      owner: Number(item.owner),
      create_time: Number(item.create_time),
      last_upload_time: Number(item.last_upload_time || item.modify_time || item.create_time || 0),
      modify_time: item.modify_time ? Number(item.modify_time) : undefined,
      upload_number: Number(item.upload_number || item.photo_num || 0),
      creator: item.creator ? { ...item.creator, uin: Number(item.creator.uin) } : undefined,
    })).sort((a: GroupAlbum, b: GroupAlbum) => b.last_upload_time - a.last_upload_time)
  } catch (e) {
    toast.add({ severity: 'error', summary: '加载相册失败', detail: String(e), life: 3000 })
  } finally {
    ui.loading = false
  }
}

// 加载照片列表
const loadPhotos = async (append = false) => {
  const currentAlbumId = data.current?.album_id
  if (!currentAlbumId) return
  if (append) {
    if (!data.hasMore || ui.loading) return
  } else {
    ui.loading = true
    data.photos = []
    data.nextAttachInfo = ''
    data.hasMore = false
  }
  if (ui.loading && append) return
  ui.loading = true
  try {
    const res: any = await bot.getGroupAlbumMediaList(groupId.value, currentAlbumId, data.nextAttachInfo)
    const rawList = Array.isArray(res) ? res : (res.media_list || [])
    const nextInfo = !Array.isArray(res) ? (res.next_attach_info ?? res.attach_info ?? '') : ''
    const hasMore = !Array.isArray(res) ? !!(res.next_has_more ?? res.has_more) : false
    const parsedPhotos: GroupAlbumMedia[] = rawList.map((item: any) => ({
      ...item,
      type: item.type ?? 0,
      lloc: item.lloc,
      uploader: Number(item.uploader || item.upload_user?.uin),
      upload_user: item.upload_user ? { ...item.upload_user, uin: Number(item.upload_user.uin) } : undefined,
      upload_time: Number(item.upload_time || 0),
      like: {
        count: item.like?.count || item.like?.num || 0,
        liked: !!item.like?.liked || !!item.like?.is_liked,
        key: item.like?.key || ''
      },
      comment: {
        count: item.comment?.count || item.comment?.num || 0
      },
    }))
    if (append) {
      data.photos.push(...parsedPhotos)
    } else {
      data.photos = parsedPhotos
    }
    data.nextAttachInfo = nextInfo
    data.hasMore = hasMore
    photoCache.set(currentAlbumId, {
      list: data.photos,
      next: nextInfo,
      hasMore: hasMore
    })
  } catch (e) {
    toast.add({ severity: 'error', summary: '加载照片失败', detail: String(e), life: 3000 })
  } finally {
    ui.loading = false
  }
}

// 进入相册
const openAlbum = (album: GroupAlbum) => {
  data.current = album
  if (photoCache.has(album.album_id)) {
    const cached = photoCache.get(album.album_id)!
    data.photos = cached.list
    data.nextAttachInfo = cached.next
    data.hasMore = cached.hasMore
  } else {
    loadPhotos(false)
  }
}

// 返回上一级
const goBack = () => {
  if (data.current) {
    data.current = null
    data.photos = []
    loadAlbums()
  } else {
    router.back()
  }
}

// 关闭查看器
const closeViewer = () => {
  ui.activeIndex = -1
  ui.showComment = false
}

// 切换媒体
const switchMedia = (delta: number) => {
  const next = ui.activeIndex + delta
  if (next >= 0 && next < data.photos.length) {
    ui.activeIndex = next
    ui.showComment = false
  }
}

// 下载媒体
const downloadMedia = (media: GroupAlbumMedia) => {
  const url = getMediaUrl(media, 'full')
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = `album_${media.lloc}.${media.type === 1 ? 'mp4' : 'jpg'}`
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

// 新建相册
const createAlbum = async () => {
  if (!form.name) return
  try {
    await bot.createGroupAlbum(groupId.value, form.name, form.desc)
    ui.showCreate = false; form.name = ''; form.desc = ''
    loadAlbums(true)
  } catch(e) {
    toast.add({ severity: 'error', summary: '创建失败', detail: String(e), life: 3000 })
  }
}

// 删除项目
const handleDelete = (type: 'album' | 'photo', item: GroupAlbum | GroupAlbumMedia) => {
  confirm.require({
    message: '确定要删除此内容吗？',
    header: '删除内容',
    acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        if (type === 'album') {
          await bot.deleteGroupAlbum(groupId.value, (item as GroupAlbum).album_id);
          goBack();
        } else {
          const photo = item as GroupAlbumMedia;
          const currentAlbumId = data.current?.album_id
          if (!photo.lloc || !currentAlbumId) return;
          await bot.delGroupAlbumMedia(groupId.value, currentAlbumId, photo.lloc);
          const index = data.photos.findIndex(p => p.lloc === photo.lloc);
          if (index > -1) data.photos.splice(index, 1);
          const cached = photoCache.get(currentAlbumId)
          if (cached) cached.list = data.photos
          if (ui.activeIndex === index) {
              if (data.photos.length === 0) closeViewer();
              else if (ui.activeIndex >= data.photos.length) ui.activeIndex = data.photos.length - 1;
          }
        }
      } catch (e) {
        toast.add({ severity: 'error', summary: '删除失败', detail: String(e), life: 3000 });
      }
    }
  });
}

// 上传文件
const handleUpload = async (e: Event) => {
  const files = (e.target as HTMLInputElement).files
  const currentAlbumId = data.current?.album_id
  if (!files?.length || !currentAlbumId) return
  toast.add({ severity: 'info', summary: '开始上传...', detail: `正在上传 ${files.length} 个文件`, life: 3000 })
  try {
    const albumName = data.current?.name || ''
    if (bot.backend === 'NapCat') {
      const uploadPromises = Array.from(files).map(file =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = async (event) => {
            try {
              const res = await bot.uploadImageToQunAlbum(groupId.value, currentAlbumId, event.target?.result as string, albumName);
              resolve(res);
            } catch (err) { reject(err) }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
      );
      await Promise.all(uploadPromises);
    } else {
      const b64s = await Promise.all(Array.from(files).map(f => new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = e => resolve((e.target?.result as string));
        r.onerror = reject;
        r.readAsDataURL(f);
      })))
      await bot.uploadGroupAlbum(groupId.value, currentAlbumId, b64s)
    }
    toast.add({ severity: 'success', summary: '上传成功', detail: `成功上传 ${files.length} 个文件`, life: 3000 });
    setTimeout(() => {
      if (bot.backend === 'NapCat') {
        photoCache.delete(currentAlbumId)
        loadPhotos(false)
      } else {
        loadAlbums(true)
      }
    }, 2000);
  } catch(e) { toast.add({ severity: 'error', summary: '上传失败', detail: String(e), life: 3000 }) }
}

// 点赞
const handleLike = async () => {
  const mediaIndex = ui.activeIndex
  if (mediaIndex < 0 || bot.backend !== 'NapCat' || !data.current) return
  const media = data.photos[mediaIndex]
  if (!media || !media.lloc) return
  const set = !media.like?.liked
  if (!media.like) media.like = { count: 0, liked: false, key: '' };
  media.like.liked = set
  media.like.count = (media.like.count || 0) + (set ? 1 : -1)
  try {
    await bot.setGroupAlbumLike(groupId.value, data.current.album_id, media.batch_id || '', media.lloc, set);
  } catch (e) {
    if (media.like) {
      media.like.liked = !set
      media.like.count = (media.like.count || 0) + (set ? -1 : 1)
    }
    toast.add({ severity: 'error', summary: '点赞失败', detail: String(e), life: 3000 });
  }
}

// 发送评论
const sendComment = async () => {
  const mediaIndex = ui.activeIndex
  if (mediaIndex < 0 || !form.comment.trim() || bot.backend !== 'NapCat' || !data.current) return
  const media = data.photos[mediaIndex]
  if (!media || !media.lloc) return
  try {
    await bot.doGroupAlbumComment(groupId.value, data.current.album_id, media.lloc, form.comment);
    if (media.comment) media.comment.count = (media.comment.count || 0) + 1;
    form.comment = '';
  } catch (e) {
    toast.add({ severity: 'error', summary: '评论失败', detail: String(e), life: 3000 });
  }
}

// 组件挂载
onMounted(() => {
  backendType.value = bot.backend
  if (groupId.value) loadAlbums()
})

// 清空缓存
onUnmounted(() => photoCache.clear())
</script>
