import { ref, computed, type Ref } from 'vue'
import { useStorage } from '@vueuse/core'
import Dexie, { type Table } from 'dexie'
import { bot } from '@/api'
import { determineMsgType, parseMsgList } from '@/utils/msg-parser'
import { settingsStore } from './settings'
import { MsgType } from '@/types'
import type { FriendInfo, GroupInfo, SystemNotice, Message, MessageSegment } from '@/types'

// =========================================================================================
// 核心类型定义 (Core Types)
// =========================================================================================

/**
 * @interface Session
 * @description 定义会话列表项的结构。
 */
export interface Session {
  /** 唯一标识 (用户ID或群ID) */
  id: string
  /** 会话类型: 'private' (私聊) 或 'group' (群聊) */
  type: 'private' | 'group'
  /** 显示名称 (好友备注/昵称或群名称) */
  name: string
  /** 头像 URL */
  avatar: string
  /** 最新消息的预览文本 */
  preview: string
  /** 最新消息的时间戳 (毫秒) */
  time: number
  /** 未读消息数量 */
  unread: number
}

/**
 * @interface ChatMsg
 * @description 定义用于聊天界面的消息对象结构，扩展了基础的 OneBot 消息类型。
 * @extends Message
 */
export interface ChatMsg extends Message {
  /** 消息发送状态 */
  status?: 'sending' | 'success' | 'fail'
  /** 消息是否已被撤回 (用于本地防撤回) */
  recalled?: boolean
  /** 是否为本地生成的系统提示消息 */
  isSystem?: boolean
}

/**
 * @interface StoredChatMsg
 * @description 定义存储在 IndexedDB 中的消息对象结构。
 * @extends ChatMsg
 */
export interface StoredChatMsg extends ChatMsg {
  /** 消息所属的会话ID */
  sessionId: string
}

// =========================================================================================
// 数据库定义 (Dexie)
// =========================================================================================

/**
 * RimeQ 的 IndexedDB 数据库类定义。
 * @extends Dexie
 */
class RimeQDB extends Dexie {
  /** 聊天消息表 */
  public messages!: Table<StoredChatMsg, number>

  constructor() {
    super('RimeQDB')
    this.version(1).stores({
      messages: 'message_id, sessionId, [sessionId+time]'
    })
  }
}

const db = new RimeQDB()

// =========================================================================================
// 持久化存储工具
// =========================================================================================

/** 帮助类型：为存储的数据添加过期时间戳 */
interface StoredWithTTL<T> {
  data: T
  expires: number
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * ONE_DAY_MS

/**
 * 创建一个带过期时间的、响应式的 localStorage 存储。
 * @template T - 存储数据的类型。
 * @param {string} key - localStorage 的键。
 * @param {T} defaultValue - 当数据不存在或已过期时的默认值。
 * @param {number} [ttlMs=SEVEN_DAYS_MS] - 过期时间（毫秒）。
 * @returns {Ref<T>} 一个行为类似 ref 的计算属性，数据会自动持久化并处理过期逻辑。
 */
function createExpirableStorage<T>(key: string, defaultValue: T, ttlMs: number = SEVEN_DAYS_MS): Ref<T> {
  const storage = useStorage<StoredWithTTL<T> | null>(key, null)

  return computed<T>({
    get() {
      const now = Date.now()
      const current = storage.value

      // **关键修复**: 检查数据是否有效（存在、未过期、结构正确）
      if (!current || typeof current.data === 'undefined' || now > current.expires) {
        // 如果无效，则重置为默认值
        const newValue = {
          data: defaultValue,
          expires: now + ttlMs
        }
        storage.value = newValue
        return newValue.data
      }

      // 如果有效，则返回数据
      return current.data
    },
    set(newValue) {
      // 写入时刷新过期时间
      storage.value = {
        data: newValue,
        expires: Date.now() + ttlMs
      }
    }
  })
}

// =========================================================================================
// 数据存储核心类
// =========================================================================================

/**
 * @class DataStore
 * @description 应用的核心数据管理器。
 * 负责管理会话、消息、好友、群组等数据的内存缓存与持久化存储。
 */
export class DataStore {
  public friends = createExpirableStorage<FriendInfo[]>('rimeq_friends', [], ONE_DAY_MS)
  public groups = createExpirableStorage<GroupInfo[]>('rimeq_groups', [], ONE_DAY_MS)
  public notices = createExpirableStorage<SystemNotice[]>('rimeq_notices', [])
  private readonly _sessions = createExpirableStorage<Session[]>('rimeq_sessions', [])

