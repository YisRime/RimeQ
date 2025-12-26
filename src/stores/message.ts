import { defineStore } from 'pinia'
import { ref } from 'vue'
import Dexie, { type Table } from 'dexie'
import { bot } from '@/api'
import { useSessionStore } from './session'
import { useSettingStore } from './setting'
import { determineMsgType, parseMsgList } from '@/utils/msg-parser'
import { MsgType } from '@/types'
import type { ChatMsg } from '@/utils/msg-parser' // 假设这里定义了基础 ChatMsg
import type { MessageSegment } from '@/types'

// 扩展 ChatMsg 接口以包含数据库所需的索引字段
export interface StoredChatMsg extends ChatMsg {
  sessionId: string // 必须包含，用于索引查询
}

class RimeQDB extends Dexie {
  // 只保留消息表
  public messages!: Table<StoredChatMsg, number>

  constructor() {
    super('RimeQDB')
    // 简化版本管理，确保只包含 messages 表
    // 索引：message_id (主键), sessionId (查询某人), [sessionId+time] (排序分页)
    this.version(1).stores({
      messages: 'message_id, sessionId, [sessionId+time]'
    })
  }
}

// 实例化数据库
const db = new RimeQDB()

// ============================================================================
// 2. Message Store 定义
// ============================================================================

