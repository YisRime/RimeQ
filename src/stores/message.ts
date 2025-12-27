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
// IndexedDB 配置 (保持不变，用于存储海量消息)
// ============================================================================

export interface StoredChatMsg extends ChatMsg {
  sessionId: string
}

class RimeQDB extends Dexie {
  public messages!: Table<StoredChatMsg, number>

  constructor() {
    super('RimeQDB')
    this.version(1).stores({
      messages: 'message_id, sessionId, [sessionId+time]'
    })
  }
}

const db = new RimeQDB()

// ============================================================================
// Store 定义
// ============================================================================

export const useMessageStore = defineStore('message', () => {
  const sessionStore = useSessionStore()
  const settingStore = useSettingStore()

  // ============================================================================
  // 纯内存状态 (Memory State) - 切换会话或刷新后重置
  // ============================================================================

  const activeChatId = ref<string>('')  // 当前激活的会话 ID
  const messages = ref<ChatMsg[]>([])   // 当前视图的消息列表
  const isLoading = ref(false)          // 加载中状态
  const isFinished = ref(false)         // 历史记录是否拉取完毕

  // ============================================================================
  // 动作
  // ============================================================================

  /**
   * 切换当前会话 (进入聊天页面时调用)
   */
  async function openSession(id: string) {
    if (activeChatId.value === id) return

    // 1. 状态重置
    activeChatId.value = id
    messages.value = []
    isLoading.value = true
    isFinished.value = false

    // 2. 清除该会话的未读数
    sessionStore.clearUnread(id)

    try {
      // 3. 从 IndexedDB 加载最近 50 条
      const history = await db.messages
        .where({ sessionId: id })
        .reverse()
        .limit(50)
        .toArray()

      // 4. 存入内存时转回正序
      messages.value = history.reverse()

      // 5. 数据太少自动拉取云端
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
   * 拉取云端历史记录
   */
  async function fetchCloudHistory(id: string) {
    if (isLoading.value || isFinished.value) return
    isLoading.value = true

    try {
      const earliestMsg = messages.value.find(m => m.message_id > 0)
      const seq = earliestMsg?.real_id || earliestMsg?.message_id

      const session = sessionStore.getSession(id)
      const isGroup = session?.type === 'group' || id.length > 5

      const res = isGroup
        ? await bot.getGroupMsgHistory(Number(id), seq)
        : await bot.getFriendMsgHistory(Number(id), seq)

      if (!res.messages || res.messages.length === 0) {
        isFinished.value = true
      } else {
        const newMsgs = res.messages.map((m: any) => ({
          ...m,
          sessionId: id,
          message_type: isGroup ? 'group' : 'private',
          message: typeof m.message === 'string' ? parseMsgList(m.message).raw : m.message,
        })) as StoredChatMsg[]

        // 存入 DB
        await db.messages.bulkPut(newMsgs)

        // 如果是当前会话，更新内存
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
    // 1. 始终写入 DB
    await db.messages.put({ ...msg, sessionId: id })

    // 2. 如果是当前会话，推入内存
    if (activeChatId.value === id) {
      if (!messages.value.some(m => m.message_id === msg.message_id)) {
        messages.value.push(msg)
      }
    }

    // 3. 更新会话列表预览
    const preview = _generatePreview(msg)
    const unreadInc = activeChatId.value === id ? 0 : 1

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

    const chain: MessageSegment[] = []
    if (replyId) chain.push({ type: 'reply', data: { id: String(replyId) } })
    const body = typeof content === 'string' ? [{ type: 'text', data: { text: content } }] : content
    chain.push(...(body as MessageSegment[]))

    const tempMsg: ChatMsg = {
      post_type: 'message',
      message_id: 0,
      time: Date.now() / 1000,
      message_type: isGroup ? 'group' : 'private',
      sender: {
        user_id: settingStore.user?.user_id || 0,
        nickname: settingStore.user?.nickname || '我'
      },
      message: chain,
      status: 'sending'
    }

    // 立即上屏
    if (activeChatId.value === id) {
      messages.value.push(tempMsg)
    }

    try {
      const { message_id } = await bot.sendMsg({
        message_type: isGroup ? 'group' : 'private',
        [isGroup ? 'group_id' : 'user_id']: Number(id),
        message: chain
      })

      tempMsg.status = 'success'
      tempMsg.message_id = message_id

      // 存入 DB
      await db.messages.put({ ...tempMsg, sessionId: id })

      // 更新会话
      sessionStore.updateSession(id, {
        time: Date.now(),
        preview: _generatePreview(tempMsg),
        unread: 0
      })

    } catch (e) {
      console.error('Send failed', e)
      tempMsg.status = 'fail'
    }
  }

  /**
   * 撤回消息
   */
  async function recallMessage(msgId: number) {
    const msg = messages.value.find(m => m.message_id === msgId)
    if (msg) {
      if (settingStore.config.enableAntiRecall) {
        msg.recalled = true
        await db.messages.update(msgId, { recalled: true })
      } else {
        const idx = messages.value.indexOf(msg)
        if (idx > -1) messages.value.splice(idx, 1)
        await db.messages.delete(msgId)
      }
    }
  }

  function _generatePreview(msg: ChatMsg): string {
    if (msg.isSystem) return '[系统消息]'

    // 生成内容摘要
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
          .map(s => s.data.text)
          .join('')
    }

    // 如果是群聊，前缀增加发送者昵称
    if (msg.message_type === 'group') {
      const name = msg.sender.card || msg.sender.nickname
      if (name) {
        return `${name}: ${content}`
      }
    }

    return content
  }

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
