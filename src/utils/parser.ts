import { useContactStore } from '@/stores/contact'
import { useMessageStore } from '@/stores/message'
import { getPreviewText, formatFileSize } from './format'
import type { Message, Segment } from '@/types'

// === 类型定义 ===

export interface ProcessedMessage {
  replyId: string | null
  replyDetail: {
    id: string
    text: string
    sender: string
  } | null
  segments: FormattedSegment[]
  isPureImage: boolean // 用于 UI 判断是否需要去除气泡背景
  previewText: string // 用于会话列表预览
}

export interface FormattedSegment {
  type: string
  text?: string // 文本内容
  url?: string // 图片/视频地址/跳转链接
  fileName?: string // 文件名
  fileSize?: string // 文件大小
  atUid?: number // @对象的UID
  atName?: string // @对象的名称
  faceId?: number // 表情ID
  // 卡片/转发相关
  title?: string
  desc?: string
  preview?: string
  source?: string
  // 语音相关
  duration?: number
  // 转发相关
  nodes?: { sender: string; text: string }[]
  count?: number
  // 原始数据
  raw?: Segment
}

// === 辅助解析工具 ===

/**
 * 解析 JSON 消息卡片
 */
function parseJsonCard(dataStr: string): FormattedSegment | null {
  try {
    const json = JSON.parse(dataStr)
    // 1. 群公告
    if (json.desc === '群公告') {
      return {
        type: 'card',
        title: '群公告',
        desc: json.prompt || json.desc,
        preview: '',
        text: '[群公告]'
      }
    }
    // 2. 通用结构解析 (meta -> detail/news/etc)
    const metaKeys = Object.keys(json.meta || {})
    if (metaKeys.length > 0) {
      const key = metaKeys[0]
      const body = json.meta[key]
      if (body) {
        return {
          type: 'card',
          title: body.title || body.tag || json.prompt || json.app,
          desc: body.desc,
          preview: body.preview || body.cover || body.icon,
          url: body.jumpUrl || body.qqdocurl || body.url,
          text: json.prompt || '[卡片消息]'
        }
      }
    }
    return { type: 'card', title: json.prompt || '卡片消息', text: '[卡片消息]' }
  } catch (e) {
    return null
  }
}

/**
 * 解析 XML 消息卡片 (简化版)
 */
function parseXmlCard(dataStr: string): FormattedSegment | null {
  try {
    // 简单提取 title 和 summary
    const titleMatch = dataStr.match(/title="([^"]*)"/) || dataStr.match(/<title>([^<]*)<\/title>/)
    const summaryMatch = dataStr.match(/summary="([^"]*)"/) || dataStr.match(/<summary>([^<]*)<\/summary>/)
    const sourceMatch = dataStr.match(/source name="([^"]*)"/)

    return {
      type: 'card',
      title: titleMatch ? titleMatch[1] : 'XML 卡片',
      desc: summaryMatch ? summaryMatch[1] : '',
      source: sourceMatch ? sourceMatch[1] : '',
      text: '[卡片消息]'
    }
  } catch (e) {
    return null
  }
}

/**
 * 解析图片 URL
 * 增强对 NTQQ multimedia 链接的处理兼容
 */
function resolveImageUrl(data: any): string {
  if (!data) return ''

  let url = ''

  // 1. 优先使用网络 URL
  if (data.url && data.url.startsWith('http')) {
    url = data.url
  }
  // 2. 处理 file 字段 (Base64 或 http)
  else if (data.file) {
    if (data.file.startsWith('base64://')) {
      url = 'data:image/png;base64,' + data.file.substring(9)
    } else if (data.file.startsWith('http')) {
      url = data.file
    } else if (data.file.length > 500 && !data.file.includes('/')) {
      // 假设是无头的 base64
      url = 'data:image/png;base64,' + data.file
    }
  }

  return url
}

// === 核心解析逻辑 ===

/**
 * 处理消息链 (Message -> UI Format)
 * @param msg 完整的消息对象 (Message)
 */
