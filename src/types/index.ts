// ============================================================================
// 基础枚举与结构 (Enums & Base Structures)
// ============================================================================

/**
 * 消息段类型枚举
 * 对应 OneBot 消息段 (Segment) 的 `type` 字段
 */
export enum MsgType {
  /** 纯文本 */
  Text = 'text',
  /** 图片 */
  Image = 'image',
  /** 语音 */
  Record = 'record',
  /** 视频 */
  Video = 'video',
  /** At 某人 */
  At = 'at',
  /** 猜拳 */
  Rps = 'rps',
  /** 掷骰子 */
  Dice = 'dice',
  /** 窗口抖动 */
  Shake = 'shake',
  /** 戳一戳 */
  Poke = 'poke',
  /** 匿名发消息 */
  Anonymous = 'anonymous',
  /** 链接分享 */
  Share = 'share',
  /** 推荐联系人/群 */
  Contact = 'contact',
  /** 位置 */
  Location = 'location',
  /** 音乐分享 */
  Music = 'music',
  /** 回复 */
  Reply = 'reply',
  /** 合并转发 */
  Forward = 'forward',
  /** 合并转发节点 */
  Node = 'node',
  /** XML 卡片消息 */
  Xml = 'xml',
  /** JSON 卡片消息 */
  Json = 'json',
  /** QQ 表情 */
  Face = 'face',
  /** (扩展) 文件 */
  File = 'file',
  /** (扩展) 商城表情 */
  MarketFace = 'mface',
  /** (扩展) Markdown */
  Markdown = 'markdown'
}

/**
 * 基础 API 响应外壳
 * 所有 API 返回的数据都包裹在此结构中 (WebSocket/HTTP)
 * @template T - 具体的响应数据类型
 */
export interface ApiResponse<T> {
  /** 执行状态 */
  status: 'ok' | 'failed' | 'async'
  /** 返回码: 0 表示成功，非 0 表示失败 */
  retcode: number
  /** 响应数据主体 */
  data: T
  /** 错误提示信息 */
  msg?: string
  /** (Go-CQHTTP) 错误提示信息 */
  wording?: string
  /** 回显字段，原样返回请求中的 echo */
  echo?: string
  /** (NapCat) 错误信息 */
  error?: string
}

// ============================================================================
// 消息相关模型 (Message Models)
// ============================================================================

/**
 * 消息段结构
 * OneBot 数组格式的基础单元
 */
export interface MessageSegment {
  /** 消息段类型 */
  type: string
  /** 数据对象 (内容取决于 type) */
  data: {
    /** [Text] 文本内容 */
    text?: string
    /** [Image/Record/Video/File] 文件名/路径/URL/Base64 */
    file?: string
    /** [Image/Record/Video] 网络 URL */
    url?: string
    /** [At] 被 At 用户的 QQ 号 */
    qq?: string
    /** [At] 被 At 用户的名称 (仅发送时有效，接收时通常无此字段) */
    name?: string
    /** [Face] 表情 ID */
    id?: string
    /** [Reply] 回复的消息 ID */
    // id?: string
    /** [Share/Location] 标题 */
    title?: string
    /** [Share/Location] 内容描述 */
    content?: string
    /** [Share] 图片 URL */
    image?: string
    /** [Location] 纬度 */
    lat?: string
    /** [Location] 经度 */
    lon?: string
    /** [Music] 类型: qq, 163, xm */
    // type?: string
    /** [Audio] 语音 URL */
    audio?: string
    /** 任意其他参数 */
    [key: string]: any
  }
}

/**
 * 基础发送者信息
 */
export interface Sender {
  /** 发送者 QQ 号 */
  user_id: number
  /** 昵称 */
  nickname: string
  /** 群名片 (仅群聊) */
  card?: string
  /** 性别 */
  sex?: 'male' | 'female' | 'unknown'
  /** 年龄 */
  age?: number
  /** 地区 */
  area?: string
  /** 成员等级 */
  level?: string
  /** 角色 (owner/admin/member) */
  role?: 'owner' | 'admin' | 'member'
  /** 专属头衔 */
  title?: string
}

/**
 * 消息对象
 * 用于前端 UI 展示及历史记录存储，统一了不同后端的字段差异
 */
