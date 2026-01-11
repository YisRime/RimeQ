import { useContactStore } from '@/stores/contact'
import type { Segment } from '@/types'

/**
 * 字节大小转换为文件大小
 * @param bytes - 文件大小（字节）
 * @returns 格式化后的字符串
 */
export function formatFileSize(bytes: number) {
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i]
}

/**
 * 根据时间戳生成时间显示
 * @param timestamp - Unix 时间戳 (毫秒)
 * @returns 格式化后的时间字符串
 */
export function formatTime(timestamp: number): string {
  const d = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diffDays = Math.floor((today - target) / (1000 * 60 * 60 * 24))
  // 当天
  if (diffDays === 0) return d.toLocaleTimeString('zh-CN', { hour12: false }) // HH:mm:ss
  // 一周内
  if (diffDays > 0 && diffDays < 7) {
    const hour = d.getHours()
    if (diffDays === 1) return `昨天 ${hour}时`
    if (diffDays === 2) return `前天 ${hour}时`
    return `${diffDays}天前 ${hour}时`
  }
  // 同年
  if (d.getFullYear() === now.getFullYear()) return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) // M/D
  // 跨年
  return d.toLocaleDateString('zh-CN', { year: '2-digit', month: 'numeric', day: 'numeric' }) // YY/M/D
}

/**
 * 格式化秒数为时长
 * @param seconds - 秒数
 * @returns 格式化后的时长字符串
 */
export function formatDuration(seconds: number | string): string {
  const sec = parseInt(String(seconds))
  if (isNaN(sec) || sec < 0) return ''
  const units: [string, number][] = [['天', 86400], ['小时', 3600], ['分钟', 60], ['秒', 1]]
  const parts: string[] = []
  units.reduce((acc, [label, value]) => {
    const count = Math.floor(acc / value)
    if (count > 0) parts.push(`${count}${label}`)
    return acc % value
  }, sec)
  return parts.join(' ')
}

/**
 * 生成纯文本预览
 * @param message - 消息内容 (字符串或消息段数组)
 * @param groupId - (可选) 所属群号，用于显示昵称
 * @returns 预览文本
 */
export function getTextPreview(message: Segment[], groupId?: number | string): string {
  const contactStore = useContactStore()
  let text = ''
  for (const seg of message) {
    switch (seg.type) {
      case 'text':
        text += seg.data.text
        break
      case 'at':
        text += `@${seg.data.qq === 'all' ? '全体成员' : contactStore.getUserName(seg.data.qq || '', groupId)} `
        break
      case 'image':
      case 'mface':
        text += seg.data.summary || '[图片]'
        break
      case 'record':
        text += '[语音]'
        break
      case 'video':
        text += '[视频]'
        break
      case 'file':
        text += `[文件|${seg.data.file}]`
        break
      case 'dice':
        text += `[骰子|${seg.data.result}]`
        break
      case 'rps':
        text += `[猜拳|${seg.data.result}]`
        break
      case 'face':
        text += `[表情|${seg.data.id}]`
        break
      case 'forward':
        text += '[聊天记录]'
        break
      case 'xml':
      case 'json':
        let card = ''
        if (seg.type === 'json') {
          const o = JSON.parse(seg.data.data || '{}')
          card = o.prompt || o.desc || (Object.values(o.meta || {})[0] as any)?.title
        } else {
          const match = seg.data.data?.match(/title="([^"]*)"|<title>([^<]*)<\/title>/)
          card = (match?.[1] || match?.[2]) || ''
        }
        text += card ? `[卡片|${card}]` : '[卡片]'
        break
      case 'location':
        text += `[位置|${seg.data.prompt}|${seg.data.lat},${seg.data.lng}]`
        break
      case 'reply':
        break
      default:
        text += `[${seg.type}]`
        break
    }
  }
  return text
}
