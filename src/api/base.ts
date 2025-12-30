import { socket } from './socket'
import type * as T from '@/types'

/**
 * OneBot v11 标准 API 客户端
 * @description 标准协议定义的基础方法
 */
export class BaseClient {
  /**
   * 发送通用请求
   * @param action - API 动作名称
   * @param params - 请求参数
   * @returns Promise 解析后的响应数据
   */
  protected request<R>(action: string, params: Record<string, any> = {}): Promise<R> {
    return socket.request<R>(action, params)
  }

  // ============================================================================
  // 消息相关 (Message)
  // ============================================================================

  /**
   * 发送私聊消息
   * @param user_id - 对方 QQ 号
   * @param message - 消息内容 (字符串或消息段数组)
   * @param auto_escape - 消息内容是否作为纯文本发送
   */
  sendPrivateMsg(user_id: number, message: string | T.Segment[], auto_escape = false) {
    return this.request<{ message_id: number }>('send_private_msg', { user_id, message, auto_escape })
  }

  /**
   * 发送群消息
   * @param group_id - 群号
   * @param message - 消息内容 (字符串或消息段数组)
   * @param auto_escape - 消息内容是否作为纯文本发送
   */
  sendGroupMsg(group_id: number, message: string | T.Segment[], auto_escape = false) {
    return this.request<{ message_id: number }>('send_group_msg', { group_id, message, auto_escape })
  }

  /**
   * 发送消息 (自动识别类型)
   * @param params - 发送参数对象
   * @param params.message_type - 消息类型: 'private' 或 'group'
   * @param params.user_id - 对方 QQ 号
   * @param params.group_id - 群号
   * @param params.message - 消息内容 (字符串或消息段数组)
   * @param params.auto_escape - 消息内容是否作为纯文本发送
   */
  sendMsg(params: {
    message_type?: 'private' | 'group'
    user_id?: number
    group_id?: number
    message: string | T.Segment[]
    auto_escape?: boolean
  }) {
    return this.request<{ message_id: number }>('send_msg', params)
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
   * @param id - 合并转发 ID
   */
  getForwardMsg(id: string) {
    return this.request<{ message: T.Segment[] }>('get_forward_msg', { id })
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
   * 处理好友请求
   * @param flag - 加好友请求的 flag
   * @param approve - 是否同意请求
   * @param remark - 好友备注
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
   * @returns 好友列表数组
   */
  getFriendList() {
    return this.request<T.FriendInfo[]>('get_friend_list')
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
   * @returns 群列表数组
   */
  getGroupList() {
    return this.request<T.GroupInfo[]>('get_group_list')
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
   */
  getGroupMemberList(group_id: number) {
    return this.request<T.GroupMemberInfo[]>('get_group_member_list', { group_id })
  }

  /**
   * 获取群荣誉信息
   * @param group_id - 群号
   * @param type - 要获取的群荣誉类型，可分别获取单个类型的群荣誉数据，或传入 all 获取所有数据
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
   * @param duration - 禁言时长，单位秒，0 表示取消
   */
  setGroupBan(group_id: number, user_id: number, duration = 1800) {
    return this.request<void>('set_group_ban', { group_id, user_id, duration })
  }

  /**
   * 群组匿名用户禁言
   * @param group_id - 群号
   * @param flag - 匿名用户的 flag
   * @param duration - 禁言时长，单位秒，无法取消禁言
   */
  setGroupAnonymousBan(group_id: number, flag: string, duration = 1800) {
    return this.request<void>('set_group_anonymous_ban', { group_id, flag, duration })
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
   * @param user_id - 要设置/取消管理员的 QQ 号
   * @param enable - true 为设置，false 为取消
   */
  setGroupAdmin(group_id: number, user_id: number, enable = true) {
    return this.request<void>('set_group_admin', { group_id, user_id, enable })
  }

  /**
   * 设置群匿名
   * @param group_id - 群号
   * @param enable - 是否允许匿名聊天
   */
  setGroupAnonymous(group_id: number, enable = true) {
    return this.request<void>('set_group_anonymous', { group_id, enable })
  }

  /**
   * 设置群名片 (群备注)
   * @param group_id - 群号
   * @param user_id - 要设置的 QQ 号
   * @param card - 群名片内容，不填或空字符串表示删除
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
   * @param is_dismiss - 是否解散，仅登录号是群主且此项为 true 时能够解散
   */
  setGroupLeave(group_id: number, is_dismiss = false) {
    return this.request<void>('set_group_leave', { group_id, is_dismiss })
  }

  /**
   * 设置群专属头衔
   * @param group_id - 群号
   * @param user_id - 要设置的 QQ 号
   * @param special_title - 专属头衔，不填或空字符串表示删除
   * @param duration - 专属头衔有效期，单位秒，-1 表示永久
   */
  setGroupSpecialTitle(group_id: number, user_id: number, special_title: string, duration = -1) {
    return this.request<void>('set_group_special_title', { group_id, user_id, special_title, duration })
  }

  /**
   * 处理加群请求／邀请
   * @param flag - 加群请求的 flag
   * @param sub_type - add 或 invite，请求类型
   * @param approve - 是否同意请求／邀请
   * @param reason - 拒绝理由
   */
  setGroupAddRequest(flag: string, sub_type: 'add' | 'invite', approve: boolean, reason = '') {
    return this.request<void>('set_group_add_request', { flag, sub_type, approve, reason })
  }

  // ============================================================================
  // Bot 自身相关 (Bot)
  // ============================================================================

  /**
   * 获取登录号信息
   */
  getLoginInfo() {
    return this.request<T.LoginInfo>('get_login_info')
  }

  /**
   * 获取 Cookies
   * @param domain - 需要获取 cookies 的域名
   */
  getCookies(domain = '') {
    return this.request<T.Credentials>('get_cookies', { domain })
  }

  /**
   * 获取 CSRF Token
   */
  getCsrfToken() {
    return this.request<{ token: number }>('get_csrf_token')
  }

  /**
   * 获取 QQ 相关接口凭证 (Cookies 和 CSRF Token)
   * @param domain - 需要获取 cookies 的域名
   */
  getCredentials(domain = '') {
    return this.request<T.Credentials>('get_credentials', { domain })
  }

  /**
   * 获取语音
   * @param file - 语音文件名
   * @param out_format - 要转换到的格式，支持 mp3, amr, wma, m4a, spx, ogg, wav, flac
   */
  getRecord(file: string, out_format = 'mp3') {
    return this.request<{ file: string }>('get_record', { file, out_format })
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
    return this.request<T.AppStatus>('get_status')
  }

  /**
   * 获取版本信息
   */
  getVersionInfo() {
    return this.request<T.VersionInfo>('get_version_info')
  }

  /**
   * 重启 OneBot 实现
   * @param delay - 延迟毫秒数
   */
  setRestart(delay = 0) {
    return this.request<void>('set_restart', { delay })
  }

  /**
   * 清理缓存
   */
  cleanCache() {
    return this.request<void>('clean_cache')
  }
}
