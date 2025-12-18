import { socket } from './socket'
import { BaseClient } from './base'
import type * as T from '../types'

// 支持的后端类型
export type BackendType = 'NapCat' | 'Lagrange' | 'LLOneBot'

/**
 * OneBot v11 扩展客户端
 * 包含 NapCat / Lagrange / LLOneBot 的所有扩展 API
 */
export class ExtendedClient extends BaseClient {
  /** 当前连接的后端类型 */
  private backend: BackendType = 'NapCat'

  constructor() {
    super()
  }

  setBackend(type: BackendType) {
    console.log(`[API] Backend detected: ${type}`)
    this.backend = type
  }

  // ============================================================================
  // 连接管理
  // ============================================================================

  async connect(url: string, token: string) {
    await socket.connect(url, token)
    try {
      const ver = await this.getVersionInfo()
      if (ver.app_name.includes('NapCat')) this.setBackend('NapCat')
      else if (ver.app_name.includes('Lagrange')) this.setBackend('Lagrange')
      else if (ver.app_name.includes('LLOneBot')) this.setBackend('LLOneBot')
    } catch { /* 忽略错误 */ }
  }

  disconnect() {
    socket.disconnect()
  }

  // ============================================================================
  // 消息扩展 (Message Ext)
  // ============================================================================

  /** 发送通用合并转发 (Go-CQHTTP) */
  sendForwardMsg(message_type: 'private' | 'group', target_id: number, messages: T.ForwardNode[]) {
    const params: any = { message_type, messages }
    if (message_type === 'group') params.group_id = target_id
    else params.user_id = target_id
    return this.req<{ message_id: number, forward_id: string }>('send_forward_msg', params)
  }

  /** 发送合并转发 (群聊) */
  sendGroupForwardMsg(group_id: number, messages: T.ForwardNode[]) {
    return this.req<{ message_id: number, forward_id: string }>('send_group_forward_msg', { group_id, messages })
  }

  /** 发送合并转发 (好友) */
  sendPrivateForwardMsg(user_id: number, messages: T.ForwardNode[]) {
    return this.req<{ message_id: number, forward_id: string }>('send_private_forward_msg', { user_id, messages })
  }

  /** 获取群历史消息 (Go-CQ/NapCat) */
  getGroupMsgHistory(group_id: number, message_seq?: number, count = 20) {
    return this.req<{ messages: any[] }>('get_group_msg_history', { group_id, message_seq, count })
  }

  /** 获取好友历史消息 (社区) */
  getFriendMsgHistory(user_id: number, message_seq?: number, count = 20) {
    return this.req<{ messages: any[] }>('get_friend_msg_history', { user_id, message_seq, count })
  }

  /** 标记消息已读 (Lagrange) */
  markMsgAsRead(message_id: number) {
    return this.req('mark_msg_as_read', { message_id })
  }

  /** 标记群消息已读 (NapCat) */
  markGroupMsgAsRead(group_id: number, message_id?: number) {
    return this.req('mark_group_msg_as_read', { group_id, message_id })
  }

  /** 标记私聊消息已读 (NapCat) */
  markPrivateMsgAsRead(user_id: number, message_id?: number) {
    return this.req('mark_private_msg_as_read', { user_id, message_id })
  }

  /** 标记所有消息已读 (NapCat) */
  markAllAsRead() {
    return this.req('_mark_all_as_read')
  }

  /** 设置表情回应 (Lagrange) */
  setGroupReaction(group_id: number, message_id: number, code: string, is_add = true) {
    return this.req('set_group_reaction', { group_id, message_id, code, is_add })
  }

  /** 设置消息表情回应 (NapCat) */
  setMsgEmojiLike(message_id: number, emoji_id: string, set = true) {
    return this.req('set_msg_emoji_like', { message_id, emoji_id, set })
  }

  /** 获取消息表情回应列表 (NapCat) */
  fetchEmojiLike(message_id: number, user_id: number, emojiType: number, count = 20) {
    return this.req<{ emojiLikesList: T.EmojiLikeUser[] }>('fetch_emoji_like', { message_id, user_id, emojiType, count })
  }

