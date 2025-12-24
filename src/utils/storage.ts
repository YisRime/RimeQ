import { ref } from 'vue'
import { bot } from '@/api'
import { determineMsgType, parseMsgList } from '@/utils/msg-parser'
import { settingsStore } from './settings'
import { MsgType } from '@/types'
import type {
  FriendInfo, GroupInfo, GroupMemberInfo,
  SystemNotice, Message, MessageSegment
} from '@/types'

// =========================================================================================
// Types
// =========================================================================================

/** 统一会话接口 */
export interface Session {
  id: string
  type: 'private' | 'group'
  name: string
  avatar: string
  preview: string
  time: number
  unread: number
}

/** 扩展后的消息模型 */
export type ChatMsg = Message & {
  status?: 'sending' | 'success' | 'fail'
  recalled?: boolean
  isSystem?: boolean
}

// =========================================================================================
// Data Store
// =========================================================================================

/**
 * 数据存储类
 * 管理联系人列表、消息记录与会话状态
 */
export class DataStore {
  /** 好友列表 */
  friends = ref<FriendInfo[]>([])
  /** 群组列表 */
  groups = ref<GroupInfo[]>([])
  /** 群成员缓存 */
  members = ref<Map<number, GroupMemberInfo[]>>(new Map())
  /** 活跃会话列表 */
  sessions = ref<Session[]>([])
  /** 系统通知列表 */
  notices = ref<SystemNotice[]>([])

  /** 聊天记录缓存 */
  records = ref<Record<string, ChatMsg[]>>({})
  /** 历史记录加载状态 */
  historyLoading = ref<Record<string, boolean>>({})
  /** 历史记录是否加载完毕 */
  historyFinished = ref<Record<string, boolean>>({})

  /**
   * 更新或创建会话
   * @param id Peer ID
   * @param data 补全数据
   */
  updateSession(id: string, data: Partial<Session>) {
    const idx = this.sessions.value.findIndex(s => s.id === id)
    if (idx !== -1) {
      const item = this.sessions.value[idx]!
      this.sessions.value.splice(idx, 1)
      const updated: Session = {
        id: item.id,
        type: item.type,
        name: item.name,
        avatar: item.avatar,
        preview: item.preview,
        time: item.time,
        unread: item.unread,
        ...data
      }
      if (data.unread && data.unread > 0) {
        updated.unread = item.unread + data.unread
      }
      this.sessions.value.unshift(updated)
    } else {
      const isGroup = data.type === 'group' || id.length > 5
      let name = id
      let avatar = ''

      if (isGroup) {
        const g = this.groups.value.find(i => String(i.group_id) === id)
        name = g?.group_name || `群 ${id}`
        avatar = `https://p.qlogo.cn/gh/${id}/${id}/0`
      } else {
        const f = this.friends.value.find(i => String(i.user_id) === id)
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
        unread: 0,
        ...data
      })
    }
  }

  /** 获取单个会话对象 */
  getSession(id: string) {
    return this.sessions.value.find(s => s.id === id)
  }

  /** 移除会话 */
  removeSession(id: string) {
    const idx = this.sessions.value.findIndex(s => s.id === id)
    if (idx !== -1) this.sessions.value.splice(idx, 1)
  }

  /** 清除未读计数 */
  clearUnread(id: string) {
    const s = this.sessions.value.find(i => i.id === id)
    if (s) s.unread = 0
  }

  /** 获取指定会话的消息列表 */
  getMsgList(id: string) {
    if (!this.records.value[id]) this.records.value[id] = []
    return this.records.value[id]
  }

  /** 添加消息 */
  addMsg(id: string, msg: ChatMsg) {
    const list = this.getMsgList(id)
    if (list.some(m => m.message_id === msg.message_id && m.message_id !== 0)) return

    list.push(msg)

    // 生成预览
    const type = determineMsgType(msg.message)
    let preview = '[消息]'
    if (type === MsgType.Image) preview = '[图片]'
    else if (type === MsgType.Record) preview = '[语音]'
    else if (type === MsgType.File) preview = '[文件]'
    else {
      preview = msg.message.filter(s => s.type === 'text').map(s => s.data.text).join('') || '[消息]'
    }

    this.updateSession(id, {
      time: msg.time * 1000,
      preview,
      unread: 1 // 接收新消息增加未读，清除逻辑交给 View
    })
  }

  /** 添加系统消息 */
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

  /** 拉取历史记录 */
  async fetchHistory(id: string) {
    if (this.historyLoading.value[id] || this.historyFinished.value[id]) return
    this.historyLoading.value[id] = true

    try {
      const list = this.getMsgList(id)
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
        this.historyFinished.value[id] = true
      } else {
        const parsed = msgs.map((m: any) => ({
          ...m,
          message: typeof m.message === 'string' ? parseMsgList(m.message).raw : m.message,
          message_type: isGroup ? 'group' : 'private'
        }))

        const newMsgs = parsed.filter((m: any) => !list.some(ex => ex.message_id === m.message_id))
        if (newMsgs.length > 0) {
          this.records.value[id] = [...newMsgs, ...list]
        } else {
          this.historyFinished.value[id] = true
        }
      }
    } catch (e) {
      console.error('[DataStore] Fetch history failed', e)
    } finally {
      this.historyLoading.value[id] = false
    }
  }

  /** 发送消息 */
  async sendMsg(id: string, content: string | MessageSegment[], replyId?: number) {
    const isGroup = id.length > 5
    const chain: MessageSegment[] = []

    if (replyId) {
      chain.push({ type: 'reply', data: { id: String(replyId) } })
    }

    if (typeof content === 'string') {
      chain.push({ type: 'text', data: { text: content } })
    } else {
      chain.push(...content)
    }

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
      const res = await bot.sendMsg({
        group_id: isGroup ? Number(id) : undefined,
        user_id: !isGroup ? Number(id) : undefined,
        message: chain
      })

      tempMsg.status = 'success'
      if (res && res.message_id) tempMsg.message_id = res.message_id
    } catch (e) {
      tempMsg.status = 'fail'
      console.error('[DataStore] Send failed', e)
    }
  }

  /** 撤回逻辑 (本地标记) */
  recallMsg(id: string, msgId: number) {
    const list = this.records.value[id]
    if (!list) return
    const target = list.find(m => m.message_id === msgId)
    if (target) {
      if (settingsStore.config.value.antiRecall) {
        target.recalled = true
      } else {
        const idx = list.indexOf(target)
        if (idx > -1) {
          list.splice(idx, 1)
          this.addSystemMsg(id, `"${target.sender.nickname}" 撤回了一条消息`)
        }
      }
    }
  }
}

export const dataStore = new DataStore()
