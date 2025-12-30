/**
 * 后端协议定义 (LLOneBot / NapCat / Lagrange)
 * @packageDocumentation
 */

export * from './interface'

// ============================================================================
// 枚举定义 (Enums)
// ============================================================================

/**
 * 上报事件类型
 */
export enum PostType {
  /** 接收消息 */
  Message = 'message',
  /** 发送消息 */
  Sent = 'message_sent',
  /** 请求 */
  Request = 'request',
  /** 通知 */
  Notice = 'notice',
  /** 元事件 */
  Meta = 'meta_event'
}

/**
 * 消息段类型
 */
export enum SegType {
  /** 文本 */
  Text = 'text',
  /** 图片 */
  Image = 'image',
  /** 语音 */
  Record = 'record',
  /** 视频 */
  Video = 'video',
  /** 文件 */
  File = 'file',
  /** 艾特 */
  At = 'at',
  /** 猜拳 */
  Rps = 'rps',
  /** 掷骰子 */
  Dice = 'dice',
  /** 窗口抖动 */
  Shake = 'shake',
  /** 戳一戳 */
  Poke = 'poke',
  /** 链接分享 */
  Share = 'share',
  /** 推荐联系人 */
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
  /** XML 卡片 */
  Xml = 'xml',
  /** JSON 卡片 */
  Json = 'json',
  /** QQ 表情 */
  Face = 'face',
  /** 商城表情 (NapCat/Lagrange) */
  MFace = 'mface',
  /** Markdown (Lagrange) */
  Markdown = 'markdown',
  /** 按钮 (Lagrange) */
  Keyboard = 'keyboard',
  /** 闪照/闪传 (LLOneBot) */
  Flash = 'flash_file'
}

/**
 * 性别
 */
export enum Gender {
  Male = 'male',
  Female = 'female',
  Unknown = 'unknown'
}

/**
 * 群成员角色
 */
export enum GroupRole {
  Owner = 'owner',
  Admin = 'admin',
  Member = 'member'
}

/**
 * 消息来源
 */
export enum MessageSource {
  Group = 'group',
  Private = 'private'
}

// ============================================================================
// 基础结构 (Base Structures)
// ============================================================================

/**
 * API 统一响应
 * @template T - 响应数据类型
 */
export interface Response<T = any> {
  /** 执行状态 */
  status: 'ok' | 'failed' | 'async'
  /** 返回码 (Success:0) */
  retcode: number
  /** 响应数据 */
  data: T
  /** 错误信息 */
  msg?: string
  /** 错误信息 (Go-CQ) */
  wording?: string
  /** 回显标识 */
  echo?: string
  /** 错误详情 (NapCat) */
  error?: string
}

// ============================================================================
// 消息段模型 (Segment Models)
// ============================================================================

/**
 * 消息段数据
 */
export interface SegData {
  /** [Text] 文本内容 */
  text?: string
  /** [Image/Record/Video] 文件路径/URL/Base64 */
  file?: string
  /** [Image] 图片子类型 */
  subType?: number
  /** [Image/Record] 网络 URL */
  url?: string
  /** [At] 目标 QQ (全体:'all') */
  qq?: string | number | 'all'
  /** [At] 显示名称 */
  name?: string
  /** [Face] 表情 ID */
  id?: string
  /** [Reply] 回复消息 ID */
  // id?: string
  /** [Music] 类型: qq, 163, xm, custom */
  type?: string
  /** [Music] 标题 */
  title?: string
  /** [Music] 内容 */
  content?: string
  /** [Music] 音频地址 */
  audio?: string
  /** [Json] JSON 字符串 */
  data?: string
  /** [Location] 纬度 */
  lat?: string
  /** [Location] 经度 */
  lon?: string
  /** [MFace] 表情包 ID */
  emoji_package_id?: number
  /** [MFace] 表情 ID */
  emoji_id?: string
  /** [MFace] 摘要 */
  summary?: string
  /** [Node] 发送者 ID */
  user_id?: number | string
  /** [Node] 发送者昵称 */
  nickname?: string
  /** [Flash] 闪传文件集 ID */
  file_set_id?: string
  /** 扩展字段 */
  [key: string]: any
}

/**
 * 消息段
 */
export interface Segment {
  /** 类型 */
  type: SegType | string
  /** 数据 */
  data: SegData
}

// ============================================================================
// 事件模型 (Event Models)
// ============================================================================

/**
 * 基础事件
 */
export interface Event {
  /** 时间戳 (秒) */
  time: number
  /** 收到事件 QQ */
  self_id: number
  /** 上报类型 */
  post_type: PostType
}

/**
 * 消息事件
 */
