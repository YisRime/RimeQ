<template>
  <div class="ui-flex-col-full bg-transparent relative">
    <!-- 顶部导航栏 -->
    <header class="shrink-0 flex flex-col border-b border-white/5 bg-transparent z-10">
      <div class="h-14 px-3 flex items-center gap-3">
        <Button
          v-tooltip.bottom="'返回'"
          icon="i-ri-arrow-left-s-line"
          text rounded
          class="!w-8 !h-8 !text-foreground-sub shrink-0"
          @click="handleNavigation('back')"
        />
        <!-- 搜索框 -->
        <div class="flex-1 max-w-sm">
          <IconField class="w-full">
            <InputIcon class="i-ri-search-line text-foreground-sub text-xs" />
            <InputText v-model="keyword" placeholder="搜索文件..." class="w-full !h-8 !text-xs !bg-background-sub/30 focus:!bg-background-sub/50 !border-transparent !rounded-lg !pl-8 ui-trans placeholder:text-foreground-dim" />
          </IconField>
        </div>
        <!-- 操作按钮组 -->
        <div class="ui-flex-x gap-1 ml-auto">
          <Button v-tooltip.bottom="'上传文件'" icon="i-ri-upload-cloud-2-line" text rounded class="!w-8 !h-8 !text-foreground-sub hover:!text-primary" @click="fileInput?.click()" />
          <Button v-tooltip.bottom="'新建文件夹'" icon="i-ri-folder-add-line" text rounded class="!w-8 !h-8 !text-foreground-sub hover:!text-primary" @click="openInputDialog('create')" />
          <Button v-if="canManage" v-tooltip.bottom="'批量管理'" :icon="isBatchMode ? 'i-ri-check-double-line text-primary' : 'i-ri-list-check'" text rounded class="!w-8 !h-8 !text-foreground-sub hover:!text-primary" :class="{ '!bg-primary/10': isBatchMode }" @click="isBatchMode = !isBatchMode; selectedFiles.clear()" />
        </div>
      </div>
      <!-- 面包屑导航与容量指示 -->
      <div class="relative h-8 flex items-center border-t border-white/5 bg-background-sub/10 overflow-hidden select-none">
        <!-- 容量条 -->
        <div
          class="absolute inset-y-0 left-0 bg-primary/5 transition-all duration-500 ease-out pointer-events-none z-0"
          :style="{ width: Math.min((spaceInfo.used / (spaceInfo.total || 1)) * 100, 100) + '%' }"
        />
        <!-- 容量文字 -->
        <div class="absolute right-3 top-0 bottom-0 flex items-center z-0 pointer-events-none">
          <span class="text-[10px] font-mono text-foreground-dim italic">
            {{ formatFileSize(spaceInfo.used) }} / {{ formatFileSize(spaceInfo.total) }}
          </span>
        </div>
        <!-- 路径列表 -->
        <div class="relative z-10 flex-1 overflow-x-auto ui-scrollbar whitespace-nowrap mask-linear-fade flex items-center text-xs px-3">
          <div
            class="py-0.5 cursor-pointer hover:text-primary ui-trans shrink-0 flex items-center font-bold"
            :class="!pathStack.length ? 'text-primary' : 'text-foreground-sub'"
            @click="handleNavigation('jump', -1)"
          >
            <span class="leading-none">根</span>
          </div>
          <template v-for="(folder, index) in pathStack" :key="folder.id">
            <span class="opacity-30 font-mono mx-1 text-foreground-dim">/</span>
            <div
              class="py-0.5 cursor-pointer hover:text-primary ui-trans shrink-0 flex items-center"
              :class="index === pathStack.length - 1 ? 'text-foreground-main font-bold' : 'text-foreground-sub'"
              @click="handleNavigation('jump', index)"
            >
              <span class="truncate max-w-[120px]">{{ folder.name }}</span>
            </div>
          </template>
        </div>
      </div>
    </header>
    <!-- 文件列表区域 -->
    <div class="flex-1 overflow-y-auto ui-scrollbar p-1" @click="isBatchMode = false">
      <!-- 加载中 -->
      <div v-if="loading" class="h-full ui-flex-center">
        <ProgressSpinner />
      </div>
      <!-- 空状态 -->
      <div v-else-if="!filteredItems.length" class="flex flex-col items-center justify-center py-20 text-foreground-dim opacity-60">
        <div class="i-ri-folder-open-line text-4xl mb-2" />
        <span class="text-xs">暂无文件</span>
      </div>
      <!-- 列表项 -->
      <VirtualScroller v-else :items="filteredItems" :item-size="46" class="size-full ui-scrollbar" :pt="{ content: { class: '!w-full' } }" >
        <template #item="{ item }">
          <div class="h-[46px] py-[1px]">
            <div
              :key="item.id"
              class="group ui-flex-x gap-2 px-2 py-1.5 rounded-lg cursor-pointer ui-trans hover:bg-background-sub/30 border border-transparent active:scale-[0.99] relative overflow-hidden"
              :class="{ '!bg-primary/10': selectedFiles.has(item.id) && isBatchMode }"
              @click.stop="handleItemClick(item)"
              @contextmenu.prevent="!isBatchMode && ((menuTarget = item), menu.show($event))"
            >
              <!-- 图标 -->
              <div class="shrink-0 text-xl flex items-center justify-center w-7 h-7" :class="getFileIcon(item.name, item.type)?.color">
                <div :class="getFileIcon(item.name, item.type)?.icon" />
              </div>
              <!-- 信息 -->
              <div class="ui-flex-truncate flex flex-col gap-0.5 min-w-0 ui-trans relative z-0">
                <div class="text-sm text-foreground-main truncate group-hover:text-primary ui-trans font-medium pr-1">
                  {{ item.name }}
                </div>
                <div class="text-[10px] text-foreground-sub/80 flex items-center gap-1.5 font-mono leading-none min-w-0">
                  <span class="shrink-0">{{ item.type === 'folder' ? `${item.count}项` : item.size }}</span>
                  <template v-if="item.uploader">
                    <span class="w-px h-2 bg-background-dim shrink-0" />
                    <span class="truncate">{{ item.uploader }}</span>
                  </template>
                  <template v-if="item.expire_time">
                    <span class="w-px h-2 bg-background-dim shrink-0" />
                    <span class="shrink-0">
                      {{ Math.ceil((item.expire_time * 1000 - Date.now()) / 86400000) }}天
                    </span>
                  </template>
                </div>
              </div>
              <!-- 悬浮操作按钮 -->
              <div class="absolute right-0 top-0 bottom-0 flex items-center px-2 opacity-0 group-hover:opacity-100 ui-trans z-10">
                <Button icon="i-ri-more-2-fill" text rounded class="!w-8 !h-8 !text-foreground-sub hover:!text-foreground-main hover:!bg-background-sub/50 shadow-sm border border-transparent" @click.stop="(menuTarget = item), menu.show($event)"/>
              </div>
            </div>
          </div>
        </template>
      </VirtualScroller>
    </div>
    <!-- 批量操作栏 -->
    <div
      v-if="isBatchMode"
      class="absolute bottom-4 left-4 right-4 bg-background-sub/80 backdrop-blur-xl border border-white/10 shadow-xl rounded-xl p-3 flex items-center justify-between z-30 gap-3"
      v-motion
      :initial="{ y: 100, opacity: 0 }"
      :enter="{ y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } }"
      :leave="{ y: 100, opacity: 0, transition: { duration: 200 } }"
      @click.stop
    >
      <div class="ui-flex-x gap-1">
        <div class="text-xs font-bold text-foreground-main flex items-center gap-1 shrink-0">
          <span>已选 {{ selectedFiles.size }} 项</span>
        </div>
        <Button v-tooltip.top="isAllSelected ? '取消全选' : '全选'" :icon="isAllSelected ? 'i-ri-checkbox-circle-line' : 'i-ri-checkbox-blank-circle-line'" text rounded class="!w-8 !h-8 !text-primary" @click="handleSelectAll" />
      </div>
      <div class="flex items-center gap-2">
        <Button v-if="canManage" label="移动" size="small" severity="info" class="!px-3" outlined :disabled="!canBatchMove" @click="moveDialog.visible = true; loadResources('/', moveDialog.folders)" />
        <Button v-if="canManage" label="删除" size="small" severity="danger" class="!px-3" :disabled="!selectedFiles.size" @click="handleDelete()" />
      </div>
    </div>
    <!-- 右键菜单 -->
    <ContextMenu ref="menu" :model="menuItems" />
    <!-- 文件上传 -->
    <input ref="fileInput" type="file" class="hidden" @change="handleUploadFile" />
    <!-- 输入弹窗 -->
    <Dialog v-model:visible="inputDialog.visible" modal :header="inputDialog.mode === 'create' ? '新建文件夹' : '重命名'" :style="{ width: '20rem' }">
      <div class="flex flex-col gap-3">
        <InputText v-model="inputDialog.value" class="w-full !text-sm !bg-background-sub/50 !border-transparent !rounded-lg" autofocus @keyup.enter="handleInputSubmit" />
        <div class="flex justify-end gap-2">
          <Button label="取消" text severity="secondary" size="small" @click="inputDialog.visible = false" />
          <Button label="确定" size="small" :loading="inputDialog.loading" @click="handleInputSubmit" />
        </div>
      </div>
    </Dialog>
    <!-- 移动弹窗 -->
    <Dialog v-model:visible="moveDialog.visible" modal header="移动到" :style="{ width: '22rem' }">
        <div class="flex flex-col h-[300px]">
        <div class="flex items-center gap-1 text-xs text-foreground-sub mb-2 overflow-x-auto ui-scrollbar whitespace-nowrap px-1">
          <span
            class="cursor-pointer hover:text-primary"
            :class="!moveDialog.pathStack.length ? 'font-bold text-foreground-main' : ''"
            @click="handleNavigation('jump', -1, true)"
          >根</span>
          <template v-for="(f, i) in moveDialog.pathStack" :key="f.id">
            <span>/</span>
            <span
              class="cursor-pointer hover:text-primary"
              :class="i === moveDialog.pathStack.length - 1 ? 'font-bold text-foreground-main' : ''"
              @click="handleNavigation('jump', i, true)"
            >{{ f.name }}</span>
          </template>
        </div>
        <div class="flex-1 border border-white/10 bg-background-sub/20 rounded-lg overflow-y-auto ui-scrollbar p-1">
          <div class="flex flex-col gap-1">
            <div
              v-for="folder in moveDialog.folders"
              :key="folder.id"
              class="ui-flex-x gap-2 p-2 rounded hover:bg-background-sub/30 cursor-pointer text-sm"
              @click="handleNavigation('enter', folder, true)"
            >
              <div class="i-ri-folder-3-fill text-yellow-500" />
              <span class="truncate flex-1">{{ folder.name }}</span>
            </div>
          </div>
        </div>
        <div class="flex justify-end gap-2 mt-3">
          <Button label="取消" text severity="secondary" size="small" @click="moveDialog.visible = false" />
          <Button label="移动" size="small" :loading="moveDialog.submitting" @click="handleMoveSubmit" />
        </div>
      </div>
    </Dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, reactive, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { Button, useToast, useConfirm, Dialog, InputText, IconField, InputIcon, ContextMenu, ProgressSpinner, VirtualScroller } from 'primevue'
