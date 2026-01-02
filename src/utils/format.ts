import type { Segment } from '@/types'

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number) {
  if (!bytes && bytes !== 0) return '未知大小'
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

/**
 * 文本转 HTML (处理链接和换行)
 */
export function formatTextToHtml(text: string): string {
  if (!text) return ''
  let result = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')

  // 处理换行
  result = result.replace(/\r\n/g, '<br>').replace(/\n/g, '<br>').replace(/\r/g, '<br>')

  // 识别 URL 并转为链接 (禁止事件冒泡防止触发气泡点击)
  const urlRegex = /(https?:\/\/[^\s<]+)/g
  result = result.replace(urlRegex, url => {
    return `<a href="${url}" target="_blank" class="text-blue-500 hover:underline break-all cursor-pointer" onclick="event.stopPropagation()">${url}</a>`
  })

  return result
}

/**
 * 格式化时间显示
 * @description
 * - 当天: HH:mm
 * - 当年: M/D
 * - 其他: YY/M/D
 */
export function formatTime(timestamp?: number): string {
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const isSameYear = d.getFullYear() === now.getFullYear()

  if (isToday) return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (isSameYear) return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  return d.toLocaleDateString('zh-CN', { year: '2-digit', month: 'numeric', day: 'numeric' })
}

/**
 * 辅助：获取预览文本 (用于 reply 或 会话列表)
 */
export function getPreviewText(message: Segment[] | string): string {
  if (typeof message === 'string') return message
  if (!Array.isArray(message)) return ''

  let text = ''
  for (const seg of message) {
    if (seg.type === 'text' && seg.data.text) text += seg.data.text
    else if (seg.type === 'image') text += '[图片]'
    else if (seg.type === 'face') text += '[表情]'
    else if (seg.type === 'mface') text += '[表情]'
    else if (seg.type === 'record') text += '[语音]'
    else if (seg.type === 'video') text += '[视频]'
    else if (seg.type === 'file') text += `[文件: ${seg.data.name}]`
    else if (seg.type === 'at') text += `@${seg.data.name || seg.data.qq} `
    else if ((seg.type === 'json' || seg.type === 'xml') && seg.data.data) {
        try {
            if (seg.type === 'json') text += JSON.parse(seg.data.data).prompt || '[卡片]'
            else text += '[卡片]'
        } catch { text += '[卡片]' }
    }
    else if (seg.type === 'forward') text += '[聊天记录]'
    else if (seg.type === 'markdown') text += '[Markdown]'
    else text += `[${seg.type}]`
  }
  return text
}
