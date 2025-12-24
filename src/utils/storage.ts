import { ref, watch, type Ref } from 'vue'
import { useStorage } from '@vueuse/core'
import Dexie, { type Table } from 'dexie'
import { bot } from '@/api'
import { determineMsgType, parseMsgList } from '@/utils/msg-parser'
import { settingsStore } from './settings'
import { MsgType } from '@/types'
import type {
  FriendInfo, GroupInfo, GroupMemberInfo,
  SystemNotice, Message, MessageSegment
} from '@/types'

// =========================================================================================
// 类型定义 (Types)
// =========================================================================================

// 定义会话列表项的结构
export interface Session {
  id: string
  type: 'private' | 'group'
  name: string
  avatar: string
  preview: string
  time: number
  unread: number
}

// 定义聊天消息的结构, 扩展了基础消息类型
export type ChatMsg = Message & {
  status?: 'sending' | 'success' | 'fail' // 消息发送状态
  recalled?: boolean // 是否被撤回
  isSystem?: boolean // 是否为系统消息
}

// 定义存储在 IndexedDB 中的消息结构, 增加了会话ID用于索引
export interface StoredChatMsg extends ChatMsg {
  sessionId: string
}

// =========================================================================================
// IndexedDB 数据库定义 (使用 Dexie)
// =========================================================================================

// 定义一个继承自 Dexie 的类来描述数据库结构
class RimeQDB extends Dexie {
  // 'messages' 是表名, Table<StoredChatMsg, number> 定义了表中的对象类型和主键类型
  messages!: Table<StoredChatMsg, number>

  constructor() {
    super('RimeQDB') // 定义数据库名称
    this.version(1).stores({
      // 定义表结构: 'messages' 表, 'message_id'为主键, 'sessionId'为索引, '[sessionId+time]'为复合索引
      messages: 'message_id, sessionId, [sessionId+time]'
    })
  }
}

// 创建并导出数据库的全局单例
const db = new RimeQDB()

// =========================================================================================
// 带过期时间的持久化存储 (Expirable Storage)
// =========================================================================================

// 帮助类型：为存储的数据包裹一层，包含数据本身和过期时间戳
interface StoredWithTTL<T> {
  data: T
  expires: number
}
// 预设过期时间
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000 // 7天过期时间
const ONE_DAY_MS = 24 * 60 * 60 * 1000      // 新增：1天过期时间

/**
 * 创建一个带过期时间的 useStorage 包装器
 * @param key localStorage 的键
 * @param defaultValue 默认值
 * @param ttlMs 过期时间(毫秒), 默认为7天
 * @returns 一个响应式的 ref，其行为类似 useStorage，但增加了过期逻辑
 */
function createExpirableStorage<T>(key: string, defaultValue: T, ttlMs: number = SEVEN_DAYS_MS): Ref<T> {
  const storage = useStorage<StoredWithTTL<T> | null>(key, null)

  // 启动时检查数据是否已过期
  if (storage.value && Date.now() > storage.value.expires) {
    storage.value = null // 已过期，清空
  }

  // 如果 storage 为空 (首次使用或已过期), 则进行初始化
  if (!storage.value) {
    storage.value = {
      data: defaultValue,
      expires: Date.now() + ttlMs
    }
  }

  // 创建一个 ref，使其与 storage 中实际的 'data' 部分同步
  const dataRef = ref(storage.value.data) as Ref<T>

  // 监听 dataRef 的变化，当数据被修改时，更新 localStorage 并重置过期时间
  watch(
    dataRef,
    (newData) => {
      storage.value = {
        data: newData,
        expires: Date.now() + ttlMs // 每次写入都刷新过期时间
      }
    },
    { deep: true }
  )

  return dataRef
}

// =========================================================================================
// 数据存储核心类 (DataStore)
// =========================================================================================

export class DataStore {
  // --- 持久化存储 (localStorage, 带过期) ---
  // 应用：为 friends 和 groups 设置1天过期
  friends = createExpirableStorage<FriendInfo[]>('rimeq_friends', [], ONE_DAY_MS) // 好友列表 (1天)
  groups = createExpirableStorage<GroupInfo[]>('rimeq_groups', [], ONE_DAY_MS)   // 群组列表 (1天)
  // 以下保持默认7天过期
  sessions = createExpirableStorage<Session[]>('rimeq_sessions', [])           // 会话列表 (7天)
  notices = createExpirableStorage<SystemNotice[]>('rimeq_notices', [])       // 系统通知列表 (7天)

