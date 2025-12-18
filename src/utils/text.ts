/**
 * HTML 转义
 */
export function escapeHtml(str: string): string {
  if (!str) return ''
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

/**
 * 文本处理：转义 HTML + 自动链接
 */
export function formatText(text: string): string {
  if (!text) return ''

  // 1. XSS 防护：先转义
  let result = escapeHtml(text)

  // 2. 还原换行
  result = result.replace(/\n/g, '<br>')

  // 3. 自动识别链接
  // 匹配 http/https 链接
  const urlRegex = /(https?:\/\/[^\s<]+)/g
  result = result.replace(urlRegex, (url) => {
    // 这里的 url 已经被 escapeHtml 转义过，如果包含 & 等符号需要注意
    // 但 URL 中的特殊字符转义后通常不影响 href 识别，除了双引号
    return `<a href="${url}" target="_blank" class="text-blue-500 hover:underline cursor-pointer" onclick="event.stopPropagation()">${url}</a>`
  })

  return result
}