  public readonly sessions = computed(() =>
    (this._sessions.value || []).slice().sort((a, b) => b.time - a.time)
  )

  public records = ref<Record<string, ChatMsg[]>>({})
  public historyLoading = ref<Record<string, boolean>>({})
  public historyFinished = ref<Record<string, boolean>>({})

  private _generatePreview(msg: ChatMsg): string {
    if (msg.isSystem) {
      return msg.message.find(s => s.type === 'text')?.data.text || '[系统消息]'
    }
    const parsedText = msg.message
      .filter(s => s.type === 'text')
      .map(s => s.data.text)
      .join('')

    switch (determineMsgType(msg.message)) {
      case MsgType.Image: return '[图片]'
      case MsgType.Record: return '[语音]'
      case MsgType.File: return '[文件]'
      case MsgType.Json: case MsgType.Xml: return '[卡片消息]'
      case MsgType.Markdown: return '[Markdown]'
      default: return parsedText || '[消息]'
    }
  }

  private _createSession(id: string, data: Partial<Session>): Session {
    const isGroup = data.type === 'group' || id.length > 5
    let name: string, avatar: string

    if (isGroup) {
      const groupInfo = this.groups.value.find(g => String(g.group_id) === id)
      name = groupInfo?.group_name || `群 ${id}`
      avatar = `https://p.qlogo.cn/gh/${id}/${id}/0`
    } else {
      const friendInfo = this.friends.value.find(f => String(f.user_id) === id)
      name = friendInfo?.remark || friendInfo?.nickname || `用户 ${id}`
      avatar = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${id}`
    }

    return {
      id,
      type: isGroup ? 'group' : 'private',
      name,
      avatar,
      preview: '',
      time: Date.now(),
      unread: 1,
      ...data,
    }
  }

  public updateSession(id: string, data: Partial<Session>): void {
    const sessions = this._sessions.value
    const index = sessions.findIndex(s => s.id === id)

    if (index !== -1) {
      const existingSession = { ...sessions[index], ...data }
      if (data.unread && data.unread > 0) {
        existingSession.unread = (existingSession.unread || 0) + data.unread
      }
      sessions.splice(index, 1)
      sessions.unshift((existingSession as Session))
    } else {
      const newSession = this._createSession(id, data)
      sessions.unshift(newSession)
    }
     // Manually trigger update for useStorage
    this._sessions.value = [...sessions]
  }

  public getSession(id: string): Session | undefined {
    return this.sessions.value.find(s => s.id === id)
  }

  public async removeSession(id: string): Promise<void> {
    const sessions = this._sessions.value
    const index = sessions.findIndex(s => s.id === id)
    if (index !== -1) {
      sessions.splice(index, 1)
      this._sessions.value = [...sessions] // Trigger update
      await db.messages.where({ sessionId: id }).delete()
      delete this.records.value[id]
    }
  }

  public clearUnread(id: string): void {
    const session = this._sessions.value.find(s => s.id === id)
    if (session) {
      session.unread = 0
      this._sessions.value = [...this._sessions.value] // Trigger update
    }
  }

  public async getMsgList(id: string): Promise<ChatMsg[]> {
    if (!this.records.value[id]) {
      const messages = await db.messages.where({ sessionId: id }).sortBy('time')
      this.records.value[id] = messages
    }
    return this.records.value[id]
  }

  public async addMsg(id: string, msg: ChatMsg): Promise<void> {
    const messageList = await this.getMsgList(id)
    if (messageList.some(m => m.message_id > 0 && m.message_id === msg.message_id)) {
      return
    }
    messageList.push(msg)

    if (msg.message_id > 0 && !msg.isSystem) {
      await db.messages.put({ ...msg, sessionId: id })
    }

    const isTop = this.sessions.value[0]?.id === id
    this.updateSession(id, {
      time: msg.time * 1000,
      preview: this._generatePreview(msg),
      unread: isTop ? 0 : 1, // If session is already active, don't increment unread
    })
  }

  public addSystemMsg(id: string, text: string): void {
    this.addMsg(id, {
      post_type: 'message',
      message_id: -Math.random(),
      time: Date.now() / 1000,
      message_type: id.length > 5 ? 'group' : 'private',
      sender: { user_id: 0, nickname: 'System' },
      message: [{ type: 'text', data: { text } }],
      isSystem: true,
    })
  }

  public async fetchHistory(id: string): Promise<void> {
    if (this.historyLoading.value[id] || this.historyFinished.value[id]) return

    this.historyLoading.value[id] = true
    try {
      const messageList = await this.getMsgList(id)
      const earliestMsg = messageList.find(m => m.message_id > 0)
      const seq = earliestMsg?.real_id || earliestMsg?.message_id
      const isGroup = this.getSession(id)?.type === 'group'

      const { messages = [] } = isGroup
        ? await bot.getGroupMsgHistory(Number(id), seq)
        : await bot.getFriendMsgHistory(Number(id), seq)

      if (messages.length === 0) {
        this.historyFinished.value[id] = true
      } else {
        const newMessages: StoredChatMsg[] = messages.map((m: any) => ({
          ...m,
          sessionId: id,
          message_type: isGroup ? 'group' : 'private',
          message: typeof m.message === 'string' ? parseMsgList(m.message).raw : m.message,
        }))
        await db.messages.bulkPut(newMessages)
        this.records.value[id] = [...newMessages.reverse(), ...messageList]
      }
    } catch (error) {
      console.error(`[DataStore] 拉取会话 ${id} 历史记录失败:`, error)
    } finally {
      this.historyLoading.value[id] = false
    }
  }

  public async sendMsg(id: string, content: string | MessageSegment[], replyId?: number): Promise<void> {
    const isGroup = this.getSession(id)?.type === 'group'
    const messageChain: MessageSegment[] = []
    if (replyId) messageChain.push({ type: 'reply', data: { id: String(replyId) } })

    const contentSegments = typeof content === 'string'
      ? [{ type: 'text' as const, data: { text: content } }]
      : content;
    messageChain.push(...contentSegments)

    const sender = settingsStore.user.value
    const tempMsg: ChatMsg = {
      post_type: 'message',
      message_id: 0,
      time: Date.now() / 1000,
      message_type: isGroup ? 'group' : 'private',
      sender: { user_id: sender?.user_id ?? 0, nickname: sender?.nickname ?? '我' },
      message: messageChain,
      status: 'sending',
    }

    this.addMsg(id, tempMsg)

    try {
      const { message_id } = await bot.sendMsg({
        message_type: isGroup ? 'group' : 'private',
        [isGroup ? 'group_id' : 'user_id']: Number(id),
        message: messageChain,
      })

      tempMsg.status = 'success'
      tempMsg.message_id = message_id
      await db.messages.put({ ...tempMsg, sessionId: id })
    } catch (error) {
      tempMsg.status = 'fail'
      console.error(`[DataStore] 发送消息至 ${id} 失败:`, error)
    }
  }

  public async recallMsg(id: string, msgId: number): Promise<void> {
    const messageList = await this.getMsgList(id)
    const targetMsg = messageList.find(m => m.message_id === msgId)

    if (targetMsg) {
      if (settingsStore.config.value.enableAntiRecall) {
        targetMsg.recalled = true
        await db.messages.update(msgId, { recalled: true })
      } else {
        const index = messageList.indexOf(targetMsg)
        if (index > -1) messageList.splice(index, 1)

        await db.messages.delete(msgId)
        this.addSystemMsg(id, `“${targetMsg.sender.nickname}” 撤回了一条消息`)
      }
    }
  }
}

/** 导出的 DataStore 全局单例。 */
export const dataStore = new DataStore()
