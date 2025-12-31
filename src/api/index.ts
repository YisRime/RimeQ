import { socket } from './socket'
import { BaseClient } from './base'
import type * as T from '@/types'

/** 后端类型 */
export type BackendType = 'NapCat' | 'Lagrange' | 'LLOneBot'

/**
 * OneBot v11 扩展客户端
 * @description NapCat、Lagrange、LLOneBot 等后端的扩展 API
 */
export class ExtendedClient extends BaseClient {
  private backend: BackendType = 'NapCat'

  constructor() {
    super()
  }

  /**
   * 设置后端类型
   * @param type - 后端类型
   */
  setBackend(type: BackendType) {
    this.backend = type
  }

  // ============================================================================
  // 连接管理
  // ============================================================================

  /**
   * 连接到 WebSocket 服务
   * @param url - 服务地址
   * @param token - 访问令牌
   */
  async connect(url: string, token: string) {
    await socket.connect(url, token)
    try {
      const ver = await this.getVersionInfo()
      if (ver.app_name.includes('NapCat')) this.setBackend('NapCat')
      else if (ver.app_name.includes('Lagrange')) this.setBackend('Lagrange')
      else if (ver.app_name.includes('LLOneBot')) this.setBackend('LLOneBot')
    } catch { /* 忽略错误 */ }
  }

  /** 断开连接 */
  disconnect() {
    socket.disconnect()
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
    const params: any = { message_type, messages }
    if (message_type === 'group') params.group_id = target_id
    else params.user_id = target_id
    return this.request<{ message_id: number, forward_id: string }>('send_forward_msg', params)
  }

  /**
   * 发送合并转发 (群聊)
   * @param group_id - 群号
   * @param messages - 消息节点列表
   */
  sendGroupForwardMsg(group_id: number, messages: T.Segment[]) {
    return this.request<{ message_id: number, forward_id: string }>('send_group_forward_msg', { group_id, messages })
  }

  /**
   * 发送合并转发 (好友)
   * @param user_id - 好友 QQ
   * @param messages - 消息节点列表
   */
  sendPrivateForwardMsg(user_id: number, messages: T.Segment[]) {
    return this.request<{ message_id: number, forward_id: string }>('send_private_forward_msg', { user_id, messages })
  }

  /**
   * 获取群历史消息
   * @param group_id - 群号
   * @param message_seq - 起始消息序号，0 为最新
   * @param count - 获取数量
   */
  getGroupMsgHistory(group_id: number, message_seq?: number, count = 20, reverseOrder = false) {
    return this.request<{ messages: T.Message[] }>('get_group_msg_history', { group_id, message_seq, count, reverseOrder })
  }