import type { MenuItem } from 'primevue/menuitem'
import { bot } from '@/api'
import { useContactStore, useSettingStore } from '@/stores'
import { formatFileSize, getFileIcon } from '@/utils/format'
import { uploadFile } from '@/utils/file'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const confirm = useConfirm()
const contactStore = useContactStore()
const settingStore = useSettingStore()

// 核心数据
const groupId = computed(() => Number(route.params.id))
const canManage = computed(() => {
  const uid = settingStore.user?.user_id
  const me = uid ? contactStore.getMember(groupId.value, uid) : undefined
  return me?.role === 'owner' || me?.role === 'admin'
})

// UI 状态
const loading = ref(false)
const items = ref<any[]>([])
const pathStack = ref<{ id: string; name: string }[]>([])
const spaceInfo = ref({ used: 0, total: 1 })
const keyword = ref('')
const backendType = ref('')
const isBatchMode = ref(false)
const selectedFiles = ref<Set<string>>(new Set())

// 弹窗状态
const inputDialog = reactive({ visible: false, mode: 'create', value: '', loading: false, targetId: '', targetType: 'file' })
const moveDialog = reactive({ visible: false, submitting: false, pathStack: [] as any[], folders: [] as any[] })
const fileInput = ref<HTMLInputElement>()
const menu = ref()
const menuTarget = ref<any>(null)

