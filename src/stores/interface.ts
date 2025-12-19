import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Message } from '@/types'

/**
 * 界面交互 Store
 * 管理 UI 显示状态与聊天交互逻辑
 */
export const useInterfaceStore = defineStore('interface', () => {
  // --- UI State ---

  /** 侧边栏是否展开 (移动端) */
  const sidebarOpen = ref(false)

  /** 媒体查看器 (图片/视频预览) 状态 */
  const viewer = ref({
    show: false,
    url: '',
    list: [] as string[]
  })

  // --- Interaction State ---

  /** 当前被引用的消息 (回复目标) */
  const replyTarget = ref<Message | null>(null)

  /** 是否处于多选模式 */
  const multiSelect = ref(false)

  /** 多选模式下选中的消息 ID 列表 */
  const selectedIds = ref<number[]>([])

  /** 转发模式状态 */
  const forwardMode = ref<{
    active: boolean
    ids: number[] // 待转发的消息 ID
    type: 'single' | 'batch'
  }>({
    active: false,
    ids: [],
    type: 'single'
  })

  // --- Actions (UI) ---

  /** 切换侧边栏状态 */
  function toggleSidebar() {
    sidebarOpen.value = !sidebarOpen.value
  }

  /**
   * 打开媒体查看器
   * @param url - 当前媒体地址
   * @param list - 播放列表
   */
  function openViewer(url: string, list?: string[]) {
    viewer.value = { show: true, url, list: list || [url] }
  }

  /** 关闭媒体查看器 */
  function closeViewer() {
    viewer.value.show = false
  }

  // --- Actions (Interaction) ---

  /**
   * 设置回复目标
   * @param msg - 消息对象，null 为取消回复
   */
  function setReply(msg: Message | null) {
    replyTarget.value = msg
  }

  /**
   * 开启多选模式
   * @param initId - (可选) 初始选中的消息 ID
   */
  function startMulti(initId?: number) {
    multiSelect.value = true
    selectedIds.value = initId ? [initId] : []
  }

  /** 退出多选模式 */
  function stopMulti() {
    multiSelect.value = false
    selectedIds.value = []
  }

  /**
   * 切换消息选中状态
   * @param id - 消息 ID
   */
  function toggleSelect(id: number) {
    const idx = selectedIds.value.indexOf(id)
    if (idx > -1) selectedIds.value.splice(idx, 1)
    else selectedIds.value.push(id)
  }

  /**
   * 开启转发流程
   * @param ids - 要转发的消息 ID 列表
   * @param type - 转发类型 (逐条/合并)
   */
  function startForward(ids: number[], type: 'single' | 'batch' = 'single') {
    forwardMode.value = { active: true, ids, type }
  }

  /** 取消转发流程 */
  function stopForward() {
    forwardMode.value = { active: false, ids: [], type: 'single' }
  }

  return {
    sidebarOpen,
    viewer,
    replyTarget,
    multiSelect,
    selectedIds,
    forwardMode,

    toggleSidebar,
    openViewer,
    closeViewer,
    setReply,
    startMulti,
    stopMulti,
    toggleSelect,
    startForward,
    stopForward
  }
})