  /** 加入群表情接龙 (Lagrange) */
  joinGroupEmojiChain(group_id: number, message_id: number, emoji_id: number) {
    return this.req('.join_group_emoji_chain', { group_id, message_id, emoji_id })
  }

  /** 加入好友表情接龙 (Lagrange) */
  joinFriendEmojiChain(user_id: number, message_id: number, emoji_id: number) {
    return this.req('.join_friend_emoji_chain', { user_id, message_id, emoji_id })
  }

  /** 调用群机器人回调 (Lagrange) */
  sendGroupBotCallback(group_id: number, bot_id: number, data_1: string, data_2: string) {
    return this.req('send_group_bot_callback', { group_id, bot_id, data_1, data_2 })
  }

  /** 转发好友单条消息 (NapCat) */
  forwardFriendSingleMsg(user_id: number, message_id: number) {
    return this.req('forward_friend_single_msg', { user_id, message_id })
  }

  /** 转发群单条消息 (NapCat) */
  forwardGroupSingleMsg(group_id: number, message_id: number) {
    return this.req('forward_group_single_msg', { group_id, message_id })
  }

  // ============================================================================
  // 好友扩展 (Friend Ext)
  // ============================================================================

  /** 获取单向好友列表 (Go-CQ) */
  getUnidirectionalFriendList() {
    return this.req<any[]>('get_unidirectional_friend_list')
  }

  /** 删除好友 (Go-CQ/NapCat) */
  deleteFriend(user_id: number) {
    return this.req('delete_friend', { user_id })
  }

  /** 删除单向好友 (Go-CQ) */
  deleteUnidirectionalFriend(user_id: number) {
    return this.req('delete_unidirectional_friend', { user_id })
  }

  /** 设置好友备注 (NapCat) */
  setFriendRemark(user_id: number, remark: string) {
    return this.req('set_friend_remark', { user_id, remark })
  }

  /** 获取分类的好友列表 (NapCat) */
  getFriendsWithCategory() {
    return this.req<T.FriendCategory[]>('get_friends_with_category')
  }

  /** 获取可疑好友请求 (NapCat) */
  getDoubtFriendsAddRequest() {
    return this.req<any[]>('get_doubt_friends_add_request')
  }

  /** 处理可疑好友请求 (NapCat) */
  setDoubtFriendsAddRequest(request_id: string, approve = true) {
    return this.req('set_doubt_friends_add_request', { request_id, approve })
  }

  /** 好友戳一戳 (NapCat) */
  friendPoke(user_id: number) {
    return this.req('friend_poke', { user_id })
  }

  // ============================================================================
  // 群组扩展 (Group Ext)
  // ============================================================================

  /** 设置群头像 (Go-CQ/NapCat) */
  setGroupPortrait(group_id: number, file: string) {
    return this.req('set_group_portrait', { group_id, file })
  }

  /** 设置精华消息 (Go-CQ/NapCat) */
  setEssenceMsg(message_id: number) {
    return this.req('set_essence_msg', { message_id })
  }

  /** 移出精华消息 (Go-CQ/NapCat) */
  deleteEssenceMsg(message_id: number) {
    return this.req('delete_essence_msg', { message_id })
  }

  /** 获取精华消息列表 (Go-CQ/NapCat) */
  getEssenceMsgList(group_id: number) {
    return this.req<T.EssenceMsg[]>('get_essence_msg_list', { group_id })
  }

  /** 群打卡 (Go-CQ) */
  sendGroupSign(group_id: number) {
    return this.req('send_group_sign', { group_id })
  }

  /** 获取群公告 */
  async getGroupNotice(group_id: number) {
    try {
      const res = await this.req<T.GroupNotice[]>('get_group_notice', { group_id })
      return Array.isArray(res) ? res : []
    } catch {
      const res = await this.req<T.GroupNotice[]>('_get_group_notice', { group_id })
      return Array.isArray(res) ? res : []
    }
  }

  /** 发送群公告 (Go-CQ) */
  sendGroupNotice(group_id: number, content: string, image?: string) {
    return this.req('_send_group_notice', { group_id, content, image })
  }

  /** 删除群公告 (Go-CQ) */
  delGroupNotice(group_id: number, notice_id: string) {
    return this.req('_del_group_notice', { group_id, notice_id })
  }