export interface Message extends Event {
  post_type: PostType.Message | PostType.Sent
  /** 消息类型 */
  message_type: 'private' | 'group'
  /** 消息子类型 */
  sub_type: 'friend' | 'group' | 'normal' | 'anonymous' | 'notice'
  /** 消息 ID */
  message_id: number
  /** 发送者 QQ */
  user_id: number
  /** 消息内容 */
  message: Segment[]
  /** 原始消息 */
  raw_message: string
  /** 字体 */
  font: number
  /** 发送者信息 */
  sender: SenderInfo
  /** 群号 */
  group_id?: number
  /** 匿名信息 */
  anonymous?: AnonymousInfo | null
  /** 消息序列号 */
  message_seq?: number
  /** 真实消息 ID */
  real_id?: number
}

/**
 * 元事件
 */
export interface Meta extends Event {
  post_type: PostType.Meta
  /** 类型: lifecycle, heartbeat */
  meta_event_type: string
  /** 子类型: connect, enable, disable */
  sub_type?: string
  /** 状态信息 (心跳) */
  status?: AppStatus
  /** 间隔 (心跳) */
  interval?: number
}

/**
 * 通知事件
 */
export interface Notice extends Event {
  post_type: PostType.Notice
  /** 通知类型 */
  notice_type: string
  /** 子类型 */
  sub_type?: string
  /** 群号 */
  group_id?: number
  /** 用户 QQ */
  user_id?: number
  /** 操作者 QQ */
  operator_id?: number
  /** 目标 QQ */
  target_id?: number
  /** 消息 ID (撤回/表情回应) */
  message_id?: number
  /** 持续时间 (禁言) */
  duration?: number
  /** 文件信息 (文件上传) */
  file?: FileInfo
  /** 表情回应列表 (NapCat) */
  likes?: Array<{ emoji_id: string, count: number }>
  /** 群荣誉类型 */
  honor_type?: 'talkative' | 'performer' | 'legend' | 'strong_newbie' | 'emotion'
}

/**
 * 请求事件
 */
export interface Request extends Event {
  post_type: PostType.Request
  /** 请求类型 */
  request_type: 'friend' | 'group'
  /** 子类型 */
  sub_type?: 'add' | 'invite'
  /** 请求 Flag */
  flag: string
  /** 验证消息 */
  comment?: string
  /** 发送者 QQ */
  user_id: number
  /** 群号 */
  group_id?: number
}

/**
 * 联合事件类型
 */
export type OneBotEvent = Message | Meta | Notice | Request

// ============================================================================
// 实体数据模型 (Entity Data Models)
// ============================================================================

/**
 * 基础用户信息
 */
export interface UserInfo {
  /** QQ 号 */
  user_id: number
  /** 昵称 */
  nickname: string
  /** 性别 */
  sex?: Gender | string
  /** 年龄 */
  age?: number
  /** 等级 */
  level?: number
  /** QID (Lagrange) */
  qid?: string
  /** 连续登录天数 (LLOneBot) */
  login_days?: number
}

/**
 * 发送者信息
 */
export interface SenderInfo extends UserInfo {
  /** 群名片 */
  card?: string
  /** 角色 */
  role?: GroupRole | string
  /** 群号 (临时会话) */
  group_id?: number
  /** 专属头衔 */
  title?: string
}

/**
 * 好友信息
 */
export interface FriendInfo extends UserInfo {
  /** 备注 */
  remark?: string
  /** 分组 ID (NapCat) */
  class_id?: number
  /** 扩展分组 ID (NapCat) */
  categoryId?: number
  /** 签名 */
  long_nick?: string
}

/**
 * 陌生人信息
 */
export interface StrangerInfo extends FriendInfo {
  /** 注册时间 */
  reg_time?: number
  /** 扩展状态 */
  status?: number
  /** 是否 VIP */
  is_vip?: boolean
}

/**
 * 好友分组
 */
export interface FriendCategory {
  /** 分组 ID */
  categoryId: number
  /** 排序 ID */
  categorySortId: number
  /** 分组名称 */
  categoryName: string
  /** 成员数 */
  categoryMbCount: number
  /** 在线数 */
  onlineCount: number
  /** 好友列表 */
  buddyList: FriendInfo[]
}

/**
 * 群信息
 */
export interface GroupInfo {
  /** 群号 */
  group_id: number
  /** 群名称 */
  group_name: string
  /** 成员数 */
  member_count: number
  /** 容量 */
  max_member_count: number
  /** 群备注 */
  group_remark?: string
  /** 创建时间 */
  group_create_time?: number
  /** 群等级 */
  group_level?: number
  /** 全员禁言 (NapCat) */
  group_all_shut_up?: number
}

/**
 * 群成员信息
 */
