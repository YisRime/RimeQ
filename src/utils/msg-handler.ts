import { useMessagesStore } from '@/stores/messages'
import { useContactsStore } from '@/stores/contacts'
import type { ChatMsg } from '@/stores/messages'
import { parseMsgList } from './msg-parser'

// OneBot 事件载荷定义
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
 * 将后端事件分发到对应的 Pinia Store Action
 */
export function dispatchMessage(payload: OneBotPayload) {
  // 1. 元事件 (心跳/连接生命周期)
  if (payload.post_type === 'meta_event') {
    if (payload.meta_event_type === 'lifecycle' && payload.sub_type === 'connect') {
      console.log('[MsgHandler] OneBot connected')
      // 连接成功后，刷新联系人与群组列表
      useContactsStore().syncData()
    }
    return
  }

  // 2. 根据类型分发
  const postType = payload.post_type
  if (postType === 'message') {
    handleMessage(payload as any)
  } else if (postType === 'notice') {
    handleNotice(payload as any)
  } else if (postType === 'request') {
    handleRequest(payload as any)
  }
}

/** 处理聊天消息 */
function handleMessage(payload: any) {
  const messagesStore = useMessagesStore()

  const isGroup = payload.message_type === 'group'
  const peerId = isGroup ? String(payload.group_id) : String(payload.user_id)

  // 解析消息内容 (CQ码转对象)
  const content = parseMsgList(payload.message).raw

  // 构造标准消息对象
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
    status: 'success' // 接收到的消息默认成功
  }

  // 存入 Store
  messagesStore.addMsg(peerId, msgObj)
}

/** 处理通知事件 (撤回/群变动/戳一戳) */
function handleNotice(payload: any) {
  const messagesStore = useMessagesStore()
  const contactsStore = useContactsStore()

  // --- 消息撤回 ---
  if (payload.notice_type === 'group_recall' || payload.notice_type === 'friend_recall') {
    const peerId = payload.group_id ? String(payload.group_id) : String(payload.user_id)
    messagesStore.recallMsg(peerId, payload.message_id)
    return
  }

  // --- 戳一戳 ---
  if (payload.notice_type === 'notify' && payload.sub_type === 'poke') {
    const peerId = payload.group_id ? String(payload.group_id) : String(payload.user_id)
    const sender = payload.sender_id
    const target = payload.target_id
    // 构建本地系统提示
    const text = `用户 ${sender} 戳了戳 ${target}`
    messagesStore.addSystem(peerId, text)
    return
  }

  // --- 群禁言 ---
  if (payload.notice_type === 'group_ban') {
    const groupId = String(payload.group_id)
    const isBan = payload.sub_type === 'ban'
    const duration = payload.duration || 0
    const text = isBan
      ? `成员 ${payload.user_id} 被禁言 ${duration} 秒`
      : `成员 ${payload.user_id} 被解除禁言`
    messagesStore.addSystem(groupId, text)
    return
  }

  // --- 群成员变动 (进群) ---
  if (payload.notice_type === 'group_increase') {
    const groupId = String(payload.group_id)
    messagesStore.addSystem(groupId, `欢迎 ${payload.user_id} 加入群聊`)
    // 强制刷新该群成员列表缓存
    contactsStore.getMembers(payload.group_id, true)
    return
  }

  // --- 群成员变动 (退群) ---
  if (payload.notice_type === 'group_decrease') {
    const groupId = String(payload.group_id)
    const memberName = payload.user_id // 如果能获取昵称更好，这里只有ID
    messagesStore.addSystem(groupId, `${memberName} 已离开群聊`)
    contactsStore.getMembers(payload.group_id, true)
    return
  }
}

/** 处理请求事件 (好友/加群) */
function handleRequest(payload: any) {
  const contactsStore = useContactsStore()

  // 构造通知对象
  const notice = {
    time: payload.time,
    self_id: payload.self_id,
    post_type: 'request',
    request_type: payload.request_type, // 'friend' | 'group'
    sub_type: payload.sub_type,         // 'add' | 'invite'
    user_id: payload.user_id,
    group_id: payload.group_id,
    comment: payload.comment,
    flag: payload.flag
  }

  // 存入 Store (UI 会响应式更新)
  contactsStore.notices.unshift(notice as any)

  // 浏览器原生通知
  if (window.Notification && Notification.permission === 'granted') {
    const title = payload.request_type === 'friend' ? '新好友请求' : '新群组请求'
    new Notification(title, { body: `用户 ${payload.user_id} 请求添加` })
  }
}
