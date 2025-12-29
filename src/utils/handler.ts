import { socket } from '@/api'
import { useMessageStore } from '@/stores/message'
import { useSessionStore } from '@/stores/session'
import { useContactStore } from '@/stores/contact'
import { MsgType, type OneBotEvent, type Message, type SystemNotice, type MetaEvent, type IMessage, type MessageSegment, type FileInfo, type ParsedMessage } from '@/types'

// === 消息解析工具函数 ===

interface CQSegment { type: string; data: Record<string, string> }

// 解码 CQ 码转义字符
function decodeCQText(str: string): string {
  if (!str) return ''
  return str.replace(/&amp;/g, '&').replace(/&#91;/g, '[').replace(/&#93;/g, ']').replace(/&#44;/g, ',')
}

// 解析 CQ 码字符串为段数组
function parseCQ(msg: string): CQSegment[] {
  if (typeof msg !== 'string') return msg as unknown as CQSegment[]
  const segments: CQSegment[] = []
  const regex = /\[CQ:([a-zA-Z0-9-_]+)((?:,[a-zA-Z0-9-_]+=[^,\]]*)*)\]/g
  let lastIndex = 0
  let match

  while ((match = regex.exec(msg)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', data: { text: decodeCQText(msg.substring(lastIndex, match.index)) } })
    }
    const data: Record<string, string> = {}
    if (match[2]) {
      match[2].split(',').forEach(param => {
        const eqIdx = param.indexOf('=')
        if (eqIdx > -1) data[param.substring(0, eqIdx)] = decodeCQText(param.substring(eqIdx + 1))
      })
    }
    segments.push({ type: match[1] || 'unknown', data })
    lastIndex = regex.lastIndex
  }
  if (lastIndex < msg.length) {
    segments.push({ type: 'text', data: { text: decodeCQText(msg.substring(lastIndex)) } })
  }
  return segments
}

// 提取 JSON/XML 卡片关键信息
function extractCardInfo(rawData: string | Record<string, unknown>): any | null {
  try {
    const data: any = typeof rawData === 'string' ? (rawData.startsWith('<') ? {} : JSON.parse(rawData)) : rawData
    // 简易 XML 处理
    if (typeof rawData === 'string' && rawData.startsWith('<')) {
      const title = rawData.match(/summary="([^"]*)"/) || rawData.match(/<title>([^<]*)<\/title>/)
      return { title: title?.[1] || 'XML卡片', desc: '点击查看详情', preview: '' }
    }
    // JSON 处理
    const meta = data.meta || {}
    const detail = meta.detail_1 || meta.news || Object.values(meta)[0] || {}
    return {
      title: detail.title || data.title || data.prompt || '卡片消息',
      desc: detail.desc || detail.summary || '',
      preview: detail.preview || detail.cover || ''
    }
  } catch {
    return null
  }
}

/** 解析消息列表为前端友好格式 */
export function parseMsgList(message: string | MessageSegment[] | CQSegment[]): ParsedMessage {
  const result: ParsedMessage = { text: '', images: [], files: [], replyId: null, atUserId: null, faces: [], raw: [] }
  const chain = (typeof message === 'string' && message.includes('[CQ:')) ? parseCQ(message) : message

  if (typeof chain === 'string') {
    result.text = chain
    result.raw = [{ type: 'text', data: { text: chain } }]
    return result
  }

  if (!Array.isArray(chain)) return result
  result.raw = chain as MessageSegment[]

  for (const seg of chain) {
    const data = seg.data || {}
    switch (seg.type) {
      case 'text': result.text += (data.text as string) || ''; break
      case 'image':
      case 'mface':
        const url = (data.url || data.file) as string
        if (url) result.images.push(url)
        result.text += seg.type === 'mface' ? `[${data.summary || '表情'}]` : '[图片]'
        break
      case 'face': result.faces.push(Number(data.id)); result.text += '[表情]'; break
      case 'file':
        if (data.name) result.files.push(data as FileInfo)
        result.text += `[文件: ${data.name || '未知'}]`
        break
      case 'at': result.atUserId = Number(data.qq); result.text += `@${data.name || data.qq} `; break
      case 'reply': result.replyId = String(data.id); break
      case 'markdown': result.markdown = data.content as string; result.text += '[Markdown]'; break
      case 'json':
      case 'xml':
        result.text += '[卡片消息]'
        const card = extractCardInfo(data.data || data.content || data)
        if (card) result.card = card
        break
      case 'video': result.text += '[视频]'; break
    }
  }
  return result
}

/**
 * 判断消息的主要类型
 * 优先级: 文件 > Markdown > 卡片 > 纯图片 > 文本
 */
