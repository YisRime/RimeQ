import type { SegType } from './base'
import type { Message } from './event';

/**
 * 消息段基础结构
 */
interface SegmentBase<T extends SegType, D> {
  /** 类型 */
  type: T;
  /** 数据 */
  data: D;
}

/**
 * 文本消息段
 */
export type TextSegment = SegmentBase<SegType.Text, {
  /** 文本内容 */
  text: string;
}>;

/**
 * 原生表情消息段
 */
export type FaceSegment = SegmentBase<SegType.Face, {
  /** 表情 ID */
  id: string;
  /** (NapCat) */
  resultId?: string;
  /** (NapCat) */
  chainCount?: number;
}>;

/**
 * 商城 / 魔法表情消息段
 */
export type MFaceSegment = SegmentBase<SegType.MFace, {
  /** 表情包 ID */
  emoji_package_id: number;
  /** 表情 ID */
  emoji_id: string;
  /** 加密 Key */
  key: string;
  /** 摘要/名称 */
  summary: string;
  /** 图片 URL (LLOneBot/SnowLuma) */
  url?: string;
}>;

/**
 * 图片消息段
 */
export type ImageSegment = SegmentBase<SegType.Image, {
  /** 文件路径/URL/Base64 */
  file: string;
  /** 子类型 (0: 普通图片 1-7: 特殊类型) (LLOneBot/NapCat) */
  subType?: number;
  /** 网络 URL (LLOneBot/NapCat) */
  url?: string;
  /** 摘要 (LLOneBot/NapCat) */
  summary?: string;
  /** 文件大小 (字节) (LLOneBot/NapCat) */
  file_size?: number;
  /** 文件名 */
  name?: string;
  /** 缩略图 Base64 (LLOneBot/NapCat) */
  thumb?: string;
}>;

/**
 * 语音消息段
 */
export type RecordSegment = SegmentBase<SegType.Record, {
  /** 文件路径/URL/Base64 */
  file: string;
  /** 语音网络 URL (LLOneBot/NapCat) */
  url?: string;
  /** 文件大小 (字节) (LLOneBot/NapCat) */
  file_size?: number;
  /** 文件名 (LLOneBot/NapCat) */
  name?: string;
}>;

/**
 * 视频消息段
 */
export type VideoSegment = SegmentBase<SegType.Video, {
  /** 文件路径/URL/Base64 */
  file: string;
  /** 视频网络 URL (LLOneBot/NapCat) */
  url?: string;
  /** 文件大小 (字节) (LLOneBot/NapCat) */
  file_size?: number;
  /** 文件名 (LLOneBot/NapCat) */
  name?: string;
  /** 封面缩略图 Base64 (LLOneBot/NapCat) */
  thumb?: string;
}>;

/**
 * 文件消息段
 */
export type FileSegment = SegmentBase<SegType.File, {
  /* 文件路径/URL/Base64 */
  file: string;
  /** 网络 URL (LLOneBot/NapCat) */
  url?: string;
  /** 文件大小 (字节) (LLOneBot/NapCat) */
  file_size?: number;
  /** 文件名 (LLOneBot/NapCat) */
  name?: string;
  /** UUID (LLOneBot) */
  file_id?: string;
}>;

/**
 * @ 提及消息段
 */
export type AtSegment = SegmentBase<SegType.At, {
  /** 目标的 QQ 号 */
  qq: string;
  /** 显示名称 */
  name?: string;
}>;

/**
 * 回复消息段
 */
export type ReplySegment = SegmentBase<SegType.Reply, {
  /** 被回复的消息 ID */
  id: string;
}>;

/**
 * 掷骰子消息段 (LLOneBot/NapCat)
 */
export type DiceSegment = SegmentBase<SegType.Dice, {
  /** 骰子结果 (1-6) */
  result: number;
}>;

/**
 * 猜拳消息段
 */
export type RpsSegment = SegmentBase<SegType.Rps, {
  /** 猜拳结果 (1: 石头 2: 剪刀 3: 布) */
  result: number;
}>;

/**
 * 戳一戳消息段
 */
export type PokeSegment = SegmentBase<SegType.Poke, {
  /** 目标 QQ 号 (可选) */
  qq?: number;
  /** 类型 / ID */
  id?: number;
  /** 类型名称 (NapCat/SnowLuma) */
  type?: string;
}>;

/**
 * 音乐分享消息段
 */
export type MusicSegment = SegmentBase<SegType.Music, {
  /** 音乐平台类型 (qq/163/xm/kugou/migu/kuwo/custom) */
  type: string;
  /** 音乐 ID (平台音乐) */
  id?: string;
  /** 跳转 URL (自定义音乐) */
  url?: string;
  /** 音频 URL (自定义音乐) */
  audio?: string;
  /** 音乐标题 (自定义音乐) */
  title?: string;
  /** 音乐描述 (自定义音乐) */
  content?: string;
  /** 封面图片 URL (自定义音乐) */
  image?: string;
}>;

