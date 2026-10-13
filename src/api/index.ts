import { socket } from './socket'
import { httpsse } from './httpsse'
import { BaseClient } from './base'
import type * as T from '@/types'

/**
 * OneBot v11 扩展客户端
 * @description NapCat、SnowLuma、LLOneBot 三款后端的全部扩展 API。
 * 方法名与文档动作名一一对应；同名动作在不同后端参数不一致时由方法内部自动路由。
 *
 * 文档来源：
 * - NapCat: https://napcat.apifox.cn/
 * - SnowLuma: https://snowluma.github.io/zh/docs/api
 * - LLOneBot: https://api.luckylillia.com/doc-7202281
 */
export class ExtendedClient extends BaseClient {
  // ============================================================================
  // 连接管理 (Connection)
  // ============================================================================

  /**
   * 注册全局事件接收器
   * @param fn - 接收数据的回调函数
   */
  onReceive(fn: (data: any) => void) {
    socket.onReceive(fn)
    httpsse.onReceive(fn)
  }

  /**
   * 连接服务
   * @param address - 服务地址 (ws:// 或 http://)
   * @param token - 访问令牌
   */
  async connect(address: string, token: string) {
    if (address.startsWith('http://') || address.startsWith('https://')) {
      this.mode = 'http'
      await httpsse.connect(address, token)
    } else {
      this.mode = 'ws'
      await socket.connect(address, token)
    }

    try {
      const ver = await this.getVersionInfo()
      if (ver.app_name.includes('NapCat')) this.setBackend('NapCat')
      else if (ver.app_name.includes('SnowLuma')) this.setBackend('SnowLuma')
      else if (ver.app_name.includes('LLOneBot')) this.setBackend('LLOneBot')
    } catch { /* 忽略错误 */ }
  }

  /** 断开连接 */
  disconnect() {
    if (this.mode === 'ws') {
      socket.disconnect()
    } else {
      httpsse.disconnect()
    }
  }

  /**
   * 长连接接收消息 (`_events`)
   * @description SSE 上报事件地址，等价于 `${httpApi}/_events`，亦为 `${httpApi}/events?access_token=...`
   * @param address - HTTP API 地址
   * @param token - 访问令牌
   */
  getEventsUrl(address: string, token = '') {
    return `${address.replace(/\/+$/, '')}/events?access_token=${encodeURIComponent(token)}`
  }

  // ============================================================================
  // 消息扩展 (Message Ext)
  // ============================================================================

  /**
   * 发送合并转发
   * @param message_type - 消息类型 group | private
   * @param target_id - 群号或用户 ID
   * @param messages - 消息节点列表
   */
  sendForwardMsg(message_type: 'private' | 'group', target_id: number, messages: T.Segment[]) {
    if (this.backend === 'LLOneBot') {
      return message_type === 'group'
        ? this.sendGroupForwardMsg(target_id, messages)
        : this.sendPrivateForwardMsg(target_id, messages)
    }
    return this.request<{ message_id: number; forward_id: string }>('send_forward_msg', {
      message_type,
      messages,
      ...(message_type === 'group' ? { group_id: target_id } : { user_id: target_id })
    })
  }

  /**
   * 发送群聊合并转发
   * @param group_id - 群号
   * @param messages - 消息节点列表
   */
  sendGroupForwardMsg(group_id: number, messages: T.Segment[]) {
    return this.request<{ message_id: number; forward_id: string }>('send_group_forward_msg', { group_id, messages })
  }

  /**
   * 发送私聊合并转发
   * @param user_id - 好友 QQ
   * @param messages - 消息节点列表
   */
  sendPrivateForwardMsg(user_id: number, messages: T.Segment[]) {
    return this.request<{ message_id: number; forward_id: string }>('send_private_forward_msg', { user_id, messages })
  }

  /**
   * 获取好友消息历史
   * @param user_id - 好友 QQ
   * @param message_seq - 起始消息标识
   * @param count - 获取数量
   */
  getFriendMsgHistory(user_id: number, message_seq?: number, count = 20) {
    return this.request<{ messages: T.Message[] }>('get_friend_msg_history', {
      user_id,
      ...(this.backend === 'SnowLuma' ? { message_id: message_seq } : { message_seq }),
      count
    })
  }

  /**
   * 获取群消息历史
   * @param group_id - 群号
   * @param message_seq - 起始消息标识
   * @param count - 获取数量
   * @param reverseOrder - 是否倒序 (LLOneBot)
   */
  getGroupMsgHistory(group_id: number, message_seq?: number, count = 20, reverseOrder = false) {
    return this.request<{ messages: T.Message[] }>('get_group_msg_history', {
      group_id,
      ...(this.backend === 'SnowLuma' ? { message_id: message_seq } : { message_seq }),
      count,
      ...(this.backend === 'LLOneBot' ? { reverseOrder } : {})
    })
  }

  /**
   * 获取历史消息
   * @param message_type - 消息类型
   * @param id - 好友 QQ 或群号
   * @param message_seq - 起始消息标识
   * @param count - 获取数量
   * @param reverseOrder - 是否倒序 (LLOneBot)
   */
  getMsgHistory(message_type: 'private' | 'group', id: number, message_seq?: number, count = 20, reverseOrder = false) {
    return message_type === 'private'
      ? this.getFriendMsgHistory(id, message_seq, count)
      : this.getGroupMsgHistory(id, message_seq, count, reverseOrder)
  }

  /**
   * 标记消息已读
   * @param message_id - 消息 ID
   */
  markMsgAsRead(message_id: number) {
    return this.request<void>('mark_msg_as_read', { message_id })
  }

  /**
   * 标记群消息已读
   * @param message_id - 消息 ID
   * @param group_id - 群号
   */
  markGroupMsgAsRead(message_id: number, group_id?: number) {
    return this.request<void>('mark_group_msg_as_read', { message_id, group_id })
  }

  /**
   * 标记私聊消息已读
   * @param message_id - 消息 ID
   * @param user_id - 用户 QQ
   */
  markPrivateMsgAsRead(message_id: number, user_id?: number) {
    return this.request<void>('mark_private_msg_as_read', { message_id, user_id })
  }

  /**
   * 标记全部消息已读
   */
  markAllAsRead() {
    return this.request<void>('_mark_all_as_read')
  }

  /**
   * 设置消息表情回应
   * @param message_id - 消息 ID
   * @param emoji_id - 表情 ID
   * @param is_add - 添加或取消回应
   */
  setMsgEmojiLike(message_id: number, emoji_id: string, is_add = true) {
    return this.request<void>('set_msg_emoji_like', { message_id, emoji_id, set: is_add })
  }

  /**
   * 获取消息表情回应用户
   * @param message_id - 消息 ID
   * @param emojiId - 表情 ID
   * @param emojiType - 表情类型
   * @param count - 获取数量
   * @param cookie - 分页 Cookie
   */
  fetchEmojiLike(message_id: number, emojiId: string, emojiType: string | number = '', count = 20, cookie = '') {
    return this.request<any>('fetch_emoji_like', { message_id, emojiId, emojiType, count, cookie })
  }

  /**
   * 获取表情回应用户
   * @param message_id - 消息 ID
   * @param emoji_id - 表情 ID
   * @param group_id - 群号 (短 ID 可不传)
   * @param emoji_type - 表情类型
   * @param count - 数量，0 代表全部
   */
  getEmojiLikes(message_id: number, emoji_id: string, group_id?: number, emoji_type = '', count = 20) {
    return this.request<any>('get_emoji_likes', { message_id, emoji_id, group_id, emoji_type, count })
  }

  /**
   * 获取一条消息的全部表情回应 (SnowLuma)
   * @param message_id - 消息 ID
   */
  getMsgEmojiLikes(message_id: number) {
    return this.request<any[]>('get_msg_emoji_likes', { message_id })
  }

  /**
   * 群聊表情回应 (SnowLuma)
   * @param group_id - 群号
   * @param message_id - 消息 ID
   * @param code - 表情 ID
   * @param is_set - 添加或取消
   */
  setGroupReaction(group_id: number, message_id: number, code: string, is_set = true) {
    return this.request<void>('set_group_reaction', { group_id, message_id, code, is_set })
  }

