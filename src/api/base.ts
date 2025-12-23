import { socket } from './socket'
import type * as T from '@/types'

/**
 * OneBot v11 标准 API 客户端
 * 包含所有标准协议定义的基础方法
 */
export class BaseClient {
  /**
   * 发送通用请求
   * @param action API 动作名
   * @param params 参数
   */
  protected request<R>(action: string, params = {}) {
    return socket.request<R>(action, params)
  }

  // ============================================================================
  // 消息相关 (Message)
  // ============================================================================

  /** 发送私聊消息 */
  sendPrivateMsg(user_id: number, message: any, auto_escape = false) {
    return this.request<T.MsgId>('send_private_msg', { user_id, message, auto_escape })
  }

  /** 发送群消息 */
  sendGroupMsg(group_id: number, message: any, auto_escape = false) {
    return this.request<T.MsgId>('send_group_msg', { group_id, message, auto_escape })
  }

  /** 发送消息 */
  sendMsg(params: T.SendMsgParams) {
    return this.request<T.MsgId>('send_msg', params)
  }

  /** 撤回消息 */
  deleteMsg(message_id: number) {
    return this.request('delete_msg', { message_id })
  }

  /** 获取消息详情 */
  getMsg(message_id: number) {
    return this.request<T.GetMsg>('get_msg', { message_id })
  }

  /** 获取合并转发消息 */
  getForwardMsg(id: string) {
    return this.request<T.GetForwardMsg>('get_forward_msg', { id })
  }

  // ============================================================================
  // 好友相关 (Friend)
  // ============================================================================

  /** 发送好友赞 */
  sendLike(user_id: number, times = 1) {
    return this.request('send_like', { user_id, times })
  }

  /** 处理好友请求 */
  setFriendAddRequest(flag: string, approve: boolean, remark = '') {
    return this.request('set_friend_add_request', { flag, approve, remark })
  }

  /** 获取陌生人信息 */
  getStrangerInfo(user_id: number, no_cache = false) {
    return this.request<T.StrangerInfo>('get_stranger_info', { user_id, no_cache })
  }

  /** 获取好友列表 */
  getFriendList() {
    return this.request<T.FriendInfo[]>('get_friend_list')
  }

  // ============================================================================
  // 群组相关 (Group)
  // ============================================================================

  /** 获取群信息 */
  getGroupInfo(group_id: number, no_cache = false) {
    return this.request<T.GroupInfo>('get_group_info', { group_id, no_cache })
  }

  /** 获取群列表 */
  getGroupList() {
    return this.request<T.GroupInfo[]>('get_group_list')
  }

  /** 获取群成员信息 */
  getGroupMemberInfo(group_id: number, user_id: number, no_cache = false) {
    return this.request<T.GroupMemberInfo>('get_group_member_info', { group_id, user_id, no_cache })
  }

  /** 获取群成员列表 */
  getGroupMemberList(group_id: number) {
    return this.request<T.GroupMemberInfo[]>('get_group_member_list', { group_id })
  }

  /** 获取群荣誉信息 */
  getGroupHonorInfo(group_id: number, type = 'all') {
    return this.request<T.GroupHonorInfo>('get_group_honor_info', { group_id, type })
  }

  /** 群组踢人 */
  setGroupKick(group_id: number, user_id: number, reject_add_request = false) {
    return this.request('set_group_kick', { group_id, user_id, reject_add_request })
  }

  /** 群组单人禁言 */
  setGroupBan(group_id: number, user_id: number, duration = 1800) {
    return this.request('set_group_ban', { group_id, user_id, duration })
  }

  /** 群组匿名用户禁言 */
  setGroupAnonymousBan(group_id: number, flag: string, duration = 1800) {
    return this.request('set_group_anonymous_ban', { group_id, flag, duration })
  }

  /** 群组全员禁言 */
  setGroupWholeBan(group_id: number, enable = true) {
    return this.request('set_group_whole_ban', { group_id, enable })
  }

  /** 设置群管理员 */
  setGroupAdmin(group_id: number, user_id: number, enable = true) {
    return this.request('set_group_admin', { group_id, user_id, enable })
  }

  /** 设置群匿名 */
  setGroupAnonymous(group_id: number, enable = true) {
    return this.request('set_group_anonymous', { group_id, enable })
  }

  /** 设置群名片 */
  setGroupCard(group_id: number, user_id: number, card = '') {
    return this.request('set_group_card', { group_id, user_id, card })
  }

  /** 设置群名 */
  setGroupName(group_id: number, group_name: string) {
    return this.request('set_group_name', { group_id, group_name })
  }

  /** 退出群组 */
  setGroupLeave(group_id: number, is_dismiss = false) {
    return this.request('set_group_leave', { group_id, is_dismiss })
  }

  /** 设置群专属头衔 */
  setGroupSpecialTitle(group_id: number, user_id: number, special_title: string, duration = -1) {
    return this.request('set_group_special_title', { group_id, user_id, special_title, duration })
  }

  /** 处理加群请求 */
  setGroupAddRequest(flag: string, sub_type: string, approve: boolean, reason = '') {
    return this.request('set_group_add_request', { flag, sub_type, approve, reason })
  }

  // ============================================================================
  // Bot 自身相关 (Bot)
  // ============================================================================

  /** 获取登录号信息 */
  getLoginInfo() {
    return this.request<T.LoginInfo>('get_login_info')
  }

  /** 获取 Cookies */
  getCookies(domain = '') {
    return this.request<{ cookies: string }>('get_cookies', { domain })
  }

  /** 获取 CSRF Token */
  getCsrfToken() {
    return this.request<{ token: number }>('get_csrf_token')
  }

  /** 获取 QQ 相关接口凭证 */
  getCredentials(domain = '') {
    return this.request<{ cookies: string, csrf_token: number }>('get_credentials', { domain })
  }

  /** 获取语音 */
  getRecord(file: string, out_format = 'mp3') {
    return this.request<{ file: string }>('get_record', { file, out_format })
  }

  /** 获取图片 */
  getImage(file: string) {
    return this.request<{ file: string }>('get_image', { file })
  }

  /** 检查是否可以发送图片 */
  canSendImage() {
    return this.request<{ yes: boolean }>('can_send_image')
  }

  /** 检查是否可以发送语音 */
  canSendRecord() {
    return this.request<{ yes: boolean }>('can_send_record')
  }

  /** 获取运行状态 */
  getStatus() {
    return this.request<T.StatusInfo>('get_status')
  }

  /** 获取版本信息 */
  getVersionInfo() {
    return this.request<T.VersionInfo>('get_version_info')
  }

  /** 重启 OneBot 协议端 */
  setRestart(delay = 0) {
    return this.request('set_restart', { delay })
  }

  /** 清理缓存 */
  cleanCache() {
    return this.request('clean_cache')
  }
}