  // --- 运行时内存缓存 (RAM) ---
  members = ref<Record<string, GroupMemberInfo[]>>({}) // 群成员列表缓存 (RAM)
  records = ref<Record<string, ChatMsg[]>>({}) // 当前活跃会话的聊天记录缓存
  historyLoading = ref<Record<string, boolean>>({}) // 各会话历史记录的加载状态
  historyFinished = ref<Record<string, boolean>>({}) // 各会话历史记录是否已全部加载完毕

  // 构造函数: 初始化时对会话列表按时间排序
  constructor() {
    this.sessions.value.sort((a, b) => b.time - a.time)
  }

  // 更新或创建会话
  updateSession(id: string, data: Partial<Session>) {
    const idx = this.sessions.value.findIndex((s) => s.id === id)
    if (idx !== -1) {
      // 如果会话已存在, 更新数据并移至列表顶部
      const item = this.sessions.value[idx]!
      Object.assign(item, data)
      if (data.unread && data.unread > 0 && item.unread < 99) {
        item.unread += data.unread
      }
      this.sessions.value.splice(idx, 1)
      this.sessions.value.unshift(item)
    } else {
      // 如果是新会话, 创建并添加到列表顶部
      const isGroup = data.type === 'group' || id.length > 5
      let name = id,
        avatar = ''
      if (isGroup) {
        const g = this.groups.value.find((i) => String(i.group_id) === id)
        name = g?.group_name || `群 ${id}`
        avatar = `https://p.qlogo.cn/gh/${id}/${id}/0`
      } else {
        const f = this.friends.value.find((i) => String(i.user_id) === id)
        name = f?.remark || f?.nickname || `用户 ${id}`
        avatar = `https://q1.qlogo.cn/g?b=qq&s=0&nk=${id}`
      }
      this.sessions.value.unshift({
        id,
        type: isGroup ? 'group' : 'private',
        name,
        avatar,
        preview: '',
        time: Date.now(),
        unread: 1,
        ...data
      })
    }
  }

  // 获取单个会话对象
  getSession(id: string) {
    return this.sessions.value.find((s) => s.id === id)
  }

  // 移除会话及其所有聊天记录
  async removeSession(id: string) {
    const idx = this.sessions.value.findIndex((s) => s.id === id)
    if (idx !== -1) {
      this.sessions.value.splice(idx, 1) // 从会话列表移除
      await db.messages.where('sessionId').equals(id).delete() // 从 IndexedDB 删除消息
      delete this.records.value[id] // 从内存缓存移除
    }
  }

  // 清除指定会话的未读计数
  clearUnread(id: string) {
    const s = this.sessions.value.find((i) => i.id === id)
    if (s) s.unread = 0
  }

  // 获取消息列表 (优先从内存缓存读取, 否则从 IndexedDB 加载)
  async getMsgList(id: string): Promise<ChatMsg[]> {
    if (!this.records.value[id]) {
      // 检查内存缓存, 如果不存在则从 IndexedDB 加载
      const messages = await db.messages.where('sessionId').equals(id).sortBy('time')
      this.records.value[id] = messages
    }
    return this.records.value[id]
  }

  // 添加一条新消息 (存入内存和 IndexedDB)
  async addMsg(id: string, msg: ChatMsg) {
    const list = await this.getMsgList(id) // 确保消息列表已加载到内存
    if (list.some((m) => m.message_id === msg.message_id && m.message_id > 0)) return // 避免重复添加

    list.push(msg)

    // 将消息存入 IndexedDB (系统消息和发送中消息除外)
    if (msg.message_id !== 0 && !msg.isSystem) {
      await db.messages.put({ ...msg, sessionId: id })
    }

    // 更新会话的预览文本和时间
    const type = determineMsgType(msg.message)
    const preview =
      type === MsgType.Image
        ? '[图片]'
        : type === MsgType.Record
          ? '[语音]'
          : type === MsgType.File
            ? '[文件]'
            : msg.message
                .filter((s) => s.type === 'text')
                .map((s) => s.data.text)
                .join('') || '[消息]'

    this.updateSession(id, { time: msg.time * 1000, preview, unread: 1 })
  }

