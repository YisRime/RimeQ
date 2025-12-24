import { ref, watch } from 'vue'
import { useStorage } from '@vueuse/core'
import { bot } from '@/api'
import { colord, extend } from 'colord'
import mixPlugin from 'colord/plugins/mix'
import namesPlugin from 'colord/plugins/names'
import type { LoginInfo } from '@/types'

// Extend colord plugins
extend([mixPlugin, namesPlugin])

// =========================================================================================
// Configuration Types
// =========================================================================================

/** 应用全局配置 */
export interface AppConfig {
  autoConnect: boolean
  address: string
  token: string
  remember: boolean
  darkMode: boolean
  autoTheme: boolean
  themeColor: number | string
  bgImage: string
  bgBlur: number
  antiRecall: boolean
  css: string
  logLevel: string
}

// =========================================================================================
// Settings Store
// =========================================================================================

/**
 * 设置存储类
 * 管理登录状态、用户信息、持久化配置以及主题逻辑
 */
export class SettingsStore {
  /** 是否已连接服务器 */
  isConnected = ref(false)
  /** 连接中状态 */
  isConnecting = ref(false)
  /** 当前登录用户信息 */
  user = ref<LoginInfo | null>(null)

  /** 应用配置 (持久化) */
  config = useStorage<AppConfig>('app_settings_v2', {
    autoConnect: false,
    address: '',
    token: '',
    remember: false,
    darkMode: false,
    autoTheme: true,
    themeColor: '#7abb7e',
    bgImage: '',
    bgBlur: 0,
    antiRecall: false,
    css: '',
    logLevel: 'error'
  }, localStorage, { mergeDefaults: true })

  constructor() {
    // 监听配置变化自动应用主题
    watch(
      () => [this.config.value.themeColor, this.config.value.darkMode, this.config.value.bgBlur, this.config.value.css],
      () => this.applyTheme(),
      { deep: true, immediate: true }
    )
  }

  /** 是否已登录且获取到信息 */
  get isLogged() {
    return this.isConnected.value && !!this.user.value
  }

  /**
   * 登录连接
   * @param addr 服务器地址
   * @param tk Access Token
   */
  async login(addr: string, tk: string) {
    this.isConnecting.value = true
    try {
      // 1. 建立 WS 连接
      await bot.connect(addr, tk)

      // 2. 获取登录号信息
      const info = await bot.getLoginInfo()

      if (info) {
        this.user.value = info
        this.isConnected.value = true
        this.config.value.address = addr
        if (this.config.value.remember) this.config.value.token = tk

        console.log(`[Settings] 登录成功: ${info.nickname} (${info.user_id})`)
      } else {
        throw new Error('无法获取用户信息')
      }
    } catch (e) {
      this.isConnected.value = false
      this.user.value = null
      throw e
    } finally {
      this.isConnecting.value = false
    }
  }

  /** 登出并断开连接 */
  logout() {
    bot.disconnect()
    this.isConnected.value = false
    this.user.value = null
  }

  // =========================================================================================
  // Theme Logic
  // =========================================================================================

  private setProperty(key: string, value: string) {
    document.documentElement.style.setProperty(key, value)
  }

  /** 应用主题 */
  applyTheme() {
    const config = this.config.value
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
      this.setProperty('--primary-color', primary.toHex())

      if (isDark) {
        // === 深色模式 ===
        // 交互色
        this.setProperty('--primary-hover', primary.lighten(0.05).toHex())
        this.setProperty('--primary-active', primary.darken(0.05).toHex())
        this.setProperty('--primary-soft', primary.alpha(0.20).toRgbString())
        this.setProperty('--primary-content', primary.isDark() ? '#ffffff' : '#000000')

        // 全局背景 (黑 + 少量主色)
        this.setProperty('--color-main', colord('#000000').mix(primary, 0.08).toHex())
        this.setProperty('--color-sub', colord('#000000').mix(primary, 0.15).toHex())
        this.setProperty('--color-dim', colord('#000000').mix(primary, 0.25).toHex())

        // 全局文字 (白 + 极少主色)
        this.setProperty('--text-main', colord('#ffffff').mix(primary, 0.05).toHex())
        this.setProperty('--text-sub', colord('#ffffff').mix(primary, 0.30).toHex())
        this.setProperty('--text-dim', colord('#ffffff').mix(primary, 0.60).toHex())
      } else {
        // === 浅色模式 ===
        // 交互色
        this.setProperty('--primary-hover', primary.darken(0.05).toHex())
        this.setProperty('--primary-active', primary.darken(0.10).toHex())
        this.setProperty('--primary-soft', primary.alpha(0.10).toRgbString())
        this.setProperty('--primary-content', primary.isDark() ? '#ffffff' : '#000000')

        // 全局背景 (白 + 极少主色)
        this.setProperty('--color-main', '#ffffff')
        this.setProperty('--color-sub', colord('#ffffff').mix(primary, 0.06).toHex())
        this.setProperty('--color-dim', colord('#ffffff').mix(primary, 0.15).toHex())

        // 全局文字 (黑 + 少量主色)
        this.setProperty('--text-main', colord('#000000').mix(primary, 0.10).toHex())
        this.setProperty('--text-sub', colord('#000000').mix(primary, 0.40).toHex())
        this.setProperty('--text-dim', colord('#000000').mix(primary, 0.70).toHex())
      }
    }

    // 3. 背景模糊变量
    this.setProperty('--bg-blur', `${config.bgBlur}px`)

    // 4. 全局切换 dark class
    if (isDark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }
}

export const settingsStore = new SettingsStore()