export interface Message {
  /** 事件类型 */
  post_type: 'message'
  /** 消息 ID */
  message_id: number
  /** 消息真实 ID (Seq) */
  real_id?: number
  /** 发送者信息 */
  sender: Sender
  /** 发送时间戳 (秒) */
  time: number
  /** 消息类型 */
  message_type: 'private' | 'group'
  /** 消息子类型 (normal/anonymous/friend/group) */
  sub_type?: string
  /** 原始 CQ 码消息字符串 */
  raw_message?: string
  /** 消息段数组 */
  message: MessageSegment[]
  /** 来源群号 (仅群聊) */
  group_id?: number
  /** 来源用户 ID */
  user_id?: number
  /** 匿名信息 */
  anonymous?: {
    id: number
    name: string
    flag: string
  } | null
  /** 字体 */
  font?: number
  /** (NapCat) 消息序列号 */
  message_seq?: number
}

// ============================================================================
// API 请求参数与响应 (API Requests & Responses)
// ============================================================================

// --- 发送消息 ---

/** 发送消息请求参数 */
export interface SendMsgParams {
  /** 消息类型: private=私聊, group=群聊 */
  message_type?: 'private' | 'group'
  /** 对方 QQ 号 (私聊必填) */
  user_id?: number
  /** 群号 (群聊必填) */
  group_id?: number
  /** 消息内容: 字符串或消息段数组 */
  message: string | MessageSegment[]
  /** 是否纯文本发送 (不解析 CQ 码) */
  auto_escape?: boolean
}

/** 发送消息响应 */
export interface MsgId {
  /** 消息 ID */
  message_id: number
  /** (NapCat/Go-CQ) 转发消息 ID，仅在发送转发消息时存在 */
  forward_id?: string
  /** (NapCat) 转发消息 ID 别名 */
  res_id?: string
}

// --- 获取消息 ---

/** 获取单条消息响应 */
export interface GetMsg {
  /** 发送时间戳 */
  time: number
  /** 消息类型 */
  message_type: 'private' | 'group'
  /** 消息 ID */
  message_id: number
  /** 消息真实 ID (Seq) */
  real_id: number
  /** 发送者信息 */
  sender: Sender
  /** 消息内容 */
  message: MessageSegment[]
}

// --- 合并转发 ---

/**
 * 合并转发节点数据结构
 * 用于 send_group_forward_msg 等接口
 */
export interface ForwardNode {
  type: 'node'
  data: {
    /** 引用消息 ID (转发已有消息) */
    id?: string
    /** 发送者 QQ (自定义转发) */
    user_id?: number
    /** 发送者昵称 (自定义转发) */
    nickname?: string
    /** 消息内容 (自定义转发) */
    content?: string | MessageSegment[]
    /** (NapCat) 转发卡片第一层预览文字 */
    news?: { text: string }[]
    /** (NapCat) 转发卡片标题 */
    prompt?: string
    /** (NapCat) 转发卡片摘要 */
    summary?: string
    /** (NapCat) 转发卡片来源 */
    source?: string
  }
}

/** 获取合并转发消息响应 */
export interface GetForwardMsg {
  /** 消息内容列表 */
  message: MessageSegment[]
}

// --- 历史消息 ---

/** 历史消息响应 */
export interface GetHistoryMsg {
  /** 消息列表 (包含 sender, time, message 等字段) */
  messages: any[]
}

// ============================================================================
// 实体数据模型 (Entity Models)
// ============================================================================

// --- 好友 ---

/** 好友信息 */
export interface FriendInfo {
  /** QQ 号 */
  user_id: number
  /** 昵称 */
  nickname: string
  /** 备注 */
  remark: string
  /** (NapCat) 分组 ID */
  class_id?: number
  /** (NapCat) 等级 */
  level?: number
  /** (Lagrange) 性别 */
  sex?: string
}

/** 陌生人信息 */
export interface StrangerInfo extends FriendInfo {
  /** 性别 */
  sex?: string
  /** 年龄 */
  age?: number
  /** (Lagrange) QID */
  qid?: string
  /** (Lagrange) 登录天数 */
  login_days?: number
}

/** (NapCat) 好友分类信息 */
export interface FriendCategory {
  /** 分类 ID */
  categoryId: number
  /** 分类排序 ID */
  categorySortId: number
  /** 分类名称 */
  categoryName: string
  /** 分类成员数量 */
  categoryMbCount: number
  /** 在线成员数量 */
  onlineCount: number
  /** 好友列表 */
  buddyList: FriendInfo[]
}

// --- 群组 ---

