import { ref, shallowRef, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { bot } from '@/api'
import { database, type DBMessage } from './database'
import { useSessionStore } from './session'
import { useSettingStore } from './setting'
import { useContactStore } from './contact'
import type { Message } from '@/types'

/**
 * 消息状态管理 Store
 * @description 负责消息的存储、加载、实时更新及多选和回复等功能
 */
export const useMessageStore = defineStore('message', () => {
  const sessionStore = useSessionStore()
  const settingStore = useSettingStore()
  const contactStore = useContactStore()

  /** 上次活跃时间 */
  const lastActiveTime = useStorage('rimeq-last-active', Date.now())
  /** 当前激活的会话 ID */
  const activeId = ref('')
  /** 当前展示的消息列表 */
  const messages = shallowRef<DBMessage[]>([])
  /** 是否正在加载消息 */
  const isLoading = ref(false)
  /** 是否已加载完历史消息 */
  const isLoaded = ref(false)
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
   * @param id - 会话 ID
   * @returns 会话类型 ('group' | 'private')
   */
  const getSessionType = (id: string): 'group' | 'private' => {
    const session = sessionStore.getSession(id)
    if (session) return session.type
    const isGroup = contactStore.checkIsGroup(id)
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
   * @param msg - 原始消息对象
   * @returns 标准化后的消息对象，包含 session_id 和 session_seq
   */
  const normalizeMessage = (msg: Message): DBMessage => {
    const storedMsg = { ...msg } as DBMessage
    let seq = 0
    if (msg.real_seq) seq = Number(msg.real_seq)
    else if (msg.message_seq) seq = msg.message_seq || 0
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
   * 将新消息合并到当前视图
   * @param newMessages - 新消息列表
   */
  const mergeToView = (newMessages: DBMessage[]) => {
    if (newMessages.length === 0) return
    const currentIds = new Set(messages.value.map(m => m.message_id))
    const toAdd = newMessages.filter(m => !currentIds.has(m.message_id))
    if (toAdd.length > 0) {
      const merged = [...messages.value, ...toAdd]
      merged.sort((a, b) => a.session_seq - b.session_seq)
      messages.value = merged
    }
  }

  /**
   * 从本地数据库拉取历史消息
   * @param id 会话ID
   * @param beforeSeq 获取该序号之前的消息
   * @param count 数量
   */
  const fetchFromLocal = async (id: string, beforeSeq: number, count = 50): Promise<DBMessage[]> => {
    const type = getSessionType(id)
    const sessionKey = getSessionKey(id, type)
    return await database.messages
      .where('[session_id+session_seq]')
      .below([sessionKey, beforeSeq])
      .and(item => item.session_id === sessionKey)
      .reverse()
      .limit(count)
      .toArray()
  }

  /**
   * 从云端 API 拉取历史消息
   * @param id 会话ID
   * @param startSeq 起始序号
   * @param count 数量
   */
  const fetchFromCloud = async (id: string, startSeq?: number, count = 50): Promise<DBMessage[]> => {
    if (!settingStore.isConnected) return []
    const type = getSessionType(id)
    let res: { messages: Message[] }
    try {
      if (type === 'group') {
        res = await bot.getGroupMsgHistory(Number(id), startSeq, count, true)
      } else {
        res = await bot.getFriendMsgHistory(Number(id), startSeq, count, true)
      }
    } catch (e) {
      console.error('[Message] 拉取消息失败:', e)
      return []
    }
    const fetchedList = res.messages || []
    if (fetchedList.length === 0) return []
    const normalized = fetchedList.map(m => normalizeMessage(m))
    await database.messages.bulkPut(normalized).catch(e => console.warn('[Message] 存储消息失败:', e))
    return normalized
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
    isLoaded.value = false
    setMultiSelect()
    setReplyTarget(null)
    sessionStore.clearUnread(id)
    messages.value = []
    try {
      const now = Date.now()
      const timeDiff = now - lastActiveTime.value
      const isColdStart = timeDiff > 300 * 1000
      if (isColdStart) {
        const cloudMsgs = await fetchFromCloud(id, 0, 50)
        mergeToView(cloudMsgs)
      } else {
        const localMsgs = await fetchFromLocal(id, Number.MAX_SAFE_INTEGER, 50)
        messages.value = localMsgs.reverse()
        fetchFromCloud(id, 0, 50).then(cloudMsgs => {
          mergeToView(cloudMsgs)
        })
      }
      lastActiveTime.value = now
    } catch (e) {
      console.error('[Message] 打开会话失败:', e)
    } finally {
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
    if (isLoaded.value) return false
    isLoading.value = true
    let hasNewData = false
    try {
      const oldestMsg = messages.value[0]
      const currentSeq = oldestMsg ? oldestMsg.session_seq : Number.MAX_SAFE_INTEGER
      let candidates = await fetchFromLocal(id, currentSeq, 50)
      let isDiscontinuous = false
      if (candidates.length === 0) {
        isDiscontinuous = true
      } else if (oldestMsg) {
        const firstCandidate = candidates[0]
        if (firstCandidate) {
          const gap = currentSeq - firstCandidate.session_seq
          if (gap > 300 * 1000) isDiscontinuous = true
        }
      }
      if (isDiscontinuous && settingStore.isConnected) {
        const apiCursor = oldestMsg ? oldestMsg.message_seq : undefined
        const cloudData = await fetchFromCloud(id, apiCursor, 50)
        if (cloudData.length > 0) candidates = cloudData
      }
      if (candidates.length > 0) {
        mergeToView(candidates)
        hasNewData = true
      } else {
        isLoaded.value = true
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
    database.messages.put(processed).catch(e => console.warn('[Message] 存储消息失败:', e))
    if (activeId.value) {
      const activeSession = sessionStore.getSession(activeId.value)
      let activeKey = ''
      if (activeSession) {
         activeKey = getSessionKey(activeId.value, activeSession.type)
      } else {
         const type = rawEvent.message_type === 'group' ? 'group' : 'private'
         activeKey = getSessionKey(activeId.value, type)
      }
      if (activeKey === processed.session_id) {
        if (!messages.value.some(m => m.message_id === processed.message_id)) {
          messages.value = [...messages.value, processed]
        }
      }
    }
    lastActiveTime.value = Date.now()
  }

  /**
   * 处理消息撤回
   * @param msgId - 消息 ID
   */
  async function recallMessage(msgId: number): Promise<void> {
    recalledCache.value.add(msgId)
    if (!settingStore.config.enableAntiRecall) {
      await database.messages.where('message_id').equals(msgId).delete()
      const idx = messages.value.findIndex(m => m.message_id === msgId)
      if (idx !== -1) {
        const copy = [...messages.value]
        copy.splice(idx, 1)
        messages.value = copy
      }
    }
  }

  /**
   * 设置多选模式
   * @param id - 传入数字切换该消息选中状态；不传则关闭多选模式并清空
   */
  function setMultiSelect(id?: number): void {
    if (id === undefined) {
      isMultiSelect.value = false
      selectedIds.value = []
      return
    }
    if (!isMultiSelect.value) {
      isMultiSelect.value = true
      setReplyTarget(null)
    }
    const idx = selectedIds.value.indexOf(id)
    if (idx > -1) selectedIds.value.splice(idx, 1)
    else selectedIds.value.push(id)
  }

  /**
   * 设置回复引用目标
   * @param message - 目标消息对象
   */
  function setReplyTarget(message: Message | null): void {
    replyTarget.value = message
  }

  return { activeId, messages, isLoading, isLoaded, isMultiSelect, selectedIds, selectedMessages, replyTarget,
    isRecalled, openSession, fetchHistory, pushMessage, recallMessage, setMultiSelect, setReplyTarget }
})
