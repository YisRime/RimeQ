import { useContactStore } from '@/stores/contact'
import { useMessageStore } from '@/stores/message'
import { useSessionStore } from '@/stores/session'
import { useSettingStore } from '@/stores/setting'
import { getPreviewText } from './format'
import type { Message } from '@/types'

/**
 * 全局 WebSocket 消息事件处理器
 * 负责将 OneBot 事件分发到各个 Store
 */
export function dispatchEvent(data: any) {
  const messageStore = useMessageStore()
  const sessionStore = useSessionStore()
  const contactStore = useContactStore()
  const settingStore = useSettingStore()

  // 1. 处理消息事件
  if (data.post_type === 'message' || data.post_type === 'message_sent') {
    const isGroupMsg = data.message_type === 'group'
    const selfId = settingStore.user?.user_id

    let sessionId: string
    if (isGroupMsg) {
      sessionId = String(data.group_id)
    } else {
      sessionId = String(data.user_id === selfId ? (data as any).target_id : data.user_id)
    }

    // 推送消息到 Message Store
    messageStore.pushMessage(data as Message)

    // 更新会话列表
    const preview = getPreviewText(data.message)
    const isSelf = data.sender.user_id === selfId
    // 如果是自己发送的，或者当前正好在这个会话中，则不增加未读数
    const isActiveSession = messageStore.activeId === sessionId
    const unreadCount = (isActiveSession || isSelf) ? 0 : 1

    sessionStore.updateSession(sessionId, {
      type: isGroupMsg ? 'group' : 'private',
      preview: `${isSelf ? '我' : (data.sender.card || data.sender.nickname)}: ${preview}`,
      time: data.time * 1000,
      unread: unreadCount
    })
  }

  // 2. 处理请求事件
  if (data.post_type === 'request') {
    contactStore.addNotice(data)
  }

  // 3. 处理通知事件
  if (data.post_type === 'notice') {
      // 消息撤回
      if (data.notice_type === 'group_recall' || data.notice_type === 'friend_recall') {
          messageStore.recallMessage(data.message_id)
      }
      // 好友添加/群成员变动等可在此扩展
  }

  // 4. 心跳事件
  if (data.post_type === 'meta_event' && data.meta_event_type === 'heartbeat') {
      // 可以在 settingStore 中更新心跳状态
  }
}