  /**
   * 转发单条消息给好友
   * @param user_id - 目标 QQ
   * @param message_id - 消息 ID
   */
  forwardFriendSingleMsg(user_id: number, message_id: number) {
    return this.request<void>('forward_friend_single_msg', { user_id, message_id })
  }

  /**
   * 转发单条消息到群
   * @param group_id - 目标群号
   * @param message_id - 消息 ID
   */
  forwardGroupSingleMsg(group_id: number, message_id: number) {
    return this.request<void>('forward_group_single_msg', { group_id, message_id })
  }

  /**
   * 转发单条消息
   * @param type - 消息类型
   * @param target_id - 好友 QQ 或群号
   * @param message_id - 消息 ID
   */
  forwardSingleMsg(type: 'private' | 'group', target_id: number, message_id: number) {
    return type === 'private'
      ? this.forwardFriendSingleMsg(target_id, message_id)
      : this.forwardGroupSingleMsg(target_id, message_id)
  }

  /**
   * 发送账号收藏表情 (SnowLuma)
   * @param emoji_id - 收藏表情完整 ID 或 32 位 MD5
   * @param target_id - 目标群号或 QQ 号
   * @param type - 目标类型
   * @param reply_to - 可选回复消息 ID
   */
  sendCustomFace(emoji_id: string, target_id: number, type: 'group' | 'private' = 'group', reply_to?: number) {
    return this.request<void>('send_custom_face', {
      emoji_id,
      ...(type === 'group' ? { group_id: target_id } : { user_id: target_id }),
      reply_to
    })
  }

  /**
   * 上传转发消息 (SnowLuma)
   * @param messages - 消息节点列表
   * @param group_id - 群号 (可选)
   */
  uploadForwardMsg(messages: T.Segment[], group_id?: number) {
    return this.request<{ forward_id: string }>('upload_forward_msg', { messages, group_id })
  }

  /**
   * 上传转发消息（别名拼写） (SnowLuma)
   * @param messages - 消息节点列表
   * @param group_id - 群号 (可选)
   */
  uploadFowardMsg(messages: T.Segment[], group_id?: number) {
    return this.request<{ forward_id: string }>('upload_foward_msg', { messages, group_id })
  }

  /**
   * 语音消息转文字 (LLOneBot)
   * @param message_id - 消息 ID
   */
  voiceMsgToText(message_id: number) {
    return this.request<{ text: string }>('voice_msg_to_text', { message_id })
  }

  /**
   * 获取语音转文字结果
   * @param message_id - 消息 ID
   */
  fetchPttText(message_id: number) {
    return this.request<{ text: string }>('fetch_ptt_text', { message_id })
  }

  /**
   * 发送闪传消息
   * @param fileset_id - 文件集 ID
   * @param target_id - 目标群号或 QQ 号
   * @param type - 目标类型
   */
  sendFlashMsg(fileset_id: string, target_id: number, type: 'group' | 'private' = 'group') {
    return this.request<{ message_id: number }>('send_flash_msg', {
      fileset_id,
      ...(type === 'group' ? { group_id: target_id } : { user_id: target_id })
    })
  }

  // ------------------------- 在线文件 (NapCat) -------------------------

  /**
   * 发送在线文件 (NapCat)
   * @param user_id - 用户 QQ
   * @param file_path - 本地文件路径
   * @param file_name - 文件名 (可选)
   */
  sendOnlineFile(user_id: string | number, file_path: string, file_name?: string) {
    return this.request<void>('send_online_file', { user_id, file_path, file_name })
  }

  /**
   * 发送在线文件夹 (NapCat)
   * @param user_id - 用户 QQ
   * @param folder_path - 本地文件夹路径
   * @param folder_name - 文件夹名称 (可选)
   */
  sendOnlineFolder(user_id: string | number, folder_path: string, folder_name?: string) {
    return this.request<void>('send_online_folder', { user_id, folder_path, folder_name })
  }

  /**
   * 获取在线文件消息 (NapCat)
   * @param user_id - 用户 QQ
   */
  getOnlineFileMsg(user_id: string | number) {
    return this.request<any>('get_online_file_msg', { user_id })
  }

  /**
   * 接收在线文件 (NapCat)
   * @param user_id - 用户 QQ
   * @param msg_id - 消息 ID
   * @param element_id - 元素 ID
   */
  receiveOnlineFile(user_id: string | number, msg_id: string, element_id?: string) {
    return this.request<void>('receive_online_file', { user_id, msg_id, element_id })
  }

  /**
   * 拒绝在线文件 (NapCat)
   * @param user_id - 用户 QQ
   * @param msg_id - 消息 ID
   * @param element_id - 元素 ID
   */
  refuseOnlineFile(user_id: string | number, msg_id: string, element_id?: string) {
    return this.request<void>('refuse_online_file', { user_id, msg_id, element_id })
  }

  /**
   * 取消在线文件 (NapCat)
   * @param user_id - 用户 QQ
   * @param msg_id - 消息 ID
   */
  cancelOnlineFile(user_id: string | number, msg_id: string) {
    return this.request<void>('cancel_online_file', { user_id, msg_id })
  }

  // ============================================================================
  // 好友扩展 (Friend Ext)
  // ============================================================================

  /**
   * 获取单向好友列表
   */
  getUnidirectionalFriendList() {
    return this.request<any[]>('get_unidirectional_friend_list')
  }

  /**
   * 删除好友
   * @param user_id - 好友 QQ
   * @param block - 是否拉黑
   * @param temp_both_del - 是否双向删除 (NapCat/SnowLuma)
   */
  deleteFriend(user_id: number, block = false, temp_both_del?: boolean) {
    return this.request<void>('delete_friend', this.backend === 'LLOneBot' ? { user_id, friend_id: user_id, block } : { user_id, temp_block: block, temp_both_del })
  }

  /**
   * 设置好友备注
   * @param user_id - 好友 QQ
   * @param remark - 备注名
   */
  setFriendRemark(user_id: number, remark: string) {
    return this.request<void>('set_friend_remark', { user_id, remark })
  }

  /**
   * 获取分类的好友列表
   */
  getFriendsWithCategory() {
    return this.request<T.FriendCategory[]>('get_friends_with_category')
  }

  /**
   * 移动好友分组 (LLOneBot)
   * @param user_id - 好友 QQ
   * @param category_id - 分组 ID
   */
  setFriendCategory(user_id: number, category_id: number) {
    return this.request<void>('set_friend_category', { user_id, category_id })
  }

  /**
   * 移动好友到指定分组 (SnowLuma)
   * @param uin - 要移动的好友 QQ 号
   * @param categoryId - 目标分组 ID
   * @param categoryName - 目标分组名称（必须唯一且完全匹配）
   */
  setFriendsCategory(uin: number, categoryId: number, categoryName?: string) {
    return this.request<void>('set_friends_category', { uin, categoryId, categoryName })
  }

  /**
   * 获取被过滤的好友请求
   * @param count - 获取数量
   */
  getDoubtFriendsAddRequest(count = 20) {
    return this.request<any[]>('get_doubt_friends_add_request', { count })
  }

  /**
   * 处理被过滤的好友请求
   * @param flag - 请求 Flag
   * @param approve - 是否同意
   */
  setDoubtFriendsAddRequest(flag: string, approve = true) {
    return this.request<void>('set_doubt_friends_add_request', { flag, approve })
  }

  /**
   * 发送戳一戳
   * @param user_id - 目标 QQ 号
   * @param group_id - [可选] 群号
   */
  async sendPoke(user_id: number, group_id?: number): Promise<void> {
    try {
      await this.request<void>('send_poke', { user_id, group_id })
    } catch {
      if (group_id) {
        await this.request<void>('group_poke', { group_id, user_id })
      } else {
        await this.request<void>('friend_poke', { user_id })
      }
    }
  }

