/**
 * 格式化时间戳显示
 */
export function formatTime(timestamp?: number): string {
  if (!timestamp) return ''

  const date = new Date(timestamp)
  const now = new Date()

  // 如果是今天，显示 HH:mm
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  // 如果是昨天
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  }

  // 否则显示日期
  return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}