/** 群组信息 */
export interface GroupInfo {
  /** 群号 */
  group_id: number
  /** 群名称 */
  group_name: string
  /** 成员数 */
  member_count: number
  /** 最大成员数 */
  max_member_count: number
  /** 群备注 */
  group_remark?: string
  /** 创建时间 */
  group_create_time?: number
  /** 群等级 */
  group_level?: number
  /** (NapCat) 全员禁言状态 0=关闭 1=开启 */
  group_all_shut_up?: number
}

/** 群成员信息 */
export interface GroupMemberInfo extends Sender {
  /** 群号 */
  group_id: number
  /** 加群时间戳 */
  join_time: number
  /** 最后发言时间戳 */
  last_sent_time: number
  /** 是否不良记录成员 */
  unfriendly: boolean
  /** 专属头衔过期时间 */
  title_expire_time: number
  /** 是否允许修改群名片 */
  card_changeable: boolean
  /** (NapCat) 禁言截止时间戳 */
  shut_up_timestamp?: number
  /** (NapCat) 是否是机器人 */
  is_robot?: boolean
  /** 等级 */
  level?: string
  /** 地区 */
  area?: string
  /** (Go-CQ) 是否允许私聊 */
  allow_change_card?: boolean
}

/** 群荣誉信息 */
export interface GroupHonorInfo {
  /** 群号 */
  group_id: number
  /** 当前龙王 */
  current_talkative?: {
    user_id: number
    nickname: string
    avatar: string
    day_count: number
  }
  /** 历史龙王列表 */
  talkative_list?: {
    user_id: number
    nickname: string
    avatar: string
    description: string
  }[]
  /** 群聊之火列表 */
  performer_list?: {
    user_id: number
    nickname: string
    avatar: string
    description: string
  }[]
  /** 群聊炽焰列表 */
  legend_list?: {
    user_id: number
    nickname: string
    avatar: string
    description: string
  }[]
  /** 快乐之源列表 */
  emotion_list?: {
    user_id: number
    nickname: string
    avatar: string
    description: string
  }[]
}

/** 群公告 */
export interface GroupNotice {
  /** (NapCat/Lagrange) 公告 ID */
  notice_id?: string
  /** 发布者 QQ */
  sender_id: number
  /** 发布时间 */
  publish_time: number
  /** 消息内容 */
  message: {
    /** 文本内容 */
    text: string
    /** 图片列表 (标准/Go-CQ) */
    images?: { id: string, height: string, width: string }[]
    /** 图片列表 (NapCat 兼容字段) */
    image?: { id: string, height: string, width: string }[]
  }
}

/** 群系统消息请求 (加群/邀请) */
export interface GroupSystemRequest {
  /** 请求 ID */
  request_id: number
  /** 邀请者 QQ */
  invitor_uin?: number
  /** 邀请者昵称 */
  invitor_nick?: string
  /** 申请人 QQ */
  requester_uin?: number
  /** 申请人昵称 */
  requester_nick?: string
  /** 群号 */
  group_id: number
  /** 群名称 */
  group_name: string
  /** 验证消息 */
  message?: string
  /** 是否已处理 */
  checked: boolean
  /** 处理人 QQ */
  actor: number
}

/** 群系统消息响应 */
export interface GroupSystemMsg {
  /** 邀请请求列表 */
  invited_requests: GroupSystemRequest[]
  /** 加群请求列表 */
  join_requests: GroupSystemRequest[]
  /** (NapCat) 兼容字段 */
  InvitedRequest?: any[]
}

// --- 文件系统 ---

/** 文件信息 */
export interface FileInfo {
  /** 文件 ID */
  file_id: string
  /** 文件名 */
  file_name: string
  /** 文件大小 (字节) */
  file_size: number
  /** 业务 ID */
  busid?: number
  /** 下载 URL */
  url?: string
  /** 上传时间 */
  upload_time?: number
  /** 过期时间 (0为永久) */
  dead_time?: number
  /** 下载次数 */
  download_times?: number
  /** 上传者 QQ */
  uploader?: number
  /** 上传者昵称 */
  uploader_name?: string
}

/** 文件夹信息 */
export interface FolderInfo {
  /** 文件夹 ID */
  folder_id: string
  /** 文件夹名称 */
  folder_name: string
  /** 创建时间 */
  create_time: number
  /** 创建者 QQ */
  creator: number
  /** 文件总数 */
  total_file_count: number
}

/** 群文件列表响应 */
export interface GroupFiles {
  /** 文件列表 */
  files: FileInfo[]
  /** 文件夹列表 */
  folders: FolderInfo[]
}

