// ================= START FILE: src/utils/theme.ts =================
import { colord, extend } from 'colord'
import mixPlugin from 'colord/plugins/mix'
import namesPlugin from 'colord/plugins/names'
import { accountStore } from './storage'

// 启用插件以支持更多颜色名称和混合模式
extend([mixPlugin, namesPlugin])

/**
 * 将 CSS 变量应用到 HTML 根元素
 */
const setProperty = (key: string, value: string) => {
  document.documentElement.style.setProperty(key, value)
}

/**
 * 注入自定义 CSS 和动态主题变量
 */
export function applyTheme() {
  const config = accountStore.config.value
  const isDark = config.darkMode // 或者结合系统偏好: usePreferredDark()

  // 1. 注入用户自定义 CSS (高级设置中的内容)
  const styleId = 'user-custom-css'
  let styleEl = document.getElementById(styleId)
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = styleId
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = config.css || ''

  // 2. 计算动态主题色
  // 默认绿色 #7abb7e，防止用户输入空值
  const primaryInput = config.themeColor || '#7abb7e'
  const primaryColor = colord(primaryInput)

  if (primaryColor.isValid()) {
    // --- 基础色 ---
    setProperty('--primary-color', primaryColor.toHex())

    // --- 状态色生成策略 ---
    if (isDark) {
      // 深色模式下：Hover 稍微变亮，Active 变暗，Soft 背景透明度增加
      setProperty('--primary-hover', primaryColor.lighten(0.05).toHex())
      setProperty('--primary-active', primaryColor.darken(0.05).toHex())
      // Soft: 用于选中项背景，使用 rgba 格式以支持透明度
      setProperty('--primary-soft', primaryColor.alpha(0.20).toRgbString())
    } else {
      // 浅色模式下：Hover 稍微变暗，Active 更暗
      setProperty('--primary-hover', primaryColor.darken(0.05).toHex())
      setProperty('--primary-active', primaryColor.darken(0.10).toHex())
      // Soft: 浅色背景，透明度较低
      setProperty('--primary-soft', primaryColor.alpha(0.12).toRgbString())
    }

    // --- 文本对比色 (可选) ---
    // 计算在主色背景上的文字颜色 (白/黑)
    setProperty('--primary-content', primaryColor.isDark() ? '#ffffff' : '#000000')
  }

  // 3. 处理背景模糊 (CSS Variable)
  setProperty('--bg-blur', `${config.bgBlur}px`)
}
// ================= END FILE =================