  /**
   * 群拍一拍
   * @param group_id - 群号
   * @param user_id - QQ 号
   */
  groupPoke(group_id: number, user_id: number) {
    return this.request<void>('group_poke', { group_id, user_id, target_id: user_id })
  }

  /**
   * 好友拍一拍
   * @param user_id - 用户 QQ
   */
  friendPoke(user_id: number) {
    return this.request<void>('friend_poke', { user_id, target_id: user_id })
  }

  /**
   * 获取资料点赞
   * @param user_id - QQ 号 (NapCat/SnowLuma)
   * @param start - 起始索引
   * @param count - 数量
   */
  getProfileLike(user_id?: number, start = 0, count = 10) {
    return this.request<{ users: { uid: string; count: number; nick: string; src: number; latestTime: number }[]; nextStart: number }>('get_profile_like', { user_id, start, count })
  }

  /**
   * 获取名片赞数量 (LLOneBot)
   * @param user_id - QQ 号
   */
  getProfileLikeCount(user_id: number) {
    return this.request<{ count: number }>('get_profile_like_count', { user_id })
  }

  /**
   * 获取谁赞过我列表 (LLOneBot)
   * @param start - 从 0 开始，-1 表示获取全部
   * @param count - 一页数量，最多 30
   */
  getProfileLikeMe(start = 0, count = 10) {
    return this.request<any>('get_profile_like_me', { start, count })
  }

  /**
   * 获取 QQ 或 QQ 群头像 (LLOneBot)
   * @param user_id - QQ 号
   * @param group_id - 群号
   */
  getQqAvatar(user_id?: number, group_id?: number) {
    return this.request<{ url: string }>('get_qq_avatar', { user_id, group_id })
  }

  /**
   * 设置输入状态
   * @param user_id - QQ 号
   * @param event_type - 事件类型
   */
  setInputStatus(user_id: number, event_type = 1) {
    return this.request<void>('set_input_status', { user_id, event_type })
  }

  /**
   * 设置在线状态
   * @param status - 主状态
   * @param ext_status - 扩展状态
   * @param battery_status - 电量状态
   */
  setOnlineStatus(status: number, ext_status = 0, battery_status = 0) {
    return this.request<void>('set_online_status', { status, ext_status, battery_status })
  }

  /**
   * 设置自定义在线状态
   * @param wording - 状态文本
   * @param face_id - 图标 ID
   * @param face_type - 图标类型
   */
  setDiyOnlineStatus(wording: string, face_id?: number | string, face_type = 1) {
    return this.request<void>('set_diy_online_status', { wording, face_id, face_type })
  }

  /**
   * 获取用户在线 / 扩展状态
   * @param user_id - QQ 号
   */
  ncGetUserStatus(user_id: number) {
    return this.request<{ status: number; ext_status: number }>('nc_get_user_status', { user_id })
  }

  /**
   * 获取官方机器人账号范围
   */
  getRobotUinRange() {
    return this.request<{ minUin: string; maxUin: string }[]>('get_robot_uin_range')
  }

  /**
   * 设置个性签名
   * @param longNick - 签名内容
   */
  setSelfLongnick(longNick: string) {
    return this.request<void>('set_self_longnick', { longNick, long_nick: longNick })
  }

  /**
   * 设置登录号资料
   * @param nickname - 昵称
   * @param personal_note - 个性签名
   * @param sex - 性别 (0 未知 / 1 男 / 2 女)
   */
  setQqProfile(nickname?: string, personal_note?: string, sex?: number) {
    return this.request<void>('set_qq_profile', { nickname, personal_note, sex })
  }

  /**
   * 设置个人头像
   * @param file - 图片路径 / URL / Base64
   */
  setQqAvatar(file: string) {
    return this.request<void>('set_qq_avatar', { file })
  }

  /**
   * 获取 clientkey
   */
  getClientkey() {
    return this.request<{ clientkey: string }>('get_clientkey')
  }

  /**
   * 获取下载 rkey
   */
  getRkey() {
    return this.request<{ type?: string; rkey: string; created_at?: number; ttl?: number | string; time?: number } | { private_key: string; group_key: string }>('get_rkey')
  }

  /**
   * 获取 rkey 服务器信息
   */
  getRkeyServer() {
    return this.request<{ private_rkey: string; group_rkey: string; expired_time: number }>('get_rkey_server')
  }

  /**
   * 获取 RKey (NapCat)
   */
  ncGetRkey() {
    return this.request<{ rkey: string; ttl: string; time: number }>('nc_get_rkey')
  }

  /**
   * 获取在线客户端
   * @param no_cache - 是否强制刷新
   */
  getOnlineClients(no_cache = false) {
    return this.request<{ app_id: number; device_name: string; device_kind: string }[]>('get_online_clients', { no_cache })
  }

  /**
   * 获取机型展示
   * @param model - 机型标识
   */
  getModelShow(model: string) {
    return this.request<{ variants: { model_show: string; need_pay: boolean }[] }[]>('_get_model_show', { model })
  }

  /**
   * 设置机型展示
   * @param model - 机型标识
   * @param model_show - 显示名称
   */
  setModelShow(model: string, model_show: string) {
    return this.request<void>('_set_model_show', { model, model_show })
  }

  /**
   * 获取最近会话
   * @param count - 数量
   */
  getRecentContact(count = 20) {
    return this.request<any[]>('get_recent_contact', { count })
  }

  /**
   * 获取自定义表情
   * @param count - 数量
   * @param return_type - 返回类型 (url / id，LLOneBot)
   */
  fetchCustomFace(count = 48, return_type = 'url') {
    return this.request<string[]>('fetch_custom_face', { count, return_type })
  }

  /**
   * 获取自定义表情详情
   * @param count - 数量
   */
  fetchCustomFaceDetail(count = 48) {
    return this.request<any[]>('fetch_custom_face_detail', { count })
  }

  /**
   * 添加收藏表情
   * @param file - 本地表情文件路径
   * @param emoji_id - 表情 ID
   * @param package_id - 表情包 ID
   */
  addCustomFace(file: string, emoji_id?: string | number, package_id: string | number = 0) {
    return this.request<void>('add_custom_face', { file, emoji_id, package_id })
  }

  /**
   * 删除收藏表情
   * @param emoji_id - 表情 ID
   * @param ids - 资源 ID 列表
   */
  deleteCustomFace(emoji_id?: string, ids?: string[]) {
    return this.request<void>('delete_custom_face', { emoji_id, res_id: ids, id: ids, ids, md5: ids })
  }

  /**
   * 修改收藏表情备注 (SnowLuma)
   * @param emoji_id - 表情 ID
   * @param desc - 新备注
   */
  modifyCustomFace(emoji_id: string, desc: string) {
    return this.request<void>('modify_custom_face', { emoji_id, desc })
  }

  /**
   * 收藏表情移到最前 (SnowLuma)
   * @param emoji_id - 表情 ID
   */
  moveCustomFaceToFront(emoji_id: string) {
    return this.request<void>('move_custom_face_to_front', { emoji_id })
  }

  /**
   * 修改自定义表情描述 (NapCat)
   * @param emoji_id - 表情 ID
   * @param desc - 新的表情描述
   * @param res_id - 资源 ID
   * @param md5 - 表情 MD5
   */
  setCustomFaceDesc(emoji_id: number | string, desc: string, res_id?: string, md5?: string) {
    return this.request<void>('set_custom_face_desc', { emoji_id, res_id, md5, desc })
  }

  /**
   * 获取指定 QQ 号正在使用的个性装扮 (SnowLuma)
   * @param user_id - 目标 QQ 号
   */
  getFriendDress(user_id: number) {
    return this.request<any>('_get_friend_dress', { user_id })
  }

  // ============================================================================
  // 群组扩展 (Group Ext)
  // ============================================================================

  /**
   * 设置群头像
   * @param group_id - 群号
   * @param file - 图片路径 / 链接
   */
  setGroupPortrait(group_id: number, file: string) {
    return this.request<void>('set_group_portrait', { group_id, file })
  }