/** 文件系统信息 */
export interface FileSystemInfo {
  /** 文件总数 */
  file_count: number
  /** 文件数量限制 */
  limit_count: number
  /** 已用空间 */
  used_space: number
  /** 总空间 */
  total_space: number
}

// --- 系统/Bot ---

/** 登录号信息 */
export interface LoginInfo {
  /** QQ 号 */
  user_id: number
  /** 昵称 */
  nickname: string
}

/** 版本信息 */
export interface VersionInfo {
  /** 应用名称 (如 NapCat, Go-CQHTTP) */
  app_name: string
  /** 应用版本 */
  app_version: string
  /** OneBot 协议版本 */
  protocol_version: string
  /** (Lagrange) NT 协议版本 */
  nt_protocol?: string
}

/** 运行状态 */
export interface StatusInfo {
  /** 是否在线 */
  online: boolean
  /** 状态是否良好 */
  good: boolean
  /** 统计信息 */
  stat?: any
}

// ============================================================================
// 事件上报 (Event Notification)
// ============================================================================

/**
 * 元事件 (心跳/生命周期)
 */
export interface MetaEvent {
  time: number
  self_id: number
  post_type: 'meta_event'
  meta_event_type: 'lifecycle' | 'heartbeat'
  sub_type?: 'connect' | 'enable' | 'disable'
  status?: StatusInfo
  interval?: number
}

/**
 * 系统通知/请求事件
 * 对应 post_type: request | notice
 */
export interface SystemNotice {
  /** 事件时间戳 */
  time: number
  /** 收到事件的机器人 QQ */
  self_id: number
  /** 上报类型 */
  post_type: 'notice' | 'request'
  /** 通知类型 (如 group_increase, friend_add) */
  notice_type?: string
  /** 请求类型 (如 friend, group) */
  request_type?: string
  /** 子类型 (如 approve, invite) */
  sub_type?: string
  /** 群号 */
  group_id?: number
  /** 用户 QQ */
  user_id?: number
  /** 目标用户 QQ */
  target_id?: number
  /** 验证消息/备注 */
  comment?: string
  /** 请求标识 (用于处理请求) */
  flag?: string
  /** 操作者 QQ */
  operator_id?: number
  /** 持续时间 (如禁言) */
  duration?: number
  /** 关联消息 ID (如撤回) */
  message_id?: number
  /** 荣誉类型 */
  honor_type?: string
  /** 文件信息 (群文件上传) */
  file?: {
    id: string
    name: string
    size: number
    busid?: number
    url?: string
  }
}

/**
 * OneBot 统一事件类型
 * 涵盖 消息、通知、请求、元事件
 */
export type OneBotEvent = Message | SystemNotice | MetaEvent

// ============================================================================
// 扩展功能响应 (Extension Responses)
// ============================================================================

/** OCR 识别结果 */
export interface OcrResult {
  /** 识别文本列表 */
  texts: {
    /** 文本内容 */
    text: string
    /** 置信度 */
    confidence: number
    /** 坐标点 */
    coordinates: any[]
  }[]
  /** 语言 */
  language: string
}

/** 精华消息 */
export interface EssenceMsg {
  /** 发送者 QQ */
  sender_id: number
  /** 发送者昵称 */
  sender_nick: string
  /** 发送时间 */
  sender_time?: number
  /** 消息 ID */
  message_id: number
  /** 操作者 QQ */
  operator_id: number
  /** 操作者昵称 */
  operator_nick: string
  /** 操作时间 */
  operator_time: number
}

/** (NapCat) 收藏列表响应 */
export interface CollectionList {
  /** 收藏搜索结果 */
  collectionSearchList: {
    /** 收藏项列表 */
    collectionItemList: {
      /** 收藏 ID */
      cid: string
      /** 类型 */
      type: number
      /** 状态 */
      status: number
      /** 作者信息 */
      author: {
        type: number
        numId: string
        strId: string
        groupId: string
        groupName: string
        uid: string
      }
      /** 摘要信息 */
      summary: {
        textSummary: string
        gallerySummary?: string
      }
    }[]
    /** 是否有更多 */
    hasMore: boolean
  }
}

/** (NapCat/社区) AI 声色列表项 */
export interface AiCharacter {
  /** 声色 ID */
  character_id: string
  /** 声色名称 */
  character_name: string
  /** 预览音频 URL */
  preview_url: string
}

/** (NapCat) 表情点赞用户 */
export interface EmojiLikeUser {
  /** 表情 ID (TinyID) */
  tinyId: string
  /** 用户昵称 */
  nickName: string
  /** 用户头像 URL */
  headUrl: string
}
