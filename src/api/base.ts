import { socket } from './socket'
import { httpsse } from './httpsse'
import type * as T from '@/types'

/**
 * 后端类型
 * @description 当前支持的三款 OneBot v11 实现
 * - NapCat: https://napcat.apifox.cn/
 * - SnowLuma: https://snowluma.github.io/zh/docs/api
 * - LLOneBot: https://api.luckylillia.com/
 */
export type BackendType = 'NapCat' | 'SnowLuma' | 'LLOneBot'

/** 通信模式 */
export type TransportMode = 'ws' | 'http'

/**
 * OneBot v11 标准 API 客户端
 * @description 三款后端共同支持的标准协议方法，扩展方法见 {@link ExtendedClient}
 */
export class BaseClient {
  /** 当前后端类型 */
  public backend: BackendType = 'NapCat'
  /** 当前通信模式 */
  public mode: TransportMode = 'ws'

  /**
   * 设置后端类型
   * @param type - 后端类型
   */
  setBackend(type: BackendType) {
    this.backend = type
  }

  /**
   * 发送通用请求
   * @param action - API 动作名称
   * @param params - 请求参数
   * @returns Promise 解析后的响应数据
   */
  protected request<R>(action: string, params: Record<string, any> = {}): Promise<R> {
    if (this.mode === 'http') {
      return httpsse.request<R>(action, params)
    } else {
      return socket.request<R>(action, params)
    }
  }

  // ============================================================================
  // 消息相关 (Message)
  // ============================================================================

  /**
   * 发送消息
   * @description 按 `message_type` 自动路由到私聊或群聊
   * @param message_type - 消息类型
   * @param id - 对方 QQ 号或群号
   * @param message - 消息内容
   */
  sendMsg(message_type: 'private' | 'group', id: number, message: string | T.Segment[]) {
    if (this.backend === 'LLOneBot') {
      return message_type === 'private'
        ? this.sendPrivateMsg(id, message)
        : this.sendGroupMsg(id, message)
    }
    return this.request<{ message_id: number }>('send_msg', {
      message,
      message_type,
      ...(message_type === 'private' ? { user_id: id } : { group_id: id })
    })
  }

  /**
   * 发送私聊消息
   * @param user_id - 对方 QQ 号
   * @param message - 消息内容
   * @param auto_escape - 是否作为纯文本发送
   */
  sendPrivateMsg(user_id: number, message: string | T.Segment[], auto_escape = false) {
    return this.request<{ message_id: number }>('send_private_msg', { user_id, message, auto_escape })
  }

  /**
   * 发送群聊消息
   * @param group_id - 群号
   * @param message - 消息内容
   * @param auto_escape - 是否作为纯文本发送
   */
  sendGroupMsg(group_id: number, message: string | T.Segment[], auto_escape = false) {
    return this.request<{ message_id: number }>('send_group_msg', { group_id, message, auto_escape })
  }

  /**
   * 撤回消息
   * @param message_id - 消息 ID
   */
  deleteMsg(message_id: number) {
    return this.request<void>('delete_msg', { message_id })
  }

  /**
   * 获取消息详情
   * @param message_id - 消息 ID
   */
  getMsg(message_id: number) {
    return this.request<T.Message>('get_msg', { message_id })
  }

  /**
   * 获取合并转发消息
   * @param id - 合并转发 ID (message_id 或 id)
   */
  getForwardMsg(id: string) {
    return this.request<{ message: T.Segment[] }>('get_forward_msg', { message_id: id })
  }

  // ============================================================================
  // 好友相关 (Friend)
  // ============================================================================

  /**
   * 发送好友赞
   * @param user_id - 对方 QQ 号
   * @param times - 点赞次数
   */
  sendLike(user_id: number, times = 1) {
    return this.request<void>('send_like', { user_id, times })
  }

  /**
   * 处理好友添加请求
   * @param flag - 加好友请求的 flag
   * @param approve - 是否同意请求
   * @param remark - 添加后的好友备注
   */
  setFriendAddRequest(flag: string, approve: boolean, remark = '') {
    return this.request<void>('set_friend_add_request', { flag, approve, remark })
  }

  /**
   * 获取陌生人信息
   * @param user_id - QQ 号
   * @param no_cache - 是否不使用缓存
   */
  getStrangerInfo(user_id: number, no_cache = false) {
    return this.request<T.StrangerInfo>('get_stranger_info', { user_id, no_cache })
  }

  /**
   * 获取好友列表
   * @param no_cache - 是否不使用缓存
   * @returns 好友列表数组
   */
  getFriendList(no_cache = false) {
    return this.request<T.FriendInfo[]>('get_friend_list', { no_cache })
  }

  // ============================================================================
  // 群组相关 (Group)
  // ============================================================================

  /**
   * 获取群信息
   * @param group_id - 群号
   * @param no_cache - 是否不使用缓存
   */
  getGroupInfo(group_id: number, no_cache = false) {
    return this.request<T.GroupInfo>('get_group_info', { group_id, no_cache })
  }

  /**
   * 获取群列表
   * @param no_cache - 是否不使用缓存
   * @returns 群列表数组
   */
  getGroupList(no_cache = false) {
    return this.request<T.GroupInfo[]>('get_group_list', { no_cache })
  }

  /**
   * 获取群成员信息
   * @param group_id - 群号
   * @param user_id - QQ 号
   * @param no_cache - 是否不使用缓存
   */
  getGroupMemberInfo(group_id: number, user_id: number, no_cache = false) {
    return this.request<T.GroupMemberInfo>('get_group_member_info', { group_id, user_id, no_cache })
  }