  /**
   * 设置群备注
   * @param group_id - 群号
   * @param remark - 备注内容
   */
  setGroupRemark(group_id: number, remark: string) {
    return this.request<void>('set_group_remark', { group_id, remark })
  }

  /**
   * 设置加群选项
   * @param group_id - 群号
   * @param add_type - 加群方式
   * @param group_question - 加群问题
   * @param group_answer - 加群答案
   */
  setGroupAddOption(group_id: number, add_type: number, group_question?: string, group_answer?: string) {
    return this.request<void>('set_group_add_option', { group_id, add_type, group_question, group_answer })
  }

  /**
   * 设置群机器人加群选项
   * @param group_id - 群号
   * @param robot_member_switch - 机器人成员开关
   * @param robot_member_examine - 机器人成员审核
   */
  setGroupRobotAddOption(group_id: number, robot_member_switch = 0, robot_member_examine = 0) {
    return this.request<void>('set_group_robot_add_option', { group_id, robot_member_switch, robot_member_examine })
  }

  /**
   * 设置群被搜索方式
   * @param group_id - 群号
   * @param no_finger_open - 关键词搜索开关
   * @param no_code_finger_open - 群号搜索开关
   */
  setGroupSearch(group_id: number, no_finger_open = 0, no_code_finger_open = 0) {
    return this.request<void>('set_group_search', { group_id, no_finger_open, no_code_finger_open })
  }

  /**
   * 设置群成员邀请策略
   * @param group_id - 群号
   * @param policy - 成员邀请策略
   */
  setGroupMemberInvitePolicy(group_id: number, policy: string) {
    return this.request<void>('set_group_member_invite_policy', { group_id, policy })
  }

  /**
   * 设置群成员功能权限（仅群主可改）
   * @param group_id - 群号
   * @param allow_member_upload_album - 允许成员上传群相册
   * @param allow_member_temporary_session - 允许成员发起临时会话
   * @param allow_member_create_group - 允许成员发起新的群聊
   */
  setGroupMemberPermissions(group_id: number, allow_member_upload_album = false, allow_member_temporary_session = false, allow_member_create_group = false) {
    return this.request<void>('set_group_member_permissions', { group_id, allow_member_upload_album, allow_member_temporary_session, allow_member_create_group })
  }

  /**
   * 设置新成员是否可查看历史消息
   * @param group_id - 群号
   * @param visible - 是否可见
   */
  setGroupNewMemberHistoryVisibility(group_id: number, visible = true) {
    return this.request<void>('set_group_new_member_history_visibility', { group_id, visible })
  }

  /**
   * 批量踢出群成员
   * @param group_id - 群号
   * @param user_ids - 成员 QQ 列表
   * @param reject_add_request - 是否拒绝再次申请 (NapCat/SnowLuma)
   */
  setGroupKickMembers(group_id: number, user_ids: number[], reject_add_request = false) {
    if (this.backend === 'LLOneBot') {
      return this.request<void>('batch_delete_group_member', { group_id, user_ids })
    }
    return this.request<void>('set_group_kick_members', { group_id, user_id: user_ids, reject_add_request })
  }

  /**
   * 获取群详细信息 (NapCat/SnowLuma)
   * @param group_id - 群号
   */
  getGroupInfoEx(group_id: number) {
    return this.request<any>('get_group_info_ex', { group_id })
  }

  /**
   * 获取群详细信息
   * @param group_id - 群号
   * @param no_cache - 是否不使用缓存
   */
  getGroupDetailInfo(group_id: number, no_cache = false) {
    return this.request<any>('get_group_detail_info', { group_id, no_cache })
  }

  /**
   * 获取被忽略的入群请求
   * @param group_id - 群号 (LLOneBot)
   */
  getGroupIgnoreAddRequest(group_id?: number) {
    if (this.backend === 'LLOneBot') {
      return this.request<any[]>('get_group_ignore_add_request', { group_id })
    }
    return this.request<any[]>('get_group_ignored_notifies', { group_id })
  }

  /**
   * 获取被过滤的入群请求
   * @param group_id - 群号 (可选)
   */
  getGroupIgnoredNotifies(group_id?: number) {
    return this.request<any>('get_group_ignored_notifies', { group_id })
  }

  /**
   * 获取群禁言列表
   * @param group_id - 群号
   */
  getGroupShutList(group_id: number) {
    return this.request<any[]>('get_group_shut_list', { group_id })
  }

  /**
   * 获取群今日打卡列表
   * @param group_id - 群号
   */
  getGroupSignedList(group_id: number) {
    return this.request<any[]>('get_group_signed_list', { group_id })
  }

  /**
   * 群打卡
   * @param group_id - 群号
   */
  sendGroupSign(group_id: string | number) {
    return this.request<void>('send_group_sign', { group_id })
  }

  /**
   * 群签到
   * @param group_id - 群号
   */
  setGroupSign(group_id: number) {
    return this.request<void>('set_group_sign', { group_id })
  }

  /**
   * 获取群 @全体成员 剩余次数
   * @param group_id - 群号
   */
  getGroupAtAllRemain(group_id: number) {
    return this.request<{ can_at_all: boolean; remain_at_all_count_for_uin: number }>('get_group_at_all_remain', { group_id })
  }

  /**
   * 获取群系统消息
   * @param group_id - 群号 (可选)
   * @param only_pending - 仅未处理
   * @param count - 每个收件箱最多读取的记录数
   */
  getGroupSystemMsg(group_id?: number, only_pending = false, count = 20) {
    return this.request<{ invited_requests: T.GroupSystemRequest[]; join_requests: T.GroupSystemRequest[] }>('get_group_system_msg', { group_id, only_pending, count })
  }

  /**
   * 设置群消息接收方式 (LLOneBot)
   * @param group_id - 群号
   * @param mask - 1:接收并提醒 2:收进群助手 3:屏蔽 4:接收不提醒
   */
  setGroupMsgMask(group_id: number, mask: 1 | 2 | 3 | 4) {
    return this.request<void>('set_group_msg_mask', { group_id, mask })
  }

  /**
   * 获取群分享链接 (NapCat)
   * @param group_id - 群号
   * @param need_short_url - 是否返回短链
   */
  getGroupShareLink(group_id: number | string, need_short_url = false) {
    return this.request<{ url: string }>('get_group_share_link', { group_id, need_short_url })
  }

  /**
   * 获取群管理设置的当前值 (SnowLuma)
   * @param group_id - 群号
   */
  getGroupAdminSettings(group_id: number) {
    return this.request<any>('get_group_admin_settings', { group_id })
  }

  /**
   * 读取某个群分类下的资料标签 (SnowLuma)
   * @param group_class - 群分类
   */
  getGroupTags(group_class: number) {
    return this.request<any[]>('get_group_tags', { group_class })
  }

  /**
   * 向某个群分类添加资料标签 (SnowLuma)
   * @param group_class - 群分类
   * @param name - 标签名
   */
  addGroupTag(group_class: number, name: string) {
    return this.request<void>('add_group_tag', { group_class, name })
  }

  /**
   * 从某个群分类移除资料标签 (SnowLuma)
   * @param group_class - 群分类
   * @param name - 标签名
   */
  deleteGroupTag(group_class: number, name: string) {
    return this.request<void>('delete_group_tag', { group_class, name })
  }

  /**
   * 匿名开关 (SnowLuma)
   */
  setGroupAnonymous() {
    return this.request<void>('set_group_anonymous')
  }

  /**
   * 匿名禁言 (SnowLuma)
   */
  setGroupAnonymousBan() {
    return this.request<void>('set_group_anonymous_ban')
  }

  /**
   * 设置群待办
   * @param group_id - 群号
   * @param message_id - 消息 ID
   * @param message_seq - 消息 Seq (可选)
   */
  setGroupTodo(group_id: number, message_id: number, message_seq?: string) {
    return this.request<void>('set_group_todo', { group_id, message_id, message_seq })
  }

