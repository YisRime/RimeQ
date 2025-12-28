import type { Message, MessageSegment, FileInfo } from './index'

/**
 * 应用层消息模型
 * 扩展自基础 Message，用于前端 UI 展示及数据库存储
 */
export interface IMessage extends Message {
  /** 会话 ID */
  sessionId: string
  /** 是否已被撤回 */
  recalled?: boolean
}

// ============================================================================
// 前端解析模型 (Frontend Parsed Models)
// ============================================================================

/**
 * 解析后的消息结构
 * 用于 UI 快速渲染，将原始消息链拆解为易读的属性
 */
export interface ParsedMessage {
  /** 纯文本内容 (已拼接所有 text 段) */
  text: string
  /** 图片 URL 列表 */
  images: string[]
  /** 文件列表 */
  files: FileInfo[]
  /** 回复的目标消息 ID */
  replyId: string | null
  /** 被 At 的用户 ID */
  atUserId: number | null
  /** 表情 ID 列表 */
  faces: number[]
  /** Markdown 内容 */
  markdown?: string
  /** 卡片消息内容 (JSON/XML 提取) */
  card?: {
    title: string
    desc: string
    preview: string
    url: string
    icon: string
    source: string
  }
  /** 原始消息段 */
  raw: MessageSegment[]
}