export interface GroupMemberInfo extends SenderInfo {
  /** 加群时间 */
  join_time: number
  /** 最后发言时间 */
  last_sent_time: number
  /** 是否不良记录 */
  unfriendly?: boolean
  /** 头衔过期时间 */
  title_expire_time?: number
  /** 允许修改名片 */
  card_changeable?: boolean
  /** 禁言截止时间 */
  shut_up_timestamp?: number
  /** 是否机器人 */
  is_robot?: boolean
  /** 地区 */
  area?: string
  /** Q龄 (Lagrange) */
  qage?: string
}

/**
 * 匿名用户信息
 */
export interface AnonymousInfo {
  /** 匿名 ID */
  id: number
  /** 匿名名称 */
  name: string
  /** 匿名标识 */
  flag: string
}

/**
 * 群荣誉信息
 */
export interface GroupHonorInfo {
  /** 群号 */
  group_id: number
  /** 当前龙王 */
  current_talkative?: {
    /** 用户 QQ */
    user_id: number
    /** 用户昵称 */
    nickname: string
    /** 头像 URL */
    avatar: string
    /** 连续天数 */
    day_count: number
  }
  /** 历史龙王 */
  talkative_list?: any[]
  /** 群聊之火 */
  performer_list?: any[]
  /** 群聊炽焰 */
  legend_list?: any[]
  /** 快乐源泉 */
  emotion_list?: any[]
  /** 冒尖小春笋 */
  strong_newbie_list?: any[]
}

/**
 * 群系统请求
 */
export interface GroupSystemRequest {
  /** 请求 ID */
  request_id: number
  /** 群号 */
  group_id: number
  /** 群名称 */
  group_name: string
  /** 邀请者 QQ 号 */
  invitor_uin?: number
  /** 邀请者昵称 */
  invitor_nick?: string
  /** 申请者 QQ 号 */
  requester_uin?: number
  /** 申请者昵称 */
  requester_nick?: string
  /** 验证消息/申请理由 */
  message: string
  /** 是否已处理 */
  checked: boolean
  /** 处理管理员 (未处理:0) */
  actor: number
  /** 来源 (NapCat) */
  source?: string
  /** 拒绝理由 (仅被忽略) (NapCat) */
  reason?: string
}

/**
 * 群系统消息
 */
export interface GroupSystemMsg {
  /** 邀请入群请求 */
  invited_requests: GroupSystemRequest[]
  /** 申请入群请求 */
  join_requests: GroupSystemRequest[]
}

/**
 * 群文件
 */
export interface FileInfo {
  /** 文件 ID */
  file_id: string
  /** 文件名 */
  file_name: string
  /** 文件大小 */
  file_size: number
  /** 业务 ID */
  busid?: number
  /** 上传时间 */
  upload_time?: number
  /** 过期时间 */
  dead_time?: number
  /** 下载次数 */
  download_times?: number
  /** 上传者 QQ */
  uploader?: number
  /** 上传者名称 */
  uploader_name?: string
  /** 下载链接 */
  url?: string
}

/**
 * 群文件夹
 */
export interface FolderInfo {
  /** 文件夹 ID */
  folder_id: string
  /** 文件夹名称 */
  folder_name: string
  /** 创建时间 */
  create_time: number
  /** 创建者 QQ */
  creator: number
  /** 创建者名称 */
  creator_name: string
  /** 文件总数 */
  total_file_count: number
}

/**
 * 群文件列表
 */
export interface GroupFileList {
  /** 文件列表 */
  files: FileInfo[]
  /** 文件夹列表 */
  folders: FolderInfo[]
}

/**
 * 群文件系统信息
 */
export interface FileSystemInfo {
  /** 文件数量 */
  file_count: number
  /** 数量限制 */
  limit_count: number
  /** 已用空间 */
  used_space: number
  /** 总空间 */
  total_space: number
}

/**
 * 群相册 (LLOneBot)
 */
export interface GroupAlbum {
  /** 相册 ID */
  album_id: string
  /** 相册名 */
  name: string
  /** 描述 */
  desc: string
  /** 创建时间 */
  create_time: number
  /** 图片数量 */
  upload_number: number
}

/**
 * 登录号信息
 */
export interface LoginInfo {
  /** QQ 号 */
  user_id: number
  /** 昵称 */
  nickname: string
}

/**
 * 版本信息
 */
export interface VersionInfo {
  /** 应用名称 */
  app_name: string
  /** 应用版本 */
  app_version: string
  /** 协议版本 */
  protocol_version: string
  /** (Lagrange) NT 协议版本 */
  nt_protocol?: string
}

/**
 * 运行状态
 */
export interface AppStatus {
  /** 是否在线 */
  online: boolean
  /** 状态良好 */
  good: boolean
  /** 统计信息 */
  stat?: any
  /** (Lagrange) 插件状态 */
  plugins_good?: boolean
}