  /**
   * 完成群待办
   * @param group_id - 群号
   * @param message_id - 消息 ID
   * @param message_seq - 消息 Seq (可选)
   */
  completeGroupTodo(group_id: number, message_id: number, message_seq?: string) {
    return this.request<void>('complete_group_todo', { group_id, message_id, message_seq })
  }

  /**
   * 取消群待办
   * @param group_id - 群号
   * @param message_id - 消息 ID
   * @param message_seq - 消息 Seq (可选)
   */
  cancelGroupTodo(group_id: number, message_id: number, message_seq?: string) {
    return this.request<void>('cancel_group_todo', { group_id, message_id, message_seq })
  }

  /**
   * 获取群待办列表 (SnowLuma)
   * @param group_id - 群号
   */
  getGroupTodoList(group_id: number) {
    return this.request<any[]>('get_group_todo_list', { group_id })
  }

  // ============================================================================
  // 群公告与精华 (Notice & Essence)
  // ============================================================================

  /**
   * 获取群公告
   * @param group_id - 群号
   */
  getGroupNotice(group_id: number) {
    return this.request<any[]>('_get_group_notice', { group_id })
  }

  /**
   * 发送群公告
   * @param group_id - 群号
   * @param content - 公告正文
   * @param image - 公告图片 (可选)
   */
  sendGroupNotice(group_id: number, content: string, image?: string) {
    return this.request<void>('_send_group_notice', { group_id, content, image })
  }

  /**
   * 删除群公告
   * @param group_id - 群号
   * @param notice_id - 公告 ID (SnowLuma/NapCat 亦可用 fid)
   */
  delGroupNotice(group_id: number, notice_id: string) {
    if (this.backend === 'LLOneBot') {
      return this.request<void>('_delete_group_notice', { group_id, notice_id })
    }
    return this.request<void>('_del_group_notice', { group_id, notice_id })
  }

  /**
   * 设置精华消息
   * @param message_id - 消息 ID
   */
  setEssenceMsg(message_id: number) {
    return this.request<void>('set_essence_msg', { message_id })
  }

  /**
   * 移出精华消息
   * @param message_id - 消息 ID
   */
  deleteEssenceMsg(message_id: number) {
    return this.request<void>('delete_essence_msg', { message_id })
  }

  /**
   * 获取精华消息列表
   * @param group_id - 群号
   */
  getEssenceMsgList(group_id: number) {
    return this.request<any[]>('get_essence_msg_list', { group_id })
  }

  // ============================================================================
  // 群相册 (Group Album)
  // ============================================================================

  /**
   * 获取群相册列表
   * @param group_id - 群号
   */
  getGroupAlbumList(group_id: number) {
    return this.request<T.GroupAlbum[]>('get_group_album_list', { group_id })
  }

  /**
   * 获取群相册列表 (NapCat/SnowLuma)
   * @param group_id - 群号
   */
  getQunAlbumList(group_id: number) {
    return this.request<any[]>('get_qun_album_list', { group_id })
  }

  /**
   * 获取群相册媒体列表
   * @param group_id - 群号
   * @param album_id - 相册 ID
   * @param attach_info - [可选] 分页定位
   */
  getGroupAlbumMediaList(group_id: number, album_id: string, attach_info?: string) {
    return this.request<any>('get_group_album_media_list', { group_id, album_id, attach_info })
  }

  /**
   * 创建群相册 (LLOneBot)
   * @param group_id - 群号
   * @param name - 相册名
   * @param desc - 描述
   */
  createGroupAlbum(group_id: number, name: string, desc?: string) {
    return this.request<{ album_id: string }>('create_group_album', { group_id, name, desc })
  }

  /**
   * 删除群相册 (LLOneBot)
   * @param group_id - 群号
   * @param album_id - 相册 ID
   */
  deleteGroupAlbum(group_id: number, album_id: string) {
    return this.request<void>('delete_group_album', { group_id, album_id })
  }

  /**
   * 上传群相册 (LLOneBot)
   * @param group_id - 群号
   * @param album_id - 相册 ID
   * @param files - 文件路径列表
   */
  uploadGroupAlbum(group_id: number, album_id: string, files: string[]) {
    return this.request<{ success_count: number; fail_count: number }>('upload_group_album', { group_id, album_id, files })
  }

  /**
   * 上传图片到群相册
   * @param group_id - 群号
   * @param album_id - 相册 ID
   * @param file - 图片路径 / URL / Base64
   * @param album_name - 相册名称
   */
  uploadImageToQunAlbum(group_id: number, album_id: string, file: string, album_name?: string) {
    return this.request<void>('upload_image_to_qun_album', { group_id, album_id, album_name, file })
  }

  /**
   * 上传多张图片到群相册 (NapCat)
   * @param group_id - 群号
   * @param album_id - 相册 ID
   * @param files - 图片路径 / URL / Base64 数组
   * @param album_name - 相册名称
   */
  uploadImagesToQunAlbum(group_id: number | string, album_id: string, files: string[], album_name?: string) {
    return this.request<void>('upload_images_to_qun_album', { group_id, album_id, album_name, files })
  }

  /**
   * 上传视频到群相册
   * @param group_id - 群号
   * @param album_id - 相册 ID
   * @param file - 视频文件
   * @param album_name - 相册名称
   */
  uploadVideoToQunAlbum(group_id: number, album_id: string, file: string, album_name?: string) {
    return this.request<void>('upload_video_to_qun_album', { group_id, album_id, album_name, file })
  }

  /**
   * 删除群相册照片
   * @param group_id - 群号
   * @param album_id - 相册 ID
   * @param lloc - 照片标识
   */
  delGroupAlbumMedia(group_id: number | string, album_id: string, lloc: string) {
    return this.request<void>('del_group_album_media', { group_id, album_id, lloc })
  }

  /**
   * 点赞群相册媒体
   * @param group_id - 群号
   * @param album_id - 相册 ID
   * @param batch_id - 上传批次标识
   * @param lloc - 照片 LLOC 标识
   * @param set - 是否点赞
   */
  setGroupAlbumLike(group_id: number | string, album_id: string, batch_id: string, lloc: string, set = true) {
    return this.request<void>('set_group_album_media_like', { group_id, album_id, batch_id, lloc, set })
  }

  /**
   * 取消点赞群相册媒体
   * @param group_id - 群号
   * @param album_id - 相册 ID
   * @param batch_id - 上传批次标识
   * @param lloc - 照片 LLOC 标识
   */
  cancelGroupAlbumLike(group_id: number | string, album_id: string, batch_id: string, lloc?: string) {
    return this.request<void>('cancel_group_album_media_like', { group_id, album_id, batch_id, lloc })
  }

  /**
   * 评论群相册
   * @param group_id - 群号
   * @param album_id - 相册 ID
   * @param lloc - 照片 LLOC
   * @param content - 评论内容
   */
  doGroupAlbumComment(group_id: number, album_id: string, lloc: string, content: string) {
    return this.request<void>('do_group_album_comment', { group_id, album_id, lloc, content })
  }

  // ============================================================================
  // 群文件 (Group File)
  // ============================================================================

  /**
   * 获取群文件资源链接
   * @param group_id - 群号
   * @param file_id - 文件 ID
   * @param busid - 业务 ID
   */
  getGroupFileUrl(group_id: number, file_id: string, busid?: number) {
    return this.request<{ url: string }>('get_group_file_url', { group_id, file_id, busid })
  }

  /**
   * 获取私聊文件资源链接
   * @param user_id - 用户 ID
   * @param file_id - 文件 ID
   * @param file_hash - 文件哈希（可选）
   */
  getPrivateFileUrl(user_id: number, file_id: string, file_hash?: string) {
    return this.request<{ url: string }>('get_private_file_url', { user_id, file_id, ...(file_hash ? { file_hash } : {}) })
  }

  /**
   * 上传群文件
   * @param group_id - 群号
   * @param file - 资源路径 / URL / Base64
   * @param name - 文件名
   * @param folder - 父目录 ID
   */
  uploadGroupFile(group_id: number, file: string, name: string, folder?: string) {
    return this.request<void>('upload_group_file', { group_id, file, name, ...(folder ? { folder, folder_id: folder } : {}) })
  }

