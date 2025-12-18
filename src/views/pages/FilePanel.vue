<template>
  <div class="h-full w-full flex flex-col bg-white dark:bg-gray-900">
    <div class="md:hidden h-14 flex items-center px-4 border-b border-gray-100 dark:border-gray-800">
      <div class="i-ri-arrow-left-s-line text-xl mr-2 cursor-pointer" @click="goBack" />
      <span class="font-bold">群文件</span>
    </div>

    <div v-if="loading" class="flex-1 flex items-center justify-center">
      <div class="i-ri-loader-4-line animate-spin text-2xl text-gray-400" />
    </div>

    <n-scrollbar v-else class="flex-1 p-4">
      <n-empty v-if="currentFiles.length === 0" description="此文件夹为空" />

      <div v-else class="flex flex-col gap-2">
        <div
          v-for="file in currentFiles"
          :key="file.id"
          class="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg cursor-pointer transition-colors"
          @click="handleFileClick(file)"
        >
          <div
            :class="[file.isDir ? 'i-ri-folder-line text-yellow-400' : 'i-ri-file-line text-blue-400', 'text-2xl']"
          />
          <div class="flex-1 min-w-0">
            <div class="font-medium truncate">{{ file.folder_name || file.file_name }}</div>
            <div class="text-xs text-gray-400 mt-1 flex items-center gap-3">
              <span v-if="!file.isDir">{{ formatFileSize(file.size || 0) }}</span>
              <span v-if="file.uploader_name">{{ file.uploader_name }}</span>
            </div>
          </div>
          <div v-if="file.isDir" class="i-ri-arrow-right-s-line text-gray-300" />
          <div v-else class="i-ri-download-line text-gray-400 hover:text-primary transition-colors" />
        </div>
      </div>
    </n-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { NScrollbar, NEmpty, useMessage } from 'naive-ui'
import { useRoute, useRouter } from 'vue-router'
import { botApi } from '@/api'
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
const message = useMessage()

const groupId = computed(() => (route.params.id as string) || props.groupId || '')

const goBack = () => router.back()

const pathStack = ref<{ id: string; name: string }[]>([])
const currentFiles = ref<GroupFile[]>([])
const loading = ref(false)

const loadFiles = async (folderId: string = '/') => {
  loading.value = true
  currentFiles.value = []
  try {
    const res = await botApi.getGroupFilesByFolder(Number(groupId.value), folderId)
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
    message.error('加载文件列表失败')
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
  message.loading('获取下载链接...')
  try {
    const url = await botApi.getGroupFileUrl(Number(groupId.value), file.file_id || '', file.busid || 0)
    if (url) {
      window.open(url, '_blank')
      message.success('已打开下载链接')
    } else {
      message.error('无法获取下载链接')
    }
  } catch (e) {
    console.error('获取下载链接失败', e)
    message.error('无法获取下载链接')
  }
}

onMounted(() => {
  if (groupId.value) {
    pathStack.value = []
    loadFiles('/')
  }
})
</script>
