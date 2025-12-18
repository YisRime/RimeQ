/**
 * 平滑滚动到容器底部
 */
export function scrollToBottom(element: HTMLElement, smooth = true) {
  if (!element) return

  const options: ScrollToOptions = {
    top: element.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  }

  element.scrollTo(options)
}

/**
 * 滚动到指定元素 (锚点跳转)
 */
export function scrollToElement(container: HTMLElement, targetId: string) {
  const target = document.getElementById(targetId)
  if (target && container) {
    const top = target.offsetTop - container.offsetTop
    container.scrollTo({ top, behavior: 'smooth' })

    // 高亮动画
    target.classList.add('bg-primary/10')
    setTimeout(() => {
      target.classList.remove('bg-primary/10')
    }, 1500)
  }
}

/**
 * 复制文本到剪贴板
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    } else {
      // 降级方案
      const textArea = document.createElement("textarea")
      textArea.value = text
      textArea.style.position = "fixed"
      textArea.style.left = "-9999px"
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      textArea.remove()
      return true
    }
  } catch (err) {
    console.error('Copy failed', err)
    return false
  }
}
