import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Message, MessageSegment } from '../types'
import { MsgType } from '../types'
import { botApi } from '../api'
import { parseMsgList, determineMsgType } from '../utils/msg-parser'
import { useAuthStore } from './auth'
import { useContactStore } from './contact'
import { useOptionStore } from './option'

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()
  const contactStore = useContactStore()
  const optionStore = useOptionStore()

  // 消息映射表: key=peerId, value=Message[]
  const messageMap = ref<Record<string, Message[]>>({})

  // 禁言状态表: key=peerId, value=禁言结束时间戳(ms)
  const banMap = ref<Record<string, number>>({})

  // 当前正在引用的消息 (回复功能)
  const replyMessage = ref<Message | null>(null)

  // 历史记录加载状态
  const isLoadingHistory = ref(false)
  const noMoreHistory = ref<Record<string, boolean>>({})

  // 转发状态
  const forwardingState = ref<{
    isActive: boolean
    messageIds: string[]
    type: 'single' | 'batch'
  }>({
    isActive: false,
    messageIds: [],
    type: 'single'
  })

  /**
   * 消息工厂：标准化消息对象创建
   */
  function createMessageModel(params: {
    id: string
    seq?: number
    time: number
    type: MsgType
    sender: {
      userId: number
      nickname: string
      avatar: string
      card?: string
      role?: 'owner' | 'admin' | 'member'
    }
    content: Message['content']
    raw_content?: MessageSegment[]
    isMe: boolean
    isSending?: boolean
    isError?: boolean
    isDeleted?: boolean
  }): Message {
    return {
      id: params.id,
      seq: params.seq ?? 0,
      time: params.time,
      type: params.type,
      sender: params.sender,
      content: params.content,
      raw_content: params.raw_content,
      isMe: params.isMe,
      isSending: params.isSending,
      isError: params.isError,
      isDeleted: params.isDeleted
    }
  }

  /**
   * 获取指定会话的消息列表（仅返回现有数据，不触发请求）
   * @param peerId 会话标识
   */
  function getMessages(peerId: string) {
    if (!messageMap.value[peerId]) {
      messageMap.value[peerId] = []
    }
    return messageMap.value[peerId]
  }

  /**
   * 加载聊天历史记录 - 显式 Action
   * @param peerId 会话标识
   */
  async function loadHistory(peerId: string) {
    if (!messageMap.value[peerId]) messageMap.value[peerId] = []
    await fetchHistory(peerId)
  }

  /**
   * 获取聊天历史记录 - 对应 OneBot API: get_chat_history
   * @param peerId 会话标识
   */
  async function fetchHistory(peerId: string) {
    if (isLoadingHistory.value || noMoreHistory.value[peerId]) return
    isLoadingHistory.value = true
    const currentMsgs = messageMap.value[peerId] || []
    const firstRealMsg = currentMsgs.find(m => !m.id.startsWith('temp-') && !m.id.startsWith('sys-') && !m.id.startsWith('poke-'))
    const startMsgId = firstRealMsg ? Number(firstRealMsg.id) : 0
    try {
      const isGroup = peerId.length > 5
      const params: Record<string, number> & { message_id?: number } = { count: 20 }
      if (isGroup) params.group_id = Number(peerId)
      else params.user_id = Number(peerId)
      if (startMsgId !== 0) params.message_id = startMsgId
      const messages = await botApi.getChatHistory(params, authStore.loginInfo?.userId)
      if (messages.length === 0) noMoreHistory.value[peerId] = true
      else {
        const newMsgs = messages.filter((m: Message) => !currentMsgs.some(ex => ex.id === m.id))
        if (newMsgs.length > 0) messageMap.value[peerId] = [...newMsgs, ...currentMsgs]
        else noMoreHistory.value[peerId] = true
      }
    } catch (e) {
      console.error('Get chat history failed', e)
    } finally {
      isLoadingHistory.value = false
    }
  }

  /**
   * 添加消息到指定会话 - 内部方法
   * @param peerId 会话标识
   */
  function addMessage(peerId: string, msg: Message) {
    if (!messageMap.value[peerId]) {
      messageMap.value[peerId] = []
    }
    if (messageMap.value[peerId].some(m => m.id === msg.id)) return
    messageMap.value[peerId].push(msg)
  }

  /**
   * 添加系统消息
   * @param peerId 会话标识
   */
  function addSysMsg(peerId: string, text: string) {
    const msg = createMessageModel({ id: `sys-${Date.now()}-${Math.random()}`, time: Date.now(), type: MsgType.System, sender: { userId: 0, nickname: 'System', avatar: '' }, content: text, isMe: false })
    addMessage(peerId, msg)
  }

  /**
   * 删除消息 - 对应 OneBot API: delete_msg
   * @param peerId 会话标识
   * @param msgId 消息ID
   */
  function deleteMessage(peerId: string, msgId: string) {
    const list = messageMap.value[peerId]
    if (!list) return
    const idx = list.findIndex(m => m.id === msgId)

    if (idx !== -1) {
      const msg = list[idx]!
      if ((optionStore.config as { opt_anti_recall?: boolean }).opt_anti_recall) {
        msg.isDeleted = true
      } else {
        msg.type = MsgType.System
        msg.content = '该消息已被撤回'
        msg.raw_content = undefined
      }
    }
  }

  function setBanState(groupId: string, isBan: boolean, duration: number) {
    if (isBan) {
      banMap.value[groupId] = Date.now() + duration * 1000
    } else {
      delete banMap.value[groupId]
    }
  }

  function isCurrentBanned(peerId: string): boolean {
    const banTime = banMap.value[peerId]
    if (!banTime) return false
    if (Date.now() > banTime) {
      delete banMap.value[peerId]
      return false
    }
    return true
  }

  /**
   * 设置当前回复引用的消息
   */
  function setReplyMessage(msg: Message | null) {
    replyMessage.value = msg
  }

  /**
   * 发送消息 - 对应 OneBot API: send_msg / send_group_msg / send_private_msg
   * @param peerId 会话标识
   */
  async function sendMsg(peerId: string, content: string | { type: string; data: Record<string, unknown> }[]) {
    const isGroup = peerId.length > 5

    // 构建消息链
    const chain: { type: string; data: Record<string, unknown> }[] = []

    // 1. 处理引用回复
    if (replyMessage.value) {
      chain.push({
        type: 'reply',
        data: { id: replyMessage.value.id }
      })
      // 发送后清除引用状态
      replyMessage.value = null
    }

    // 2. 处理内容
    if (typeof content === 'string') {
      chain.push({ type: 'text', data: { text: content } })
    } else {
      chain.push(...content)
    }

    // 3. 乐观更新 (UI显示)
    const tempId = `temp-${Date.now()}`
    const currentLoginInfo = authStore.loginInfo!
    const newMsg = createMessageModel({
      id: tempId,
      time: Date.now(),
      type: typeof content === 'string' ? MsgType.Text : determineMsgType(content),
      sender: {
        userId: currentLoginInfo.userId,
        nickname: currentLoginInfo.nickname,
        avatar: currentLoginInfo.avatar
      },
      content: typeof content === 'string'
        ? { text: content, images: [], files: [], faces: [], replyId: null, atUserId: null, raw: [] }
        : parseMsgList(content),
      raw_content: typeof content === 'string' ? undefined : content,
      isMe: true,
      isSending: true
    })

    addMessage(peerId, newMsg)

    // 更新会话列表预览
    const preview = newMsg.type === MsgType.Image ? '[图片]' : (typeof content === 'string' ? content : '[消息]')
    contactStore.update(peerId, { msg: preview, time: Date.now() })

    // 4. 网络请求
    try {
      const res = isGroup ? await botApi.sendGroupMsg(Number(peerId), chain) : await botApi.sendPrivateMsg(Number(peerId), chain)
      newMsg.isSending = false
      if (res && res.message_id) newMsg.id = String(res.message_id)
    } catch (e) {
      console.error('Send failed', e)
      newMsg.isSending = false
      newMsg.isError = true
    }
  }

  /**
   * 处理戳一戳通知
   */
  function handlePokeNotice(params: {
    peerId: string
    senderId: number
    targetId: number
  }) {
    const { peerId, senderId, targetId } = params
    const myUserId = authStore.loginInfo?.userId
    const isMe = targetId === myUserId
    const text = isMe ? `${senderId} 戳了戳你` : `你戳了戳 ${targetId}`

    const msgObj = createMessageModel({
      id: `poke-${Date.now()}`,
      time: Date.now(),
      type: MsgType.System,
      sender: { userId: 0, nickname: 'System', avatar: '' },
      content: text,
      isMe: false
    })
    addMessage(peerId, msgObj)
  }

  /**
   * 处理群文件上传通知
   */
  function handleGroupUpload(params: {
    groupId: string
    userId: number
    file: {
      name: string
      size: number
      url?: string
      busid?: number
    }
  }) {
    const { groupId, userId, file } = params
    const myUserId = authStore.loginInfo?.userId

    const msgObj = createMessageModel({
      id: `file-${Date.now()}`,
      time: Date.now(),
      type: MsgType.File,
      sender: {
        userId: userId,
        nickname: 'Unknown',
        avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${userId}`
      },
      content: {
        text: `[文件] ${file.name}`,
        images: [],
        files: [{
          name: file.name,
          size: file.size,
          url: file.url,
          id: file.busid?.toString()
        }],
        replyId: null,
        atUserId: null,
        faces: [],
        raw: []
      },
      isMe: userId === myUserId
    })
    addMessage(groupId, msgObj)
  }

  /**
   * 处理群禁言通知
   */
  function handleGroupBan(params: {
    groupId: string
    userId: number
    operatorId: number
    duration: number
    isBan: boolean
  }) {
    const { groupId, userId, duration, isBan } = params
    const myUserId = authStore.loginInfo?.userId

    if (userId === myUserId) {
      setBanState(groupId, isBan, duration)
      const text = isBan ? `你被管理员禁言 ${duration} 秒` : '你已被解除禁言'
      addSysMsg(groupId, text)
    } else {
      const text = isBan ? `成员 ${userId} 被禁言 ${duration} 秒` : `成员 ${userId} 被解除禁言`
      addSysMsg(groupId, text)
    }
  }

  /**
   * 处理群成员增加通知
   */
  function handleGroupIncrease(params: {
    groupId: string
    userId: number
  }) {
    const { groupId, userId } = params
    contactStore.getGroupMemberList(Number(groupId), true)
    addSysMsg(groupId, `欢迎 ${userId} 加入群聊`)
  }

  /**
   * 处理群成员减少通知
   */
  function handleGroupDecrease(params: {
    groupId: string
    userId: number
  }) {
    const { groupId, userId } = params
    const myUserId = authStore.loginInfo?.userId

    if (userId === myUserId) {
      addSysMsg(groupId, '你已退出该群')
    } else {
      contactStore.getGroupMemberList(Number(groupId), true)
      addSysMsg(groupId, `${userId} 已离开群聊`)
    }
  }

  /**
   * 开始转发模式
   */
  function startForward(messageIds: string[], type: 'single' | 'batch') {
    forwardingState.value = {
      isActive: true,
      messageIds,
      type
    }
  }

  /**
   * 取消转发模式
   */
  function cancelForward() {
    forwardingState.value = {
      isActive: false,
      messageIds: [],
      type: 'single'
    }
  }

  /**
   * 完成转发 (发送给目标)
   */
  function completeForward() {
    // 转发逻辑应该在 ForwardBar 中处理
    // 这里只是清理状态
    cancelForward()
  }

  return {
    messageMap,
    isLoadingHistory,
    banMap,
    replyMessage,
    forwardingState,
    getMessages,
    loadHistory,
    fetchHistory,
    addMessage,
    addSysMsg,
    deleteMessage,
    setBanState,
    isCurrentBanned,
    setReplyMessage,
    sendMsg,
    handlePokeNotice,
    handleGroupUpload,
    handleGroupBan,
    handleGroupIncrease,
    handleGroupDecrease,
    startForward,
    cancelForward,
    completeForward,
    loadChatHistory: loadHistory,
    getChatHistory: fetchHistory,
    pushSystemMessage: addSysMsg,
    sendMessage: sendMsg
  }
})