  /** 获取群系统消息 (Go-CQ/NapCat) */
  getGroupSystemMsg() {
    return this.req<{ invited_requests: any[], join_requests: any[] }>('get_group_system_msg')
  }

  /** 获取群 @全体 剩余次数 (Go-CQ) */
  getGroupAtAllRemain(group_id: number) {
    return this.req<{ can_at_all: boolean, remain_at_all_count_for_uin: number }>('get_group_at_all_remain', { group_id })
  }

  /** 设置群Bot发言状态 (Lagrange) */
  setGroupBotStatus(group_id: number, bot_id: number, enable: number) {
    return this.req('set_group_bot_status', { group_id, bot_id, enable })
  }

  /** 群组踢多人 (NapCat) */
  setGroupKickMembers(group_id: number, user_ids: number[], reject_add_request = false) {
    return this.req('set_group_kick_members', { group_id, user_ids, reject_add_request })
  }

  /** 设置机器人进群选项 (NapCat) */
  setGroupRobotAddOption(group_id: number, robot_member_switch = 0, robot_member_examine = 0) {
    return this.req('set_group_robot_add_option', { group_id, robot_member_switch, robot_member_examine })
  }

  /** 设置群添加选项 (NapCat) */
  setGroupAddOption(group_id: number, add_type: number, group_question?: string, group_answer?: string) {
    return this.req('set_group_add_option', { group_id, add_type, group_question, group_answer })
  }

  /** 设置群搜索 (NapCat) */
  setGroupSearch(group_id: number, no_code_finger_open = 0, no_code_finger_close = 0) {
    return this.req('set_group_search', { group_id, no_code_finger_open, no_code_finger_close })
  }

  /** 设置群备注 (NapCat) */
  setGroupRemark(group_id: number, remark: string) {
    return this.req('set_group_remark', { group_id, remark })
  }

  /** 群内戳一戳 (NapCat) */
  groupPoke(group_id: number, user_id: number) {
    return this.req('group_poke', { group_id, target_id: user_id })
  }

  /** 获取群信息扩展 (NapCat) */
  getGroupInfoEx(group_id: number) {
    return this.req('get_group_info_ex', { group_id })
  }

  /** 获取群详细信息 (NapCat) */
  getGroupDetailInfo(group_id: number) {
    return this.req('get_group_detail_info', { group_id })
  }

  /** 获取被过滤的加群请求 (NapCat) */
  getGroupIgnoreAddRequest() {
    return this.req<any[]>('get_group_ignore_add_request')
  }

  /** 获取群禁言列表 (NapCat) */
  getGroupShutList(group_id: number) {
    return this.req<any[]>('get_group_shut_list', { group_id })
  }

  /** 获取群过滤系统消息 (NapCat) */
  getGroupIgnoredNotifies(group_id: number) {
    return this.req('get_group_ignored_notifies', { group_id })
  }

  // ============================================================================
  // 文件扩展 (File Ext)
  // ============================================================================

  /** 获取群文件资源链接 */
  getGroupFileUrl(group_id: number, file_id: string, busid?: number) {
    return this.req<{ url: string }>('get_group_file_url', { group_id, file_id, busid })
  }

  /** 获取私聊文件资源链接 */
  getPrivateFileUrl(user_id: number, file_id: string) {
    return this.req<{ url: string }>('get_private_file_url', { user_id, file_id })
  }

  /** 上传群文件 */
  uploadGroupFile(group_id: number, file: string, name: string, folder?: string) {
    return this.req('upload_group_file', { group_id, file, name, folder })
  }

  /** 获取群文件系统信息 */
  getGroupFileSystemInfo(group_id: number) {
    return this.req<T.FileSystemInfo>('get_group_file_system_info', { group_id })
  }

  /** 获取群根目录文件 */
  getGroupRootFiles(group_id: number) {
    return this.req<T.GroupFiles>('get_group_root_files', { group_id })
  }

  /** 获取群子目录文件 */
  getGroupFilesByFolder(group_id: number, folder_id: string, file_count = 50) {
    return this.req<T.GroupFiles>('get_group_files_by_folder', { group_id, folder_id, file_count })
  }