/**
 * 凭证信息
 */
export interface Credentials {
  /** Cookies */
  cookies: string
  /** CSRF Token */
  csrf_token: number
  /** Token */
  token?: number
}

/**
 * OCR 结果
 */
export interface OcrResult {
  /** 文本列表 */
  texts: {
    /** 文本 */
    text: string
    /** 置信度 */
    confidence: number
    /** 坐标 */
    coordinates: any[]
  }[]
  /** 语言 */
  language: string
}

/**
 * 收藏列表 (NapCat)
 */
export interface CollectionList {
  /** 收藏搜索结果 */
  collectionSearchList: {
    /** 收藏项列表 */
    collectionItemList: {
      /** 收藏内容 ID */
      cid: string
      /** 收藏类型 */
      type: number
      /** 状态 */
      status: number
      /** 业务 ID */
      bid?: number
      /** 分类 ID */
      category?: number
      /** 作者信息 */
      author: {
        /** 作者 UID */
        uid: string
        /** 来源群名称 */
        groupName: string
        /** 作者类型 */
        type?: number
        /** 数字 ID */
        numId?: string
        /** 字符串 ID */
        strId?: string
        /** 来源群 ID */
        groupId?: string
      }
      /** 摘要信息 */
      summary: {
        /** 文本摘要 */
        textSummary: string
        /** 链接摘要 */
        linkSummary?: string
        /** 图片摘要 */
        gallerySummary?: string
        /** 音频摘要 */
        audioSummary?: string
        /** 视频摘要 */
        videoSummary?: string
        /** 文件摘要 */
        fileSummary?: string
        /** 位置摘要 */
        locationSummary?: string
        /** 富媒体摘要 */
        richMediaSummary?: string
      }
      /** 创建时间 */
      createTime?: string
      /** 收藏时间 */
      collectTime?: string
      /** 修改时间 */
      modifyTime?: string
      /** 序列号 */
      sequence?: string
      /** 分享链接 */
      shareUrl?: string
    }[]
    /** 是否还有更多数据 */
    hasMore: boolean
    /** 底部时间戳 */
    bottomTimeStamp?: string
  }
}

/**
 * AI 声色 (NapCat/LLOneBot)
 */
export interface AiCharacter {
  /** 声色 ID */
  character_id: string
  /** 声色名称 */
  character_name: string
  /** 预览 URL */
  preview_url: string
}

/**
 * 闪传文件信息 (LLOneBot)
 */
export interface FlashFileInfo {
  /** 文件集 ID */
  file_set_id: string
  /** 分享链接 */
  share_link: string
  /** 过期时间 */
  expire_time?: number
  /** 文件列表 */
  files?: { name: string, size: number }[]
}

/**
 * Packet 状态 (NapCat)
 */
export interface PacketStatus {
  /** RKey */
  rkey: string
  /** TTL */
  ttl: string
  /** 时间 */
  time: number
}

/**
 * 在线机型 (LLOneBot)
 */
export interface DeviceModel {
  /** 变体 */
  variants: {
    /** 显示名称 */
    model_show: string
    /** 是否需付费 */
    need_pay: boolean
  }[]
}

/**
 * 机器人范围 (NapCat/LLOneBot)
 */
export interface RobotUinRange {
  /** 最小 UIN */
  minUin: string
  /** 最大 UIN */
  maxUin: string
}

/**
 * 点赞用户信息 (NapCat)
 */
export interface LikeUserInfo {
  /** 用户 UID */
  uid: string
  /** 点赞次数 */
  count: number
  /** 昵称 */
  nick: string
  /** 来源 */
  src: number
  /** 最新时间 */
  latestTime: number
}

/**
 * 在线客户端信息 (NapCat)
 */
export interface OnlineClient {
  /** 客户端 App ID */
  app_id: number
  /** 设备名称 */
  device_name: string
  /** 设备类型 */
  device_kind: string
}

/**
 * RKey 信息 (Lagrange/NapCat)
 */
export interface RKeyInfo {
  /** 类型: group/private */
  type?: string
  /** RKey 值 */
  rkey: string
  /** 创建时间戳 */
  created_at?: number
  /** 有效期 (秒) */
  ttl?: number | string
  /** 兼容字段 (NapCat) */
  time?: number
}

/**
 * 小程序卡片数据 (NapCat)
 */
export interface ArkInfo {
  /** 应用名称 */
  appName: string
  /** 应用视图类型 */
  appView: string
  /** 版本号 */
  ver: string
  /** 描述信息 */
  desc: string
  /** 提示语 */
  prompt: string
  /** 元数据配置 */
  metaData: Record<string, any>
  /** 渲染配置 */
  config: Record<string, any>
}