export function parseMessage(msg: Message): ProcessedMessage {
  const contactStore = useContactStore()
  const messageStore = useMessageStore() // 仅用于同步查找，不进行 API 请求

  // 1. 规范化消息段
  let rawSegments: Segment[] = []
  if (Array.isArray(msg.message)) {
    rawSegments = msg.message
  } else if (typeof msg.message === 'string') {
    rawSegments = [{ type: 'text', data: { text: msg.message } }]
  }

  // 2. 状态变量
  let replyId: string | null = null
  let replyDetail: ProcessedMessage['replyDetail'] = null
  const segments: FormattedSegment[] = []
  let imageCount = 0
  let nonImageCount = 0
  let previewText = ''

  // 3. 遍历解析
  for (const seg of rawSegments) {
    // === Reply (引用回复) ===
    if (seg.type === 'reply' && seg.data.id) {
      replyId = seg.data.id
      // 尝试在本地 Store 中查找引用的消息
      if (replyId) {
        // 忽略负数 ID (本地临时 ID)
        if (parseInt(replyId) < 0) {
          replyDetail = { id: replyId, text: '[本地消息]', sender: '我' }
        } else {
          // 在当前会话列表里查找
          const found = messageStore.messages.find(m => String(m.message_id) === replyId)
          if (found) {
            replyDetail = {
              id: replyId,
              text: getPreviewText(found.message),
              sender: found.sender.card || found.sender.nickname
            }
          }
        }
      }
      continue
    }

    // === Image (图片) / MFace (商城表情) ===
    if (seg.type === 'image' || seg.type === 'mface') {
      const url = resolveImageUrl(seg.data)
      if (url) {
        const isMface = seg.type === 'mface'
        segments.push({
            type: isMface ? 'mface' : 'image',
            url,
            text: seg.data.summary || seg.data.text,
            raw: seg
        })
        imageCount++
        previewText += seg.data.summary || '[图片]'
      } else {
        segments.push({ type: 'text', text: '[图片失效]', raw: seg })
        nonImageCount++
      }
      continue
    }

    // === At (提及) ===
    if (seg.type === 'at' && seg.data.qq) {
      const uid = Number(seg.data.qq)
      let name = seg.data.name
      if (!name) {
        if (seg.data.qq === 'all') {
          name = '全体成员'
        } else {
          name = contactStore.getUserName(uid)
        }
      }

      segments.push({ type: 'at', atUid: uid, atName: name, raw: seg })
      previewText += `@${name} `
      nonImageCount++
      continue
    }

    // === Text (文本) ===
    if (seg.type === 'text') {
      const text = seg.data.text || ''
      if (text) {
        segments.push({ type: 'text', text, raw: seg })
        if (text.trim()) {
          previewText += text
          nonImageCount++
        }
      }
      continue
    }

    // === Face (表情) ===
    if (seg.type === 'face' && seg.data.id) {
      segments.push({ type: 'face', faceId: Number(seg.data.id), raw: seg })
      previewText += '[表情]'
      nonImageCount++
      continue
    }

    // === File (文件) ===
    if (seg.type === 'file' && seg.data.name) {
      segments.push({
        type: 'file',
        fileName: seg.data.name || seg.data.file || '未知文件',
        fileSize: formatFileSize(Number(seg.data.size)),
        raw: seg
      })
      previewText += `[文件: ${seg.data.name}]`
      nonImageCount++
      continue
    }

    // === Video (视频) ===
    if (seg.type === 'video') {
      const url = resolveImageUrl(seg.data)
      segments.push({ type: 'video', url, raw: seg })
      previewText += '[视频]'
      imageCount++
      continue
    }

    // === Record (语音) ===
    if (seg.type === 'record') {
        const url = resolveImageUrl(seg.data)
        segments.push({
            type: 'record',
            url,
            text: '语音消息',
            raw: seg
        })
        previewText += '[语音]'
        nonImageCount++
        continue
    }

    // === Forward (合并转发) ===
    if (seg.type === 'forward' && seg.data.id) {
        const nodes = [] as { sender: string; text: string }[]
        const content = (seg.data as any).content
        if (content && Array.isArray(content)) {
            (content as any[]).slice(0, 4).forEach((node: any) => {
                if (node.type === 'node') {
                    const sender = node.data.nickname || node.data.user_id || '未知'
                    let text = ''
                    if (Array.isArray(node.data.content)) {
                        text = getPreviewText(node.data.content)
                    } else if (typeof node.data.content === 'string') {
                        text = node.data.content
                    }
                    nodes.push({ sender: String(sender), text })
                }
            })
        }
        segments.push({
            type: 'forward',
            title: (seg.data as any).summary || '聊天记录',
            nodes,
            source: (seg.data as any).source || '聊天记录',
            raw: seg
        })
        previewText += '[聊天记录]'
        nonImageCount++
        continue
    }

    // === Card (JSON/XML) ===
    if (['json', 'xml'].includes(seg.type) && seg.data.data) {
      let cardInfo: FormattedSegment | null = null
      if (seg.type === 'json') {
        cardInfo = parseJsonCard(seg.data.data)
      } else {
        cardInfo = parseXmlCard(seg.data.data)
      }

      if (cardInfo) {
        cardInfo.raw = seg
        segments.push(cardInfo)
        previewText += cardInfo.text || '[卡片]'
      } else {
        segments.push({ type: 'card', text: '未知卡片', raw: seg })
        previewText += '[卡片]'
      }
      nonImageCount++
      continue
    }

    // === Markdown ===
    if (seg.type === 'markdown') {
      segments.push({ type: 'markdown', text: (seg.data as any).content || '', raw: seg })
      previewText += '[Markdown]'
      nonImageCount++
      continue
    }

    // === Poke (戳一戳) ===
    if (seg.type === 'poke') {
        segments.push({ type: 'text', text: '[戳一戳]', raw: seg })
        previewText += '[戳一戳]'
        nonImageCount++
        continue
    }
  }

  // 纯图片判断
  const isPureImage = imageCount > 0 && nonImageCount === 0

  return {
    replyId,
    replyDetail,
    segments,
    isPureImage,
    previewText: previewText || '[消息]'
  }
}