  /**
   * 上传私聊文件
   * @param user_id - 用户 QQ
   * @param file - 资源路径 / URL / Base64
   * @param name - 文件名
   */
  uploadPrivateFile(user_id: number, file: string, name: string) {
    return this.request<void>('upload_private_file', { user_id, file, name })
  }

  /**
   * 上传文件
   * @param type - 消息类型
   * @param id - 对方 QQ 或群号
   * @param file - 文件路径 / URL / Base64
   * @param name - 文件名
   * @param folder - 文件夹 ID（群文件/可选）
   */
  uploadFile(type: 'private' | 'group', id: number, file: string, name: string, folder?: string) {
    return type === 'private' ? this.uploadPrivateFile(id, file, name) : this.uploadGroupFile(id, file, name, folder)
  }

  /**
   * 获取群文件系统信息
   * @param group_id - 群号
   */
  getGroupFileSystemInfo(group_id: number) {
    return this.request<{ file_count: number; limit_count: number; used_space: number; total_space: number }>('get_group_file_system_info', { group_id })
  }

  /**
   * 获取群根目录文件
   * @param group_id - 群号
   * @param file_count - 获取数量
   */
  getGroupRootFiles(group_id: number, file_count = 50) {
    return this.request<{ files: T.FileInfo[]; folders: T.FolderInfo[] }>('get_group_root_files', { group_id, file_count })
  }

  /**
   * 获取群子目录文件
   * @param group_id - 群号
   * @param folder_id - 文件夹 ID
   * @param file_count - 获取数量
   */
  getGroupFilesByFolder(group_id: number, folder_id: string, file_count = 50) {
    return this.request<{ files: T.FileInfo[]; folders: T.FolderInfo[] }>('get_group_files_by_folder', { group_id, folder_id, folder: folder_id, file_count })
  }

  /**
   * 删除群文件
   * @param group_id - 群号
   * @param file_id - 文件 ID
   * @param busid - 业务 ID
   */
  deleteGroupFile(group_id: number, file_id: string, busid?: number) {
    return this.request<void>('delete_group_file', { group_id, file_id, busid })
  }

  /**
   * 创建群文件夹
   * @param group_id - 群号
   * @param name - 文件夹名
   * @param parent_id - 父文件夹 ID
   */
  createGroupFileFolder(group_id: number, name: string, parent_id = '/') {
    return this.request<{ folder_id: string }>('create_group_file_folder', { group_id, name, folder_name: name, parent_id })
  }

  /**
   * 删除群文件夹
   * @param group_id - 群号
   * @param folder_id - 文件夹 ID
   */
  deleteGroupFolder(group_id: number, folder_id: string) {
    return this.request<void>('delete_group_folder', { group_id, folder_id, folder: folder_id })
  }

  /**
   * 删除群文件夹 (SnowLuma)
   * @param group_id - 群号
   * @param folder_id - 文件夹 ID
   */
  deleteGroupFileFolder(group_id: number, folder_id: string) {
    return this.request<void>('delete_group_file_folder', { group_id, folder_id })
  }

  /**
   * 移动群文件
   * @param group_id - 群号
   * @param file_id - 文件 ID
   * @param parent_directory - 当前父目录
   * @param target_directory - 目标父目录
   */
  moveGroupFile(group_id: number, file_id: string, parent_directory: string, target_directory: string) {
    return this.request<void>('move_group_file', {
      group_id,
      file_id,
      parent_directory,
      target_directory,
      current_parent_directory: parent_directory,
      target_parent_directory: target_directory
    })
  }

  /**
   * 重命名群文件
   * @param group_id - 群号
   * @param file_id - 文件 ID
   * @param new_name - 新名称
   * @param current_parent_directory - 文件所在目录 ID
   */
  renameGroupFile(group_id: number, file_id: string, new_name: string, current_parent_directory = '/') {
    return this.request<void>('rename_group_file', { group_id, file_id, new_name, current_parent_directory })
  }

  /**
   * 重命名群文件夹
   * @param group_id - 群号
   * @param folder_id - 文件夹 ID
   * @param new_folder_name - 新名称
   */
  renameGroupFileFolder(group_id: number, folder_id: string, new_folder_name: string) {
    return this.request<void>('rename_group_file_folder', { group_id, folder_id, new_folder_name, name: new_folder_name })
  }

  /**
   * 转存群文件
   * @param group_id - 群号
   * @param file_id - 文件 ID
   */
  transGroupFile(group_id: number, file_id: string) {
    return this.request<void>('trans_group_file', { group_id, file_id })
  }

  /**
   * 群文件转永久 (LLOneBot)
   * @param group_id - 群号
   * @param file_id - 文件 ID
   */
  setGroupFileForever(group_id: number, file_id: string) {
    return this.request<void>('set_group_file_forever', { group_id, file_id })
  }

  /**
   * 获取文件详情
   * @param file_id - 文件 ID 或文件名
   */
  getFile(file_id: string) {
    return this.request<{ file: string; url: string; file_size: string; file_name: string }>('get_file', this.backend === 'LLOneBot' ? { file: file_id } : { file_id })
  }

  // ============================================================================
  // 闪传文件 (Flash File)
  // ============================================================================

  /**
   * 创建闪传任务
   * @param files - 路径、{ file, name }，或它们的数组
   * @param name - 任务名称
   * @param validitySeconds - 文件集有效期（秒）
   */
  createFlashTask(files: string | string[], name?: string, validitySeconds = 1209600) {
    return this.request<{ fileset_id: string }>('create_flash_task', { files, name, validitySeconds })
  }

  /**
   * 获取文件集信息
   * @param fileset_id - 文件集 ID
   */
  getFilesetInfo(fileset_id: string) {
    return this.request<any>('get_fileset_info', { fileset_id })
  }

  /**
   * 从 QQ 闪传分享码或官方分享链接获取 fileset_id
   * @param share_code - 分享码或官方分享链接
   */
  getFilesetId(share_code: string) {
    return this.request<{ fileset_id: string }>('get_fileset_id', { share_code })
  }

  /**
   * 获取闪传文件列表
   * @param fileset_id - 文件集 ID
   */
  getFlashFileList(fileset_id: string) {
    return this.request<T.FlashFileInfo>('get_flash_file_list', { fileset_id })
  }

  /**
   * 获取闪传文件链接
   * @param fileset_id - 文件集 ID
   * @param file_name - 文件名
   * @param file_index - 文件索引
   */
  getFlashFileUrl(fileset_id: string, file_name?: string, file_index?: number) {
    return this.request<{ url: string }>('get_flash_file_url', { fileset_id, file_name, file_index })
  }

  /**
   * 获取文件分享链接
   * @param fileset_id - 文件集 ID
   */
  getShareLink(fileset_id: string) {
    return this.request<{ url: string }>('get_share_link', { fileset_id })
  }

  /**
   * 解析闪传文件下载直链
   * @param fileset_id - 文件集 ID
   * @param file_name - 文件名
   * @param file_index - 文件索引
   */
  downloadFileset(fileset_id: string, file_name?: string, file_index?: number) {
    return this.request<{ url: string; file_name: string; file_size: number }>('download_fileset', { fileset_id, file_name, file_index })
  }

  /**
   * 删除闪传文件 (SnowLuma)
   * @param fileset_id - 文件集 ID
   */
  deleteFlashFile(fileset_id: string) {
    return this.request<void>('delete_flash_file', { fileset_id })
  }

  /**
   * 重命名闪传文件 (SnowLuma)
   * @param fileset_id - 文件集 ID
   * @param new_name - 新名称
   */
  renameFlashFile(fileset_id: string, new_name: string) {
    return this.request<void>('rename_flash_file', { fileset_id, new_name })
  }

  /**
   * 列出当前账号的所有闪传文件集 (SnowLuma)
   */
  listFilesets() {
    return this.request<any[]>('list_filesets')
  }

