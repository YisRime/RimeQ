import type { PostType } from './base'
import type { FileInfo, SenderInfo } from './data'
import type { Segment } from './segment'

/**
 * 基础事件
 */
export interface Event {
  /** 事件发生的时间戳 (秒) */
  time: number
  /** 收到事件的机器人 QQ 号 */
  self_id: number
  /** 事件类型 */
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
  /** 发送者的 QQ 号 */
  user_id: number
  /** 消息内容 (消息段数组) */
  message: Segment[]
  /** 原始消息内容 (CQ 码格式) */
  raw_message: string
  /** 字体 ID */
  font: number
  /** 发送者信息 */
  sender: SenderInfo
  /** 群号 (群聊) */
  group_id?: number
  /** 目标ID (私聊:好友QQ 发送:目标ID) */
  target_id?: number
  /** 匿名信息 (匿名) */
  anonymous?: { id: number; name: string; flag: string; } | null;
  /** 消息序列号 */
  message_seq?: number
  /** 真实消息 ID (NapCat) */
  real_id?: number
  /** 真实消息序列号 (NapCat) */
  real_seq?: string
  /** 临时会话来源 */
  temp_source?: number
}

/**
 * 元事件
 */
export interface Meta extends Event {
  post_type: PostType.Meta
  /** 元事件类型 (lifecycle/heartbeat) */
  meta_event_type: string
  /** 子类型 (connect/enable/disable) */
  sub_type?: string
  /** 状态信息 (心跳) */
  status?: {
    /** 是否在线 */
    online: boolean;
    /** 状态良好 */
    good: boolean;
    /** 统计信息 */
    stat?: any;
    /** 插件状态 (SnowLuma) */
    plugins_good?: boolean;
  }
  /** 心跳间隔 (毫秒) (心跳) */
  interval?: number
}

/**
 * 通知事件基础接口
 */
interface NoticeBase extends Event {
  post_type: PostType.Notice
  /** 通知的具体类型 */
  notice_type: string
}

/**
 * 群文件上传通知
 */
export interface GroupUploadNotice extends NoticeBase {
  notice_type: 'group_upload'
  /** 群号 */
  group_id: number
  /** 上传者 QQ */
  user_id: number
  /** 文件信息 */
  file: FileInfo
}

/**
 * 群管理员变动通知
 */
export interface GroupAdminNotice extends NoticeBase {
  notice_type: 'group_admin'
  /** 子类型（设置/取消） */
  sub_type: 'set' | 'unset'
  /** 群号 */
  group_id: number
  /** 管理员 QQ */
  user_id: number
}

/**
 * 群成员减少通知 (退群/踢出)
 */
export interface GroupDecreaseNotice extends NoticeBase {
  notice_type: 'group_decrease'
  /** 子类型（主动退群/被踢/自身被踢） */
  sub_type: 'leave' | 'kick' | 'kick_me'
  /** 群号 */
  group_id: number
  /** 操作者 QQ */
  operator_id: number
  /** 离开者 QQ */
  user_id: number
}

/**
 * 群成员增加通知 (入群)
 */
export interface GroupIncreaseNotice extends NoticeBase {
  notice_type: 'group_increase'
  /** 子类型（管理员同意/邀请入群） */
  sub_type: 'approve' | 'invite'
  /** 群号 */
  group_id: number
  /** 操作者 QQ */
  operator_id: number
  /** 加入者 QQ */
  user_id: number
}

/**
 * 群禁言通知
 */
export interface GroupBanNotice extends NoticeBase {
  notice_type: 'group_ban'
  /** 子类型 */
  sub_type: 'ban' | 'lift_ban'
  /** 群号 */
  group_id: number
  /** 操作者 QQ */
  operator_id: number
  /** 被禁言用户 QQ (全员:0) */
  user_id: number
  /** 禁言时长 (秒) (解除:0) */
  duration: number
}

/**
 * 群成员名片变更通知
 */
export interface GroupCardNotice extends NoticeBase {
  notice_type: 'group_card';
  /** 群号 */
  group_id: number;
  /** 被改名片的用户 QQ 号 */
  user_id: number;
  /** 新的群名片 */
  card_new: string;
  /** 旧的群名片 */
  card_old: string;
}

/**
 * 好友添加通知
 */
export interface FriendAddNotice extends NoticeBase {
  notice_type: 'friend_add'
  /** 新好友 QQ */
  user_id: number
}

/**
 * 群消息撤回通知
 */
export interface GroupRecallNotice extends NoticeBase {
  notice_type: 'group_recall'
  /** 群号 */
  group_id: number
  /** 消息发送者 QQ */
  user_id: number
  /** 操作者 QQ */
  operator_id: number
  /** 被撤回的消息 ID */
  message_id: number
}

/**
 * 好友消息撤回通知
 */
export interface FriendRecallNotice extends NoticeBase {
  notice_type: 'friend_recall'
  /** 好友 QQ */
  user_id: number
  /** 被撤回的消息 ID */
  message_id: number
}

/**
 * 通知事件子类型基础结构
 */
interface NotifyNoticeBase extends NoticeBase {
  notice_type: 'notify';
}

/**
 * 通知子事件联合类型
 */