  /**
   * 获取好友历史消息
   * @param user_id - 好友 QQ
   * @param message_seq - 起始消息序号
   * @param count - 获取数量
   */
  getFriendMsgHistory(user_id: number, message_seq?: number, count = 20, reverseOrder = false) {
    return this.request<{ messages: T.Message[] }>('get_friend_msg_history', { user_id, message_seq, count, reverseOrder })
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
   * @param group_id - 群号
   */
  markGroupMsgAsRead(group_id: number) {
    return this.request<void>('mark_group_msg_as_read', { group_id })
  }

  /**
   * 标记私聊消息已读
   * @param user_id - 对方 QQ
   */
  markPrivateMsgAsRead(user_id: number) {
    return this.request<void>('mark_private_msg_as_read', { user_id })
  }

  /**
   * 标记所有消息已读 (NapCat)
   */
  markAllAsRead() {
    return this.request<void>('_mark_all_as_read')
  }

  /**
   * 设置表情回应
   * @param group_id - 群号
   * @param message_id - 消息 ID
   * @param code - 表情代码/ID
   * @param is_add - 是否添加 (Lagrange/LLOneBot:is_add, NapCat:set)
   */
  setGroupReaction(group_id: number, message_id: number, code: string, is_add = true) {
    const params: Record<string, any> = { group_id, message_id, code }
    if (this.backend === 'NapCat') {
      params.set = is_add
    } else {
      params.is_add = is_add
    }
    return this.request<void>('set_group_reaction', params)
  }

  /**
   * 设置消息表情回应 (NapCat)
   * @param message_id - 消息 ID
   * @param emoji_id - 表情 ID
   * @param set - 是否添加
   */
  setMsgEmojiLike(message_id: number, emoji_id: string, set = true) {
    return this.request<void>('set_msg_emoji_like', { message_id, emoji_id, set })
  }

  /**
   * 取消表情回应 (LLOneBot)
   * @param message_id - 消息 ID
   * @param emoji_id - 表情 ID
   */
  unsetMsgEmojiLike(message_id: number, emoji_id: number) {
    return this.request<void>('unset_msg_emoji_like', { message_id, emoji_id })
  }

  /**
   * 获取消息表情回应列表 (NapCat)
   * @param message_id - 消息 ID
   * @param emojiId - 表情 ID
   * @param emojiType - 表情类型
   * @param count - 获取数量
   */
  fetchEmojiLike(message_id: number, emojiId: string, emojiType: string, count = 20) {
    return this.request<any>('fetch_emoji_like', { message_id, emojiId, emojiType, count })
  }

  /**
   * 加入群表情接龙 (Lagrange/LLOneBot)
   * @param group_id - 群号
   * @param message_id - 消息 ID
   * @param emoji_id - 表情 ID
   */
  joinGroupEmojiChain(group_id: number, message_id: number, emoji_id: number) {
    return this.request<void>('.join_group_emoji_chain', { group_id, message_id, emoji_id })
  }

  /**
   * 加入好友表情接龙 (Lagrange/LLOneBot)
   * @param user_id - 好友 QQ
   * @param message_id - 消息 ID
   * @param emoji_id - 表情 ID
   */
  joinFriendEmojiChain(user_id: number, message_id: number, emoji_id: number) {
    return this.request<void>('.join_friend_emoji_chain', { user_id, message_id, emoji_id })
  }

  /**
   * 转发单条好友消息
   * @param user_id - 目标 QQ
   * @param message_id - 消息 ID
   */
  forwardFriendSingleMsg(user_id: number, message_id: number) {
    return this.request<void>('forward_friend_single_msg', { user_id, message_id })
  }

  /**
   * 转发单条群消息
   * @param group_id - 目标群号
   * @param message_id - 消息 ID
   */
  forwardGroupSingleMsg(group_id: number, message_id: number) {
    return this.request<void>('forward_group_single_msg', { group_id, message_id })
  }

  /**
   * 语音转文字 (LLOneBot)
   * @param message_id - 消息 ID
   */
  voiceMsgToText(message_id: number) {
    return this.request<{ text: string }>('voice_msg_to_text', { message_id })
  }

  // ============================================================================
  // 好友扩展 (Friend Ext)
  // ============================================================================

  /**
   * 获取单向好友列表 (NapCat)
   */
  getUnidirectionalFriendList() {
    return this.request<any[]>('get_unidirectional_friend_list')
  }

  /**
   * 删除好友
   * @param user_id - 好友 QQ
   * @param block - 是否拉黑 (Lagrange/NapCat)
   */
  deleteFriend(user_id: number, block = false, temp_both_del?: boolean) {
    const params: Record<string, any> = { user_id }
    if (this.backend === 'NapCat') {
      // NapCat (支持双向删除)
      params.temp_block = block
      params.temp_both_del = temp_both_del
    } else {
      // Lagrange
      params.block = block
    }
    return this.request<void>('delete_friend', params)
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
   * 获取分类的好友列表 (NapCat/LLOneBot)
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
   * 获取被过滤的好友请求 (NapCat/LLOneBot)
   */
  getDoubtFriendsAddRequest() {
    return this.request<any[]>('get_doubt_friends_add_request')
  }

  /**
   * 处理被过滤的好友请求 (NapCat/LLOneBot)
   * @param flag - 请求 Flag
   * @param approve - 是否同意
   */
  setDoubtFriendsAddRequest(flag: string, approve = true) {
    return this.request<void>('set_doubt_friends_add_request', { flag, approve })
  }

  /**
   * 发送戳一戳
   * @param params - 参数对象
   * @param params.user_id - 目标 QQ 号
   * @param params.group_id - [可选] 群号。
   */
  async sendPoke(params: { user_id: number; group_id?: number }): Promise<void> {
    try {
      await this.request<void>('send_poke', params)
    } catch {
      if (params.group_id) {
        await this.request<void>('group_poke', { group_id: params.group_id, user_id: params.user_id })
      } else {
        await this.request<void>('friend_poke', { user_id: params.user_id })
      }
    }
  }

  // ============================================================================
  // 群组扩展 (Group Ext)
  // ============================================================================

  /**
   * 设置群头像
   * @param group_id - 群号
   * @param file - 图片路径/链接
   */
  setGroupPortrait(group_id: number, file: string) {
    return this.request<void>('set_group_portrait', { group_id, file })
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

  /**
   * 群打卡
   * @param group_id - 群号
   */
  sendGroupSign(group_id: number) {
    return this.request<void>('send_group_sign', { group_id })
  }

  /**
   * 获取群公告
   * @param group_id - 群号
   */
  async getGroupNotice(group_id: number) {
    try {
      // 尝试标准/常规扩展接口
      const res = await this.request<any[]>('get_group_notice', { group_id })
      return Array.isArray(res) ? res : []
    } catch {
      // 尝试下划线前缀接口
      const res = await this.request<any[]>('_get_group_notice', { group_id })
      return Array.isArray(res) ? res : []
    }
  }

  /**
   * 发送群公告
   * @param group_id - 群号
   * @param content - 内容
   * @param image - 图片路径 (可选)
   */
  sendGroupNotice(group_id: number, content: string, image?: string) {
    return this.request<void>('_send_group_notice', { group_id, content, image })
  }

  /**
   * 删除群公告
   * @param group_id - 群号
   * @param notice_id - 公告 ID
   */
  delGroupNotice(group_id: number, notice_id: string) {
    return this.request<void>('_del_group_notice', { group_id, notice_id })
  }

  /**
   * 获取群系统消息 (进群申请等)
   */
  getGroupSystemMsg() {
    return this.request<T.GroupSystemMsg>('get_group_system_msg')
  }

  /**
   * 获取群 @全体成员 剩余次数
   * @param group_id - 群号
   */
  getGroupAtAllRemain(group_id: number) {
    return this.request<{ can_at_all: boolean, remain_at_all_count_for_uin: number }>('get_group_at_all_remain', { group_id })
  }

  /**
   * 设置群 Bot 发言状态 (Lagrange)
   * @param group_id - 群号
   * @param bot_id - 机器人 QQ
   * @param enable - 是否开启
   */
  setGroupBotStatus(group_id: number, bot_id: number, enable: number) {
    return this.request<void>('set_group_bot_status', { group_id, bot_id, enable })
  }

  /**
   * 批量踢出群成员
   * @param group_id - 群号
   * @param user_ids - 成员 QQ 列表
   * @param reject_add_request - 是否拒绝再次申请
   */
  setGroupKickMembers(group_id: number, user_ids: number[], reject_add_request = false) {
    return this.request<void>('set_group_kick_members', { group_id, user_ids, reject_add_request })
  }

  /**
   * 设置群机器人添加选项
   * @param group_id - 群号
   * @param robot_member_switch - 机器人添加开关
   * @param robot_member_examine - 机器人添加审核
   */
  setGroupRobotAddOption(group_id: number, robot_member_switch = 0, robot_member_examine = 0) {
    return this.request<void>('set_group_robot_add_option', { group_id, robot_member_switch, robot_member_examine })
  }

  /**
   * 设置群添加选项
   * @param group_id - 群号
   * @param add_type - 添加类型
   * @param group_question - 问题
   * @param group_answer - 答案
   */
  setGroupAddOption(group_id: number, add_type: number, group_question?: string, group_answer?: string) {
    return this.request<void>('set_group_add_option', { group_id, add_type, group_question, group_answer })
  }

  /**
   * 设置群搜索
   * @param group_id - 群号
   * @param no_code_finger_open - 选项
   * @param no_code_finger_close - 选项
   */
  setGroupSearch(group_id: number, no_code_finger_open = 0, no_code_finger_close = 0) {
    return this.request<void>('set_group_search', { group_id, no_code_finger_open, no_code_finger_close })
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
   * 获取群详细信息 (扩展)
   * @param group_id - 群号
   */
  getGroupInfoEx(group_id: number) {
    return this.request<any>('get_group_info_ex', { group_id })
  }

  /**
   * 获取被过滤的加群请求
   * @param group_id - 群号 (可选)
   */
  getGroupIgnoreAddRequest(group_id?: number) {
    return this.request<any[]>('get_group_ignore_add_request', { group_id })
  }

  /**
   * 获取群禁言列表
   * @param group_id - 群号
   */
  getGroupShutList(group_id: number) {
    return this.request<any[]>('get_group_shut_list', { group_id })
  }

  /**
   * 获取群过滤系统消息
   * @param group_id - 群号 (可选)
   */
  getGroupIgnoredNotifies(group_id?: number) {
    return this.request<any>('get_group_ignored_notifies', { group_id })
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
   * 获取群相册列表 (LLOneBot)
   * @param group_id - 群号
   */
  getGroupAlbumList(group_id: number) {
    return this.request<T.GroupAlbum[]>('get_group_album_list', { group_id })
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
    return this.request<{ success_count: number, fail_count: number }>('upload_group_album', { group_id, album_id, files })
  }

  /**
   * 获取群相册照片列表 (LLOneBot/Lagrange)
   * @param group_id - 群号
   * @param album_id - 相册 ID
   */
  getGroupAlbumMediaList(group_id: number, album_id: string) {
    return this.request<any>('get_group_album_media_list', { group_id, album_id })
  }

  /**
   * 删除群相册照片 (LLOneBot)
   * @param params - 删除参数对象
   * @param params.group_id - 群号
   * @param params.album_id - 相册 ID
   * @param params.lloc - 照片 LLOC 标识
   */
  delGroupAlbumMedia(params: {
    group_id: number | string
    album_id: string
    lloc: string
  }) {
    return this.request<void>('del_group_album_media', params)
  }

  /**
   * 设置群相册照片点赞 (LLOneBot)
   * @param params - 点赞参数对象
   * @param params.group_id - 群号
   * @param params.album_id - 相册 ID
   * @param params.lloc - 照片 LLOC 标识
   * @param params.id - 照片 ID
   * @param params.set - 是否点赞
   */
  setGroupAlbumLike(params: {
    group_id: number | string
    album_id: string
    lloc: string
    id: string
    set: boolean
  }) {
    return this.request<void>('set_group_album_media_like', params)
  }

  /**
   * 设置群待办 (NapCat)
   * @param group_id - 群号
   * @param content - 待办内容
   */
  setGroupTodo(group_id: number, content: string) {
    return this.request<void>('set_group_todo', { group_id, content })
  }

  /**
   * 获取群相册列表 (NapCat 专用)
   * @param group_id - 群号
   */
  getQunAlbumList(group_id: number) {
    return this.request<any[]>('get_qun_album_list', { group_id })
  }

  /**
   * 上传图片到群相册 (NapCat)
   * @param group_id - 群号
   * @param album_id - 相册 ID
   * @param file - 文件路径
   * @param album_name - 相册名称
   */
  uploadImageToQunAlbum(group_id: number, album_id: string, file: string, album_name?: string) {
    return this.request<void>('upload_image_to_qun_album', { group_id, album_id, file, album_name })
  }

  /**
   * 评论群相册 (NapCat)
   * @param group_id - 群号
   * @param album_id - 相册 ID
   * @param lloc - 照片 LLOC
   * @param content - 评论内容
   */
  doGroupAlbumComment(group_id: number, album_id: string, lloc: string, content: string) {
    return this.request<void>('do_group_album_comment', { group_id, album_id, lloc, content })
  }

  // ============================================================================
  // 文件扩展 (File Ext)
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
   * @param file_hash - 文件哈希 (可选)
   */
  getPrivateFileUrl(user_id: number, file_id: string, file_hash?: string) {
    return this.request<{ url: string }>('get_private_file_url', { user_id, file_id, file_hash })
  }

  /**
   * 上传群文件
   * @param group_id - 群号
   * @param file - 文件路径
   * @param name - 文件名
   * @param folder - 文件夹路径 (NapCat/LLOneBot)
   */
  uploadGroupFile(group_id: number, file: string, name: string, folder?: string) {
    return this.request<void>('upload_group_file', { group_id, file, name, folder })
  }

  /**
   * 获取群文件系统信息
   * @param group_id - 群号
   */
  getGroupFileSystemInfo(group_id: number) {
    return this.request<T.FileSystemInfo>('get_group_file_system_info', { group_id })
  }

  /**
   * 获取群根目录文件
   * @param group_id - 群号
   * @param file_count - 获取数量
   */
  getGroupRootFiles(group_id: number, file_count = 50) {
    return this.request<T.GroupFileList>('get_group_root_files', { group_id, file_count })
  }

  /**
   * 获取群子目录文件
   * @param group_id - 群号
   * @param folder_id - 文件夹 ID
   * @param file_count - 获取数量
   */
  getGroupFilesByFolder(group_id: number, folder_id: string, file_count = 50) {
    return this.request<T.GroupFileList>('get_group_files_by_folder', { group_id, folder_id, file_count })
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
    return this.request<{ folder_id: string }>('create_group_file_folder', { group_id, name, parent_id })
  }

  /**
   * 删除群文件夹
   * @param group_id - 群号
   * @param folder_id - 文件夹 ID
   */
  deleteGroupFolder(group_id: number, folder_id: string) {
    return this.request<void>('delete_group_folder', { group_id, folder_id })
  }

  /**
   * 上传私聊文件
   * @param user_id - 用户 ID
   * @param file - 文件路径
   * @param name - 文件名
   */
  uploadPrivateFile(user_id: number, file: string, name: string) {
    return this.request<void>('upload_private_file', { user_id, file, name })
  }

  /**
   * 上传图片 (Lagrange)
   * @param file - 文件路径
   */
  uploadImage(file: string) {
    return this.request<{ url: string }>('upload_image', { file })
  }

  /**
   * 移动群文件
   * @param group_id - 群号
   * @param file_id - 文件 ID
   * @param parent_directory - 原父目录
   * @param target_directory - 目标父目录
   */
  moveGroupFile(group_id: number, file_id: string, parent_directory: string, target_directory: string) {
    return this.request<void>('move_group_file', { group_id, file_id, parent_directory, target_directory })
  }

  /**
   * 重命名群文件夹
   * @param group_id - 群号
   * @param folder_id - 文件夹 ID
   * @param new_folder_name - 新名称
   */
  renameGroupFileFolder(group_id: number, folder_id: string, new_folder_name: string) {
    return this.request<void>('rename_group_file_folder', { group_id, folder_id, new_folder_name })
  }

  /**
   * 转存群文件 (Lagrange)
   * @param group_id - 群号
   * @param file_id - 文件 ID
   */
  transGroupFile(group_id: number, file_id: string) {
    return this.request<void>('trans_group_file', { group_id, file_id })
  }

  /**
   * 重命名群文件
   * @param group_id - 群号
   * @param file_id - 文件 ID
   * @param new_name - 新名称
   * @param parent_directory - 父目录
   */
  renameGroupFile(group_id: number, file_id: string, new_name: string, parent_directory = '/') {
    return this.request<void>('rename_group_file', { group_id, file_id, new_name, current_parent_directory: parent_directory })
  }

  /**
   * 获取文件详情
   * @param file_id - 文件 ID
   */
  getFile(file_id: string) {
    return this.request<{ file: string, url: string, file_size: string, file_name: string }>('get_file', { file_id })
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
   * 上传闪传文件 (LLOneBot)
   * @param paths - 文件路径列表
   * @param title - 标题
   */
  uploadFlashFile(paths: string[], title?: string) {
    return this.request<{ file_set_id: string, share_link: string }>('upload_flash_file', { paths, title })
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
   * 清理流式传输临时文件 (NapCat)
   */
  cleanStreamTempFile() {
    return this.request<void>('clean_stream_temp_file')
  }

  /**
   * 流式上传文件 (NapCat)
   * @description 用于分片上传大文件
   * @param params - 上传参数
   */
  uploadFileStream(params: {
    stream_id?: string
    chunk_data?: string
    chunk_index?: number
    total_chunks?: number
    file_size?: number
    file_name?: string
    is_complete?: boolean
  }) {
    return this.request<{ stream_id: string, file_path?: string }>('upload_file_stream', params)
  }

  /**
   * 流式下载文件 (NapCat)
   * @param file - 文件路径
   * @param chunk_size - 分片大小
   */
  downloadFileStream(file: string, chunk_size = 65536) {
    return this.request<any>('download_file_stream', { file, chunk_size })
  }

  /**
   * 流式下载语音 (NapCat)
   * @param file - 文件路径
   * @param out_format - 输出格式
   * @param chunk_size - 分片大小
   */
  downloadFileRecordStream(file: string, out_format = 'mp3', chunk_size = 65536) {
    return this.request<any>('download_file_record_stream', { file, out_format, chunk_size })
  }

  /**
   * 流式下载图片 (NapCat)
   * @param file - 文件路径
   * @param chunk_size - 分片大小
   */
  downloadFileImageStream(file: string, chunk_size = 65536) {
    return this.request<any>('download_file_image_stream', { file, chunk_size })
  }

  // ============================================================================
  // Bot 自身扩展 (Bot Ext)
  // ============================================================================

  /**
   * 获取当前账号在线客户端列表
   * @param no_cache - 是否无视缓存
   */
  getOnlineClients(no_cache = false) {
    return this.request<T.OnlineClient[]>('get_online_clients', { no_cache })
  }

  /**
   * 获取在线机型 (NapCat)
   * @param model - 机型标识
   */
  getModelShow(model: string) {
    return this.request<T.DeviceModel[]>('_get_model_show', { model })
  }

  /**
   * 设置在线机型 (NapCat)
   * @param model - 机型标识
   * @param model_show - 显示名称
   */
  setModelShow(model: string, model_show: string) {
    return this.request<void>('_set_model_show', { model, model_show })
  }

  /**
   * 设置登录号资料
   * @param profile - 资料参数对象
   * @param profile.nickname - 昵称
   * @param profile.personal_note - 个性签名
   * @param profile.sex - 性别 (1:男, 2:女, 0:未知)
   */
  setQqProfile(profile: {
    nickname?: string
    personal_note?: string
    sex?: number
  }) {
    return this.request<void>('set_qq_profile', profile)
  }

  /**
   * 设置个人头像
   * @param file - 图片路径/链接
   */
  setQqAvatar(file: string) {
    return this.request<void>('set_qq_avatar', { file })
  }

  /**
   * 获取已收藏的QQ表情列表
   * @param count - 数量
   */
  fetchCustomFace(count = 48) {
    return this.request<string[]>('fetch_custom_face', { count })
  }

  /**
   * 获取商城表情 key (Lagrange)
   * @param emoji_ids - 表情 ID 列表
   */
  getMfaceKey(emoji_ids: string[]) {
    return this.request<string[]>('get_mface_key', { emoji_ids })
  }

  /**
   * 获取 RKey
   */
  getRkey() {
    return this.request<T.RKeyInfo | { private_key: string, group_key: string }>('get_rkey')
  }

  /**
   * 获取 RKey 服务器 (NapCat)
   */
  getRkeyServer() {
    return this.request<{ private_rkey: string, group_rkey: string, expired_time: number }>('get_rkey_server')
  }

  /**
   * 设置自定义在线状态 (NapCat)
   * @param wording - 状态文本
   * @param face_id - 表情 ID
   */
  setDiyOnlineStatus(wording: string, face_id?: number | string) {
    return this.request<void>('set_diy_online_status', { wording, face_id })
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
   * 设置输入状态 (NapCat)
   * @param user_id - 用户 ID
   * @param event_type - 事件类型
   */
  setInputStatus(user_id: number, event_type: number) {
    return this.request<void>('set_input_status', { user_id, event_type })
  }

  /**
   * 获取个人资料点赞列表
   * @param user_id - 用户 ID
   * @param start - 起始索引
   * @param count - 数量
   */
  getProfileLike(user_id?: number, start = 0, count = 10) {
    return this.request<any>('get_profile_like', { user_id, start, count })
  }

  /**
   * 获取官方机器人账号范围
   */
  getRobotUinRange() {
    return this.request<T.RobotUinRange[]>('get_robot_uin_range')
  }

  /**
   * 设置个性签名
   * @param longNick - 签名内容
   */
  setSelfLongnick(longNick: string) {
    return this.request<void>('set_self_longnick', { longNick })
  }

  /**
   * 获取最近会话列表
   * @param count - 数量
   */
  getRecentContact(count = 20) {
    return this.request<any[]>('get_recent_contact', { count })
  }

  /**
   * 获取用户状态 (NapCat)
   * @param user_id - 用户 ID
   */
  getUserStatus(user_id: number) {
    return this.request<{ status: number, ext_status: number }>('nc_get_user_status', { user_id })
  }

  /**
   * 获取 clientkey (NapCat)
   */
  getClientkey() {
    return this.request<{ clientkey: string }>('get_clientkey')
  }

  // ============================================================================
  // 其他 API (Other)
  // ============================================================================

  /**
   * 图片 OCR
   * @param image - 图片 ID 或 URL
   */
  ocrImage(image: string) {
    return this.request<T.OcrResult>('ocr_image', { image })
  }

  /**
   * 下载文件
   * @param url - 下载 URL
   * @param thread_count - 线程数
   * @param headers - 请求头
   * @param base64 - Base64 内容
   * @param name - 文件名
   */
  downloadFile(url: string, thread_count = 1, headers?: string | string[], base64?: string, name?: string) {
    return this.request<{ file: string }>('download_file', { url, thread_count, headers, base64, name })
  }

  /**
   * 检查链接安全性
   * @param url - 链接 URL
   */
  checkUrlSafely(url: string) {
    return this.request<{ level: number }>('check_url_safely', { url })
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
   * 英文翻译为中文 (NapCat)
   * @param words - 单词列表
   */
  translateEn2zh(words: string[]) {
    return this.request<string[]>('translate_en2zh', { words })
  }

  /**
   * 点击内联键盘按钮 (NapCat)
   * @param group_id - 群号
   * @param bot_appid - 机器人 AppID
   * @param button_id - 按钮 ID
   * @param callback_data - 回调数据
   * @param msg_seq - 消息序列号
   */
  clickInlineKeyboardButton(group_id: number, bot_appid: string, button_id: string, callback_data: string, msg_seq?: string) {
    return this.request<void>('click_inline_keyboard_button', { group_id, bot_appid, button_id, callback_data, msg_seq })
  }

  /**
   * 获取推荐好友卡片 (NapCat)
   * @param user_id - 用户 ID
   * @param phoneNumber - 手机号
   */
  arkSharePeer(user_id: number, phoneNumber?: string) {
    return this.request<any>('ArkSharePeer', { user_id, phoneNumber })
  }

  /**
   * 获取推荐群聊卡片 (NapCat)
   * @param group_id - 群号
   */
  arkShareGroup(group_id: number) {
    return this.request<any>('ArkShareGroup', { group_id })
  }

  /**
   * 创建收藏 (NapCat)
   * @param rawData - 原始内容
   * @param brief - 摘要
   */
  createCollection(rawData: string, brief: string) {
    return this.request<void>('create_collection', { rawData, brief })
  }

  /**
   * 获取收藏列表 (NapCat)
   * @param category - 分类
   * @param count - 数量
   */
  getCollectionList(category: number, count = 10) {
    return this.request<T.CollectionList>('get_collection_list', { category, count })
  }

  /**
   * 退出机器人 (NapCat)
   */
  botExit() {
    return this.request<void>('bot_exit')
  }

  /**
   * 发送自定义组包 (NapCat)
   * @param params - 组包参数
   */
  sendPacket(params: any) {
    return this.request<void>('send_packet', params)
  }

  /**
   * 获取 packet 状态 (NapCat)
   */
  ncGetPacketStatus() {
    return this.request<T.PacketStatus>('nc_get_packet_status')
  }

  /**
   * 获取小程序卡片 (NapCat)
   * @param params - 卡片生成参数对象
   * @param params.type - 小程序类型
   * @param params.title - 标题
   * @param params.desc - 描述
   * @param params.picUrl - 封面图片链接
   * @param params.jumpUrl - 跳转链接
   */
  getMiniAppArk(params: {
    type: string
    title: string
    desc: string
    picUrl: string
    jumpUrl: string
  }) {
    return this.request<T.ArkInfo>('get_mini_app_ark', params)
  }

  /**
   * 获取音乐卡片 JSON (Lagrange)
   * @param params - 参数
   */
  getMusicArk(params: any = {}) {
    return this.request<any>('get_music_ark', params)
  }

  /**
   * 获取 AI 语音
   * @param character - 角色 ID
   * @param group_id - 群号
   * @param text - 文本内容
   * @param chat_type - 聊天类型
   */
  getAiRecord(character: string, group_id: number, text: string, chat_type = 1) {
    return this.request<string>('get_ai_record', { character, group_id, text, chat_type })
  }

  /**
   * 获取 AI 声色列表 (Lagrange/LLOneBot)
   * @param group_id - 群号
   * @param chat_type - 聊天类型
   */
  getAiCharacters(group_id?: number, chat_type = 1) {
    return this.request<any>('get_ai_characters', { group_id, chat_type })
  }

  /**
   * 发送群 AI 语音 (NapCat)
   * @param group_id - 群号
   * @param character - 角色 ID
   * @param text - 文本内容
   */
  sendGroupAiRecord(group_id: number, character: string, text: string) {
    return this.request<{ message_id: string }>('send_group_ai_record', { group_id, character, text })
  }

  /**
   * 获取推荐表情 (LLOneBot)
   * @param word - 关键词
   */
  getRecommendFace(word: string) {
    return this.request<{ url: string[] }>('get_recommend_face', { word })
  }

  /**
   * 扫描二维码 (LLOneBot)
   * @param file - 图片路径/base64
   */
  scanQrcode(file: string) {
    return this.request<{ text: string }>('scan_qrcode', { file })
  }
}

export const bot = new ExtendedClient()

/** 重新导出 socket */
export { socket }
