import { defineStore } from 'pinia'
import { ref } from 'vue'
import Dexie, { type Table } from 'dexie'
import { bot } from '@/api'
import { useSessionStore } from './session'
import { useSettingStore } from './setting'
import { determineMsgType, parseMsgList } from '@/utils/msg-parser'
import { MsgType } from '@/types'
import type { ChatMsg } from '@/utils/msg-parser'
import type { MessageSegment } from '@/types'

// ============================================================================
// IndexedDB 配置
// 使用 Dexie.js 封装 IndexedDB，用于高效存储大量聊天记录
// ============================================================================

// 定义存储在数据库中的消息结构，继承自 ChatMsg 并添加 sessionId
export interface StoredChatMsg extends ChatMsg {
  sessionId: string
}

// 定义 Dexie 数据库类
class RimeQDB extends Dexie {
  public messages!: Table<StoredChatMsg, number> // 定义 messages 表

  constructor() {
    super('RimeQDB')
    // 定义数据库版本和表结构，'message_id' 是主键，'sessionId' 是索引
    this.version(1).stores({
      messages: 'message_id, sessionId, [sessionId+time]'
    })
  }
}

const db = new RimeQDB() // 实例化数据库

// ============================================================================
// Store 定义
// ============================================================================

export const useMessageStore = defineStore('message', () => {
  const sessionStore = useSessionStore() // 引入会话 Store
  const settingStore = useSettingStore() // 引入设置 Store

  // ============================================================================
  // 内存状态 (State)
  // 这些状态仅在应用运行时存在于内存中，用于驱动当前聊天视图
  // ============================================================================

  const activeChatId = ref<string>('')  // 当前激活的会话 ID
  const messages = ref<ChatMsg[]>([])   // 当前聊天窗口的消息列表
  const isLoading = ref(false)          // 是否正在加载历史消息
  const isFinished = ref(false)         // 是否已加载完所有历史消息

  // ============================================================================
  // 动作 (Actions)
  // ============================================================================

  /**
   * 打开并切换到指定会话
   */
  async function openSession(id: string) {
    if (activeChatId.value === id) return // 如果已经是当前会话，则不执行任何操作

    // 1. 重置当前聊天窗口的状态
    activeChatId.value = id
    messages.value = []
    isLoading.value = true
    isFinished.value = false

    // 2. 清除该会话的未读标记
    sessionStore.clearUnread(id)

    try {
      // 3. 从 IndexedDB 中加载最近的 50 条历史消息
      const history = await db.messages
        .where({ sessionId: id })
        .reverse()
        .limit(50)
        .toArray()

      // 4. 将加载的消息（逆序）转为正序后存入内存
      messages.value = history.reverse()

      // 5. 如果本地消息过少，则自动从云端拉取更多
      if (messages.value.length < 5) {
        await fetchCloudHistory(id)
      }
    } catch (e) {
      console.error('[MsgStore] 从数据库加载消息失败', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 从云端（通过 API）拉取更早的历史消息
   */
  async function fetchCloudHistory(id: string) {
    if (isLoading.value || isFinished.value) return // 防止重复加载

    isLoading.value = true

    try {
      // 找到当前消息列表中最早的一条消息，以其 seq 作为分页拉取的锚点
      const earliestMsg = messages.value.find(m => m.message_id > 0)
      const seq = earliestMsg?.real_id || earliestMsg?.message_id

      const session = sessionStore.getSession(id)
      const isGroup = session?.type === 'group' || id.length > 5

      // 根据会话类型调用不同的 API
      const res = isGroup
        ? await bot.getGroupMsgHistory(Number(id), seq)
        : await bot.getFriendMsgHistory(Number(id), seq)

      if (!res.messages || res.messages.length === 0) {
        isFinished.value = true // 如果没有更多消息，则标记为已加载完毕
      } else {
        // 格式化收到的消息并准备写入数据库
        const newMsgs = res.messages.map((m: any) => ({
          ...m,
          sessionId: id,
          message_type: isGroup ? 'group' : 'private',
          message: typeof m.message === 'string' ? parseMsgList(m.message).raw : m.message,
        })) as StoredChatMsg[]

        await db.messages.bulkPut(newMsgs) // 批量写入数据库

        // 如果拉取的是当前会话的消息，则更新内存中的列表
        if (activeChatId.value === id) {
          messages.value = [...newMsgs, ...messages.value]
        }
      }
    } catch (e) {
      console.error('[MsgStore] 拉取历史消息失败', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 接收来自 WebSocket 的新消息推送
   */
  async function receiveMessage(id: string, msg: ChatMsg) {
    // 1. 无论如何，先将新消息存入数据库
    await db.messages.put({ ...msg, sessionId: id })

    // 2. 如果消息属于当前打开的聊天窗口，则直接推入内存列表以实时显示
    if (activeChatId.value === id) {
      if (!messages.value.some(m => m.message_id === msg.message_id)) {
        messages.value.push(msg)
      }
    }

    // 3. 更新会话列表的显示（预览、时间、未读数）
    const preview = _generatePreview(msg)
    // 只有当消息不属于当前窗口时，未读数才+1
    const unreadInc = activeChatId.value === id ? 0 : 1

    // 调用 sessionStore 的 Upsert 方法，自动创建或更新会话
    sessionStore.updateSession(id, {
      time: msg.time * 1000,
      preview,
      unread: unreadInc,
      type: msg.message_type // 首次创建时需要类型信息
    })
  }

  /**
   * 发送消息 (采用服务器权威模式)
   */
  async function sendMessage(id: string, content: string | MessageSegment[], replyId?: number) {
    const session = sessionStore.getSession(id)
    const isGroup = session?.type === 'group' || id.length > 5

    // 构建消息链数组
    const chain: MessageSegment[] = []
    if (replyId) chain.push({ type: 'reply', data: { id: String(replyId) } })
    const body = typeof content === 'string' ? [{ type: 'text', data: { text: content } }] : content
    chain.push(...(body as MessageSegment[]))

    try {
      // 直接调用 API 发送，不进行本地的“乐观更新”
      // UI 的更新将完全依赖于稍后服务端通过 WebSocket 推送回来的消息事件
      await bot.sendMsg({
        message_type: isGroup ? 'group' : 'private',
        [isGroup ? 'group_id' : 'user_id']: Number(id),
        message: chain
      })
    } catch (e) {
      // 发送失败仅在控制台报告错误，不做任何 UI 上的处理
      console.error('消息发送失败:', e)
    }
  }

  /**
   * 处理消息撤回事件
   */
  async function recallMessage(msgId: number) {
    const msg = messages.value.find(m => m.message_id === msgId)
    if (msg) {
      // 如果开启了防撤回
      if (settingStore.config.enableAntiRecall) {
        msg.recalled = true // 在内存中标记为已撤回
        await db.messages.update(msgId, { recalled: true }) // 在数据库中也标记
      } else {
        // 否则直接从列表和数据库中删除
        const idx = messages.value.indexOf(msg)
        if (idx > -1) messages.value.splice(idx, 1)
        await db.messages.delete(msgId)
      }
    }
  }

  // 生成会话列表的预览文本
  function _generatePreview(msg: ChatMsg): string {
    if (msg.isSystem) return '[系统消息]'

    let content = ''
    const type = determineMsgType(msg.message)
    switch (type) {
      case MsgType.Image: content = '[图片]'; break
      case MsgType.Record: content = '[语音]'; break
      case MsgType.File: content = '[文件]'; break
      case MsgType.Json: content = '[卡片]'; break
      case MsgType.Markdown: content = '[Markdown]'; break
      default:
        content = msg.message
          .filter(s => s.type === 'text')
          .map(s => s.data.text || '')
          .join('')
    }

    // 如果是群聊，在预览前加上发送者昵称
    if (msg.message_type === 'group') {
      const name = msg.sender.card || msg.sender.nickname
      if (name) {
        return `${name}: ${content}`
      }
    }

    return content
  }

  // 清空整个消息数据库
  async function clearDatabase() {
    await db.delete()
    await db.open() // 重新打开数据库以备后续使用
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
