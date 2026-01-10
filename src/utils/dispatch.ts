import { useContactStore, useMessageStore, useSessionStore, useSettingStore } from '@/stores'
import { getTextPreview } from './format'
import type { Message, Notice, Request, OneBotEvent } from '@/types'

/**
 * 处理消息事件
 * @param data 消息数据
 */
function messageEvent(data: Message) {
  const messageStore = useMessageStore()
  const sessionStore = useSessionStore()
  const settingStore = useSettingStore()
  // 判断消息类型
  const isGroupMsg = data.message_type === 'group'
  const selfId = settingStore.user?.user_id
  let sessionId: string
  if (isGroupMsg) {
    sessionId = String(data.group_id)
  } else {
    sessionId = String(data.user_id === selfId ? (data).target_id : data.user_id)
  }
  // 推送消息
  messageStore.pushMessage(data)
  // 生成文本预览
  const preview = getTextPreview(data.message)
  // 更新会话信息
  const isSelf = data.sender.user_id === selfId
  const isActiveSession = messageStore.activeId === sessionId
  const unreadCount = (isActiveSession || isSelf) ? 0 : 1
  sessionStore.updateSession(sessionId, {
    type: isGroupMsg ? 'group' : 'private',
    preview: `${isSelf ? '我' : (data.sender.card || data.sender.nickname)}: ${preview}`,
    time: data.time * 1000,
    unread: unreadCount
  })
}

/**
 * 处理请求事件
 * @param data 请求数据
 */
function requestEvent(data: Request) {
  const contactStore = useContactStore()
  contactStore.addRequest(data)
}

/**
 * 处理通知事件
 * @param data 通知数据
 */
function noticeEvent(data: Notice) {
  const messageStore = useMessageStore()
  const contactStore = useContactStore()

  switch (data.notice_type) {
    case 'group_recall':
    case 'friend_recall':
      messageStore.recallMessage(data.message_id!)
      break
    // 系统消息
    case 'friend_add':
    case 'group_name':
    case 'group_ban':
    case 'group_title':
    case 'group_notice':
      messageStore.convertToMessage(data)
      if (data.notice_type === 'group_name') {
        contactStore.updateGroupInfo(data)
      } else if (['group_ban', 'group_title'].includes(data.notice_type)) {
        contactStore.updateGroupMember(data)
      }
      break
    case 'notify':
      const notifyTypes = ['poke', 'lucky_king', 'honor']
      if (data.sub_type === 'emoji_like') {
        // 更新消息状态
        messageStore.updateMessage(data)
      } else if (data.sub_type && notifyTypes.includes(data.sub_type)) {
        messageStore.convertToMessage(data)
      } else {
        console.log('[Dispatch] 未知 Notify 事件:', data)
      }
      break
    // 更新消息状态
    case 'essence':
    case 'group_msg_emoji_like':
      messageStore.updateMessage(data)
      break
    // 添加消息通知
    case 'group_increase':
    case 'group_decrease':
    case 'group_admin':
      contactStore.addNotice(data)
      contactStore.updateGroupMember(data)
      break
    // 更新用户信息
    case 'group_card':
      contactStore.updateGroupMember(data)
      break
    // 其它通知
    default:
      console.log('[Dispatch] 未知 Notice 事件:', data)
      break
  }
}

/**
 * 全局 WebSocket 消息事件处理器
 * 负责将 OneBot 事件分发到各个 Store
 */
export function dispatchEvent(data: OneBotEvent) {
  const settingStore = useSettingStore()
  if (settingStore.config.debugMode) console.log('[Dispatch] 原始事件:', data)
  switch (data.post_type) {
    case 'message':
    case 'message_sent':
      messageEvent(data as Message)
      break
    case 'request':
      requestEvent(data as Request)
      break
    case 'notice':
      noticeEvent(data as Notice)
      break
  }
}
