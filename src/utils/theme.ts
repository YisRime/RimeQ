import { colord, extend } from 'colord'
import mixPlugin from 'colord/plugins/mix'
import namesPlugin from 'colord/plugins/names'
import { accountStore } from './storage'

extend([mixPlugin, namesPlugin])

const setProperty = (key: string, value: string) => {
  document.documentElement.style.setProperty(key, value)
}

export function applyTheme() {
  const config = accountStore.config.value
  const isDark = config.darkMode

  // 1. 注入用户自定义 CSS
  const styleId = 'user-custom-css'
  let styleEl = document.getElementById(styleId)
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = styleId
    document.head.appendChild(styleEl)
  }
  styleEl.textContent = config.css || ''

  // 2. 计算动态主题色
  const primaryInput = String(config.themeColor)
  const primary = colord(primaryInput)

  if (primary.isValid()) {
    // --- 品牌色 ---
    setProperty('--primary-color', primary.toHex())

    if (isDark) {
      // === 深色模式 ===
      // 交互色
      setProperty('--primary-hover', primary.lighten(0.05).toHex())
      setProperty('--primary-active', primary.darken(0.05).toHex())
      setProperty('--primary-soft', primary.alpha(0.20).toRgbString())
      setProperty('--primary-content', primary.isDark() ? '#ffffff' : '#000000')

      // 全局背景 (黑 + 少量主色)
      setProperty('--color-main', colord('#000000').mix(primary, 0.08).toHex())
      setProperty('--color-sub', colord('#000000').mix(primary, 0.15).toHex())
      setProperty('--color-dim', colord('#000000').mix(primary, 0.25).toHex())

      // 全局文字 (白 + 极少主色)
      setProperty('--text-main', colord('#ffffff').mix(primary, 0.05).toHex())
      setProperty('--text-sub', colord('#ffffff').mix(primary, 0.30).toHex())
      setProperty('--text-dim', colord('#ffffff').mix(primary, 0.60).toHex())
    } else {
      // === 浅色模式 ===
      // 交互色
      setProperty('--primary-hover', primary.darken(0.05).toHex())
      setProperty('--primary-active', primary.darken(0.10).toHex())
      setProperty('--primary-soft', primary.alpha(0.10).toRgbString())
      setProperty('--primary-content', primary.isDark() ? '#ffffff' : '#000000')

      // 全局背景 (白 + 极少主色)
      setProperty('--color-main', '#ffffff')
      setProperty('--color-sub', colord('#ffffff').mix(primary, 0.06).toHex())
      setProperty('--color-dim', colord('#ffffff').mix(primary, 0.15).toHex())

      // 全局文字 (黑 + 少量主色)
      setProperty('--text-main', colord('#000000').mix(primary, 0.10).toHex())
      setProperty('--text-sub', colord('#000000').mix(primary, 0.40).toHex())
      setProperty('--text-dim', colord('#000000').mix(primary, 0.70).toHex())
    }
  }

  // 3. 背景模糊变量
  setProperty('--bg-blur', `${config.bgBlur}px`)

  // 4. 全局切换 dark class
  if (isDark) document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
}
