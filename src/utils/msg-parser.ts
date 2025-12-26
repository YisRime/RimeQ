import { socket } from '@/api/socket'
import { useMessageStore } from '@/stores/message'
import { useContactStore } from '@/stores/contact' // 新增引用
import { MsgType } from '@/types'
import type { MessageSegment, FileInfo, OneBotEvent, Message, SystemNotice, MetaEvent } from '@/types'

// ============================================================================
// 1. 类型定义 (ChatMsg)
// ============================================================================

/**
 * 本地聊天消息结构 (扩展自基础 Message)
 */
export interface ChatMsg extends Message {
  /** 消息发送状态 */
  status?: 'sending' | 'success' | 'fail'
  /** 消息是否已被撤回 (用于本地防撤回) */
  recalled?: boolean
  /** 是否为本地生成的系统提示消息 */
  isSystem?: boolean
  /** 数据库索引字段 (IndexedDB用) */
  sessionId?: string
}

// ============================================================================
// 2. 消息解析逻辑 (Parser Functions)
// ============================================================================

export function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

export function formatText(text: string): string {
  if (!text) return ''
  let result = escapeHtml(text)
  result = result.replace(/\n/g, '<br>')
  const urlRegex = /(https?:\/\/[^\s<]+)/g
  result = result.replace(urlRegex, (url) => {
    return `<a href="${url}" target="_blank" class="text-blue-500 hover:underline cursor-pointer" onclick="event.stopPropagation()">${url}</a>`
  })
  return result
}

export interface CQSegment {
  type: string
  data: Record<string, string>
}

export function parseCQ(msg: string): CQSegment[] {
  if (typeof msg !== 'string') return msg as unknown as CQSegment[]
  const segments: CQSegment[] = []
  const regex = /\[CQ:([a-zA-Z0-9-_]+)((?:,[a-zA-Z0-9-_]+=[^,\]]*)*)\]/g

  let lastIndex = 0
  let match

  while ((match = regex.exec(msg)) !== null) {
    if (match.index > lastIndex) {
      const text = msg.substring(lastIndex, match.index)
      if (text) segments.push({ type: 'text', data: { text: decodeCQText(text) } })
    }
    const type = match[1]
    const paramsStr = match[2]
    const data: Record<string, string> = {}

    if (paramsStr) {
      paramsStr.split(',').forEach(param => {
        if (!param) return
        const eqIdx = param.indexOf('=')
        if (eqIdx > -1) {
          const key = param.substring(0, eqIdx)
          const value = param.substring(eqIdx + 1)
          if (key) data[key] = decodeCQText(value)
        }
      })
    }
    segments.push({ type: type || 'unknown', data })
    lastIndex = regex.lastIndex
  }

  if (lastIndex < msg.length) {
    const text = msg.substring(lastIndex)
    if (text) segments.push({ type: 'text', data: { text: decodeCQText(text) } })
  }
  return segments
}