  /** 删除群文件 */
  deleteGroupFile(group_id: number, file_id: string, busid?: number) {
    return this.req('delete_group_file', { group_id, file_id, busid })
  }

  /** 创建群文件夹 */
  createGroupFileFolder(group_id: number, name: string, parent_id = '/') {
    return this.req('create_group_file_folder', { group_id, name, parent_id })
  }

  /** 删除群文件夹 */
  deleteGroupFolder(group_id: number, folder_id: string) {
    return this.req('delete_group_folder', { group_id, folder_id })
  }

  /** 上传私聊文件 */
  uploadPrivateFile(user_id: number, file: string, name: string) {
    return this.req('upload_private_file', { user_id, file, name })
  }

  /** 上传图片 (Lagrange) */
  uploadImage(file: string) {
    return this.req('upload_image', { file })
  }

  /** 移动群文件 (社区) */
  moveGroupFile(group_id: number, file_id: string, folder_id: string) {
    return this.req('move_group_file', { group_id, file_id, folder_id })
  }

  /** 重命名群文件夹 (Lagrange) */
  renameGroupFileFolder(group_id: number, folder_id: string, new_name: string) {
    return this.req('rename_group_file_folder', { group_id, folder_id, new_name })
  }

  /** 转发群文件 (NapCat) */
  transGroupFile(group_id: number, file_id: string) {
    return this.req('trans_group_file', { group_id, file_id })
  }

  /** 重命名群文件 (NapCat) */
  renameGroupFile(group_id: number, file_id: string, new_name: string, parent_dir?: string) {
    return this.req('rename_group_file', { group_id, file_id, new_name, current_parent_directory: parent_dir })
  }

  /** 获取文件详情 (NapCat) */
  getFile(file_id: string) {
    return this.req('get_file', { file_id })
  }

  // ============================================================================
  // Bot 自身扩展 (Bot Ext)
  // ============================================================================

  /** 获取当前账号在线客户端列表 (Go-CQ) */
  getOnlineClients(no_cache = false) {
    return this.req('get_online_clients', { no_cache })
  }

  /** 获取企点账号信息 (Go-CQ) */
  qidianGetAccountInfo() {
    return this.req('qidian_get_account_info')
  }

  /** 获取在线机型 (Go-CQ) */
  getModelShow(model: string) {
    return this.req('_get_model_show', { model })
  }

  /** 设置在线机型 (Go-CQ) */
  setModelShow(model: string, model_show: string) {
    return this.req('_set_model_show', { model, model_show })
  }

  /** 设置登录号资料 (Go-CQ/NapCat) */
  setQqProfile(profile: { nickname?: string, company?: string, email?: string, personal_note?: string, sex?: number }) {
    return this.req('set_qq_profile', profile)
  }

  /** 获取已收藏的QQ表情列表 (社区) */
  fetchCustomFace(count = 48) {
    return this.req('fetch_custom_face', { count })
  }

  /** 获取商城表情 key (Lagrange) */
  getMfaceKey(emoji_ids: string[]) {
    return this.req('get_mface_key', { emoji_ids })
  }

  /** 设置QQ头像 (社区) */
  setQqAvatar(file: string) {
    return this.req('set_qq_avatar', { file })
  }

  /** 获取rkey (社区) */
  getRkey() {
    return this.req('get_rkey')
  }

  /** 获取NC版rkey (NapCat) */
  ncGetRkey() {
    return this.req('nc_get_rkey')
  }

  /** 获取rkey服务器 (NapCat) */
  getRkeyServer() {
    return this.req('get_rkey_server')
  }

  /** 设置自定义在线状态 (NapCat) */
  setDiyOnlineStatus(wording: string, face_id?: number | string) {
    return this.req('set_diy_online_status', { wording, face_id })
  }

  /** 设置在线状态 (NapCat) */
  setOnlineStatus(status: number, ext_status = 0, battery_status = 0) {
    return this.req('set_online_status', { status, ext_status, battery_status })
  }

  /** 设置输入状态 (NapCat) */
  setInputStatus(event_type: number) {
    return this.req('set_input_status', { event_type })
  }

  /** 获取个人资料点赞 (NapCat) */
  getProfileLike(user_id?: number, start = 0, count = 10) {
    return this.req('get_profile_like', { user_id, start, count })
  }

