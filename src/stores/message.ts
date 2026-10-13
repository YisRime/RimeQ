import { ref, shallowRef, computed, triggerRef } from 'vue'
import { defineStore } from 'pinia'
import { bot } from '@/api'
import { database, encodeMessageMedia, type DBMessage, type DBMedia } from './database'
import { useSessionStore } from './session'
import { useSettingStore } from './setting'
import { useContactStore } from './contact'
import { type Message, type Notice, PostType, SegType } from '@/types'
import { formatDuration } from '@/utils/format'
import Dexie from 'dexie'

/**
 * 消息状态管理 Store
 * @description 负责消息的存储、加载、实时更新及多选和回复等功能
 */
export const useMessageStore = defineStore('message', () => {
  const sessionStore = useSessionStore()
  const settingStore = useSettingStore()
  const contactStore = useContactStore()

  /** 当前激活的会话 ID */
  const activeId = ref<number>(0)
  /** 当前展示的消息列表 */
  const messages = shallowRef<DBMessage[]>([])
  /** 是否还有历史消息 */
  const hasMore = ref(true)
  /** 是否开启多选模式 */
  const isMultiSelect = ref(false)
  /** 选中的消息 ID 集合 */
  const selectedIds = ref<number[]>([])
  /** 转发目标 ID 列表 */
  const forwardTargets = ref<number[]>([])
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
   * 获取消息 ID 到消息对象的映射
   */
  const messagesById = computed((): Map<number, DBMessage> => {
    const map = new Map<number, DBMessage>()
    for (const m of messages.value) map.set(m.message_id, m)
    return map
  })

  /**
   * 标准化消息对象
   * @param msg - 原始消息对象
   * @returns 标准消息对象
   */
  const normalizeMessage = (msg: Message): DBMessage => {
    const msg_seq = Number(msg.real_seq || msg.message_seq || msg.message_id)
    const session_index = (msg.time * 10000) + (Math.abs(msg_seq) % 10000)
    const targetId = msg.message_type === 'group'
      ? msg.group_id
      : (msg.user_id === settingStore.user?.user_id ? msg.target_id : msg.user_id)
    const prefix = msg.message_type === 'group' ? 'g_' : 'p_'
    return { ...msg, session_index, session_id: `${prefix}${targetId}` }
  }

  /**
   * 加载本地消息
   * @param sessionId 会话标识
   * @param count 加载数量
   * @param index (可选) 结束索引
   */
  async function loadMessage(sessionId: string, count: number, index?: number): Promise<DBMessage[]> {
    try {
      const collection = database.messages
        .where('[session_id+session_index]')
        .between(
          [sessionId, Dexie.minKey],
          [sessionId, index ?? Dexie.maxKey],
          true,
          false
        )
        .reverse()
        .limit(count)
      const list = await collection.toArray()
      return list.reverse()
    } catch (e) {
      console.error('[Message] 读取本地消息失败:', e)
      return []
    }
  }

  /**
   * 拉取云端消息
   * @param id 会话ID
   * @param type 会话类型
   * @param count 拉取数量
   * @param startMsgId (可选) 起始消息 ID
   */
  async function fetchMessage(id: number, type: 'group' | 'private', count: number, startMsgId?: number): Promise<number> {
    try {
      const res = await bot.getMsgHistory(type, id, startMsgId, count, true)
      const list = res.messages || []
      if (list.length > 0) {
        const media: DBMedia[] = []
        const encoded = list.map(m => {
          const item = encodeMessageMedia(normalizeMessage(m))
          if (item.media.length) media.push(...item.media)
          return item.message
        })
        if (media.length) await database.media.bulkPut(media)
        await database.messages.bulkPut(encoded)
        return list.length
      }
    } catch (e) {
      console.warn('[Message] 拉取云端消息失败:', e)
    }
    return 0
  }

  /**
   * 打开新会话
   * @param id - 会话 ID
   */
  async function openSession(id: number): Promise<void> {
    if (activeId.value === id) return
    activeId.value = id
    hasMore.value = true
    setMultiSelect()
    setReplyTarget(null)
    sessionStore.clearUnread(id)
    messages.value = []

    const type = sessionStore.getSessionType(id)
    const sessionKey = type === 'group' ? `g_${id}` : `p_${id}`
    const numId = Number(id)
    const localMsgs = await loadMessage(sessionKey, 100)
    // 加载消息
    if (localMsgs.length > 0) {
      messages.value = localMsgs
      fetchMessage(numId, type, 100)
    } else {
      await fetchMessage(numId, type, 100)
      const freshMsgs = await loadMessage(sessionKey, 100)
      messages.value = freshMsgs
    }
  }

  /**
   * 拉取消息历史
   * @param id - 会话 ID
   */
  async function fetchHistory(id: number = activeId.value): Promise<number> {
    if (id !== activeId.value || !hasMore.value) return 0
    if (messages.value.length === 0) return 0

    const topMsg = messages.value[0]!
    const topIndex = topMsg.session_index
    const anchorMsg = messages.value.find(m => m.message_id > 0)
    const topMsgId = anchorMsg ? anchorMsg.message_id : undefined
    if (!topMsgId && messages.value.length > 0) return 0

    const type = sessionStore.getSessionType(id)
    const sessionKey = type === 'group' ? `g_${id}` : `p_${id}`
    const numId = Number(id)
    const localMessage = await loadMessage(sessionKey, 100, topIndex)
    // 更新视图
    if (localMessage.length > 0) {
      const existingIds = new Set(messages.value.map(m => m.message_id))
      const uniqueNew = localMessage.filter(m => !existingIds.has(m.message_id))
      if (uniqueNew.length > 0) {
        messages.value.unshift(...uniqueNew)
        triggerRef(messages)
      }
    }
    // 拉取云端
    fetchMessage(numId, type, 100, topMsgId).then(count => {
        if (count === 0 && localMessage.length === 0) hasMore.value = false
    })
    return localMessage.length
  }

  /**
   * 接收实时消息推送
   * @param rawEvent - 原始消息事件
   */
  function pushMessage(rawEvent: Message): void {
    const { message: stored, media } = encodeMessageMedia(normalizeMessage(rawEvent))
    if (media.length) database.media.bulkPut(media).catch(e => console.warn('[Message] 存储媒体失败:', e))
    database.messages.put(stored).catch(e => console.warn('[Message] 存储消息失败:', e))
    if (activeId.value) {
      const activeSession = sessionStore.getSession(activeId.value)
      const type = activeSession?.type ?? (rawEvent.message_type === 'group' ? 'group' : 'private')
      const activeKey = type === 'group' ? `g_${activeId.value}` : `p_${activeId.value}`
      if (activeKey === stored.session_id && !messages.value.some(m => m.message_id === stored.message_id)) {
        messages.value.push(stored)
        triggerRef(messages)
      }
    }
  }

  /**
   * 将通知事件转换为系统消息
   * @param notice 通知事件
   */
  function convertToMessage(notice: Notice) {
    let text = ''
    let targetId: number = 0
    let targetType: 'group' | 'private' = 'group'
    switch (notice.notice_type) {
      case 'friend_add': {
        targetId = notice.user_id
        targetType = 'private'
        text = `你和 ${contactStore.getUserName(notice.user_id)} 已成功添加为好友`
        break
      }
      case 'group_increase': {
        targetId = notice.group_id
        const userName = contactStore.getUserName(notice.user_id, notice.group_id)
        if (notice.sub_type === 'invite' || notice.user_id !== notice.operator_id) {
          const operatorName = contactStore.getUserName(notice.operator_id, notice.group_id)
          text = `${operatorName} 邀请 ${userName} 加入了本群`
        } else {
          text = `${userName} 加入了本群`
        }
        break
      }
      case 'group_decrease': {
        targetId = notice.group_id
        const userName = contactStore.getUserName(notice.user_id, notice.group_id)
        if (notice.sub_type === 'leave') {
          text = `${userName} 退出了本群`
        } else {
          const operatorName = contactStore.getUserName(notice.operator_id, notice.group_id)
          text = `${userName} 被 ${operatorName} 移出了本群`
        }
        break
      }
      case 'group_admin': {
        targetId = notice.group_id
        const userName = contactStore.getUserName(notice.user_id, notice.group_id)
        text = `${userName} 被${notice.sub_type === 'set' ? '设为' : '取消'}了管理员`
        break
      }
      case 'group_ban': {
        targetId = notice.group_id
        const userName = contactStore.getUserName(notice.user_id, notice.group_id)
        const operatorName = contactStore.getUserName(notice.operator_id, notice.group_id)
        if (notice.duration > 0) {
          text = `${userName} 被 ${operatorName} 禁言 ${formatDuration(notice.duration)}`
        } else {
          text = `${userName} 被 ${operatorName} 解除禁言`
        }
        break
      }
      case 'notify': {
        if (notice.sub_type === 'poke') {
          const { group_id, user_id, target_id, raw_info } = notice
          const isGroup = !!group_id
          targetId = isGroup ? group_id! : (user_id === settingStore.user?.user_id ? target_id : user_id)
          targetType = isGroup ? 'group' : 'private'
          if (Array.isArray(raw_info)) {
            let idx = 0
            text = raw_info.map((n: any) => {
              if (n.type === 'qq') return contactStore.getUserName(idx++ === 0 ? user_id : target_id, group_id)
              return n.type === 'nor' ? n.txt : ''
            }).join('')
          }
        } else if (notice.sub_type === 'lucky_king') {
          targetId = notice.group_id
          const luckyName = contactStore.getUserName(notice.target_id, notice.group_id)
          const senderName = contactStore.getUserName(notice.user_id, notice.group_id)
          text = `${senderName} 的红包被抢完，${luckyName} 是运气王`
        } else if (notice.sub_type === 'honor') {
          targetId = notice.group_id
          const userName = contactStore.getUserName(notice.user_id, notice.group_id)
          const honorMap: Record<string, string> = { talkative: '龙王', performer: '群聊之火', legend: '群聊炽焰', strong_newbie: '冒尖小春笋', emotion: '快乐源泉' }
          text = `恭喜 ${userName} 获得了 “${honorMap[notice.honor_type]}” 荣誉`
        } else if (notice.sub_type === 'title') {
          targetId = notice.group_id
          const userName = contactStore.getUserName(notice.user_id, notice.group_id)
          text = `恭喜 ${userName} 获得群主授予的 "${notice.title}" 头衔`
        }
        break
      }
    }
    if (!text || !targetId) return
    // 创建系统消息
    const systemMsg: Message = {
      time: notice.time,
      self_id: 0,
      post_type: PostType.Message,
      message_type: targetType,
      sub_type: 'normal',
      message_id: -Math.floor(Date.now() / 1000 + Math.random() * 100000),
      user_id: 10000,
      group_id: targetType === 'group' ? Number(targetId) : undefined,
      message: [{ type: SegType.Text, data: { text } }],
      raw_message: text,
      font: 0,
      sender: { user_id: 10000, nickname: '系统消息' }
    }
    if (settingStore.config.debugMode) console.log('[Message] 消息事件转换:', systemMsg)
    // 推送消息并更新会话
    pushMessage(systemMsg)
    sessionStore.updateSession(targetId, {
      type: targetType,
      preview: text,
      time: notice.time * 1000,
      unread: activeId.value === targetId ? 0 : 1
    })
  }

  /**
   * 更新消息状态
   * @param notice - 包含消息更新的通知事件
   */
  async function updateMessage(notice: Notice) {
    let messageId: number | undefined
    const updates: Partial<Pick<DBMessage, 'essence' | 'reactions'>> = {}
    if (notice.notice_type === 'essence') {
      messageId = notice.message_id
      updates.essence = notice.sub_type === 'add'
    } else if (notice.notice_type === 'group_msg_emoji_like') {
      messageId = notice.message_id
      updates.reactions = notice.likes
    } else if (notice.notice_type === 'notify' && notice.sub_type === 'emoji_like') {
      messageId = notice.message_id
      updates.reactions = notice.likes
    }
    if (!messageId) return
    // @ts-ignore 仅更新指定字段
    const updatedCount = await database.messages.where({ message_id: messageId }).modify(updates)
    // 更新视图
    if (updatedCount > 0) {
      const indexInView = messages.value.findIndex(m => m.message_id === messageId)
      if (indexInView !== -1) {
        messages.value[indexInView] = Object.assign({}, messages.value[indexInView], updates)
        triggerRef(messages)
      }
    }
  }

  /**
   * 处理消息撤回
   * @param msgId - 消息 ID
   */
  async function recallMessage(msgId: number): Promise<void> {
    const dbMsg = await database.messages.where('message_id').equals(msgId).first()
    if (dbMsg) {
      dbMsg.recalled = true
      await database.messages.put(dbMsg)
    }
    const idx = messages.value.findIndex(m => m.message_id === msgId)
    if (idx !== -1) {
      const target = messages.value[idx]
      if (target) {
        messages.value[idx] = { ...target, recalled: true }
        triggerRef(messages)
      }
    }
  }

  /**
   * 设置多选模式
   * @param id - 传入数字切换该消息选中状态；不传则关闭多选模式并清空
   */
  function setMultiSelect(id?: number): void {
    if (settingStore.config.debugMode) console.log('[Message] 设置多选目标:', id)
    if (id === undefined) {
      isMultiSelect.value = false
      selectedIds.value = []
      forwardTargets.value = []
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
    if (settingStore.config.debugMode) console.log('[Message] 设置回复目标:', message?.message_id)
    replyTarget.value = message
  }

  return {
    activeId, messages, forwardTargets, hasMore,
    isMultiSelect, selectedIds, selectedMessages, messagesById, replyTarget,
    setMultiSelect, setReplyTarget, openSession, pushMessage,
    fetchHistory, convertToMessage, updateMessage, recallMessage
  }
})