  /**
   * 获取群成员列表
   * @param group_id - 群号
   * @param no_cache - 是否不使用缓存
   */
  getGroupMemberList(group_id: number, no_cache = false) {
    return this.request<T.GroupMemberInfo[]>('get_group_member_list', { group_id, no_cache })
  }

  /**
   * 获取群荣誉信息
   * @param group_id - 群号
   * @param type - 群荣誉类型
   */
  getGroupHonorInfo(group_id: number, type: 'all' | 'talkative' | 'performer' | 'legend' | 'strong_newbie' | 'emotion' = 'all') {
    return this.request<T.GroupHonorInfo>('get_group_honor_info', { group_id, type })
  }

  /**
   * 群组踢人
   * @param group_id - 群号
   * @param user_id - 要踢的 QQ 号
   * @param reject_add_request - 拒绝此人的加群请求
   */
  setGroupKick(group_id: number, user_id: number, reject_add_request = false) {
    return this.request<void>('set_group_kick', { group_id, user_id, reject_add_request })
  }

  /**
   * 群组单人禁言
   * @param group_id - 群号
   * @param user_id - 要禁言的 QQ 号
   * @param duration - 禁言时长，单位秒 (0 为解除禁言)
   */
  setGroupBan(group_id: number, user_id: number, duration = 1800) {
    return this.request<void>('set_group_ban', { group_id, user_id, duration })
  }

  /**
   * 群组全员禁言
   * @param group_id - 群号
   * @param enable - 是否开启
   */
  setGroupWholeBan(group_id: number, enable = true) {
    return this.request<void>('set_group_whole_ban', { group_id, enable })
  }

  /**
   * 设置群管理员
   * @param group_id - 群号
   * @param user_id - 管理员 QQ
   * @param enable - 设置 / 取消
   */
  setGroupAdmin(group_id: number, user_id: number, enable = true) {
    return this.request<void>('set_group_admin', { group_id, user_id, enable })
  }

  /**
   * 设置群名片
   * @param group_id - 群号
   * @param user_id - 要设置的 QQ 号
   * @param card - 内容，为空表示取消
   */
  setGroupCard(group_id: number, user_id: number, card = '') {
    return this.request<void>('set_group_card', { group_id, user_id, card })
  }

  /**
   * 设置群名
   * @param group_id - 群号
   * @param group_name - 新群名
   */
  setGroupName(group_id: number, group_name: string) {
    return this.request<void>('set_group_name', { group_id, group_name })
  }

  /**
   * 退出群组
   * @param group_id - 群号
   * @param is_dismiss - 是否解散（仅群主）
   */
  setGroupLeave(group_id: number, is_dismiss = false) {
    return this.request<void>('set_group_leave', { group_id, is_dismiss })
  }

  /**
   * 设置群专属头衔
   * @param group_id - 群号
   * @param user_id - 要设置的 QQ 号
   * @param special_title - 专属头衔，为空表示取消
   */
  setGroupSpecialTitle(group_id: number, user_id: number, special_title: string) {
    return this.request<void>('set_group_special_title', { group_id, user_id, special_title })
  }

  /**
   * 处理加群请求
   * @param flag - 请求 flag
   * @param approve - 是否同意请求
   * @param reason - 拒绝理由
   * @param sub_type - 请求子类型 (add / invite)
   */
  setGroupAddRequest(flag: string, approve: boolean, reason = '', sub_type: 'add' | 'invite' = 'add') {
    return this.request<void>('set_group_add_request', { flag, sub_type, type: sub_type, approve, reason })
  }

  // ============================================================================
  // Bot 自身相关 (Bot)
  // ============================================================================

  /**
   * 获取登录号信息
   */
  getLoginInfo() {
    return this.request<{ user_id: number; nickname: string }>('get_login_info')
  }

  /**
   * 获取 Cookies
   * @param domain - 需要获取 cookies 的域名
   */
  getCookies(domain = '') {
    return this.request<{ cookies: string; csrf_token: number | string; token?: number; bkn?: string | number }>('get_cookies', { domain })
  }

  /**
   * 获取 CSRF Token
   */
  getCsrfToken() {
    return this.request<{ token: number }>('get_csrf_token')
  }

  /**
   * 获取 QQ 相关接口凭证
   * @param domain - 需要获取 cookies 的域名
   */
  getCredentials(domain = '') {
    return this.request<{ cookies: string; csrf_token: number | string; token?: number; bkn?: string | number }>('get_credentials', { domain })
  }

  /**
   * 获取语音
   * @param file - 语音文件名
   * @param out_format - 要转换到的格式 (mp3/amr/wma/m4a/spx/ogg/wav/flac)
   */
  getRecord(file: string, out_format = 'mp3') {
    return this.request<{ file: string; url: string; file_size: string; file_name: string; base64: string }>('get_record', { file, out_format })
  }

  /**
   * 获取图片
   * @param file - 图片文件名
   */
  getImage(file: string) {
    return this.request<{ file: string }>('get_image', { file })
  }

  /**
   * 检查是否可以发送图片
   */
  canSendImage() {
    return this.request<{ yes: boolean }>('can_send_image')
  }

  /**
   * 检查是否可以发送语音
   */
  canSendRecord() {
    return this.request<{ yes: boolean }>('can_send_record')
  }

  /**
   * 获取运行状态
   */
  getStatus() {
    return this.request<{ online: boolean; good: boolean; stat?: any; plugins_good?: boolean }>('get_status')
  }

  /**
   * 获取版本信息
   */
  getVersionInfo() {
    return this.request<{ app_name: string; app_version: string; protocol_version: string; nt_protocol?: string }>('get_version_info')
  }

  /**
   * 重启 OneBot 实现
   */
  setRestart() {
    return this.request<void>('set_restart')
  }

  /**
   * 清理缓存
   */
  cleanCache() {
    return this.request<void>('clean_cache')
  }
}
