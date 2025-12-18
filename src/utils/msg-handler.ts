import { useChatStore } from '../stores/chat'
import { useContactStore } from '../stores/contact'
import type { ChatMessage } from '../stores/chat' // 使用 Store 中定义的扩展类型
import { parseMsgList, determineMsgType } from './msg-parser'
import { MsgType } from '../types'

interface OneBotPayload {
  post_type?: string
  meta_event_type?: string
  sub_type?: string
  message_type?: string
  notice_type?: string
  request_type?: string
  [key: string]: unknown
}

export function dispatchMessage(payload: OneBotPayload) {
  if (payload.post_type === 'meta_event') {
    if (payload.meta_event_type === 'lifecycle' && payload.sub_type === 'connect') {
      console.log('[MsgHandler] OneBot connected')
      useContactStore().init()
    }
    return
  }

  const postType = payload.post_type
  if (postType === 'message') {
    handleMessage(payload as any)
  } else if (postType === 'notice') {
    handleNotice(payload as any)
  } else if (postType === 'request') {
    handleRequest(payload as any)
  }
}

function handleMessage(payload: any) {
  const chatStore = useChatStore()
  const contactStore = useContactStore()

  const isGroup = payload.message_type === 'group'
  const peerId = isGroup ? String(payload.group_id) : String(payload.user_id)

  // 解析消息内容
  const content = parseMsgList(payload.message).raw

  // 构造消息对象 (必须符合 ChatMessage 类型)
  const msgObj: ChatMessage = {
    message_id: payload.message_id,
    // message_seq (NapCat) or undefined
    real_id: payload.message_seq || payload.real_id || 0,
    time: payload.time,
    message_type: payload.message_type,
    sender: {
      user_id: payload.user_id,
      nickname: payload.sender?.nickname || payload.sender?.card || 'Unknown',
      card: payload.sender?.card,
      role: payload.sender?.role,
      sex: payload.sender?.sex,
      age: payload.sender?.age,
      level: payload.sender?.level,
      title: payload.sender?.title
    },
    message: content,
    raw_message: payload.raw_message,
    // isSending/isError/isDeleted 默认为空
  }

  chatStore.addMessage(peerId, msgObj)

  // 预览文本逻辑
  const type = determineMsgType(content)
  let preview = ''
  if (type === MsgType.Image) preview = '[图片]'
  else if (type === MsgType.File) preview = '[文件]'
  else if (type === MsgType.Record) preview = '[语音]'
  else if (type === MsgType.Video) preview = '[视频]'
  else {
    // 提取文本
    preview = content.filter((s: any) => s.type === 'text').map((s: any) => s.data.text).join('') || '[消息]'
  }

  if (isGroup) {
    preview = `${msgObj.sender.nickname}: ${preview}`
  }

  contactStore.update(peerId, {
    type: isGroup ? 'group' : 'user',
    name: isGroup ? `群 ${peerId}` : msgObj.sender.nickname,
    msg: preview,
    time: msgObj.time * 1000, // 注意：contact store 使用 ms
    increaseUnread: true // 接收到的消息默认增加未读
  })
}

function handleNotice(payload: any) {
  const chatStore = useChatStore()

  if (payload.notice_type === 'group_recall' || payload.notice_type === 'friend_recall') {
    const peerId = payload.group_id ? String(payload.group_id) : String(payload.user_id)
    chatStore.deleteMessage(peerId, payload.message_id)
    return
  }

  if (payload.notice_type === 'notify' && payload.sub_type === 'poke') {
    const peerId = payload.group_id ? String(payload.group_id) : String(payload.user_id)
    chatStore.handlePokeNotice({
      peerId,
      senderId: payload.sender_id,
      targetId: payload.target_id
    })
    return
  }

  if (payload.notice_type === 'group_ban') {
    const groupId = String(payload.group_id)
    const isBan = payload.sub_type === 'ban'
    const duration = payload.duration || 0
    const targetId = payload.user_id

    chatStore.handleGroupBan({
      groupId,
      userId: targetId,
      duration,
      isBan
    })
    return
  }

  if (payload.notice_type === 'group_increase') {
    const groupId = String(payload.group_id)
    const userId = payload.user_id
    chatStore.handleGroupIncrease({ groupId, userId })
    return
  }

  if (payload.notice_type === 'group_decrease') {
    const groupId = String(payload.group_id)
    const userId = payload.user_id
    chatStore.handleGroupDecrease({ groupId, userId })
    return
  }
}

function handleRequest(payload: any) {
  const contactStore = useContactStore()
  // SystemNotice 类型匹配
  contactStore.addNotice({
    time: payload.time,
    self_id: payload.self_id,
    post_type: 'request',
    request_type: payload.request_type,
    sub_type: payload.sub_type,
    user_id: payload.user_id,
    group_id: payload.group_id,
    comment: payload.comment,
    flag: payload.flag
  })

  if (window.Notification && Notification.permission === 'granted') {
    new Notification('新系统通知', { body: '您收到一个新的好友或群组请求' })
  }
}
