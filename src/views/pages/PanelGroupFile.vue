<template>
  <div class="h-full w-full flex flex-col bg-main">
    <div class="md:hidden h-14 flex-x px-4 border-b border-dim">
      <div class="i-ri-arrow-left-s-line text-xl mr-2 cursor-pointer" @click="goBack" />
      <span class="font-bold">群文件</span>
    </div>

    <div v-if="loading" class="flex-1 flex-center">
      <div class="i-ri-loader-4-line animate-spin text-2xl text-sub" />
    </div>

    <div v-else class="flex-1 p-4 overflow-y-auto my-scrollbar">
      <div v-if="currentFiles.length === 0" class="text-center text-sub py-8">此文件夹为空</div>

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="file in currentFiles"
          :key="file.id"
          class="flex-x gap-3 p-3 my-hover rounded-lg cursor-pointer my-trans"
          @click="handleFileClick(file)"
        >
          <div
            :class="[file.isDir ? 'i-ri-folder-line text-yellow-400' : 'i-ri-file-line text-blue-400', 'text-2xl']"
          />
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">{{ file.folder_name || file.file_name }}</div>
            <div class="text-xs text-sub mt-1 flex-x gap-3">
              <span v-if="!file.isDir">{{ formatFileSize(file.size || 0) }}</span>
              <span v-if="file.uploader_name">{{ file.uploader_name }}</span>
            </div>
          </div>
          <div v-if="file.isDir" class="i-ri-arrow-right-s-line text-dim" />
          <div v-else class="i-ri-download-line text-sub hover:text-primary my-trans" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useToast } from 'primevue/usetoast'
import { useRoute, useRouter } from 'vue-router'
import { bot } from '@/api'
import { formatFileSize } from '@/utils/format'

interface GroupFile {
  id: string
  name: string
  size?: number
  uploader_name?: string
  isDir: boolean
  folder_name?: string
  file_name?: string
  folder_id?: string
  file_id?: string
  busid?: number
}

const props = defineProps<{ groupId?: string }>()

defineOptions({
  name: 'FilePanel'
})

const route = useRoute()
const router = useRouter()
const toast = useToast()

const groupId = computed(() => (route.params.id as string) || props.groupId || '')

const goBack = () => router.back()

const pathStack = ref<{ id: string; name: string }[]>([])
const currentFiles = ref<GroupFile[]>([])
const loading = ref(false)

const loadFiles = async (folderId: string = '/') => {
  loading.value = true
  currentFiles.value = []
  try {
    const res = await bot.getGroupFilesByFolder(Number(groupId.value), folderId)
    const folders = (res.folders || []).map((f: any) => ({
      ...f,
      isDir: true as const,
      id: f.folder_id,
      name: f.folder_name
    }))
    const files = (res.files || []).map((f: any) => ({ ...f, isDir: false as const, id: f.file_id, name: f.file_name }))
    currentFiles.value = [...folders, ...files]
  } catch (e) {
    console.error('加载群文件失败', e)
    toast.add({ severity: 'error', summary: '加载文件列表失败', life: 3000 })
    currentFiles.value = []
  } finally {
    loading.value = false
  }
}

const navigateTo = (idx: number) => {
  if (idx === -1) {
    pathStack.value = []
    loadFiles('/')
  } else {
    pathStack.value = pathStack.value.slice(0, idx + 1)
    const lastItem = pathStack.value[pathStack.value.length - 1]
    if (lastItem) loadFiles(lastItem.id)
  }
}

const handleFileClick = (file: GroupFile) => {
  if (file.isDir) {
    if (file.folder_id && file.folder_name) {
      pathStack.value.push({ id: file.folder_id, name: file.folder_name })
      loadFiles(file.folder_id)
    }
  } else {
    downloadFile(file)
  }
}

const downloadFile = async (file: GroupFile) => {
  toast.add({ severity: 'info', summary: '获取下载链接...', life: 3000 })
  try {
    const res = await bot.getGroupFileUrl(Number(groupId.value), file.file_id || '', file.busid || 0)
    if (res && typeof res === 'object' && 'url' in res) {
      window.open(res.url, '_blank')
      toast.add({ severity: 'success', summary: '已打开下载链接', life: 3000 })
    } else {
      toast.add({ severity: 'error', summary: '无法获取下载链接', life: 3000 })
    }
  } catch (e) {
    console.error('获取下载链接失败', e)
    toast.add({ severity: 'error', summary: '无法获取下载链接', life: 3000 })
  }
}

onMounted(() => {
  if (groupId.value) {
    pathStack.value = []
    loadFiles('/')
  }
})
</script>