/**
 * 合并转发消息段
 */
export type ForwardSegment = SegmentBase<SegType.Forward, {
  /** 合并转发 ID */
  id: string;
  /** 消息内容 (NapCat) */
  content?: Message;
}>;

/**
 * 合并转发节点消息段 (构造) (LLOneBot/NapCat)
 */
export type NodeSegment = SegmentBase<SegType.Node, {
  /** 发送者 QQ 号 */
  user_id: number;
  /** 发送者昵称 */
  nickname: string;
  /** 消息内容 */
  content: Segment[];
  /** 消息 ID (可选) */
  id?: number;
  /** (兼容) */
  uin?: number;
  /** (兼容) */
  name?: string;
  /** 消息时间 (可选) */
  time?: string;
}>;

/**
 * XML 卡片消息段  (LLOneBot/NapCat)
 */
export type XmlSegment = SegmentBase<SegType.Xml, {
  /** XML 数据字符串 */
  data: string;
}>;

/**
 * JSON 卡片消息段
 */
export type JsonSegment = SegmentBase<SegType.Json, {
  /** JSON 数据字符串或对象 */
  data: string | Record<string, any>;
}>;

/**
 * Markdown 消息段
 */
export type MarkdownSegment = SegmentBase<SegType.Markdown, {
  /** Markdown 内容 */
  content: string;
}>;

/**
 * 闪传文件消息段 (LLOneBot)
 */
export type FlashSegment = SegmentBase<SegType.Flash, {
  /** 文件标题 */
  title: string;
  /** 文件集 ID */
  file_set_id: string;
  /** 场景类型 */
  scene_type: number;
}>;

/**
 * 推荐联系人 / 群消息段  (LLOneBot/NapCat)
 */
export type ContactSegment = SegmentBase<SegType.Contact, {
  /** 类型 */
  type: 'qq' | 'group';
  /** 联系人 / 群 ID */
  id: string;
}>;

/**
 * 窗口抖动消息段 (发送) (LLOneBot)
 */
export type ShakeSegment = SegmentBase<SegType.Shake, Record<string, never>>;

/**
 * 地理位置消息段 (SnowLuma)
 */
export type LocationSegment = SegmentBase<SegType.Location, {
  /** 纬度 */
  lat: string;
  /** 经度 */
  lon: string;
  /** 标题 */
  title: string;
  /** 内容描述 */
  content: string;
}>;

/**
 * 按钮消息段 (LLOneBot/SnowLuma)
 */
export type KeyboardSegment = SegmentBase<SegType.Keyboard, {
  /** 行数据列表 */
  rows: {
    /** 当前行的按钮列表 */
    buttons: {
      /** 按钮 ID */
      id: string;
      /** 按钮渲染数据 */
      render_data: {
        /** 按钮上的文字 */
        label: string;
        /** 点击后按钮上的文字 */
        visited_label: string;
        /** 按钮样式 (0: 灰色 1: 蓝色) */
        style: 0 | 1;
      };
      /** 按钮动作 */
      action: {
        /** 动作类型 (0: 跳转链接 1: 回调数据 2: 输入文本) */
        type: 0 | 1 | 2;
        /** 按钮权限 */
        permission: {
          /** 权限类型 (0: 指定成员 1: 仅管理员 2: 全体成员) */
          type: 0 | 1 | 2;
          /** 可指定角色的 ID 列表 */
          specify_role_ids?: string[];
          /** 可指定用户的 QQ 列表 */
          specify_user_ids?: string[];
        };
        /** 客户端不支持时的提示文案 */
        unsupport_tips: string;
        /** 动作相关数据 (0: 跳转的 URL 1: 回调信令 2: 指令文本) */
        data: string;
        /** [回调] 带上当前消息的回复 */
        reply?: boolean;
        /** [输入] 在用户输入后自动发送 */
        enter?: boolean;
      };
    }[];
  }[];
}>;

/**
 * 消息段联合类型
 */
export type Segment =
  | TextSegment
  | FaceSegment
  | MFaceSegment
  | ImageSegment
  | RecordSegment
  | VideoSegment
  | FileSegment
  | AtSegment
  | ReplySegment
  | DiceSegment
  | RpsSegment
  | PokeSegment
  | MusicSegment
  | ForwardSegment
  | NodeSegment
  | XmlSegment
  | JsonSegment
  | MarkdownSegment
  | FlashSegment
  | ContactSegment
  | ShakeSegment
  | LocationSegment
  | KeyboardSegment;
