/**
 * 基础用户信息
 */
export interface UserInfo {
  /** QQ 号 */
  user_id: number
  /** 昵称 */
  nickname: string
  /** 性别 */
  sex?: 'male' | 'female' | 'unknown'
  /** 年龄 */
  age?: number
  /** QID */
  qid?: string
  /** 连续登录天数 (LLOneBot/NapCat) */
  login_days?: number
  /** 生日年份 */
  birthday_year?: number
  /** 生日月份 */
  birthday_month?: number
  /** 生日日期 */
  birthday_day?: number
}

/**
 * 发送者信息
 */
export interface SenderInfo extends UserInfo {
  /** 群名片 */
  card?: string
  /** 角色 */
  role?: 'owner' | 'admin' | 'member'
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
  categoryId?: number
  /** 签名 */
  long_nick?: string
  /** QQ 等级 (LLOneBot) */
  level?: number;
  /** 用户 UID (LLOneBot) */
  uid?: string;
}

/**
 * 陌生人信息
 */
export interface StrangerInfo extends FriendInfo {
  /** 注册时间 (LLOneBot/NapCat) */
  reg_time?: number
  /** 状态 (LLOneBot/NapCat) */
  status?: number
  /** 是否 VIP (LLOneBot/NapCat) */
  is_vip?: boolean
  /** 城市 (LLOneBot) */
  city?: string;
  /** 国家 (LLOneBot) */
  country?: string;
}

/**
 * 好友分组 (LLOneBot/NapCat)
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
  /** 群主 QQ 号 (LLOneBot/NapCat) */
  owner_id?: number;
  /** 成员数 */
  member_count: number
  /** 容量 */
  max_member_count: number
  /** 群备注 (LLOneBot/NapCat) */
  group_remark?: string
  /** 群介绍/公告 (LLOneBot) */
  group_memo?: string;
  /** 创建时间 */
  group_create_time?: number
  /** 群等级 */
  group_level?: number
  /** 全员禁言 (NapCat) */
  group_all_shut?: number
}

/**
 * 群成员信息
 */
export interface GroupMemberInfo extends SenderInfo {
  /** 加群时间 */
  join_time: number
  /** 最后发言时间 */
  last_sent_time: number
  /** 群等级 (NapCat) */
  level?: string;
  /** QQ 等级 (LLOneBot) */
  qq_level?: number;
  /** 是否不良记录 (LLOneBot) */
  unfriendly?: boolean
  /** 头衔过期时间 */
  title_expire_time?: number
  /** 允许修改名片 (LLOneBot) */
  card_changeable?: boolean
  /** 禁言截止时间戳 (秒)，0 表示未禁言 */
  shut_up_timestamp?: number
  /** 是否机器人 (LLOneBot) */
  is_robot?: boolean
  /** 地区 */
  area?: string
  /** Q龄 (NapCat) */
  qage?: number
}

/**
 * 群荣誉信息 (LLOneBot/NapCat)
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
 * 群系统请求 (NapCat)
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
  /** 拒绝理由 (NapCat) */
  reason?: string
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
  /** 文件修改时间 (LLOneBot/NapCat) */
  modify_time?: number
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
  /** 文件夹路径 (NapCat) */
  folder?: string
}

/**
 * 媒体信息结构
 */
interface AlbumUrlInfo {
  url: string;
  width?: number;
  height?: number;
  spec?: number;
}

/**
 * 群相册信息
 */
export interface GroupAlbum {
  /** 相册 ID */
  album_id: string;
  /** 相册名称 */
  name: string;
  /** 相册描述 */
  desc: string;
  /** 所有者 QQ */
  owner: number;
  /** 创建时间 */
  create_time: number;
  /** 最后上传时间 */
  last_upload_time: number;
  /** 修改时间 */
  modify_time?: number;
  /** 图片/视频数量 */
  upload_number: number;
  /** 权限类型 (LLOneBot) */
  type?: number;
  /** 封面信息 */
  cover?: {
    batch_id?: string;
    image?: {
      default_url?: AlbumUrlInfo;
      photo_url?: AlbumUrlInfo[];
    };
  };
  /** 创建者信息 */
  creator?: {
    uin: number;
    nick: string;
    is_special?: boolean;
  };
  /** 允许分享 (LLOneBot) */
  allow_share?: boolean;
}

/**
 * 群相册媒体信息
 */
export interface GroupAlbumMedia {
  /** 资源类型 */
  type: number;
  /** 批次 ID */
  batch_id?: string;
  /** 唯一标识 */
  lloc: string;
  /** 描述 */
  desc: string;
  /** 上传者 QQ */
  uploader: number;
  /** 上传者信息 */
  upload_user?: {
    uin: number;
    nick: string;
  };
  /** 上传时间 */
  upload_time: number;
  /** 是否为 GIF (LLOneBot) */
  is_gif?: boolean;
  /** 图片信息 */
  image?: {
    default_url?: AlbumUrlInfo;
    photo_url?: AlbumUrlInfo[];
  };
  /** 视频信息 */
  video?: {
    id?: string;
    /** 视频地址 */
    url: string;
    /** 视频时长 */
    video_time?: string;
    cover?: {
      default_url?: AlbumUrlInfo;
    };
  };
  /** 点赞信息 (LLOneBot) */
  like?: {
    count?: number;
    num?: number;
    /** 是否已点赞 */
    liked: boolean;
    /** Key (NapCat) */
    key?: string;
  };
  /** 评论信息 (LLOneBot) */
  comment?: {
    count?: number;
    num?: number;
  };
}

/**
 * OCR 结果 (LLOneBot/NapCat)
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
  /** 文件集总大小 (字节) */
  total_file_size?: number;
}