export const useMessageStore = defineStore('message', () => {
  const sessionStore = useSessionStore()
  const settingStore = useSettingStore()

  // === State ===

  // 当前激活的会话 ID
  const activeChatId = ref<string>('')
  // 当前会话的内存消息列表 (用于 UI 渲染)
  const messages = ref<ChatMsg[]>([])
  // 加载状态
  const isLoading = ref(false)
  // 历史记录是否拉取完毕
  const isFinished = ref(false)

  // === Actions ===

  /**
   * 切换当前会话 (进入聊天页面时调用)
   * @param id 会话ID (群号或QQ号)
   */
  async function openSession(id: string) {
    if (activeChatId.value === id) return

    // 1. 状态重置
    activeChatId.value = id
    messages.value = []
    isLoading.value = true
    isFinished.value = false

    // 2. 清除该会话的未读数 (调用内存中的 sessionStore)
    sessionStore.clearUnread(id)

    try {
      // 3. 从 IndexedDB 加载最近 50 条
      // 使用 sessionId 索引查找
      const history = await db.messages
        .where({ sessionId: id })
        .reverse() // 倒序取最新的
        .limit(50)
        .toArray()

      // 4. 存入内存时转回正序 (旧 -> 新)
      messages.value = history.reverse()

      // 5. 如果 DB 里数据太少，自动触发一次云端拉取
      if (messages.value.length < 5) {
        await fetchCloudHistory(id)
      }
    } catch (e) {
      console.error('[MsgStore] DB load failed', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 拉取云端历史记录 (滚动到顶部时调用)
   */
  async function fetchCloudHistory(id: string) {
    if (isLoading.value || isFinished.value) return
    isLoading.value = true

    try {
      // 获取当前最老一条消息的 ID，作为锚点
      const earliestMsg = messages.value.find(m => m.message_id > 0)
      const seq = earliestMsg?.real_id || earliestMsg?.message_id

      const session = sessionStore.getSession(id)
      const isGroup = session?.type === 'group' || id.length > 5

      // 调用 Bot API
      const res = isGroup
        ? await bot.getGroupMsgHistory(Number(id), seq)
        : await bot.getFriendMsgHistory(Number(id), seq)

      if (!res.messages || res.messages.length === 0) {
        isFinished.value = true
      } else {
        // 格式化消息并添加 sessionId 字段
        const newMsgs = res.messages.map((m: any) => ({
          ...m,
          sessionId: id, // 关键：标记归属
          message_type: isGroup ? 'group' : 'private',
          message: typeof m.message === 'string' ? parseMsgList(m.message).raw : m.message,
        })) as StoredChatMsg[]

        // 存入 DB (bulkPut 性能更好)
        await db.messages.bulkPut(newMsgs)

        // 如果是当前会话，合并到内存头部
        if (activeChatId.value === id) {
          messages.value = [...newMsgs, ...messages.value]
        }
      }
    } catch (e) {
      console.error('[MsgStore] History fetch failed', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 接收新消息 (WebSocket 推送)
   */
  async function receiveMessage(id: string, msg: ChatMsg) {
    // 1. 始终写入 IndexedDB
    await db.messages.put({ ...msg, sessionId: id })

    // 2. 如果是当前打开的会话，推入内存数组，实现实时上屏
    if (activeChatId.value === id) {
      if (!messages.value.some(m => m.message_id === msg.message_id)) {
        messages.value.push(msg)
      }
    }

    // 3. 更新会话列表预览 (无论是否打开)
    const preview = _generatePreview(msg)
    // 如果不是当前会话，unread + 1
    const unreadInc = activeChatId.value === id ? 0 : 1

    // 调用 SessionStore 更新内存列表
    sessionStore.updateSession(id, {
      time: msg.time * 1000,
      preview,
      unread: unreadInc
    })
  }

  /**
   * 发送消息
   */
  async function sendMessage(id: string, content: string | MessageSegment[], replyId?: number) {
    const session = sessionStore.getSession(id)
    const isGroup = session?.type === 'group' || id.length > 5

    // 构造消息链
    const chain: MessageSegment[] = []
    if (replyId) chain.push({ type: 'reply', data: { id: String(replyId) } })
    const body = typeof content === 'string' ? [{ type: 'text', data: { text: content } }] : content
    chain.push(...(body as MessageSegment[]))

    // 构造临时消息 (Optimistic UI)
    const tempMsg: ChatMsg = {
      post_type: 'message',
      message_id: 0, // 临时 ID
      time: Date.now() / 1000,
      message_type: isGroup ? 'group' : 'private',
      sender: {
        user_id: settingStore.user?.user_id || 0,
        nickname: settingStore.user?.nickname || '我'
      },
      message: chain,
      status: 'sending'
    }

    // 1. 立即上屏
    if (activeChatId.value === id) {
      messages.value.push(tempMsg)
    }

    try {
      // 2. 调用 API 发送
      const { message_id } = await bot.sendMsg({
        message_type: isGroup ? 'group' : 'private',
        [isGroup ? 'group_id' : 'user_id']: Number(id),
        message: chain
      })

      // 3. 发送成功，修正 ID 和状态
      tempMsg.status = 'success'
      tempMsg.message_id = message_id

      // 4. 存入 IndexedDB (更新记录)
      await db.messages.put({ ...tempMsg, sessionId: id })

      // 5. 更新会话列表预览
      sessionStore.updateSession(id, {
        time: Date.now(),
        preview: _generatePreview(tempMsg),
        unread: 0 // 自己发送的，未读置0
      })

    } catch (e) {
      console.error('Send failed', e)
      tempMsg.status = 'fail'
      // 失败也要存库，或者仅在内存提示? 这里选择存库以便重试
      // await db.messages.put({ ...tempMsg, sessionId: id })
    }
  }

  /**
   * 撤回消息
   */
  async function recallMessage(msgId: number) {
    // 内存处理
    const msg = messages.value.find(m => m.message_id === msgId)
    if (msg) {
      if (settingStore.config.enableAntiRecall) {
        // 1. 防撤回模式：仅标记
        msg.recalled = true
        await db.messages.update(msgId, { recalled: true })
      } else {
        // 2. 普通模式：物理删除
        const idx = messages.value.indexOf(msg)
        if (idx > -1) messages.value.splice(idx, 1)
        await db.messages.delete(msgId)
      }
    }
  }

  // 内部辅助: 生成预览文本
  function _generatePreview(msg: ChatMsg): string {
    if (msg.isSystem) return '[系统消息]'
    const type = determineMsgType(msg.message)
    switch (type) {
      case MsgType.Image: return '[图片]'
      case MsgType.Record: return '[语音]'
      case MsgType.File: return '[文件]'
      case MsgType.Json: return '[卡片]'
      case MsgType.Markdown: return '[Markdown]'
      default:
        return msg.message
          .filter(s => s.type === 'text')
          .map(s => s.data.text)
          .join('')
    }
  }

  // 辅助: 导出 clearDB 方法供设置页面的“重置”功能使用
  async function clearDatabase() {
    await db.delete()
    await db.open()
  }

  return {
    activeChatId,
    messages,
    isLoading,
    isFinished,
    openSession,
    fetchCloudHistory,
    receiveMessage,
    sendMessage,
    recallMessage,
    clearDatabase
  }
})