  /**
   * 上传闪传文件 (LLOneBot)
   * @param files - 文件路径列表
   * @param title - 标题
   */
  uploadFlashFile(files: string[], title?: string) {
    return this.request<{ file_set_id: string; share_link: string }>('upload_flash_file', { files, title })
  }

  /**
   * 下载闪传文件 (LLOneBot)
   * @param share_link - 分享链接 (与 file_set_id 二选一)
   * @param file_set_id - 文件集 ID
   */
  downloadFlashFile(share_link?: string, file_set_id?: string) {
    return this.request<void>('download_flash_file', { share_link, file_set_id })
  }

  /**
   * 获取闪传文件详情 (LLOneBot)
   * @param share_link - 分享链接 (与 file_set_id 二选一)
   * @param file_set_id - 文件集 ID
   */
  getFlashFileInfo(share_link?: string, file_set_id?: string) {
    return this.request<T.FlashFileInfo>('get_flash_file_info', { share_link, file_set_id })
  }

  /**
   * 重新分享闪传文件 (LLOneBot)
   * @param file_set_id - 文件集 ID
   */
  reshareFlashFile(file_set_id: string) {
    return this.request<{ share_link: string }>('reshare_flash_file', { file_set_id })
  }

  // ============================================================================
  // 流式接口 (Stream)
  // ============================================================================

  /**
   * 清理流式传输临时文件
   */
  cleanStreamTempFile() {
    return this.request<{ message: string; removed: number }>('clean_stream_temp_file')
  }

  /**
   * 流式上传文件
   * @description 用于分片上传大文件
   * @param stream_id - 流 ID
   * @param chunk_data - 分块数据 (Base64)
   * @param chunk_index - 分块索引（从 0 开始）
   * @param total_chunks - 总分块数
   * @param file_size - 文件总大小
   * @param filename - 文件名
   * @param is_complete - 是否为最后一个分块
   */
  uploadFileStream(stream_id?: string, chunk_data?: string, chunk_index?: number, total_chunks?: number, file_size?: number, filename?: string, is_complete?: boolean) {
    return this.request<{ stream_id: string; file_path?: string; status?: string }>('upload_file_stream', {
      stream_id,
      chunk_data,
      chunk_index,
      total_chunks,
      file_size,
      filename,
      is_complete
    })
  }

  /**
   * 流式下载文件
   * @param file - 文件路径 / URL
   * @param chunk_size - 分片大小
   */
  downloadFileStream(file: string, chunk_size = 65536) {
    return this.request<any>('download_file_stream', { file, chunk_size })
  }

  /**
   * 流式下载语音
   * @param file - 文件路径
   * @param out_format - 输出格式
   * @param chunk_size - 分片大小
   */
  downloadFileRecordStream(file: string, out_format = 'mp3', chunk_size = 65536) {
    return this.request<any>('download_file_record_stream', { file, out_format, chunk_size })
  }

  /**
   * 流式下载图片
   * @param file - 文件路径
   * @param chunk_size - 分片大小
   */
  downloadFileImageStream(file: string, chunk_size = 65536) {
    return this.request<any>('download_file_image_stream', { file, chunk_size })
  }

  /**
   * 测试下载流
   * @param error - 是否触发测试错误
   */
  testDownloadStream(error = false) {
    return this.request<any>('test_download_stream', { error })
  }

  // ============================================================================
  // 系统表情 (Sys Face)
  // ============================================================================

  /**
   * 获取 QQ 系统表情目录 (SnowLuma)
   * @param refresh - 是否强制从 QQ 刷新目录
   */
  fetchSysFaces(refresh = false) {
    return this.request<any>('fetch_sys_faces', { refresh })
  }

  /**
   * 按编号查询 QQ 系统表情 (SnowLuma)
   * @param face_id - QQ 系统表情编号
   * @param refresh - 是否强制刷新
   */
  fetchFaceEntity(face_id: number, refresh = false) {
    return this.request<any>('fetch_face_entity', { face_id, refresh })
  }

  /**
   * 判断 QQ 系统表情是否使用超级表情格式 (SnowLuma)
   * @param face_id - QQ 系统表情编号
   * @param refresh - 是否强制刷新
   */
  fetchSuperFaceId(face_id: number, refresh = false) {
    return this.request<any>('fetch_super_face_id', { face_id, refresh })
  }

  /**
   * 搜索 QQ 系统表情 (SnowLuma)
   * @param query - 编号、名称、别名或分组名
   */
  searchSysFaces(query: string) {
    return this.request<any[]>('search_sys_faces', { query })
  }

  // ============================================================================
  // QQ 空间 (Qzone)
  // ============================================================================

  /**
   * 发表说说
   * @param content - 说说正文
   * @param images - 图片数组 (可选)
   * @param ugc_right - 查看权限
   * @param target_uins - 权限作用 QQ 号数组
   */
  sendQzoneMsg(content: string, images?: string[], ugc_right?: number, target_uins?: number[]) {
    return this.request<{ tid: string }>('send_qzone_msg', { content, images, ugc_right, target_uins })
  }

  /**
   * 删除一条说说
   * @param tid - 说说 tid
   */
  deleteQzoneMsg(tid: string) {
    return this.request<void>('delete_qzone_msg', { tid })
  }

  /**
   * 获取 QQ 空间好友动态 (SnowLuma)
   * @param page_num - 页码
   * @param count - 本页数量
   */
  getQzoneFeeds(page_num = 1, count = 20) {
    return this.request<any>('get_qzone_feeds', { page_num, count })
  }

  /**
   * 获取 QQ 空间说说列表 (SnowLuma)
   * @param target_uin - 目标 QQ 号
   * @param pos - 起始偏移
   * @param num - 本页数量
   */
  getQzoneMsgList(target_uin?: number, pos = 0, num = 20) {
    return this.request<any>('get_qzone_msg_list', { target_uin, pos, num })
  }

  /**
   * 给一条说说点赞 (SnowLuma)
   * @param tid - 说说 tid
   * @param target_uin - 说说所属 QQ 号
   * @param abstime - 说说发表时间（unix 秒）
   */
  likeQzone(tid: string, target_uin?: number, abstime?: number) {
    return this.request<void>('like_qzone', { tid, target_uin, abstime })
  }

  /**
   * 取消对一条说说的点赞 (SnowLuma)
   * @param tid - 说说 tid
   * @param target_uin - 说说所属 QQ 号
   * @param abstime - 说说发表时间（unix 秒）
   */
  unlikeQzone(tid: string, target_uin?: number, abstime?: number) {
    return this.request<void>('unlike_qzone', { tid, target_uin, abstime })
  }

  /**
   * 评论一条说说
   * @param tid - 说说 tid
   * @param content - 评论内容
   * @param target_uin - 说说所属 QQ 号
   * @param images - 图片数组 (可选)
   */
  commentQzone(tid: string, content: string, target_uin?: number, images?: string[]) {
    return this.request<void>('comment_qzone', { tid, content, target_uin, images })
  }

  /**
   * 修改一条已发说说的查看权限 (SnowLuma)
   * @param tid - 说说 tid
   * @param ugc_right - 查看权限
   * @param target_uins - 权限作用 QQ 号数组
   */
  setQzoneMsgRight(tid: string, ugc_right: number, target_uins?: number[]) {
    return this.request<any>('set_qzone_msg_right', { tid, ugc_right, target_uins })
  }

  /**
   * 拉黑或解除拉黑某人 (SnowLuma)
   * @param user_id - 目标 QQ 号
   * @param enable - true 拉黑，false 解除拉黑
   */
  setQzoneBan(user_id: number, enable = true) {
    return this.request<void>('set_qzone_ban', { user_id, enable })
  }

  // ============================================================================
  // AI 语音 (AI Record)
  // ============================================================================

  /**
   * 获取 AI 语音角色
   * @param group_id - 群号
   * @param chat_type - 聊天类型
   */
  getAiCharacters(group_id?: number, chat_type = 1) {
    return this.request<{ character_id: string; character_name: string; preview_url: string }[]>('get_ai_characters', { group_id, chat_type })
  }

