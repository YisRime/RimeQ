import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import Dexie, { type Table } from 'dexie'
import { bot } from '@/api'
import { useSessionStore } from './session'
import { useSettingStore } from './setting'
import type { Message } from '@/types'

interface DBMessage extends Message {
  id?: number
  session_id: string
  session_seq: number
}

/**
 * 定义用于存储消息的本地 IndexedDB 数据库
 */
class Database extends Dexie {
  /** 持久化存储聊天记录表 */
  public messages!: Table<DBMessage, number>
  constructor() {
    super('rimeq-message')
    this.version(1).stores({ messages: '++id, message_id, [session_id+session_seq]' })
  }
}
const db = new Database()

/**
 * 消息状态管理 Store
 * 负责聊天消息的获取、持久化、状态管理及相关交互逻辑
 */
export const useMessageStore = defineStore('message', () => {
  const sessionStore = useSessionStore()
  const settingStore = useSettingStore()
  /** 当前激活的会话 ID */
  const activeId = ref('')
  /** 当前会话的消息列表 */
  const messages = shallowRef<DBMessage[]>([])
  /** 是否正在加载历史消息 */
  const isLoading = ref(false)
  /** 是否已加载完历史消息 */
  const isFinished = ref(false)
  /** 是否处于消息多选模式 */
  const isMultiSelect = ref(false)
  /** 已选中消息的 ID 列表 */
  const selectedIds = ref<number[]>([])
  /** 已被撤回的消息 ID 列表 */
  const recalledCache = ref(new Set<number>())

  /**
   * (计算属性) 获取当前选中的消息对象数组
   * @returns 已选中的消息对象列表
   */
  const selectedMessages = computed((): DBMessage[] => {
    if (!selectedIds.value.length) return []
    const set = new Set(selectedIds.value)
    return messages.value.filter(m => set.has(m.message_id))
  })

  /**
   * 检查指定 ID 的消息是否已被撤回
   * @param messageId - 要检查的消息 ID
   * @returns 如果消息在撤回缓存中，则返回 `true`
   */
  function isRecalled(messageId: number): boolean {
    return recalledCache.value.has(messageId)
  }

  const getSessionId = (id: string, type: 'private' | 'group'): string => {
    if (type === 'group') {
      return `g_${id}`
    } else {
      const selfId = settingStore.user!.user_id
      const friendId = Number(id)
      return `p_${[selfId, friendId].sort((a, b) => a - b).join('_')}`
    }
  }

  /**
   * 打开并加载指定会话的消息
   * 先从本地数据库加载，然后异步拉取最新消息进行同步和补充
   * @param id - 要打开的会话 ID
   */
  async function openSession(id: string): Promise<void> {
    if (activeId.value === id) return
    activeId.value = id
    isLoading.value = true
    isFinished.value = false
    setMultiSelect(false)
    sessionStore.clearUnread(id)
    messages.value = []
    try {
      const session = sessionStore.getSession(id)
      if (!session) {
          isLoading.value = false
          return
      }
      const sessionId = getSessionId(id, session.type)
      const history = await db.messages
        .where('[session_id+session_seq]')
        .between([sessionId, Dexie.minKey], [sessionId, Dexie.maxKey])
        .reverse()
        .limit(20)
        .toArray()
      if (history.length > 0) messages.value = history.reverse()
    } catch (e) {
      console.warn('从数据库加载消息失败:', e)
    }
    await fetchHistory(id)
    isLoading.value = false
  }

  /**
   * 从 OneBot API 拉取更多历史消息
   * @param id - 目标会话 ID，默认为当前激活的会话
   */
  async function fetchHistory(id: string = activeId.value): Promise<void> {
    if (isLoading.value && messages.value.length > 0 && !isFinished.value) return
    isLoading.value = true
    try {
      const startMsg = messages.value[0]
      const apiCursor = startMsg?.message_id
      const session = sessionStore.getSession(id)
      const res = session?.type === 'group'
        ? await bot.getGroupMsgHistory(Number(id), apiCursor)
        : await bot.getFriendMsgHistory(Number(id), apiCursor)
      if (!res.messages?.length) {
        isFinished.value = true
      } else {
        const rawApiMessages: Message[] = res.messages
        const processedMessages = rawApiMessages.map(m => addCustomFields(m))
        db.messages.bulkPut(processedMessages).catch(console.warn)
        if (activeId.value === id) {
          const messageMap = new Map<number, DBMessage>()
          messages.value.forEach(m => messageMap.set(m.message_id, m))
          processedMessages.forEach(m => messageMap.set(m.message_id, m))
          const sortedMessages = Array.from(messageMap.values())
            .sort((a, b) => a.session_seq - b.session_seq)
          messages.value = sortedMessages
        }
      }
    } catch (e) {
      console.error('获取历史消息失败:', e)
    } finally {
      isLoading.value = false
    }
  }

  const addCustomFields = (msg: Message): DBMessage => {
    const storedMsg = msg as DBMessage
    storedMsg.session_seq = Number(msg.real_seq) || msg.message_seq || (msg.time * 1000 + (msg.message_id % 1000));
    if (msg.message_type === 'group') {
      storedMsg.session_id = `g_${msg.group_id}`
    } else {
      const selfId = settingStore.user!.user_id
      const friendId = msg.user_id === selfId ? (msg as any).target_id : msg.user_id
      if (selfId && friendId) {
        storedMsg.session_id = `p_${[selfId, friendId].sort((a, b) => a - b).join('_')}`;
      }
    }
    return storedMsg
  }

  /**
   * 接收并处理实时推送的新消息
   * 将新消息存入数据库，并更新当前会话的 UI
   * @param rawEvent - 从 WebSocket 推送的原始消息对象
   */
  function pushMessage(rawEvent: Message): void {
    const processedMessage = addCustomFields(rawEvent)
    db.messages.put(processedMessage).catch(() => {})
    const currentSessionId = getSessionId(activeId.value, sessionStore.getSession(activeId.value)!.type)
    if (currentSessionId === processedMessage.session_id) {
      if (!messages.value.some(m => m.message_id === processedMessage.message_id)) {
        messages.value = [...messages.value, processedMessage]
      }
    }
  }

  /**
   * 处理消息撤回事件
   * @param msgId - 被撤回的消息 ID
   */
  async function recallMessage(msgId: number): Promise<void> {
    recalledCache.value.add(msgId)
    if (!settingStore.config.enableAntiRecall) {
      await db.messages.where('message_id').equals(msgId).delete()
      const idx = messages.value.findIndex(m => m.message_id === msgId)
      if (idx !== -1) {
        const copy = [...messages.value]
        copy.splice(idx, 1)
        messages.value = copy
      }
    }
  }

  /**
   * 处理消息的选中状态变更
   * @param msgId - 被操作的消息 ID
   * @param mode - 操作模式：'toggle' (切换选中/取消) 或 'only' (仅选中此项)
   */
  function handleSelection(msgId: number, mode: 'toggle' | 'only'): void {
    if (mode === 'only') {
      isMultiSelect.value = true
      selectedIds.value = [msgId]
    } else {
      const idx = selectedIds.value.indexOf(msgId)
      if (idx > -1) selectedIds.value.splice(idx, 1)
      else selectedIds.value.push(msgId)
    }
  }

  /**
   * 启用或禁用消息多选模式
   * @param enable - `true` 表示启用，`false` 表示禁用
   */
  function setMultiSelect(enable: boolean): void {
    isMultiSelect.value = enable
    if (!enable) selectedIds.value = []
  }

  return { activeId, messages, isLoading, isFinished, isMultiSelect, selectedIds, selectedMessages,
    isRecalled, openSession, fetchHistory, pushMessage, recallMessage, handleSelection, setMultiSelect }
})
