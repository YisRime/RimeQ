import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Message, MessageSegment } from '../types'
import { MsgType } from '../types'
import { bot } from '../api'
import { parseMsgList, determineMsgType } from '../utils/msg-parser'
import { useAuthStore } from './auth'
import { useContactStore } from './contact'
import { useOptionStore } from './option'

// 本地 UI 扩展的消息类型
export type ChatMessage = Message & {
  isSending?: boolean
  isError?: boolean
  isDeleted?: boolean
}

export const useChatStore = defineStore('chat', () => {
  const authStore = useAuthStore()
  const contactStore = useContactStore()
  const optionStore = useOptionStore()

  // 存储的是扩展后的 ChatMessage
  const messageMap = ref<Record<string, ChatMessage[]>>({})
  const banMap = ref<Record<string, number>>({})
  const replyMessage = ref<Message | null>(null)
  const isLoadingHistory = ref(false)
  const noMoreHistory = ref<Record<string, boolean>>({})

  const forwardingState = ref<{
    isActive: boolean
    messageIds: number[]
    type: 'single' | 'batch'
  }>({
    isActive: false,
    messageIds: [],
    type: 'single'
  })

  // 统一消息创建工厂
  function createMessageModel(params: {
    message_id: number
    real_id?: number
    time: number
    message_type: 'private' | 'group'
    sender: Message['sender']
    message: MessageSegment[]
    raw_message?: string
    isSending?: boolean
    isError?: boolean
    isDeleted?: boolean
  }): ChatMessage {
    return {
      message_id: params.message_id,
      real_id: params.real_id,
      time: params.time,
      message_type: params.message_type,
      sender: params.sender,
      message: params.message,
      raw_message: params.raw_message,
      // UI 状态
      isSending: params.isSending,
      isError: params.isError,
      isDeleted: params.isDeleted,
      // 注意：这里没有 is_me 字段了，由组件根据 sender.user_id 判断
    }
  }

  function getMessages(peerId: string) {
    if (!messageMap.value[peerId]) {
      messageMap.value[peerId] = []
    }
    return messageMap.value[peerId]
  }

  async function loadHistory(peerId: string) {
    if (!messageMap.value[peerId]) messageMap.value[peerId] = []
    await fetchHistory(peerId)
  }

  async function fetchHistory(peerId: string) {
    if (isLoadingHistory.value || noMoreHistory.value[peerId]) return
    isLoadingHistory.value = true

    const currentMsgs = messageMap.value[peerId] || []
    const firstRealMsg = currentMsgs.find(m => m.message_id > 0 && m.message_id < 2000000000)
    const startSeq = firstRealMsg ? (firstRealMsg.real_id || firstRealMsg.message_id) : 0

    try {
      const isGroup = peerId.length > 5
      let messages: any[] = []

      if (isGroup) {
        const res = await bot.getGroupMsgHistory(Number(peerId), startSeq === 0 ? undefined : startSeq)
        messages = res.messages || []
      } else {
        const res = await bot.getFriendMsgHistory(Number(peerId), startSeq === 0 ? undefined : startSeq)
        messages = res.messages || []
      }

      if (messages.length === 0) {
        noMoreHistory.value[peerId] = true
      } else {
        const parsedMsgs = messages.map((m: any) => {
          const content = typeof m.message === 'string' ? parseMsgList(m.message).raw : m.message
          return createMessageModel({
            message_id: m.message_id,
            real_id: m.real_id,
            time: m.time,
            message_type: isGroup ? 'group' : 'private',
            sender: m.sender,
            message: content,
            raw_message: m.raw_message
          })
        })

        const newMsgs = parsedMsgs.filter(m => !currentMsgs.some(ex => ex.message_id === m.message_id))
        if (newMsgs.length > 0) {
          messageMap.value[peerId] = [...newMsgs, ...currentMsgs]
        } else {
          noMoreHistory.value[peerId] = true
        }
      }
    } catch (e) {
      console.error('Get chat history failed', e)
    } finally {
      isLoadingHistory.value = false
    }
  }

  function addMessage(peerId: string, msg: ChatMessage) {
    if (!messageMap.value[peerId]) {
      messageMap.value[peerId] = []
    }
    if (messageMap.value[peerId].some(m => m.message_id === msg.message_id)) return
    messageMap.value[peerId].push(msg)
  }

  function addSysMsg(peerId: string, text: string) {
    const msg = createMessageModel({
      message_id: -Math.floor(Math.random() * 1000000),
      time: Date.now() / 1000,
      message_type: peerId.length > 5 ? 'group' : 'private',
      sender: { user_id: 0, nickname: 'System' }, // Sender 必须包含 user_id 和 nickname
      message: [{ type: MsgType.System, data: { text } }], // 这里使用了 System 类型，注意 MsgType 枚举中需包含 System 或复用 Text
    })
    // 手动修正 type，如果 MsgType 枚举没有 System，UI 需要适配
    if (msg.message[0]) msg.message[0].type = 'system'
    addMessage(peerId, msg)
  }

  function deleteMessage(peerId: string, msgId: number) {
    const list = messageMap.value[peerId]
    if (!list) return
    const idx = list.findIndex(m => m.message_id === msgId)

    if (idx !== -1) {
      const msg = list[idx]!
      if ((optionStore.config as { opt_anti_recall?: boolean }).opt_anti_recall) {
        msg.isDeleted = true
      } else {
        // 替换为撤回提示
        msg.message = [{ type: 'system', data: { text: '该消息已被撤回' } }]
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

  function setReplyMessage(msg: Message | null) {
    replyMessage.value = msg
  }

  async function sendMsg(peerId: string, content: string | MessageSegment[]) {
    const isGroup = peerId.length > 5
    const chain: MessageSegment[] = []

    // 1. 处理回复
    if (replyMessage.value) {
      chain.push({
        type: 'reply',
        data: { id: String(replyMessage.value.message_id) }
      })
      replyMessage.value = null
    }

    // 2. 处理内容
    if (typeof content === 'string') {
      chain.push({ type: 'text', data: { text: content } })
    } else {
      chain.push(...content)
    }

    // 3. 乐观更新
    const tempId = -Math.floor(Date.now() % 10000000)
    // 关键点：发送者必须是自己，这样 MsgBubble 才能识别为 isMe
    const currentLoginInfo = authStore.loginInfo!
    const newMsg = createMessageModel({
      message_id: tempId,
      time: Date.now() / 1000,
      message_type: isGroup ? 'group' : 'private',
      sender: {
        user_id: currentLoginInfo.user_id,
        nickname: currentLoginInfo.nickname
      },
      message: chain,
      isSending: true
    })

    addMessage(peerId, newMsg)

    // 更新列表预览
    const preview = determineMsgType(chain) === MsgType.Image ? '[图片]' : (typeof content === 'string' ? content : '[消息]')
    contactStore.update(peerId, { msg: preview, time: Date.now() })

    // 4. 网络请求
    try {
      const res = await bot.sendMsg(Number(peerId), chain, isGroup)
      newMsg.isSending = false
      if (res && res.message_id) newMsg.message_id = res.message_id
    } catch (e) {
      console.error('Send failed', e)
      newMsg.isSending = false
      newMsg.isError = true
    }
  }

  function startForward(messageIds: number[], type: 'single' | 'batch') {
    forwardingState.value = { isActive: true, messageIds, type }
  }

  function cancelForward() {
    forwardingState.value = { isActive: false, messageIds: [], type: 'single' }
  }

  function handlePokeNotice(params: { peerId: string, senderId: number, targetId: number }) {
    const { peerId, senderId, targetId } = params
    const myUserId = authStore.loginInfo?.user_id
    const isMe = targetId === myUserId
    const text = isMe ? `${senderId} 戳了戳你` : `你戳了戳 ${targetId}`
    addSysMsg(peerId, text)
  }

  function handleGroupBan(params: { groupId: string, userId: number, duration: number, isBan: boolean }) {
    const { groupId, userId, duration, isBan } = params
    const myUserId = authStore.loginInfo?.user_id
    if (userId === myUserId) setBanState(groupId, isBan, duration)
    const text = isBan ? `成员 ${userId} 被禁言 ${duration} 秒` : `成员 ${userId} 被解除禁言`
    addSysMsg(groupId, text)
  }

  function handleGroupIncrease(params: { groupId: string, userId: number }) {
    contactStore.getGroupMemberList(Number(params.groupId), true)
    addSysMsg(params.groupId, `欢迎 ${params.userId} 加入群聊`)
  }

  function handleGroupDecrease(params: { groupId: string, userId: number }) {
    const myUserId = authStore.loginInfo?.user_id
    if (params.userId === myUserId) addSysMsg(params.groupId, '你已退出该群')
    else {
      contactStore.getGroupMemberList(Number(params.groupId), true)
      addSysMsg(params.groupId, `${params.userId} 已离开群聊`)
    }
  }

  return {
    messageMap,
    isLoadingHistory,
    banMap,
    replyMessage,
    forwardingState,
    getMessages,
    loadHistory,
    addMessage,
    addSysMsg,
    deleteMessage,
    setBanState,
    isCurrentBanned,
    setReplyMessage,
    sendMsg,
    handlePokeNotice,
    handleGroupBan,
    handleGroupIncrease,
    handleGroupDecrease,
    startForward,
    cancelForward,
    loadChatHistory: loadHistory,
    pushSystemMessage: addSysMsg,
    sendMessage: sendMsg
  }
})
