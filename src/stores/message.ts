import { ref, shallowRef, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { defineStore } from 'pinia'
import { bot } from '@/api'
import { database, type DBMessage } from './database'
import { useSessionStore } from './session'
import { useSettingStore } from './setting'
import { useContactStore } from './contact'
import { type Message, type Notice, PostType } from '@/types'

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
   * 将通知事件转换为系统消息
   * @param notice 通知事件
   */
  function convertToMessage(notice: Notice) {
    const formatDuration = (seconds: number): string => {
        const units: [string, number][] = [['天', 86400], ['小时', 3600], ['分钟', 60], ['秒', 1]];
        const parts: string[] = [];
        units.reduce((acc, [label, value]) => {
            const count = Math.floor(acc / value);
            if (count > 0) parts.push(`${count}${label}`);
            return acc % value;
        }, seconds);
        return parts.join(' ');
    }
    // 定义生成器
    const generators: Record<string, (n: Notice) => { text: string; targetId: string | number; targetType: 'group' | 'private' } | null> = {
      'friend_add': n => ({
        text: `你和 ${contactStore.getUserName(n.user_id!)} 已成功添加为好友`,
        targetId: n.user_id!,
        targetType: 'private'
      }),
      'group_name': n => ({
        text: `${contactStore.getUserName(n.operator_id!)} 修改了群名称为 “${(n as any).group_name}”`,
        targetId: n.group_id!,
        targetType: 'group'
      }),
      'group_notice': n => ({
        text: `${contactStore.getUserName(n.user_id!)} 发布了新的群公告`,
        targetId: n.group_id!,
        targetType: 'group'
      }),
      'group_increase': n => ({
        text: n.user_id === n.operator_id
          ? `${contactStore.getUserName(n.user_id!)} 加入了群聊`
          : `${contactStore.getUserName(n.operator_id!)} 邀请 ${contactStore.getUserName(n.user_id!)} 加入了群聊`,
        targetId: n.group_id!,
        targetType: 'group'
      }),
      'group_decrease': n => ({
        text: n.sub_type === 'leave'
          ? `${contactStore.getUserName(n.user_id!)} 退出了群聊`
          : `${contactStore.getUserName(n.user_id!)} 已被 ${contactStore.getUserName(n.operator_id!)} 移出了群聊`,
        targetId: n.group_id!,
        targetType: 'group'
      }),
      'group_admin': n => ({
        text: n.sub_type === 'set'
          ? `${contactStore.getUserName(n.operator_id!)} 将 ${contactStore.getUserName(n.user_id!)} 设置为管理员`
          : `${contactStore.getUserName(n.operator_id!)} 取消了 ${contactStore.getUserName(n.user_id!)} 的管理员`,
        targetId: n.group_id!,
        targetType: 'group'
      }),
      'group_ban': n => ({
        text: n.duration! > 0
          ? `${contactStore.getUserName(n.user_id!)} 被 ${contactStore.getUserName(n.operator_id!)} 禁言 ${formatDuration(n.duration!)}`
          : `${contactStore.getUserName(n.user_id!)} 被 ${contactStore.getUserName(n.operator_id!)} 解除禁言`,
        targetId: n.group_id!,
        targetType: 'group'
      }),
      'group_title': n => ({
        text: `恭喜 ${contactStore.getUserName(n.user_id!)} 获得群主授予的 "${(n as any).title}" 头衔`,
        targetId: n.group_id!,
        targetType: 'group'
      }),
      'notify_poke': n => {
        const target = n.group_id ? contactStore.getUserName(n.target_id!) : '你';
        return {
            text: `${contactStore.getUserName(n.user_id!)} ${
                ((n as any).raw_info as any[]).filter(item => item.type === 'nor' && item.txt).map(item => item.txt).join(` ${target} `)
            }`,
            targetId: n.group_id || (n.user_id === settingStore.user?.user_id ? n.target_id! : n.user_id!),
            targetType: n.group_id ? 'group' : 'private',
        };
      },
      'notify_lucky_king': n => ({
        text: `${contactStore.getUserName(n.user_id!)} 的红包被抢完，${contactStore.getUserName(n.target_id!)} 是运气王`,
        targetId: n.group_id!,
        targetType: 'group'
      }),
      'notify_honor': n => {
        const honorMap = { talkative: '龙王', performer: '群聊之火', legend: '群聊炽焰', strong_newbie: '冒尖小春笋', emotion: '快乐源泉' }
        const honorText = honorMap[n.honor_type as keyof typeof honorMap] || '新的荣誉'
        return {
          text: `恭喜 ${contactStore.getUserName(n.user_id!)} 获得了 “${honorText}”`,
          targetId: n.group_id!,
          targetType: 'group'
        }
      }
    }
    // 查找生成器
    const lookupKey = notice.sub_type ? `${notice.notice_type}_${notice.sub_type}` : notice.notice_type
    const generator = generators[lookupKey] || generators[notice.notice_type]
    if (!generator) return
    const result = generator(notice)
    if (!result) return
    // 创建系统消息
    const { text, targetId, targetType } = result
    const systemMsg: Message = {
      time: notice.time,
      self_id: 0,
      post_type: PostType.Message,
      message_type: targetType,
      sub_type: 'normal',
      message_id: -Math.floor(Math.random() * 1000000),
      user_id: 10000,
      group_id: targetType === 'group' ? Number(targetId) : undefined,
      message: [{ type: 'text', data: { text } }],
      raw_message: text,
      font: 0,
      sender: { user_id: 10000, nickname: '系统消息' }
    }
    // 推送消息并更新会话
    pushMessage(systemMsg)
    sessionStore.updateSession(String(targetId), {
      type: targetType,
      preview: text,
      time: notice.time * 1000,
      unread: activeId.value === String(targetId) ? 0 : 1
    })
  }

  /**
   * 更新消息状态
   * @param notice - 包含消息更新的通知事件
   */
  async function updateMessage(notice: Notice) {
    const messageId = notice.message_id
    if (!messageId) return
    // 更新记录
    const updates: Partial<Pick<DBMessage, 'essence' | 'reactions'>> = {}
    if (notice.notice_type === 'essence') {
      updates.essence = notice.sub_type === 'add'
    } else if (notice.notice_type === 'notify' && notice.sub_type === 'emoji_like') {
      updates.reactions = notice.likes
    } else {
      return
    }
    const updatedCount = await database.messages.where({ message_id: messageId }).modify(updates)
    // 更新视图
    if (updatedCount > 0) {
      const indexInView = messages.value.findIndex(m => m.message_id === messageId)
      if (indexInView !== -1) {
        const newMessages = [...messages.value]
        newMessages[indexInView] = Object.assign({}, newMessages[indexInView], updates)
        messages.value = newMessages
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
        const copy = [...messages.value]
        const target = copy[idx]
        if (target) {
            const updated = { ...target, recalled: true }
            copy[idx] = updated
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

  return { activeId, messages, isLoading, isLoaded,
    isMultiSelect, selectedIds, selectedMessages, replyTarget,
    setMultiSelect, setReplyTarget, openSession, pushMessage,
    fetchHistory, convertToMessage, updateMessage, recallMessage }
})
