/**
 * 统一响应格式
 */
export interface Response<T> {
  /** 执行状态 */
  status: 'ok' | 'failed' | 'async';
  /** 返回码 */
  retcode: number;
  /** 响应数据 */
  data: T;
  /** 错误信息 */
  message?: string;
  /** 错误信息 (NapCat/LLOneBot) */
  wording?: string;
  /** 回显标识 */
  echo?: string;
  /** 错误详情 (NapCat) */
  error?: string;
}

/**
 * 事件类型
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
  /** 窗口抖动 (LLOneBot) */
  Shake = 'shake',
  /** 戳一戳 */
  Poke = 'poke',
  /** 推荐联系人 */
  Contact = 'contact',
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
  /** 商城表情 */
  MFace = 'mface',
  /** Markdown */
  Markdown = 'markdown',
  /** 按钮 */
  Keyboard = 'keyboard',
  /** 闪传 (LLOneBot) */
  Flash = 'flash_file',
  /** 定位 (SnowLuma) */
  Location = 'location'
}
