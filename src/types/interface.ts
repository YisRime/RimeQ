import type { Message } from './index'

/**
 * 带有会话标识的消息 (应用内)
 */
export interface IMessage extends Message {
  /** 归属的会话 ID (私聊为 user_id, 群聊为 group_id) */
  sessionId: string
  /** 是否已撤回 (防撤回功能) */
  recalled?: boolean
}
