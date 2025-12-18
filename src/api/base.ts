import { wsService, type WebSocketService } from './websocket'
import type { Message, UserInfo, GroupInfo, GroupMember, SystemNotice, MessageSegment } from '../types'
import { parseMsgList, determineMsgType } from '../utils/msg-parser'

/**
 * OneBot 标准 API 基础实现类
 * 提供统一的方法封装，处理数据清洗和转换
 */
export class BaseBotApi {
  /**
   * WebSocket 服务实例（公开访问，用于高级配置）
   */
  public wsService: WebSocketService

  /**
   * 当前连接地址
   */
  protected address: string = ''

  /**
   * 当前访问令牌
   */
  protected token: string = ''

  constructor() {
    this.wsService = wsService
  }

  /**
   * 通用请求包装器：处理 try-catch 和错误日志
   */
  protected async safeRequest<T>(
    apiName: string,
    action: () => Promise<T>,
    fallback: T
  ): Promise<T> {
    try {
      return await action()
    } catch (e) {
      console.error(`[BaseBotApi] ${apiName} error:`, e)
      return fallback
    }
  }

  /**
   * 连接到 OneBot 后端
   */
  async connect(address: string, token: string): Promise<void> {
    this.address = address
    this.token = token
    await this.wsService.connect(address, token)
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.wsService.disconnect()
    this.address = ''
    this.token = ''
  }