function decodeCQText(str: string): string {
  if (!str) return ''
  return str
    .replace(/&amp;/g, '&')
    .replace(/&#91;/g, '[')
    .replace(/&#93;/g, ']')
    .replace(/&#44;/g, ',')
}

export interface ParsedMessage {
  text: string
  images: string[]
  files: FileInfo[]
  replyId: string | null
  atUserId: number | null
  faces: number[]
  markdown?: string
  card?: {
    title: string
    desc: string
    preview: string
    url: string
    icon: string
    source: string
  }
  raw: MessageSegment[]
}

export function parseMsgList(message: string | MessageSegment[] | CQSegment[]): ParsedMessage {
  const result: ParsedMessage = {
    text: '',
    images: [],
    files: [],
    replyId: null,
    atUserId: null,
    faces: [],
    raw: []
  }

  let chain = message
  if (typeof message === 'string') {
    if (message.includes('[CQ:')) chain = parseCQ(message)
    else {
      result.text = message
      result.raw = [{ type: 'text', data: { text: message } }]
      return result
    }
  }

  if (!Array.isArray(chain)) return result
  result.raw = chain as MessageSegment[]

  for (const seg of chain) {
    const data = seg.data || {}

    switch (seg.type) {
      case 'text':
        result.text += (data.text as string) || ''
        break
      case 'image':
        const imgUrl = (data.url || data.file) as string | undefined
        if (imgUrl && typeof imgUrl === 'string') result.images.push(imgUrl)
        result.text += '[图片]'
        break
      case 'face':
        result.faces.push(Number(data.id))
        result.text += '[表情]'
        break
      case 'mface':
        const mfaceUrl = data.url as string | undefined
        if (mfaceUrl && typeof mfaceUrl === 'string') result.images.push(mfaceUrl)
        result.text += `[${(data.summary as string) || '表情'}]`
        break
      case 'file':
        const fileData = data as FileInfo & Record<string, unknown>
        if (fileData.name && fileData.size) result.files.push(fileData as FileInfo)
        result.text += `[文件: ${(data.name as string) || '未知'}]`
        break
      case 'at':
        result.atUserId = Number(data.qq)
        result.text += `@${(data.name as string) || data.qq} `
        break
      case 'reply':
        result.replyId = String(data.id)
        break
      case 'markdown':
        result.markdown = data.content as string | undefined
        result.text += '[Markdown]'
        break
      case 'json':
      case 'xml':
        result.text += '[卡片消息]'
        try {
          const cardInfo = extractCardInfo((data.data || data.content || seg.data) as string | Record<string, unknown>)
          if (cardInfo) result.card = cardInfo
        } catch { }
        break
      case 'video':
        result.text += '[视频]'
        break
    }
  }
  return result
}

function extractCardInfo(rawData: string | Record<string, unknown>): ParsedMessage['card'] | null {
  try {
    let data: Record<string, unknown> = typeof rawData === 'string' ? {} : rawData
    if (typeof rawData === 'string') {
      if (rawData.startsWith('<?xml') || rawData.includes('<msg')) {
        const titleMatch = rawData.match(/summary="([^"]*)"/) || rawData.match(/<title>([^<]*)<\/title>/)
        const urlMatch = rawData.match(/url="([^"]*)"/)
        return {
          title: titleMatch?.[1] || 'XML卡片',
          desc: '点击查看详情',
          preview: '',
          url: urlMatch?.[1] || '',
          icon: '',
          source: ''
        }
      }
      data = JSON.parse(rawData) as Record<string, unknown>
    }

    const meta = (data.meta as Record<string, unknown>) || {}
    const detail = (meta.detail_1 || meta.news || Object.values(meta)[0] || {}) as Record<string, unknown>

    return {
      title: (detail.title || data.title || data.prompt || '卡片消息') as string,
      desc: (detail.desc || detail.summary || '') as string,
      preview: (detail.preview || detail.cover || '') as string,
      url: (detail.url || detail.jumpUrl || '') as string,
      icon: (detail.icon || data.icon || '') as string,
      source: (detail.source || detail.tag || data.app || '') as string
    }
  } catch {
    return null
  }
}

export function determineMsgType(message: string | MessageSegment[] | ParsedMessage): MsgType {
  if (typeof message === 'object' && 'text' in message && 'images' in message && 'raw' in message) {
    const parsed = message as ParsedMessage
    if (parsed.files.length > 0) return MsgType.File
    if (parsed.markdown) return MsgType.Markdown
    if (parsed.card) return MsgType.Json
    if (parsed.images.length > 0 && !parsed.text.trim()) return MsgType.Image
    return MsgType.Text
  }
  if (typeof message === 'string') return MsgType.Text
  if (!Array.isArray(message)) return MsgType.Text

  if (message.some(s => s.type === 'file')) return MsgType.File
  if (message.some(s => s.type === 'markdown')) return MsgType.Markdown
  if (message.some(s => s.type === 'json' || s.type === 'xml')) return MsgType.Json

  const hasImage = message.some(s => s.type === 'image' || s.type === 'mface')
  const hasText = message.some(s => s.type === 'text' && (s.data.text as string || '').trim().length > 0)

  if (hasImage && !hasText) return MsgType.Image

  return MsgType.Text
}

// ============================================================================
// 3. 业务事件处理逻辑 (OneBotHandler)
// ============================================================================

class OneBotHandler {
  constructor() {
    socket.onReceive(this.dispatch.bind(this))
  }

  public dispatch(evt: OneBotEvent) {
    // 动态获取 Store
    const messageStore = useMessageStore()

    switch (evt.post_type) {
      case 'message': return this.onMessage(evt as Message, messageStore)
      case 'notice': return this.onNotice(evt as SystemNotice, messageStore)
      case 'request': return this.onRequest(evt as SystemNotice)
      case 'meta_event': return this.onMeta(evt as MetaEvent)
    }
  }

  private onMessage(msg: Message, store: ReturnType<typeof useMessageStore>) {
    const isGroup = msg.message_type === 'group'
    const id = isGroup ? msg.group_id : msg.user_id
    if (!id) return

    const chatMsg: ChatMsg = {
      ...msg,
      message: parseMsgList(msg.message).raw,
      sender: { ...msg.sender, nickname: msg.sender.card || msg.sender.nickname || 'Unknown' },
      status: 'success'
    }

    store.receiveMessage(String(id), chatMsg)
  }

  private onNotice(evt: SystemNotice, store: ReturnType<typeof useMessageStore>) {
    const pid = String(evt.group_id || evt.user_id || '')
    if (!pid) return

    switch (evt.notice_type) {
      case 'group_recall':
      case 'friend_recall':
        if (evt.message_id) store.recallMessage(evt.message_id)
        break

      case 'notify':
        if (evt.sub_type === 'poke') {
          const actor = evt.user_id === evt.self_id ? '你' : evt.user_id
          const target = evt.target_id === evt.self_id ? '你' : evt.target_id
          this.addSystemMsg(pid, `${actor} 戳了 ${target} 一下`, store)
        }
        break

      case 'group_ban':
        {
          const action = evt.sub_type === 'ban' ? `禁言 ${evt.duration}秒` : '解除禁言'
          this.addSystemMsg(pid, `成员 ${evt.user_id} 被${action}`, store)
        }
        break

      case 'group_increase':
        this.addSystemMsg(pid, `欢迎 ${evt.user_id} 入群`, store)
        break

      case 'group_decrease':
        this.addSystemMsg(pid, `${evt.user_id} 退群`, store)
        break
    }
  }

  private addSystemMsg(id: string, text: string, store: ReturnType<typeof useMessageStore>) {
    const sysMsg: ChatMsg = {
      post_type: 'message',
      message_id: -Math.random(),
      time: Date.now() / 1000,
      message_type: id.length > 5 ? 'group' : 'private',
      sender: { user_id: 0, nickname: 'System' },
      message: [{ type: 'text', data: { text } }],
      isSystem: true,
      status: 'success'
    }
    store.receiveMessage(id, sysMsg)
  }

  private onRequest(evt: SystemNotice) {
    const contactStore = useContactStore()

    // 1. 将请求存入 Contact Store
    contactStore.addNotice(evt)

    // 2. 发送浏览器系统通知
    if (Notification.permission === 'granted') {
      new Notification(evt.request_type === 'friend' ? '好友请求' : '入群请求', {
        body: `${evt.user_id}: ${evt.comment || ''}`
      })
    }
  }

  private onMeta(evt: MetaEvent) {
    if (evt.meta_event_type === 'lifecycle' && evt.sub_type === 'connect') {
       console.log('[OneBot] Lifecycle Connected')
    }
  }
}

export const oneBotHandler = new OneBotHandler()