  /** 获取官方机器人账号范围 (NapCat) */
  getRobotUinRange() {
    return this.req('get_robot_uin_range')
  }

  /** 设置自己的个性签名 (NapCat) */
  setSelfLongnick(longNick: string) {
    return this.req('set_self_longnick', { longNick })
  }

  /** 获取最近联系人 (NapCat) */
  getRecentContact(count = 20) {
    return this.req('get_recent_contact', { count })
  }

  /** 获取用户状态 (NapCat) */
  getUserStatus(user_id: number) {
    return this.req('nc_get_user_status', { user_id })
  }

  /** 获取 clientkey (NapCat) */
  getClientkey() {
    return this.req('get_clientkey')
  }

  // ============================================================================
  // 其他 API (Other)
  // ============================================================================

  /** 图片 OCR (Go-CQ) */
  ocrImage(image: string) {
    return this.req<T.OcrResult>('ocr_image', { image })
  }

  /** 下载文件 (Go-CQ) */
  downloadFile(url: string, thread_count = 1, headers?: string | string[]) {
    return this.req<{ file: string }>('download_file', { url, thread_count, headers })
  }

  /** 检查链接安全性 (Go-CQ) */
  checkUrlSafely(url: string) {
    return this.req<{ level: number }>('check_url_safely', { url })
  }

  /** 对事件执行快速操作 */
  handleQuickOperation(context: any, operation: any) {
    return this.req('.handle_quick_operation', { context, operation })
  }

  /** 获取中文分词 (Go-CQ) */
  getWordSlices(content: string) {
    return this.req<{ slices: string[] }>('.get_word_slices', { content })
  }

  /** 英文翻译为中文 (NapCat) */
  translateEn2zh(words: string[]) {
    return this.req<string[]>('translate_en2zh', { words })
  }

  /** 点击按钮 (NapCat) */
  clickInlineKeyboardButton(group_id: number, bot_appid: string, button_id: string, button_data: string) {
    return this.req('click_inline_keyboard_button', { group_id, bot_appid, button_id, button_data })
  }

  /** 获取推荐好友卡片 (NapCat) */
  arkSharePeer(user_id: number, phoneNumber?: string) {
    return this.req('ArkSharePeer', { user_id, phoneNumber })
  }

  /** 获取推荐群聊卡片 (NapCat) */
  arkShareGroup(group_id: number, phoneNumber?: string) {
    return this.req('ArkShareGroup', { group_id, phoneNumber })
  }

  /** 创建收藏 (NapCat) */
  createCollection(rawData: string, brief: string) {
    return this.req('create_collection', { rawData, brief })
  }

  /** 获取收藏列表 (NapCat) */
  getCollectionList(category: number, count = 10) {
    return this.req<T.CollectionList>('get_collection_list', { category, count })
  }

  /** 退出机器人 (NapCat) */
  botExit() {
    return this.req('bot_exit')
  }

  /** 发送自定义组包 (NapCat) */
  sendPacket(params: any) {
    return this.req('send_packet', params)
  }

  /** 获取 packet 状态 (NapCat) */
  ncGetPacketStatus() {
    return this.req('nc_get_packet_status')
  }

  /** 获取小程序卡片 (NapCat) */
  getMiniAppArk(params: any) {
    return this.req('get_mini_app_ark', params)
  }

  /** 获取 AI 语音 (NapCat) */
  getAiRecord(character: string, group_id: number, text: string) {
    return this.req<string>('get_ai_record', { character, group_id, text })
  }

  /** 发送戳一戳 (NapCat) */
  sendPoke(user_id: number, group_id?: number, target_id?: number) {
    return this.req('send_poke', { user_id, group_id, target_id })
  }

  /** 获取 AI 声色列表 (社区) */
  getAiCharacters(group_id?: number, chat_type = 1) {
    return this.req<T.AiCharacter[]>('get_ai_characters', { group_id, chat_type })
  }

  /** 发送群 AI 语音 (社区) */
  sendGroupAiRecord(group_id: number, character: string, text: string, chat_type = 1) {
    return this.req('send_group_ai_record', { group_id, character, text, chat_type })
  }
}

/** 导出全局单例 */
export const bot = new ExtendedClient()