  /**
   * 上传文件/图片
   * @param type 'private' | 'group'
   * @param id user_id 或 group_id
   * @param file File 对象
   */
  async uploadFile(type: 'private' | 'group', id: string, file: File) {
    let url = this.address
    // 将 ws/wss 替换为 http/https
    if (url.startsWith('ws://')) url = url.replace('ws://', 'http://')
    else if (url.startsWith('wss://')) url = url.replace('wss://', 'https://')
    else if (!url.startsWith('http')) url = `http://${url}`

    const baseUrl = url.replace(/\/$/, '') // 移除末尾斜杠

    const formData = new FormData()
    formData.append('type', type)
    formData.append(type === 'group' ? 'group_id' : 'user_id', id)
    formData.append('file', file)
    formData.append('name', file.name)

    const endpoint = type === 'group' ? '/upload_group_file' : '/upload_private_file'
    const uploadUrl = `${baseUrl}${endpoint}`

    try {
      const headers: Record<string, string> = {}
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`
      }

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers,
        body: formData
      })

      if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)

      const data = await res.json()
      if (data.retcode !== 0 && data.status !== 'ok') {
        throw new Error(data.msg || 'Upload failed')
      }

      return data.data
    } catch (e) {
      console.error('[BaseBotApi] uploadFile error:', e)
      throw e
    }
  }

  /**
   * 获取好友列表
   */
  async getFriendList(): Promise<UserInfo[]> {
    return this.safeRequest('getFriendList', async () => {
      const res = await this.wsService.callApi('get_friend_list') as Array<{
        user_id: number
        nickname: string
        remark?: string
      }>

      if (!Array.isArray(res)) return []

      return res.map((f) => ({
        user_id: f.user_id,
        nickname: f.nickname,
        remark: f.remark,
        avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${f.user_id}`,
      }))
    }, [])
  }

  /**
   * 获取群组列表
   */
  async getGroupList(): Promise<GroupInfo[]> {
    return this.safeRequest('getGroupList', async () => {
      const res = await this.wsService.callApi('get_group_list') as Array<{
        group_id: number
        group_name: string
        member_count?: number
        max_member_count?: number
      }>

      if (!Array.isArray(res)) return []

      return res.map((g) => ({
        group_id: g.group_id,
        group_name: g.group_name,
        member_count: g.member_count,
        max_member_count: g.max_member_count,
        avatar: `https://p.qlogo.cn/gh/${g.group_id}/${g.group_id}/0`,
      }))
    }, [])
  }

  /**
   * 获取群成员列表
   */
  async getGroupMemberList(groupId: number): Promise<GroupMember[]> {
    return this.safeRequest('getGroupMemberList', async () => {
      const res = await this.wsService.callApi('get_group_member_list', { group_id: groupId }) as Array<{
        user_id: number
        nickname: string
        card?: string
        role: 'owner' | 'admin' | 'member'
        join_time: number
        last_sent_time: number
        shut_up_timestamp: number
        title?: string
      }>

      if (!Array.isArray(res)) return []

      return res.map((m) => ({
        user_id: m.user_id,
        nickname: m.nickname,
        card: m.card,
        role: m.role,
        join_time: m.join_time,
        last_sent_time: m.last_sent_time,
        shut_up_timestamp: m.shut_up_timestamp,
        title: m.title,
      }))
    }, [])
  }

  /**
   * 获取聊天历史记录（统一返回 Message[]）
   */
  async getChatHistory(params: {
    group_id?: number
    user_id?: number
    message_id?: number
    count?: number
  }, myUin?: number): Promise<Message[]> {
    return this.safeRequest('getChatHistory', async () => {
      const res = await this.wsService.callApi('get_chat_history', params) as {
        messages?: Array<{
          message_id: number
          message_seq?: number
          time: number
          message: MessageSegment[]
          sender: {
            user_id: number
            nickname?: string
            card?: string
            role?: 'owner' | 'admin' | 'member'
          }
        }>
      }

      if (!res || !Array.isArray(res.messages)) return []

      return res.messages.map((m) => this.convertApiMsgToModel(m, myUin))
    }, [])
  }

  /**
   * 发送私聊消息
   */
  async sendPrivateMsg(userId: number, message: MessageSegment[]): Promise<{ message_id?: number }> {
    try {
      const res = await this.wsService.callApi('send_private_msg', {
        user_id: userId,
        message,
      }) as { message_id?: number }

      return res || {}
    } catch (e) {
      console.error('[BaseBotApi] sendPrivateMsg error:', e)
      throw e
    }
  }

  /**
   * 发送群消息
   */
  async sendGroupMsg(groupId: number, message: MessageSegment[]): Promise<{ message_id?: number }> {
    try {
      const res = await this.wsService.callApi('send_group_msg', {
        group_id: groupId,
        message,
      }) as { message_id?: number }

      return res || {}
    } catch (e) {
      console.error('[BaseBotApi] sendGroupMsg error:', e)
      throw e
    }
  }

  /**
   * 撤回/删除消息
   */
  async deleteMsg(messageId: number): Promise<void> {
    try {
      await this.wsService.callApi('delete_msg', { message_id: messageId })
    } catch (e) {
      console.error('[BaseBotApi] deleteMsg error:', e)
      throw e
    }
  }

  /**
   * 获取合并转发消息内容
   */
  async getForwardMsg(id: string): Promise<Array<{
    user_id: number
    nickname: string
    content: MessageSegment[]
  }>> {
    return this.safeRequest('getForwardMsg', async () => {
      const res = await this.wsService.callApi('get_forward_msg', { id }) as {
        messages?: Array<{
          user_id: number
          nickname: string
          content: MessageSegment[]
        }>
      }
      return res?.messages || []
    }, [])
  }

  /**
   * 获取群公告
   */
  async getGroupNotice(groupId: number): Promise<Array<{
    notice_id?: string
    sender_id?: number
    publish_time?: number
    message?: { text?: string; images?: Array<{ url: string }> }
    msg?: { text?: string }
    u?: string
    t?: number
  }>> {
    return this.safeRequest('getGroupNotice', async () => {
      try {
        const res = await this.wsService.callApi('_get_group_notice', { group_id: groupId }) as unknown
        if (res) return Array.isArray(res) ? res : [res]
      } catch {
        // 降级到标准接口
      }

      const res = await this.wsService.callApi('get_group_notice', { group_id: groupId }) as unknown
      return Array.isArray(res) ? res : []
    }, [])
  }

  /**
   * 获取群文件列表
   */
  async getGroupFilesByFolder(groupId: number, folderId: string = '/'): Promise<{
    files: Array<{
      file_id: string
      file_name: string
      file_size: number
      busid: number
      upload_time: number
      uploader: number
    }>
    folders: Array<{
      folder_id: string
      folder_name: string
      create_time: number
      creator: number
      total_file_count: number
    }>
  }> {
    return this.safeRequest('getGroupFilesByFolder', async () => {
      const res = await this.wsService.callApi('get_group_files_by_folder', {
        group_id: groupId,
        folder_id: folderId,
      }) as {
        files?: Array<{
          file_id: string
          file_name: string
          file_size: number
          busid: number
          upload_time: number
          uploader: number
        }>
        folders?: Array<{
          folder_id: string
          folder_name: string
          create_time: number
          creator: number
          total_file_count: number
        }>
      }

      return {
        files: res?.files || [],
        folders: res?.folders || [],
      }
    }, { files: [], folders: [] })
  }

  /**
   * 获取群文件下载链接
   */
  async getGroupFileUrl(groupId: number, fileId: string, busid: number): Promise<string> {
    return this.safeRequest('getGroupFileUrl', async () => {
      const res = await this.wsService.callApi('get_group_file_url', {
        group_id: groupId,
        file_id: fileId,
        busid,
      }) as { url?: string }
      return res?.url || ''
    }, '')
  }

  /**
   * 获取精华消息列表
   */
  async getEssenceMsgList(groupId: number): Promise<Array<{
    sender_id: number
    sender_nick: string
    sender_time: number
    operator_id: number
    operator_nick: string
    operator_time: number
    message_id: number
  }>> {
    return this.safeRequest('getEssenceMsgList', async () => {
      const res = await this.wsService.callApi('get_essence_msg_list', {
        group_id: groupId,
      }) as Array<{
        sender_id: number
        sender_nick: string
        sender_time: number
        operator_id: number
        operator_nick: string
        operator_time: number
        message_id: number
      }>
      return Array.isArray(res) ? res : []
    }, [])
  }

  /**
   * 退出群聊
   */
  async setGroupLeave(groupId: number, onlySelf: boolean): Promise<void> {
    return this.safeRequest('setGroupLeave', async () => {
      await this.wsService.callApi('set_group_leave', { group_id: groupId, is_dismiss: onlySelf })
    }, undefined as any)
  }

  /**
   * 删除好友（根据不同后端可能行为不同）
   */
  async deleteFriend(userId: number): Promise<void> {
    return this.safeRequest('deleteFriend', async () => {
      await this.wsService.callApi('delete_friend', { user_id: userId })
    }, undefined as any)
  }

  async setFriendAddRequest(flag: string, approve: boolean): Promise<void> {
    return this.safeRequest('setFriendAddRequest', async () => {
      await this.wsService.callApi('set_friend_add_request', { flag, approve })
    }, undefined as any)
  }

  async setGroupAddRequest(flag: string, subType: 'add' | 'invite', approve: boolean): Promise<void> {
    return this.safeRequest('setGroupAddRequest', async () => {
      await this.wsService.callApi('set_group_add_request', { flag, sub_type: subType, approve })
    }, undefined as any)
  }

  /**
   * 获取系统消息（好友/群请求）
   */
  async getSystemMsg(): Promise<SystemNotice[]> {
    return this.safeRequest('getSystemMsg', async () => {
      const res = await this.wsService.callApi('get_system_msg') as { data?: SystemNotice[] }
      return res?.data || []
    }, [])
  }

  /**
   * 获取登录信息
   */
  async getLoginInfo(): Promise<{ user_id: number; nickname: string } | null> {
    return this.safeRequest('getLoginInfo', async () => {
      const res = await this.wsService.callApi('get_login_info') as { user_id: number; nickname: string }
      return res || null
    }, null)
  }

  /**
   * 获取 Cookies
   */
  async getCookies(domain?: string): Promise<string> {
    return this.safeRequest('getCookies', async () => {
      const res = await this.wsService.callApi('get_cookies', { domain }) as { cookies?: string }
      return res?.cookies || ''
    }, '')
  }

  /**
   * 获取 CSRF Token
   */
  async getCsrfToken(): Promise<number> {
    return this.safeRequest('getCsrfToken', async () => {
      const res = await this.wsService.callApi('get_csrf_token') as { token: number }
      return res?.token || 0
    }, 0)
  }

  /**
   * 发送群合并转发
   */
  async sendGroupForwardMsg(groupId: number, messages: Array<{ type: string; data: Record<string, unknown> }>): Promise<void> {
    try {
      await this.wsService.callApi('send_group_forward_msg', {
        group_id: groupId,
        messages,
      })
    } catch (e) {
      console.error('[BaseBotApi] sendGroupForwardMsg error:', e)
      throw e
    }
  }

  /**
   * 发送私聊合并转发
   */
  async sendPrivateForwardMsg(userId: number, messages: Array<{ type: string; data: Record<string, unknown> }>): Promise<void> {
    try {
      await this.wsService.callApi('send_private_forward_msg', {
        user_id: userId,
        messages,
      })
    } catch (e) {
      console.error('[BaseBotApi] sendPrivateForwardMsg error:', e)
      throw e
    }
  }

  /**
   * 发送群戳一戳（不等待响应）
   */
  sendGroupPoke(groupId: number, userId: number): void {
    try {
      this.wsService.send('group_poke', { group_id: groupId, user_id: userId })
    } catch (e) {
      console.error('[BaseBotApi] sendGroupPoke error:', e)
    }
  }

  /**
   * 发送好友戳一戳（不等待响应）
   */
  sendFriendPoke(userId: number): void {
    try {
      this.wsService.send('friend_poke', { user_id: userId })
    } catch (e) {
      console.error('[BaseBotApi] sendFriendPoke error:', e)
    }
  }

  /**
   * 内部辅助方法：将 API 返回的消息转换为前端 Message 模型
   */
  protected convertApiMsgToModel(
    m: {
      message_id: number
      message_seq?: number
      time: number
      message: MessageSegment[]
      sender: {
        user_id: number
        nickname?: string
        card?: string
        role?: 'owner' | 'admin' | 'member'
      }
    },
    myUin?: number
  ): Message {
    const content = parseMsgList(m.message)
    return {
      id: String(m.message_id),
      seq: m.message_seq || 0,
      time: m.time * 1000,
      type: determineMsgType(m.message),
      sender: {
        userId: m.sender.user_id,
        nickname: m.sender.nickname || m.sender.card || '',
        card: m.sender.card,
        role: m.sender.role,
        avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${m.sender.user_id}`,
      },
      content,
      raw_content: m.message,
      isMe: myUin ? m.sender.user_id === myUin : false,
    }
  }

  /**
   * 计算 bkn (GTK) - QQ Web 协议辅助函数
   * @param skey 从 cookie 中获取的 skey
   */
  static getBkn(skey: string): number {
    let hash = 5381
    for (let i = 0; i < skey.length; i++) {
      hash += (hash << 5) + skey.charCodeAt(i)
    }
    return hash & 0x7fffffff
  }

  /**
   * 获取指定域名的 Cookie 并解析为对象
   * @param domain 域名
   */
  async getCookiesObject(domain: string): Promise<Record<string, string>> {
    try {
      const cookieStr = await this.getCookies(domain)
      const cookies: Record<string, string> = {}
      cookieStr.split(';').forEach((pair: string) => {
        const [key, value] = pair.trim().split('=')
        if (key && value) cookies[key] = value
      })
      return cookies
    } catch {
      return {}
    }
  }

  /**
   * 获取 CSRF Token (bkn)，带降级方案
   */
  async getCsrfTokenWithFallback(): Promise<number> {
    try {
      return await this.getCsrfToken()
    } catch {
      // 降级方案：手动获取 cookie 计算
      const cookies = await this.getCookiesObject('qun.qq.com')
      if (cookies.skey) {
        return BaseBotApi.getBkn(cookies.skey)
      }
      return 0
    }
  }
}
