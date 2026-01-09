import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { useStorage, usePreferredDark } from '@vueuse/core'
import { colord, extend } from 'colord'
import mixPlugin from 'colord/plugins/mix'
import a11yPlugin from 'colord/plugins/a11y'
import { bot, socket } from '@/api'
import { useContactStore } from './contact'
import { dispatchEvent } from '@/utils/dispatch'
import type { LoginInfo } from '@/types'

extend([mixPlugin, a11yPlugin])

/**
 * 全局应用设置与状态管理
 * @description 负责用户登录、连接状态、主题外观以及各项应用配置
 */
export const useSettingStore = defineStore('setting', () => {
  /** WebSocket 连接状态 */
  const isConnected = ref(false)
  /** 当前已登录用户信息 */
  const user = ref<LoginInfo | null>(null)

  /** 持久化存储的应用配置 */
  const config = useStorage('rimeq-config', {
    /** WebSocket 连接地址 */
    connectAddress: '',
    /** 连接鉴权令牌 */
    accessToken: '',
    /** 是否记住令牌以便自动填充 */
    rememberToken: false,
    /** 是否在应用启动时自动连接 */
    autoConnect: false,
    /** 是否强制开启深色模式 */
    forceDarkMode: false,
    /** 是否跟随系统主题偏好 */
    followSystemTheme: true,
    /** 应用的主题色 */
    themeColor: '#81D8CF',
    /** 聊天背景图片的 URL */
    backgroundImg: '',
    /** 背景图片的模糊半径 (px) */
    backgroundBlur: 0,
    /** 是否启用防撤回功能 */
    enableAntiRecall: false,
    /** 自定义的 CSS 样式 */
    customCSS: '',
    /** 是否开启调试模式 */
    debugMode: false,
  })

  /** (计算属性) 判断是否已成功登录 */
  const isLogged = computed(() => isConnected.value && !!user.value)
  /** 监听系统是否处于深色模式 */
  const systemDark = usePreferredDark()

  /**
   * 执行登录流程
   * 建立 WebSocket 连接，获取用户信息，并初始化相关数据
   * @param addr - WebSocket 服务地址
   * @param tk - 访问令牌 (Token)
   * @throws 当连接或获取用户信息失败时抛出错误
   */
  async function login(addr: string, tk: string) {
    try {
      await bot.connect(addr, tk)
      const info = await bot.getLoginInfo()
      if (!info) throw new Error('Unable to Fetch Login Info')
      user.value = info
      isConnected.value = true
      socket.onReceive(dispatchEvent)
      const contactStore = useContactStore()
      contactStore.fetchContacts()
      config.value.connectAddress = addr
      config.value.accessToken = config.value.rememberToken ? tk : ''
    } catch (e) {
      logout()
      throw e
    }
  }

  /**
   * 执行登出操作
   * 断开 WebSocket 连接并清理用户状态
   */
  function logout() {
    bot.disconnect()
    socket.onReceive(() => {})
    isConnected.value = false
    user.value = null
  }

  /**
   * 应用当前的主题设置
   * 根据配置计算并注入 CSS 变量到 DOM，实现主题动态切换
   */
  function applyTheme() {
    const root = document.documentElement
    const isDark = config.value.followSystemTheme ? systemDark.value : config.value.forceDarkMode
    root.classList.toggle('dark', isDark)
    const styleId = 'rimeq-custom-css'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = config.value.customCSS || ''
    const primary = colord(config.value.themeColor)
    const bgBase = isDark ? colord('#121212') : colord('#ffffff')
    const fgBase = isDark ? colord('#ffffff') : colord('#121212')
    const primaryContent = primary.isDark() ? '#ffffff' : '#000000'
    const vars: Record<string, string> = {
      '--primary-color': primary.toHex(),
      '--primary-hover': isDark ? primary.lighten(0.1).toHex() : primary.darken(0.05).toHex(),
      '--primary-active': isDark ? primary.darken(0.1).toHex() : primary.darken(0.1).toHex(),
      '--primary-soft': primary.alpha(isDark ? 0.2 : 0.12).toRgbString(),
      '--primary-content': primaryContent,
      '--color-main': bgBase.mix(primary, isDark ? 0.05 : 0.02).toHex(),
      '--color-sub': isDark
        ? bgBase.lighten(0.05).mix(primary, 0.05).toHex()
        : bgBase.darken(0.02).mix(primary, 0.03).toHex(),
      '--color-dim': isDark
        ? bgBase.lighten(0.12).mix(primary, 0.05).toHex()
        : bgBase.darken(0.06).mix(primary, 0.05).toHex(),
      '--text-main': fgBase.alpha(0.9).toRgbString(),
      '--text-sub': fgBase.alpha(0.6).toRgbString(),
      '--text-dim': fgBase.alpha(0.35).toRgbString(),
    }
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val))
  }

  watch(
    () => [
      config.value.themeColor,
      config.value.forceDarkMode,
      config.value.followSystemTheme,
      config.value.customCSS,
      systemDark.value
    ],
    applyTheme,
    { immediate: true }
  )

  return { isConnected, user, config, isLogged, login, logout }
})