// 数据缓存
const fileCache = new Map<string, any[]>()

// 计算属性
const currentFolderId = computed(() => pathStack.value[pathStack.value.length - 1]?.id || '/')
const filteredItems = computed(() => {
  const k = keyword.value.trim().toLowerCase()
  return k ? items.value.filter(i => i.name.toLowerCase().includes(k)) : items.value
})

const isAllSelected = computed(() => {
  if (!filteredItems.value.length) return false
  return selectedFiles.value.size === filteredItems.value.length
})

const canBatchMove = computed(() => {
  if (!selectedFiles.value.size) return false
  return items.value.some(i => selectedFiles.value.has(i.id) && i.type === 'file')
})

// 初始化
onMounted(() => {
  backendType.value = bot.backend
  if (groupId.value) {
    loadResources()
    loadSpaceInfo()
  }
})

// 资源加载
async function loadResources(folderId = '/', listRef = items.value, force = false) {
  if (!groupId.value) return
  if (!force && listRef === items.value && fileCache.has(folderId)) {
    items.value = fileCache.get(folderId)!
    return
  }
  loading.value = true
  try {
    const res = folderId === '/' ? await bot.getGroupRootFiles(groupId.value, 256) : await bot.getGroupFilesByFolder(groupId.value, folderId, 256)
    const folders = (res.folders || []).map((f: any) => ({ id: f.folder_id, name: f.folder_name, type: 'folder', uploader: f.creator_name, count: f.total_file_count }))
    const result = listRef === moveDialog.folders
      ? folders
      : [...folders, ...(res.files || []).map((f: any) => ({ id: f.file_id, name: f.file_name, type: 'file', size: formatFileSize(f.file_size), uploader: f.uploader_name, busid: f.busid, expire_time: f.dead_time }))]
    if (listRef === items.value) {
      const sortedResult = result.sort((a, b) => (a.type === b.type ? 0 : a.type === 'folder' ? -1 : 1))
      fileCache.set(folderId, sortedResult)
      items.value = sortedResult
    } else {
      moveDialog.folders = result
    }
  } catch {
    toast.add({ severity: 'error', summary: '加载文件列表失败', life: 3000 })
  } finally {
    loading.value = false
  }
}