export function determineMsgType(message: string | MessageSegment[] | ParsedMessage): MsgType {
  // 1. 处理已解析的 ParsedMessage 对象
  if (typeof message === 'object' && message !== null && 'raw' in message && 'text' in message) {
    const p = message as ParsedMessage
    if (p.files.length > 0) return MsgType.File
    if (p.markdown) return MsgType.Markdown
    if (p.card) return MsgType.Json
    // 如果有图片且无有效文本，视为纯图片消息
    if (p.images.length > 0 && !p.text.trim()) return MsgType.Image
    return MsgType.Text
  }

  // 2. 处理原始 Segment 数组
  if (Array.isArray(message)) {
    // 优先检查特殊类型
    if (message.some(s => s.type === 'file')) return MsgType.File
    if (message.some(s => s.type === 'markdown')) return MsgType.Markdown
    if (message.some(s => s.type === 'json' || s.type === 'xml')) return MsgType.Json

    // 检查图片和文本共存情况
    const hasImage = message.some(s => s.type === 'image' || s.type === 'mface')
    // 修复 TS(2532): 增加可选链 ?. 确保 data 存在
    const hasText = message.some(s =>
      s.type === 'text' && String(s.data?.text || '').trim().length > 0
    )

    if (hasImage && !hasText) return MsgType.Image
    return MsgType.Text
  }

  // 3. 默认为文本
  return MsgType.Text
}

/** 生成会话列表预览文本 */
export function generatePreview(msg: IMessage): string {
  if (msg.sender.user_id === 10000) return '[系统消息]'
  if (msg.recalled) return '[已撤回]'

  const type = determineMsgType(msg.message)
  let content = ''
  switch (type) {
    case MsgType.Image: content = '[图片]'; break
    case MsgType.Record: content = '[语音]'; break
    case MsgType.File: content = '[文件]'; break
    case MsgType.Json: content = '[卡片]'; break
    case MsgType.Markdown: content = '[Markdown]'; break
    default: content = parseMsgList(msg.message).text
  }

  if (msg.message_type === 'group') {
    const name = msg.sender.card || msg.sender.nickname
    if (name) return `${name}: ${content}`
  }
  return content
}

// === OneBot 事件分发 ===

export class OneBotHandler {
  constructor() {
    socket.onReceive(this.dispatch.bind(this))
  }

  public dispatch(evt: OneBotEvent) {
    switch (evt.post_type) {
      case 'message': return this.onMessage(evt as Message)
      case 'notice': return this.onNotice(evt as SystemNotice)
      case 'request': return this.onRequest(evt as SystemNotice)
      case 'meta_event': return this.onMeta(evt as MetaEvent)
    }
  }

  private onMessage(msg: Message) {
    const messageStore = useMessageStore()
    const sessionStore = useSessionStore()
    const isGroup = msg.message_type === 'group'
    const id = isGroup ? String(msg.group_id) : String(msg.user_id)
    if (!id) return

    // 1. 交给 MessageStore 处理存储和列表更新
    const chatMsg = messageStore.pushMessage(msg, id)

    // 2. 更新会话列表预览
    const unreadInc = messageStore.activeId === id ? 0 : 1
    sessionStore.updateSession(id, {
      time: msg.time * 1000,
      preview: generatePreview(chatMsg),
      unread: unreadInc,
      type: msg.message_type
    })
  }

  private onNotice(evt: SystemNotice) {
    const messageStore = useMessageStore()
    const pid = String(evt.group_id || evt.user_id || '')
    if (!pid) return

    switch (evt.notice_type) {
      case 'group_recall':
      case 'friend_recall':
        if (evt.message_id) messageStore.recallMessage(evt.message_id)
        break
      case 'notify':
        if (evt.sub_type === 'poke') {
          const actor = evt.user_id === evt.self_id ? '你' : evt.user_id
          const target = evt.target_id === evt.self_id ? '你' : evt.target_id
          this.addSystemMsg(pid, `${actor} 戳了 ${target} 一下`)
        }
        break
      case 'group_ban':
        const action = evt.sub_type === 'ban' ? `禁言 ${evt.duration}秒` : '解除禁言'
        this.addSystemMsg(pid, `成员 ${evt.user_id} 被${action}`)
        break
      case 'group_increase': this.addSystemMsg(pid, `欢迎 ${evt.user_id} 入群`); break
      case 'group_decrease': this.addSystemMsg(pid, `${evt.user_id} 退群`); break
    }
  }

  // 构造本地系统提示消息
  private addSystemMsg(id: string, text: string) {
    // 构造一个伪造的消息事件
    this.onMessage({
      message_type: id.length > 5 ? 'group' : 'private',
      [id.length > 5 ? 'group_id' : 'user_id']: Number(id),
      post_type: 'message',
      message_id: -Date.now(), // 负数 ID 避免冲突
      time: Date.now() / 1000,
      sender: { user_id: 10000, nickname: 'System', role: 'admin' },
      message: [{ type: 'text', data: { text } }]
    } as any)
  }

  private onRequest(evt: SystemNotice) {
    const contactStore = useContactStore()
    contactStore.addNotice(evt)
  }

  private onMeta(evt: MetaEvent) {
    if (evt.meta_event_type === 'lifecycle' && evt.sub_type === 'connect') {
      console.log('[OneBot] Lifecycle Connected')
    }
  }
}

export const oneBotHandler = new OneBotHandler()