  /**
   * 生成 AI 语音
   * @param group_id - 群号
   * @param character - 角色 ID
   * @param text - 文本内容
   * @param chat_type - 聊天类型
   */
  getAiRecord(group_id: number, character: string, text: string, chat_type = 1) {
    return this.request<string>('get_ai_record', { group_id, character, text, chat_type })
  }

  /**
   * 发送群 AI 语音
   * @param group_id - 群号
   * @param character - 角色 ID
   * @param text - 文本内容
   */
  sendGroupAiRecord(group_id: number, character: string, text: string) {
    return this.request<{ message_id: string }>('send_group_ai_record', { group_id, character, text })
  }

  // ============================================================================
  // 频道 (Guild, NapCat)
  // ============================================================================

  /**
   * 获取频道列表 (NapCat)
   */
  getGuildList() {
    return this.request<any[]>('get_guild_list')
  }

  /**
   * 获取频道个人信息 (NapCat)
   */
  getGuildServiceProfile() {
    return this.request<any>('get_guild_service_profile')
  }

  // ============================================================================
  // 收藏 (Collection)
  // ============================================================================

  /**
   * 创建收藏
   * @param rawData - 原始内容
   * @param brief - 摘要
   */
  createCollection(rawData: string, brief: string) {
    return this.request<void>('create_collection', { rawData, brief })
  }

  /**
   * 获取收藏列表
   * @param category - 收藏分类 ID；0 表示全部分类
   * @param count - 最多返回数量
   */
  getCollectionList(category = 0, count = 10) {
    return this.request<T.CollectionList>('get_collection_list', { category, count })
  }

  // ============================================================================
  // Ark 卡片 (Ark)
  // ============================================================================

  /**
   * 分享用户 Ark 卡片 (NapCat)
   * @param user_id - QQ 号
   * @param phone_number - 手机号
   */
  arkSharePeer(user_id: number, phone_number?: string) {
    return this.request<any>('ArkSharePeer', { user_id, phone_number })
  }

  /**
   * 分享群 Ark 卡片 (NapCat)
   * @param group_id - 群号
   */
  arkShareGroup(group_id: number) {
    return this.request<any>('ArkShareGroup', { group_id })
  }

  /**
   * 分享用户 / 群 Ark 卡片
   * @param type - 目标类型
   * @param target_id - 好友 QQ 或群号
   * @param phone_number - 手机号
   */
  sendArkShare(type: 'private' | 'group', target_id: number, phone_number?: string) {
    if (type === 'private') return this.request<any>('send_ark_share', { user_id: target_id, phone_number })
    return this.request<any>('send_group_ark_share', { group_id: target_id })
  }

  /**
   * 分享群 Ark 卡片
   * @param group_id - 群号
   */
  sendGroupArkShare(group_id: number) {
    return this.request<any>('send_group_ark_share', { group_id })
  }

  /**
   * 分享用户 / 群 Ark 卡片 (SnowLuma)
   * @param type - 目标类型
   * @param target_id - 好友 QQ 或群号
   * @param phone_number - 手机号
   */
  sharePeer(type: 'private' | 'group', target_id: number, phone_number?: string) {
    return this.request<any>('share_peer', type === 'private' ? { user_id: target_id, phone_number } : { group_id: target_id })
  }

  /**
   * 分享群 Ark 卡片 (SnowLuma)
   * @param group_id - 群号
   */
  shareGroupEx(group_id: number) {
    return this.request<any>('share_group_ex', { group_id })
  }

  /**
   * 发送图文 Ark 卡片 (SnowLuma)
   * @param type - 目标类型
   * @param target_id - 好友 QQ 或群号
   * @param title - 标题
   * @param desc - 描述
   * @param preview_url - 预览图
   * @param jump_url - 跳转链接
   */
  sendTuwenArk(type: 'private' | 'group', target_id: number, title: string, desc: string, preview_url: string, jump_url: string) {
    return this.request<any>('send_tuwen_ark', {
      title,
      desc,
      preview_url,
      jump_url,
      ...(type === 'private' ? { user_id: target_id } : { group_id: target_id })
    })
  }

  /**
   * 获取小程序卡片
   * @param type - 小程序类型
   * @param title - 标题
   * @param desc - 描述
   * @param picUrl - 封面图片链接
   * @param jumpUrl - 跳转链接
   */
  getMiniAppArk(type: string, title: string, desc: string, picUrl: string, jumpUrl: string) {
    return this.request<{ appName: string; appView: string; ver: string; desc: string; prompt: string; metaData: Record<string, any>; config: Record<string, any> }>('get_mini_app_ark', { type, title, desc, picUrl, pic_url: picUrl, jumpUrl, jump_url: jumpUrl })
  }

  // ============================================================================
  // 其他 API (Other)
  // ============================================================================

  /**
   * 图片 OCR
   * @param image - 图片 ID / URL / Base64
   */
  ocrImage(image: string) {
    return this.request<T.OcrResult>('ocr_image', { image })
  }

  /**
   * 图片 OCR 识别 (内部, NapCat)
   * @param image - 图片路径、URL 或 Base64
   */
  ocrImageInternal(image: string) {
    return this.request<T.OcrResult>('.ocr_image', { image })
  }

  /**
   * 对事件执行快速操作 (NapCat)
   * @param context - 事件上下文
   * @param operation - 操作内容
   */
  handleQuickOperation(context: any, operation: any) {
    return this.request<void>('.handle_quick_operation', { context, operation })
  }

  /**
   * 分词 (SnowLuma)
   */
  getWordSlices() {
    return this.request<string[]>('.get_word_slices')
  }

  /**
   * 英文翻译为中文
   * @param words - 单词列表
   */
  translateEn2zh(words: string[]) {
    return this.request<string[]>('translate_en2zh', { words })
  }

  /**
   * 下载文件到本地
   * @param url - 下载 URL
   * @param headers - 请求头
   * @param base64 - Base64 内容
   * @param name - 文件名
   */
  downloadFile(url?: string, headers?: string | string[], base64?: string, name?: string) {
    return this.request<{ file: string }>('download_file', { url, headers, base64, name })
  }

  /**
   * 检查链接安全性
   * @param url - 链接 URL
   */
  checkUrlSafely(url: string) {
    return this.request<{ level: number }>('check_url_safely', { url })
  }

  /**
   * 点击内联键盘按钮
   * @param group_id - 群号
   * @param bot_appid - 机器人 AppID
   * @param button_id - 按钮 ID
   * @param callback_data - 回调数据
   * @param msg_seq - 消息序列号
   */
  clickInlineKeyboardButton(group_id: number, bot_appid: number | string, button_id: string, callback_data: string, msg_seq?: number) {
    return this.request<void>('click_inline_keyboard_button', { group_id, bot_appid, msg_seq, button_id, callback_data })
  }

  /**
   * 发送原始数据包
   * @param params - 组包参数 (NapCat/SnowLuma: cmd + data；LLOneBot: cmd + hex)
   */
  sendPacket(params: any) {
    if (this.backend === 'LLOneBot') return this.request<void>('send_pb', params)
    return this.request<void>('send_packet', params)
  }

  /**
   * 获取 packet 状态
   */
  ncGetPacketStatus() {
    return this.request<{ rkey: string; ttl: string; time: number }>('nc_get_packet_status')
  }

  /**
   * 退出机器人
   */
  botExit() {
    return this.request<void>('bot_exit')
  }

  /**
   * 扫描二维码 (LLOneBot)
   * @param file - 图片路径 / Base64
   */
  scanQrcode(file: string) {
    return this.request<{ text: string }>('scan_qrcode', { file })
  }

  /**
   * 获取推荐表情 (LLOneBot)
   * @param word - 关键词
   */
  getRecommendFace(word: string) {
    return this.request<{ url: string[] }>('get_recommend_face', { word })
  }

  /**
   * 请求数据库解密密钥 (SnowLuma)
   * @param db_path - 数据库路径
   */
  requestDecryptKey(db_path?: string) {
    return this.request<any>('request_decrypt_key', { db_path })
  }
}

export const bot = new ExtendedClient()
