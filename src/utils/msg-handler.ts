import { chatStore, type ChatMsg } from '@/utils/storage'
import { parseMsgList } from './msg-parser'

interface OneBotPayload {
  post_type?: string
  meta_event_type?: string
  sub_type?: string
  message_type?: string
  notice_type?: string
  request_type?: string
  [key: string]: unknown
}

/**
 * WebSocket 消息分发中心
 */
export function dispatchMessage(payload: OneBotPayload) {
  // 1. 元事件
  if (payload.post_type === 'meta_event') {
    if (payload.meta_event_type === 'lifecycle' && payload.sub_type === 'connect') {
      console.log('[MsgHandler] OneBot connected')
      chatStore.syncData()
    }
    return
  }

  // 2. 分发
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
  const isGroup = payload.message_type === 'group'
  const peerId = isGroup ? String(payload.group_id) : String(payload.user_id)
  const content = parseMsgList(payload.message).raw

  const msgObj: ChatMsg = {
    message_id: payload.message_id,
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
    status: 'success'
  }

  chatStore.addMsg(peerId, msgObj)
}

function handleNotice(payload: any) {
  // --- 撤回 ---
  if (payload.notice_type === 'group_recall' || payload.notice_type === 'friend_recall') {
    const peerId = payload.group_id ? String(payload.group_id) : String(payload.user_id)
    chatStore.recallMsg(peerId, payload.message_id)
    return
  }

  // --- 戳一戳 ---
  if (payload.notice_type === 'notify' && payload.sub_type === 'poke') {
    const peerId = payload.group_id ? String(payload.group_id) : String(payload.user_id)
    const text = `用户 ${payload.sender_id} 戳了戳 ${payload.target_id}`
    chatStore.addSystemMsg(peerId, text)
    return
  }

  // --- 群禁言 ---
  if (payload.notice_type === 'group_ban') {
    const groupId = String(payload.group_id)
    const text = payload.sub_type === 'ban'
      ? `成员 ${payload.user_id} 被禁言 ${payload.duration} 秒`
      : `成员 ${payload.user_id} 被解除禁言`
    chatStore.addSystemMsg(groupId, text)
    return
  }

  // --- 群成员变动 ---
  if (payload.notice_type === 'group_increase') {
    const groupId = String(payload.group_id)
    chatStore.addSystemMsg(groupId, `欢迎 ${payload.user_id} 加入群聊`)
    chatStore.getMembers(payload.group_id, true)
    return
  }

  if (payload.notice_type === 'group_decrease') {
    const groupId = String(payload.group_id)
    chatStore.addSystemMsg(groupId, `${payload.user_id} 已离开群聊`)
    chatStore.getMembers(payload.group_id, true)
    return
  }
}

function handleRequest(payload: any) {
  const notice = {
    time: payload.time,
    self_id: payload.self_id,
    post_type: 'request',
    request_type: payload.request_type,
    sub_type: payload.sub_type,
    user_id: payload.user_id,
    group_id: payload.group_id,
    comment: payload.comment,
    flag: payload.flag
  }

  chatStore.notices.value.unshift(notice as any)

  if (window.Notification && Notification.permission === 'granted') {
    const title = payload.request_type === 'friend' ? '新好友请求' : '新群组请求'
    new Notification(title, { body: `用户 ${payload.user_id} 请求添加` })
  }
}