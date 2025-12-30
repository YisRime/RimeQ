import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import Dexie, { type Table } from 'dexie'
import { bot } from '@/api'
import { useSessionStore } from './session'
import { useSettingStore } from './setting'
import { useContactStore } from './contact'
import type { Message } from '@/types'

/** 数据库定义 */
class Database extends Dexie {
  public messages!: Table<Message, number>
  constructor() {
    super('rimeq-message')
    // 直接存储原始 Message，并索引核心字段：message_id, group_id, user_id, target_id (用于发送的私聊), time
    this.version(1).stores({ messages: 'message_id, group_id, user_id, target_id, time, [group_id+time], [user_id+time]' })
  }
}
const db = new Database()

export const useMessageStore = defineStore('message', () => {
  const sessionStore = useSessionStore()
  const settingStore = useSettingStore()
  const contactStore = useContactStore()

  // 当前会话 ID
  const activeId = ref('')
  // 消息列表 (原始数据)
  const messages = shallowRef<Message[]>([])
  // 加载状态
  const isLoading = ref(false)
  // 是否加载完成
  const isFinished = ref(false)
  // 多选模式状态
  const isMultiSelect = ref(false)
  // 选中的消息 ID 列表
  const selectedIds = ref<number[]>([])

  // 撤回的消息ID集合 (仅作为 UI 状态，持久化以保持体验)
  const recalledIds = useStorage<number[]>('rimeq-recalled-ids', [])

  // 获取选中消息列表
  const selectedMessages = computed(() => {
    if (!selectedIds.value.length) return []
    const set = new Set(selectedIds.value)
    return messages.value.filter(m => set.has(m.message_id))
  })

  // 检查消息是否已撤回
  function isRecalled(messageId: number) {
    return recalledIds.value.includes(messageId)
  }

  /** 切换会话 */
  async function openSession(id: string) {
    if (activeId.value === id) return

    activeId.value = id
    isLoading.value = true
    isFinished.value = false
    setMultiSelect(false)
    sessionStore.clearUnread(id)

    // 判断会话类型
    const session = sessionStore.getSession(id)
    const isGroup = session?.type === 'group' || contactStore.groups.some(g => String(g.group_id) === id)
    const targetId = Number(id)

    // 从数据库查询历史消息
    let history: Message[] = []
    if (isGroup) {
      // 群聊：直接查 group_id
      history = await db.messages.where('[group_id+time]')
        .between([targetId, Dexie.minKey], [targetId, Dexie.maxKey])
        .reverse()
        .limit(99)
        .toArray()
    } else {
      // 私聊：查询 (user_id=ID) OR (target_id=ID)
      // Dexie 的 OR 查询排序较为复杂，这里分别查询后合并排序
      // 1. 接收的消息 (user_id 是对方)
      const incoming = await db.messages.where('user_id').equals(targetId).limit(99).toArray()
      // 2. 发送的消息 (target_id 是对方，注意：标准 OneBot 11 outgoing 私聊通常有 target_id)
      const outgoing = await db.messages.where('target_id').equals(targetId).limit(99).toArray()

      // 合并并按时间倒序
      history = [...incoming, ...outgoing].sort((a, b) => b.time - a.time).slice(0, 99)
    }

    // 修正顺序为正序显示
    messages.value = history.reverse()
    isLoading.value = false

    if (messages.value.length < 10) await fetchHistory(id)
  }

  /** 拉取历史消息 */
  async function fetchHistory(id: string = activeId.value) {
    if (isLoading.value || isFinished.value) return

    isLoading.value = true
    try {
      const startMsg = messages.value[0]
      const seq = startMsg?.real_id || startMsg?.message_id
      const session = sessionStore.getSession(id)
      const isGroup = session?.type === 'group' || contactStore.groups.some(g => String(g.group_id) === id)

      const res = isGroup
        ? await bot.getGroupMsgHistory(Number(id), seq)
        : await bot.getFriendMsgHistory(Number(id), seq)

      if (!res.messages?.length) {
        isFinished.value = true
      } else {
        const newMsgs = res.messages
        // 批量写入数据库 (重复 ID 会自动覆盖/忽略)
        db.messages.bulkPut(newMsgs).catch(() => {})

        if (activeId.value === id) {
          // 简单去重合并
          const exists = new Set(messages.value.map(m => m.message_id))
          const filtered = newMsgs.filter(m => !exists.has(m.message_id))
          messages.value = [...filtered, ...messages.value]
        }
      }
    } finally {
      isLoading.value = false
    }
  }

  /** 接收并处理消息 */
  function pushMessage(rawEvent: Message, sessionId: string) {
    // 存储原始数据到数据库
    db.messages.put(rawEvent).catch(() => {})

    // 如果属于当前会话，推送到界面
    if (activeId.value === sessionId) {
      if (!messages.value.some(m => m.message_id === rawEvent.message_id)) {
        messages.value = [...messages.value, rawEvent]
      }
    }
    return rawEvent
  }

  /** 撤回消息 */
  async function recallMessage(msgId: number) {
    // 不修改数据库中的原始消息，仅更新撤回 ID 列表
    if (!recalledIds.value.includes(msgId)) {
      recalledIds.value.push(msgId)
    }

    // 如果防撤回未开启，则从 UI 列表移除消息 (可选体验)
    if (!settingStore.config.enableAntiRecall) {
      const idx = messages.value.findIndex(m => m.message_id === msgId)
      if (idx !== -1) {
        const copy = [...messages.value]
        copy.splice(idx, 1)
        messages.value = copy
      }
    }
  }

  /** 切换消息选中状态 */
  function handleSelection(msgId: number, mode: 'toggle' | 'only') {
    if (mode === 'only') {
      isMultiSelect.value = true
      selectedIds.value = [msgId]
    } else {
      const idx = selectedIds.value.indexOf(msgId)
      if (idx > -1) selectedIds.value.splice(idx, 1)
      else selectedIds.value.push(msgId)
    }
  }

  /** 设置多选模式 */
  function setMultiSelect(enable: boolean) {
    isMultiSelect.value = enable
    if (!enable) selectedIds.value = []
  }

  return { activeId, messages, isLoading, isFinished, isMultiSelect, selectedIds, selectedMessages, recalledIds,
    openSession, fetchHistory, pushMessage, recallMessage, handleSelection, setMultiSelect, isRecalled }
})