// 空间信息加载
async function loadSpaceInfo() {
  try {
    const res = await bot.getGroupFileSystemInfo(groupId.value)
    if (res) spaceInfo.value = { used: res.used_space || 0, total: res.total_space || 0 }
  } catch { /* 忽略错误 */ }
}

// 导航处理
const handleNavigation = (action: 'enter' | 'back' | 'jump', payload?: any, isMove = false) => {
  const stack = isMove ? moveDialog.pathStack : pathStack.value
  let targetId = '/'
  if (action === 'enter') {
    stack.push({ id: payload.id, name: payload.name })
    targetId = payload.id
  } else if (action === 'back') {
    if (stack.length) stack.pop()
    else return router.back()
    targetId = stack[stack.length - 1]?.id || '/'
  } else if (action === 'jump') {
    if (payload === -1) stack.length = 0
    else if (payload < stack.length - 1) stack.splice(payload + 1)
    targetId = stack[stack.length - 1]?.id || '/'
  }
  loadResources(targetId, isMove ? moveDialog.folders : items.value)
}

// 列表点击
const handleItemClick = (item: any) => {
  if (isBatchMode.value && canManage.value) return selectedFiles.value.has(item.id) ? selectedFiles.value.delete(item.id) : selectedFiles.value.add(item.id)
  if (item.type === 'folder') handleNavigation('enter', item)
}

// 全选 / 取消
const handleSelectAll = () => {
  if (isAllSelected.value) {
    selectedFiles.value.clear()
  } else {
    selectedFiles.value = new Set(filteredItems.value.map(i => i.id))
  }
}

// 文件上传
const handleUploadFile = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return;
  (e.target as HTMLInputElement).value = ''
  toast.add({ severity: 'info', summary: '正在上传...', detail: file.name, life: 3000 })
  try {
    const folder = currentFolderId.value === '/' ? undefined : currentFolderId.value
    await uploadFile('group', groupId.value, file, folder)
    toast.add({ severity: 'success', summary: '上传成功', life: 3000 })
    loadResources(currentFolderId.value, items.value, true)
  } catch (err) {
    toast.add({ severity: 'error', summary: '上传失败', detail: String(err), life: 3000 })
  }
}

// 提交输入
const openInputDialog = (mode: string, item?: any) => {
  Object.assign(inputDialog, { visible: true, mode, value: mode === 'rename' && item ? item.name : '', targetId: item?.id || '', targetType: item?.type || 'file' })
}
const handleInputSubmit = async () => {
  if (!inputDialog.value.trim()) return
  inputDialog.loading = true
  try {
    if (inputDialog.mode === 'create') await bot.createGroupFileFolder(groupId.value, inputDialog.value, currentFolderId.value)
    else {
      if (inputDialog.targetType === 'folder') await bot.renameGroupFileFolder(groupId.value, inputDialog.targetId, inputDialog.value)
      else await bot.renameGroupFile(groupId.value, inputDialog.targetId, inputDialog.value, currentFolderId.value)
    }
    toast.add({ severity: 'success', summary: '操作成功', life: 3000 })
    inputDialog.visible = false
    loadResources(currentFolderId.value, items.value, true)
  } catch (e) { toast.add({ severity: 'error', summary: '操作失败', detail: String(e), life: 3000 }) }
  finally { inputDialog.loading = false }
}

