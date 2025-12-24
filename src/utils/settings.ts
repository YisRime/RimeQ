import { ref, watch } from 'vue'
import { useStorage, usePreferredDark } from '@vueuse/core'
import { bot } from '@/api'
import { colord, extend } from 'colord'
import mixPlugin from 'colord/plugins/mix'
import namesPlugin from 'colord/plugins/names'
import type { LoginInfo } from '@/types'

// 注册颜色处理插件
extend([mixPlugin, namesPlugin])

// 全局配置接口定义
export interface AppConfig {
  connectAddress: string      // 连接地址
  accessToken: string         // 访问令牌
  rememberToken: boolean      // 是否记住令牌
  autoConnect: boolean        // 是否自动连接
  forceDarkMode: boolean      // 是否强制深色模式
  followSystemTheme: boolean  // 是否跟随系统主题
  themeColor: number | string // 主题色
  backgroundImg: string       // 聊天背景图
  backgroundBlur: number      // 背景模糊半径
  enableAntiRecall: boolean   // 是否开启防撤回
  customCSS: string           // 用户自定义 CSS
}

// 全局设置与状态管理
export class SettingsStore {
  /** 是否已连接 WebSocket */
  isConnected = ref(false)
  /** 是否正在建立连接 */
  isConnecting = ref(false)
  /** 当前登录的用户信息 */
  user = ref<LoginInfo | null>(null)

  /** 持久化的应用配置 */
  config = useStorage<AppConfig>(
    'rimeq_settings',
    {
      connectAddress: '',
      accessToken: '',
      rememberToken: false,
      autoConnect: false,
      forceDarkMode: false,
      followSystemTheme: true,
      themeColor: '#81D8CF',
      backgroundImg: '',
      backgroundBlur: 0,
      enableAntiRecall: false,
      customCSS: ''
    },
    localStorage,
    { mergeDefaults: true }
  )

  // 初始化配置监听器
  constructor() {
    const preferredDark = usePreferredDark()

    // 监听系统主题与用户配置
    watch(
      () => [preferredDark.value, this.config.value.followSystemTheme],
      ([isSystemDark, isAuto]) => {
        if (isAuto) {
          this.config.value.forceDarkMode = isSystemDark ?? false
        }
      },
      { immediate: true }
    )

    // 监听主题配置
    watch(
      () => [
        this.config.value.themeColor,
        this.config.value.forceDarkMode,
        this.config.value.customCSS
      ],
      () => this.applyTheme(),
      { deep: true, immediate: true }
    )
  }

  // 判断用户是否已登录
  get isLogged() {
    return this.isConnected.value && !!this.user.value
  }

  // 获取用户信息
  async login(addr: string, tk: string) {
    this.isConnecting.value = true
    try {
      await bot.connect(addr, tk)
      const info = await bot.getLoginInfo()

      if (!info) throw new Error('Unable to fetch user info.')

      this.user.value = info
      this.isConnected.value = true
      this.config.value.connectAddress = addr
      if (this.config.value.rememberToken) this.config.value.accessToken = tk

    } catch (e) {
      this.logout()
      throw e
    } finally {
      this.isConnecting.value = false
    }
  }

  // 断开连接
  logout() {
    bot.disconnect()
    this.isConnected.value = false
    this.user.value = null
  }

  // 应用主题配置
  private applyTheme() {
    const { themeColor, forceDarkMode, customCSS } = this.config.value
    const root = document.documentElement

    // 注入自定义 CSS
    const styleId = 'user-custom-css'
    let styleEl = document.getElementById(styleId)
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = customCSS || ''

    const primary = colord(String(themeColor))
    if (!primary.isValid()) return

    root.style.setProperty('--primary-color', primary.toHex())
    root.style.setProperty('--primary-content', primary.isDark() ? '#ffffff' : '#000000')

    const darkBase = colord('#121212')
    const lightBase = colord('#ffffff')

    // 设置衍生颜色
    if (forceDarkMode) {
      root.classList.add('dark')
      root.style.setProperty('--primary-hover', primary.lighten(0.1).toHex())
      root.style.setProperty('--primary-active', primary.darken(0.1).toHex())
      root.style.setProperty('--primary-soft', primary.alpha(0.15).toRgbString())
      root.style.setProperty('--color-main', darkBase.mix(primary, 0.03).toHex())
      root.style.setProperty('--color-sub', darkBase.lighten(0.05).mix(primary, 0.05).toHex())
      root.style.setProperty('--color-dim', darkBase.lighten(0.08).mix(primary, 0.08).toHex())
      root.style.setProperty('--text-main', lightBase.alpha(0.87).toRgbString())
      root.style.setProperty('--text-sub', lightBase.alpha(0.6).toRgbString())
      root.style.setProperty('--text-dim', lightBase.alpha(0.38).toRgbString())
    } else {
      root.classList.remove('dark')
      root.style.setProperty('--primary-hover', primary.darken(0.05).toHex())
      root.style.setProperty('--primary-active', primary.darken(0.1).toHex())
      root.style.setProperty('--primary-soft', primary.alpha(0.12).toRgbString())
      root.style.setProperty('--color-main', lightBase.toHex())
      root.style.setProperty('--color-sub', lightBase.darken(0.02).mix(primary, 0.04).toHex())
      root.style.setProperty('--color-dim', lightBase.darken(0.05).mix(primary, 0.08).toHex())
      root.style.setProperty('--text-main', darkBase.lighten(0.1).alpha(0.87).toRgbString())
      root.style.setProperty('--text-sub', darkBase.lighten(0.1).alpha(0.6).toRgbString())
      root.style.setProperty('--text-dim', darkBase.lighten(0.1).alpha(0.38).toRgbString())
    }
  }
}

// 导出单例设置存储
export const settingsStore = new SettingsStore()
