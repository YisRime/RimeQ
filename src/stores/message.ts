import { defineStore } from 'pinia'
import { ref, shallowRef, computed } from 'vue'
import Dexie, { type Table } from 'dexie'
import { bot } from '@/api'
import { useSessionStore, type Session } from './session'
import { useSettingStore } from './setting'
import { useContactStore } from './contact'
import type { Message } from '@/types'

/**
 * 本地数据库消息接口
 * @description 扩展原始消息类型，用于本地存储和排序索引
 */
interface DBMessage extends Message {
  /** 自增主键 */
  id?: number
  /** 会话唯一标识 */
  session_id: string
  /** 会话排序序号 */
  session_seq: number
}

/**
 * 消息持久化数据库
 */
class Database extends Dexie {
  public messages!: Table<DBMessage, number>
  constructor() {
    super('rimeq-message')
    this.version(1).stores({ messages: '++id, message_id, [session_id+session_seq]' })
  }
}
const db = new Database()

/**
 * 消息状态管理 Store
 * @description 负责消息的存储、加载、实时更新及多选和回复等功能
 */
export const useMessageStore = defineStore('message', () => {
  const sessionStore = useSessionStore()
  const settingStore = useSettingStore()
  const contactStore = useContactStore()
  /** 当前激活的会话 ID */
  const activeId = ref('')
  /** 当前展示的消息列表 */
  const messages = shallowRef<DBMessage[]>([])
  /** 是否正在加载历史消息 */
  const isLoading = ref(false)
  /** 是否已加载完历史消息 */
  const isFinished = ref(false)
  /** 是否开启多选模式 */
  const isMultiSelect = ref(false)
  /** 选中的消息 ID 集合 */
  const selectedIds = ref<number[]>([])
  /** 已撤回消息的 ID 缓存 */
  const recalledCache = ref(new Set<number>())
  /** 正在回复的目标消息 */
  const replyTarget = ref<Message | null>(null)

  /**
   * 获取当前多选选中的消息对象列表
   */
  const selectedMessages = computed((): DBMessage[] => {
    if (!selectedIds.value.length) return []
    const set = new Set(selectedIds.value)
    return messages.value.filter(m => set.has(m.message_id))
  })

  /**
   * 根据 ID 获取会话类型
   */
  const getSessionType = (id: string): 'group' | 'private' => {
    const session = sessionStore.getSession(id)
    if (session) return session.type
    const isGroup = contactStore.groups.some(g => String(g.group_id) === id)
    return isGroup ? 'group' : 'private'
  }

  /**
   * 生成统一的会话 ID
   * @param targetId - 目标 ID
   * @param type - 会话类型
   */
  const getSessionKey = (targetId: string, type: 'private' | 'group'): string => {
    return type === 'group' ? `g_${targetId}` : `p_${targetId}`
  }

  /**
   * 标准化消息对象
   */
  const normalizeMessage = (msg: Message): DBMessage => {
    const storedMsg = msg as DBMessage
    let seq = 0
    if (msg.real_seq) seq = Number(msg.real_seq)
    else if (msg.message_seq) seq = msg.message_seq
    else seq = msg.time * 1000 + (msg.message_id % 1000)
    storedMsg.session_seq = seq
    if (msg.message_type === 'group') {
      storedMsg.session_id = `g_${msg.group_id}`
    } else {
      const selfId = settingStore.user?.user_id || 0
      const friendId = msg.user_id === selfId ? (msg as any).target_id : msg.user_id
      storedMsg.session_id = `p_${friendId}`
    }
    return storedMsg
  }

  /**
   * 判断消息是否已被撤回
   * @param messageId - 消息 ID
   * @returns 是否已撤回
   */
  function isRecalled(messageId: number): boolean {
    return recalledCache.value.has(messageId)
  }

  /**
   * 切换并打开一个会话
   * @param id - 会话 ID
   */
  async function openSession(id: string): Promise<void> {
    if (activeId.value === id) return
    activeId.value = id
    isLoading.value = true
    isFinished.value = false
    setMultiSelect(false)
    setReplyTarget(null)
    sessionStore.clearUnread(id)
    messages.value = []
    try {
      const type = getSessionType(id)
      const session = sessionStore.getSession(id) || ({ id, type } as Session)
      const dbKey = getSessionKey(id, session.type)
      const history = await db.messages
        .where('[session_id+session_seq]')
        .between([dbKey, Dexie.minKey], [dbKey, Dexie.maxKey])
        .reverse()
        .limit(100)
        .toArray()
      if (history.length > 0) {
        messages.value = history.reverse()
        isLoading.value = false
      } else {
        await fetchHistory(id)
      }
    } catch {
      isLoading.value = false
    }
  }

  /**
   * 拉取历史消息
   * @param id - 会话 ID (默认为当前激活会话)
   * @returns 是否成功获取并合并了新数据
   */
  async function fetchHistory(id: string = activeId.value): Promise<boolean> {
    if (id !== activeId.value) return false
    if (isLoading.value && messages.value.length > 0) return false
    if (isFinished.value) return false
    isLoading.value = true
    let hasNewData = false
    try {
      const type = getSessionType(id)
      const apiCursor = messages.value.length > 0 ? messages.value[0]?.message_seq : undefined
      let res: { messages: Message[] }
      if (type === 'group') {
        res = await bot.getGroupMsgHistory(Number(id), apiCursor, 100, true)
      } else {
        res = await bot.getFriendMsgHistory(Number(id), apiCursor, 100, true)
      }
      if (id !== activeId.value) return false
      const fetchedList = res.messages || []
      if (fetchedList.length === 0) {
        isFinished.value = true
      } else {
        const newMessages = fetchedList.map(m => normalizeMessage(m))
        await db.messages.bulkPut(newMessages)
        if (messages.value.length === 0) {
          messages.value = newMessages
          hasNewData = true
        } else {
          const existingIds = new Set(messages.value.map(m => m.message_id))
          const uniqueNew = newMessages.filter(m => !existingIds.has(m.message_id))
          if (uniqueNew.length > 0) {
            const merged = [...uniqueNew, ...messages.value]
            merged.sort((a, b) => a.session_seq - b.session_seq)
            messages.value = merged
            hasNewData = true
          } else {
            isFinished.value = true
          }
        }
      }
    } catch (e) {
      console.error(`[Message] 拉取消息 ${id} 历史失败:`, e)
    } finally {
      isLoading.value = false
    }
    return hasNewData
  }

  /**
   * 接收实时消息推送
   * @param rawEvent - 原始消息事件
   */
  function pushMessage(rawEvent: Message): void {
    const processed = normalizeMessage(rawEvent)
    db.messages.put(processed).catch(e => console.warn('[Message] 存储消息失败:', e))
    if (activeId.value) {
      const activeSession = sessionStore.getSession(activeId.value)
      if (activeSession) {
        const activeKey = getSessionKey(activeId.value, activeSession.type)
        if (activeKey === processed.session_id) {
          if (!messages.value.some(m => m.message_id === processed.message_id)) {
            messages.value = [...messages.value, processed]
          }
        }
      }
    }
  }

  /**
   * 处理消息撤回
   * @param msgId - 消息 ID
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
   * 处理消息选中状态
   * @param msgId - 消息 ID
   * @param mode - 模式：切换或仅选中
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
   * 设置多选模式
   * @param enable - 是否开启
   */
  function setMultiSelect(enable: boolean): void {
    isMultiSelect.value = enable
    if (!enable) {
      selectedIds.value = []
    } else {
      setReplyTarget(null)
    }
  }

  /**
   * 设置回复引用目标
   * @param message - 目标消息对象
   */
  function setReplyTarget(message: Message | null): void {
    replyTarget.value = message
  }

  return { activeId, messages, isLoading, isFinished, isMultiSelect, selectedIds, selectedMessages, replyTarget,
    isRecalled, openSession, fetchHistory, pushMessage, recallMessage, handleSelection, setMultiSelect, setReplyTarget }
})