// 移动文件
const handleMoveSubmit = async () => {
  const targetId = moveDialog.pathStack[moveDialog.pathStack.length - 1]?.id || '/'
  if (targetId === currentFolderId.value) return
  moveDialog.submitting = true
  try {
    const targets = isBatchMode.value
      ? items.value.filter(i => selectedFiles.value.has(i.id) && i.type !== 'folder')
      : (menuTarget.value ? [menuTarget.value] : [])
    if (!targets.length) {
      moveDialog.submitting = false;
      return;
    }
    for (const file of targets) await bot.moveGroupFile(groupId.value, file.id, currentFolderId.value, targetId)
    toast.add({ severity: 'success', summary: '移动成功', life: 3000 })
    moveDialog.visible = false
    isBatchMode.value = false; selectedFiles.value.clear()
    fileCache.delete(targetId)
    loadResources(currentFolderId.value, items.value, true)
  } catch (e) { toast.add({ severity: 'error', summary: '移动失败', detail: String(e), life: 3000 }) }
  finally { moveDialog.submitting = false }
}

// 删除文件
const handleDelete = () => {
  const targets = isBatchMode.value ? items.value.filter(i => selectedFiles.value.has(i.id)) : (menuTarget.value ? [menuTarget.value] : [])
  if (!targets.length) return
  confirm.require({
    message: `确定删除选中的 ${targets.length} 项吗？`, header: '删除文件', icon: 'i-ri-error-warning-line text-red-500', acceptClass: 'p-button-danger',
    accept: async () => {
      try {
        for (const t of targets) {
          if (t.type === 'folder') await bot.deleteGroupFolder(groupId.value, t.id)
          else await bot.deleteGroupFile(groupId.value, t.id, t.busid)
        }
        toast.add({ severity: 'success', summary: '删除成功', life: 3000 })
        isBatchMode.value = false; selectedFiles.value.clear()
        loadResources(currentFolderId.value, items.value, true)
      } catch (e) { toast.add({ severity: 'error', summary: '删除失败', detail: String(e), life: 3000 }) }
    }
  })
}

// 右键菜单
const menuItems = computed((): MenuItem[] => {
  if (!menuTarget.value) return []
  const t = menuTarget.value
  const menuCommands: MenuItem[] = []
  menuCommands.push({
    label: t.type === 'folder' ? '打开' : '下载',
    icon: t.type === 'folder' ? 'i-ri-folder-open-line' : 'i-ri-download-line',
    command: async () => {
      if (t.type === 'folder') return handleNavigation('enter', t)
      try {
        const res = await bot.getGroupFileUrl(groupId.value, t.id, t.busid)
        if (res.url) window.open(res.url, '_blank')
      } catch (e) {
        toast.add({ severity: 'error', summary: '获取链接失败', detail: String(e), life: 3000 })
      }
    }
  })
  if (t.type !== 'folder') {
    if (backendType.value === 'SnowLuma') {
      menuCommands.push({
        label: '转存微云',
        icon: 'i-ri-save-line',
        command: async () => {
          try {
            await bot.transGroupFile(groupId.value, t.id)
            toast.add({ severity: 'success', summary: '转存成功', life: 3000 })
          } catch (e) {
            toast.add({ severity: 'error', summary: '转存失败', detail: String(e), life: 3000 })
          }
        }
      })
    }
    if (backendType.value === 'LLOneBot' && t.expire_time) {
      menuCommands.push({
        label: '转为永久',
        icon: 'i-ri-infinite-line',
        command: async () => {
          try {
            await bot.setGroupFileForever(groupId.value, t.id)
            toast.add({ severity: 'success', summary: '设置成功', life: 3000 })
            loadResources(currentFolderId.value, items.value, true)
          } catch (e) {
            toast.add({ severity: 'error', summary: '设置失败', detail: String(e), life: 3000 })
          }
        }
      })
    }
  }
  if (canManage.value) {
    menuCommands.push({ separator: true })
    menuCommands.push({ label: '重命名', icon: 'i-ri-edit-line', command: () => openInputDialog('rename', t) })
    if (t.type !== 'folder') {
      menuCommands.push({
        label: '移动',
        icon: 'i-ri-drag-move-2-line',
        command: () => {
          moveDialog.visible = true
          loadResources('/', moveDialog.folders)
        }
      })
    }
    menuCommands.push({ separator: true })
    menuCommands.push({ label: '删除', icon: 'i-ri-delete-bin-line text-red-500', command: handleDelete })
  }
  return menuCommands
})

// 清空缓存
onUnmounted(() => fileCache.clear())
</script>