  // 添加一条系统提示消息
  addSystemMsg(id: string, text: string) {
    const sysMsg: ChatMsg = {
      post_type: 'message',
      message_id: -Math.random(),
      time: Date.now() / 1000,
      message_type: id.length > 5 ? 'group' : 'private',
      sender: { user_id: 0, nickname: 'System' },
      message: [{ type: 'text', data: { text } }],
      isSystem: true
    }
    this.addMsg(id, sysMsg)
  }

  // 从服务器拉取历史消息
  async fetchHistory(id: string) {
    if (this.historyLoading.value[id] || this.historyFinished.value[id]) return // 防止重复加载
    this.historyLoading.value[id] = true

    try {
      const list = await this.getMsgList(id)
      const first = list.find((m) => m.message_id > 0)
      const seq = first?.real_id || first?.message_id // 获取当前最早消息的序列号, 用于增量拉取
      const isGroup = id.length > 5

      // 调用 API 获取历史消息
      const res = isGroup
        ? await bot.getGroupMsgHistory(Number(id), seq)
        : await bot.getFriendMsgHistory(Number(id), seq)

      const msgs = res.messages || []
      if (msgs.length === 0) {
        this.historyFinished.value[id] = true // 标记历史记录已全部加载
      } else {
        const parsed: StoredChatMsg[] = msgs.map((m: any) => ({
          ...m,
          sessionId: id,
          message: typeof m.message === 'string' ? parseMsgList(m.message).raw : m.message,
          message_type: isGroup ? 'group' : 'private'
        }))

        await db.messages.bulkPut(parsed) // 将获取到的新消息批量存入 IndexedDB
        this.records.value[id] = [...parsed.reverse(), ...list] // 更新内存中的消息列表
      }
    } catch (e) {
      console.error('[DataStore] 获取历史记录失败', e)
    } finally {
      this.historyLoading.value[id] = false
    }
  }

  // 发送一条新消息
  async sendMsg(id: string, content: string | MessageSegment[], replyId?: number) {
    const isGroup = id.length > 5
    const chain: MessageSegment[] = []
    if (replyId) chain.push({ type: 'reply', data: { id: String(replyId) } }) // 构造回复消息段
    chain.push(...(typeof content === 'string' ? [{ type: 'text', data: { text: content } }] : content))

    // 1. 创建一个临时消息并立即显示在 UI 上
    const tempMsg: ChatMsg = {
      post_type: 'message',
      message_id: 0,
      time: Date.now() / 1000,
      message_type: isGroup ? 'group' : 'private',
      sender: {
        user_id: settingsStore.user.value?.user_id || 0,
        nickname: settingsStore.user.value?.nickname || '我'
      },
      message: chain,
      status: 'sending'
    }
    this.addMsg(id, tempMsg)

    try {
      // 2. 调用 API 发送消息
      const res = await bot.sendMsg({
        group_id: isGroup ? Number(id) : undefined,
        user_id: !isGroup ? Number(id) : undefined,
        message: chain
      })

      // 3. 根据结果更新消息状态和 ID
      tempMsg.status = 'success'
      if (res?.message_id) {
        tempMsg.message_id = res.message_id
        await db.messages.put({ ...tempMsg, sessionId: id }) // 用真实 ID 更新数据库记录
      }
    } catch (e) {
      tempMsg.status = 'fail'
      console.error('[DataStore] 发送消息失败', e)
    }
  }

  // 处理消息撤回
  async recallMsg(id: string, msgId: number) {
    const list = await this.getMsgList(id)
    const target = list.find((m) => m.message_id === msgId)

    if (target) {
      if (settingsStore.config.value.antiRecall) {
        // 如果开启了防撤回, 仅做标记
        target.recalled = true
        await db.messages.update(msgId, { recalled: true }) // 更新数据库中的记录
      } else {
        // 否则, 从数据库和内存中删除
        const idx = list.indexOf(target)
        if (idx > -1) list.splice(idx, 1)
        await db.messages.delete(msgId)
        this.addSystemMsg(id, `"${target.sender.nickname}" 撤回了一条消息`)
      }
    }
  }
}

// 导出 DataStore 的全局单例
export const dataStore = new DataStore()
