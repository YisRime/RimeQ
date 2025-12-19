import { MsgType } from '@/types'
import type { MessageSegment, FileInfo } from '../types'

/**
 * CQ 码解析相关类型和函数
 */
export interface CQSegment {
  type: string
  data: Record<string, string>
}

/**
 * 解析 CQ 码消息为 Segment 数组
 * 兼容旧版 OneBot 实现
 */
export function parseCQ(msg: string): CQSegment[] {
  // 如果不是字符串，直接返回
  if (typeof msg !== 'string') return msg as unknown as CQSegment[]

  const segments: CQSegment[] = []

  // 正则匹配 [CQ:type,key=value] 或 纯文本
  // 1. 匹配 CQ 码: \[CQ:([a-zA-Z0-9-_]+)((?:,[a-zA-Z0-9-_]+=[^,\]]*)*)\]
  // 2. 匹配非 CQ 码文本
  const regex = /\[CQ:([a-zA-Z0-9-_]+)((?:,[a-zA-Z0-9-_]+=[^,\]]*)*)\]/g

  let lastIndex = 0
  let match

  while ((match = regex.exec(msg)) !== null) {
    // 1. 处理前面的纯文本
    if (match.index > lastIndex) {
      const text = msg.substring(lastIndex, match.index)
      if (text) segments.push({ type: 'text', data: { text: decodeCQText(text) } })
    }

    // 2. 处理 CQ 码
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

  // 3. 处理剩余文本
  if (lastIndex < msg.length) {
    const text = msg.substring(lastIndex)
    if (text) segments.push({ type: 'text', data: { text: decodeCQText(text) } })
  }

  return segments
}

/**
 * 反转义 CQ 码中的特殊字符
 */
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
  atUserId: number | null  // atUid -> atUserId
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
    atUserId: null,  // atUid -> atUserId
    faces: [],
    raw: []
  }

  // 1. 兼容 CQ 码字符串格式
  let chain = message
  if (typeof message === 'string') {
    // 尝试解析 CQ 码
    if (message.includes('[CQ:')) {
      chain = parseCQ(message)
    } else {
      // 纯文本
      result.text = message
      return result
    }
  }

  if (!Array.isArray(chain)) return result
  result.raw = chain

  // 2. 遍历解析 Segment
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

      case 'mface': // 商城表情
        const mfaceUrl = data.url as string | undefined
        if (mfaceUrl && typeof mfaceUrl === 'string') result.images.push(mfaceUrl)
        result.text += `[${(data.summary as string) || '表情'}]`
        break

      case 'file':
        const fileData = data as FileInfo & Record<string, unknown>
        if (fileData.name && fileData.size) {
          result.files.push(fileData as FileInfo)
        }
        result.text += `[文件: ${(data.name as string) || '未知'}]`
        break

      case 'at':
        result.atUserId = Number(data.qq)  // atUid -> atUserId
        // 只有当 at 没有对应的文本显示时，才手动添加 @xxx，防止重复
        // 但通常 CQ 码里 at 只是一个定位符，不包含显示文本
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
        } catch {
          // 解析失败，保持默认
        }
        break

      case 'video':
        result.text += '[视频]'
        break
    }
  }

  return result
}

/**
 * 原项目 getJSON / buildXML 的简化逻辑
 * 提取复杂 JSON/XML 结构中的关键展示信息
 */
function extractCardInfo(rawData: string | Record<string, unknown>): ParsedMessage['card'] | null {
  try {
    let data: Record<string, unknown> = typeof rawData === 'string' ? {} : rawData
    if (typeof rawData === 'string') {
      // XML 处理：简单正则提取
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
    // 常见的结构 key: detail_1, news, music, app
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
  // 如果已经是 ParsedMessage，直接判断（避免重复解析）
  if (typeof message === 'object' && 'text' in message && 'images' in message && 'raw' in message) {
    const parsed = message as ParsedMessage
    if (parsed.files.length > 0) return MsgType.File
    if (parsed.markdown) return MsgType.Markdown
    if (parsed.card) return MsgType.Card
    if (parsed.images.length > 0 && !parsed.text.trim()) return MsgType.Image
    return MsgType.Text
  }

  // 如果是字符串，直接返回 Text
  if (typeof message === 'string') return MsgType.Text

  // 如果是数组，检查 segment 类型
  if (!Array.isArray(message)) return MsgType.Text

  if (message.some(s => s.type === 'file')) return MsgType.File
  if (message.some(s => s.type === 'markdown')) return MsgType.Markdown
  // 增加对卡片的判断
  if (message.some(s => s.type === 'json' || s.type === 'xml')) return MsgType.Json

  const hasImage = message.some(s => s.type === 'image' || s.type === 'mface')
  const hasText = message.some(s => s.type === 'text' && (s.data.text as string || '').trim().length > 0)

  if (hasImage && !hasText) return MsgType.Image

  return MsgType.Text
}
