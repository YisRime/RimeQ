import { defineStore } from 'pinia'
import { ref } from 'vue'
import { bot } from '@/api'
import type { Message, MessageSegment } from '@/types'
import { MsgType } from '@/types'
import { parseMsgList, determineMsgType } from '@/utils/msg-parser'
import { useContactsStore } from './contacts'
import { useAccountsStore } from './accounts'
import { useInterfaceStore } from './interface'
import { useSettingsStore } from './settings'

/** 扩展后的消息模型 */
export type ChatMsg = Message & {
  /** 发送状态 */
  status?: 'sending' | 'success' | 'fail'
  /** 是否已被撤回 (防撤回标记) */
  recalled?: boolean
}

/**
 * 消息 Store
 * 管理聊天记录、消息收发与历史记录
 */
export const useMessagesStore = defineStore('messages', () => {
  const contacts = useContactsStore()
  const accounts = useAccountsStore()
  const iface = useInterfaceStore() // Interface Store
  const settings = useSettingsStore()

  // --- State ---

  /** 聊天记录 (Key: PeerID) */
  const records = ref<Record<string, ChatMsg[]>>({})

  /** 历史记录加载中状态 */
  const loading = ref<Record<string, boolean>>({})

  /** 历史记录是否已无更多 */
  const finished = ref<Record<string, boolean>>({})

  // --- Actions ---

  /**
   * 获取指定会话的消息列表
   * @param id - 会话 ID
   */
  function getList(id: string): ChatMsg[] {
    if (!records.value[id]) records.value[id] = []
    return records.value[id]
  }

  /**
   * 添加一条消息到记录
   * @param id - 会话 ID
   * @param msg - 消息对象
   */
  function addMsg(id: string, msg: ChatMsg) {
    const list = getList(id)
    // 去重 (防止重复推送)
    if (list.some(m => m.message_id === msg.message_id && m.message_id !== 0)) return

    list.push(msg)

    // 生成预览文本并更新会话列表
    // 使用 determineMsgType 辅助函数
    const type = determineMsgType(msg.message)
    let preview = '[消息]'
    if (type === MsgType.Image) preview = '[图片]'
    else if (type === MsgType.Record) preview = '[语音]'
    else if (type === MsgType.File) preview = '[文件]'
    else {
      // 提取纯文本
      preview = msg.message.filter(s => s.type === 'text').map(s => s.data.text).join('') || '[消息]'
    }

    // 调用 Contacts Store 更新会话状态
    contacts.updateSession(id, {
      time: msg.time * 1000,
      preview: preview,
      unread: 1 // 默认增加未读，UI层逻辑可控制进入聊天清除
    })
  }

  /**
   * 添加系统提示消息 (仅本地显示)
   * @param id - 会话 ID
   * @param text - 提示内容
   */
  function addSystem(id: string, text: string) {
    const sysMsg: ChatMsg = {
      message_id: -Math.random(), // 负 ID 避免冲突
      time: Date.now() / 1000,
      message_type: id.length > 5 ? 'group' : 'private',
      sender: { user_id: 0, nickname: 'System' },
      message: [{ type: 'text', data: { text } }] // 渲染层需识别 System 类型特殊处理
    }
      // 强制标记类型供 UI 识别
      ; (sysMsg as any).isSystem = true
    addMsg(id, sysMsg)
  }

  /**
   * 拉取历史消息
   * @param id - 会话 ID
   */
  async function fetchHistory(id: string) {
    if (loading.value[id] || finished.value[id]) return
    loading.value[id] = true

    try {
      const list = getList(id)
      // 获取当前最早一条消息的 seq 作为游标
      const first = list.find(m => m.message_id > 0)
      const seq = first ? (first.real_id || first.message_id) : undefined
      const isGroup = id.length > 5

      let res: { messages: any[] }
      if (isGroup) {
        res = await bot.getGroupMsgHistory(Number(id), seq)
      } else {
        res = await bot.getFriendMsgHistory(Number(id), seq)
      }

      const msgs = res.messages || []
      if (msgs.length === 0) {
        finished.value[id] = true
      } else {
        // 解析并转换格式
        const parsed = msgs.map((m: any) => ({
          ...m,
          message: typeof m.message === 'string' ? parseMsgList(m.message).raw : m.message,
          message_type: isGroup ? 'group' : 'private'
        }))

        // 过滤重复并插入头部
        const newMsgs = parsed.filter((m: any) => !list.some(ex => ex.message_id === m.message_id))
        if (newMsgs.length > 0) {
          records.value[id] = [...newMsgs, ...list]
        } else {
          finished.value[id] = true
        }
      }
    } catch (e) {
      console.error('Fetch history failed', e)
    } finally {
      loading.value[id] = false
    }
  }

  /**
   * 发送消息
   * @param id - 目标 ID
   * @param content - 消息内容 (字符串或片段数组)
   */
  async function sendMsg(id: string, content: string | MessageSegment[]) {
    const isGroup = id.length > 5
    const chain: MessageSegment[] = []

    // 1. 处理回复 (从 Interface Store 获取状态)
    if (iface.replyTarget) {
      chain.push({
        type: 'reply',
        data: { id: String(iface.replyTarget.message_id) }
      })
      iface.setReply(null) // 发送后清除回复状态
    }

    // 2. 处理内容
    if (typeof content === 'string') {
      chain.push({ type: 'text', data: { text: content } })
    } else {
      chain.push(...content)
    }

    // 3. 乐观更新
    const tempMsg: ChatMsg = {
      message_id: 0,
      time: Date.now() / 1000,
      message_type: isGroup ? 'group' : 'private',
      sender: {
        user_id: accounts.user?.user_id || 0,
        nickname: accounts.user?.nickname || '我'
      },
      message: chain,
      status: 'sending'
    }
    addMsg(id, tempMsg)

    // 4. 网络请求
    try {
      const res = await bot.sendMsg({
        group_id: isGroup ? Number(id) : undefined,
        user_id: !isGroup ? Number(id) : undefined,
        message: chain
      })

      tempMsg.status = 'success'
      if (res && res.message_id) tempMsg.message_id = res.message_id
    } catch (e) {
      tempMsg.status = 'fail'
      console.error('Send failed', e)
    }
  }

  /**
   * 撤回消息
   * @param id - 会话 ID
   * @param msgId - 消息 ID
   */
  function recallMsg(id: string, msgId: number) {
    const list = records.value[id]
    if (!list) return

    const target = list.find(m => m.message_id === msgId)
    if (target) {
      if (settings.config.antiRecall) {
        // 开启防撤回：仅标记
        target.recalled = true
      } else {
        // 物理删除或替换提示
        // 实际操作中通常替换为一条"撤回了一条消息"的本地系统消息
        // 这里简单地从列表移除，或者你可以修改内容为 system type
        const idx = list.indexOf(target)
        if (idx > -1) {
          list.splice(idx, 1)
          addSystem(id, `"${target.sender.nickname}" 撤回了一条消息`)
        }
      }
    }
  }

  return {
    records,
    loading,
    finished,
    getList,
    addMsg,
    addSystem,
    fetchHistory,
    sendMsg,
    recallMsg
  }
})
