// 消息类型枚举
export enum MsgType {
  Text = 'text',
  Image = 'image',
  File = 'file',
  Reply = 'reply',
  System = 'system',
  Face = 'face',
  Video = 'video',
  Record = 'record', // 语音
  Json = 'json',
  Xml = 'xml',
  At = 'at',
  Markdown = 'markdown',
  Card = 'card',     // 内部使用的通用卡片类型
  Forward = 'forward' // 合并转发
}

// 文件信息接口
export interface FileInfo {
  name: string
  size: number
  url?: string
  id?: string
}

// 消息链节点接口
export interface MessageSegment {
  type: string
  data: Record<string, unknown>
}

// 消息解析结果接口 (对应 msg-parser 的输出)
export interface ParsedMessage {
  text: string
  images: string[]
  files: FileInfo[]
  replyId: string | null
  atUserId: number | null  // uid -> userId
  faces: number[]
  markdown?: string
  card?: {
    title: string
    desc: string
    preview: string
    url: string
    icon: string
    source: string
  }
  // 原始 OneBot 消息链
  raw: MessageSegment[]
}

// 基础用户接口
export interface UserInfo {
  user_id: number
  nickname: string
  remark?: string
  avatar?: string
  // 辅助字段
  py_initial?: string // 拼音首字母
}

// 群组接口
export interface GroupInfo {
  group_id: number
  group_name: string
  member_count?: number
  max_member_count?: number
  avatar?: string
  py_initial?: string
}

// 群成员接口
export interface GroupMember {
  user_id: number
  nickname: string
  card?: string
  role: 'owner' | 'admin' | 'member'
  join_time: number
  last_sent_time: number
  shut_up_timestamp: number
  title?: string
}

// 会话列表项接口 (用于前端展示)
export interface Contact {
  peerId: string  // sessionId -> peerId
  type: 'user' | 'group'
  name: string
  avatar: string
  lastMsg?: string
  time?: number
  unread: number
  draft?: string // 草稿
}

// 消息发送者接口
export interface Sender {
  userId: number  // uid -> userId
  nickname: string
  card?: string
  role?: 'owner' | 'admin' | 'member'
  avatar: string
}

// 核心消息对象接口
export interface Message {
  id: string
  seq: number
  time: number
  type: MsgType
  sender: Sender
  content: ParsedMessage | string // ParsedMessage 或字符串(系统消息)
  raw_content?: MessageSegment[] // 原始消息链数据

  // 状态标识
  isMe: boolean
  isSending?: boolean
  isError?: boolean
  isDeleted?: boolean // isRecall -> isDeleted (对应 OneBot 的 delete_msg)
}

// 系统通知接口
export interface SystemNotice {
  time: number
  request_type: 'friend' | 'group'
  sub_type?: 'add' | 'invite'
  user_id: number
  group_id?: number
  nickname?: string
  comment?: string
  flag: string
  status?: 'approve' | 'reject'
}