export type NotifyNotice =
  /**
   * 戳一戳通知
   */
  | (NotifyNoticeBase & {
      /** 子类型 */
      sub_type: 'poke';
      /** 发送者 QQ 号 */
      user_id: number;
      /** 被戳者 QQ 号 */
      target_id: number;
      /** 群号 (群) */
      group_id?: number;
      /** 原始信息 */
      raw_info?: unknown[];
    })
  /**
   * 戳一戳撤回通知 (LLOneBot)
   */
  | (NotifyNoticeBase & {
      /** 子类型 */
      sub_type: 'poke_recall';
      /** 发送者 QQ 号 */
      user_id: number;
      /** 被戳者 QQ 号 */
      target_id: number;
      /** 群号 (群) */
      group_id?: number;
      /** 原始信息 */
      raw_info?: string;
    })
  /**
   * 运气王通知 (NapCat)
   */
  | (NotifyNoticeBase & {
      /** 子类型 */
      sub_type: 'lucky_king';
      /** 群号 */
      group_id: number;
      /** 运气王 QQ 号 */
      target_id: number;
      /** 发红包者 QQ 号 */
      user_id: number;
    })
  /**
   * 群荣誉变更通知 (NapCat)
   */
  | (NotifyNoticeBase & {
      /** 子类型 */
      sub_type: 'honor';
      /** 群号 */
      group_id: number;
      /** 获得荣誉者 QQ 号 */
      user_id: number;
      /** 荣誉类型（龙王/群聊之火/群聊炽焰/冒尖小春笋/快乐源泉） */
      honor_type: 'talkative' | 'performer' | 'legend' | 'strong_newbie' | 'emotion';
    })
  /**
   * 群头衔变更通知 (LLOneBot)
   */
  | (NotifyNoticeBase & {
      /** 子类型 */
      sub_type: 'title';
      /** 群号 */
      group_id: number;
      /** 获得头衔者 QQ 号 */
      user_id: number;
      /** 新的头衔 */
      title: string;
    })
  /**
   * 名片点赞通知 (LLOneBot)
   */
  | (NotifyNoticeBase & {
      /** 子类型 */
      sub_type: 'profile_like';
      /** 点赞者 QQ 号 */
      operator_id: number;
      /** 点赞者昵称 */
      operator_nick?: string;
      /** 本次点赞的次数 */
      times?: number;
    })
  /**
   * 群消息表情回应通知 (NapCat)
   */
  | (NotifyNoticeBase & {
      /** 子类型 */
      sub_type: 'emoji_like';
      /** 群号 */
      group_id: number;
      /** 操作者 QQ 号 */
      user_id: number;
      /** 被回应的消息 ID */
      message_id: number;
      /** 表情回应列表 */
      likes: Array<{ emoji_id: string; count: number }>;
    });

/**
 * 群精华消息变更通知 (LLOneBot)
 */
export interface EssenceNotice extends NoticeBase {
  notice_type: 'essence'
  /** 子类型（添加/删除） */
  sub_type: 'add' | 'delete'
  /** 群号 */
  group_id: number
  /** 消息发送者 QQ */
  sender_id: number
  /** 操作者 QQ */
  operator_id: number
  /** 消息 ID */
  message_id: number
}

/**
 * 群消息表情回应通知 (LLOneBot)
 */
export interface GroupMsgEmojiLikeNotice extends NoticeBase {
  /** 子类型 */
  notice_type: 'group_msg_emoji_like'
  /** 群号 */
  group_id: number
  /** 操作者 QQ */
  user_id: number
  /** 消息 ID */
  message_id: number
  /** 表情回应列表 */
  likes: Array<{ emoji_id: string; count: number }>
  /** 是否为添加 */
  is_add?: boolean
}

/**
 * 闪传文件上传通知 (LLOneBot)
 */
export interface FlashFileNotice extends NoticeBase {
  notice_type: 'flash_file'
  /** 子类型（上传中/已上传/下载中/已下载） */
  sub_type: 'uploading' | 'uploaded' | 'downloading' | 'downloaded'
  /** 文件集 ID */
  file_set_id: string
  /** 标题 */
  title: string
  /** 分享链接 */
  share_link: string
  /** 文件列表 */
  files?: Array<{ name: string, size: number, path?: string }>
  /** 操作者 QQ */
  user_id?: number
  /** 群号 (群) */
  group_id?: number
}

/**
 * 通知事件联合类型
 */
export type Notice =
  | GroupUploadNotice
  | GroupAdminNotice
  | GroupDecreaseNotice
  | GroupIncreaseNotice
  | GroupBanNotice
  | GroupCardNotice
  | FriendAddNotice
  | GroupRecallNotice
  | FriendRecallNotice
  | NotifyNotice
  | EssenceNotice
  | GroupMsgEmojiLikeNotice
  | FlashFileNotice;

/**
 * 请求事件
 */
export interface Request extends Event {
  post_type: PostType.Request
  /** 请求类型 */
  request_type: 'friend' | 'group'
  /** 子类型 */
  sub_type?: 'add' | 'invite'
  /** 请求标识 */
  flag: string
  /** 验证消息 */
  comment?: string
  /** 发送请求的用户 QQ 号 */
  user_id: number
  /** 群号 (群) */
  group_id?: number
}

/**
 * 事件联合类型
 */
export type OneBotEvent = Message | Meta | Notice | Request
