import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { useStorage, usePreferredDark } from '@vueuse/core'
import { colord, extend } from 'colord'
import mixPlugin from 'colord/plugins/mix'
import a11yPlugin from 'colord/plugins/a11y'
import { bot } from '@/api'
import { useContactStore } from './contact'
import type { LoginInfo } from '@/types'

// 注册 Colord 插件
extend([mixPlugin, a11yPlugin])

export const useSettingStore = defineStore('setting', () => {
  // WebSocket 连接状态
  const isConnected = ref(false)
  // 当前登录用户信息
  const user = ref<LoginInfo | null>(null)

  // 应用配置 (持久化存储)
  const config = useStorage('rimeq-config', {
    // WebSocket 连接地址
    connectAddress: '',
    // 连接鉴权令牌
    accessToken: '',
    // 是否记住令牌
    rememberToken: false,
    // 是否自动连接
    autoConnect: false,
    // 是否强制开启深色模式
    forceDarkMode: false,
    // 是否跟随系统主题
    followSystemTheme: true,
    // 应用主题色
    themeColor: '#81D8CF',
    // 聊天背景图片 URL
    backgroundImg: '',
    // 背景图片模糊半径 (px)
    backgroundBlur: 0,
    // 是否启用防撤回
    enableAntiRecall: false,
    // 自定义 CSS 样式
    customCSS: ''
  })

  // 判断用户是否已登录
  const isLogged = computed(() => isConnected.value && !!user.value)
  // 监听是否处于深色模式
  const systemDark = usePreferredDark()

  // 登录：建立连接并验证身份
  async function login(addr: string, tk: string) {
    try {
      await bot.connect(addr, tk)
      // 获取登录用户信息
      const info = await bot.getLoginInfo()
      if (!info) throw new Error('User Info is Null')
      // 更新运行时状态
      user.value = info
      isConnected.value = true

      // 异步获取列表
      const contactStore = useContactStore()
      contactStore.fetchContacts()

      // 更新持久化配置
      config.value.connectAddress = addr
      config.value.accessToken = config.value.rememberToken ? tk : ''
    } catch (e) {
      logout()
      throw e
    }
  }

  // 登出：断开连接并清理状态
  function logout() {
    bot.disconnect()
    isConnected.value = false
    user.value = null
  }

  // 应用主题样式：计算 CSS 变量并注入 DOM
  function applyTheme() {
    const root = document.documentElement
    const isDark = config.value.followSystemTheme ? systemDark.value : config.value.forceDarkMode

    // 切换 HTML 根元素的 dark 类
    root.classList.toggle('dark', isDark)

    // 注入用户自定义 CSS
    const styleId = 'rimeq-custom-css'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = config.value.customCSS || ''

    // 计算主题色板
    const primary = colord(config.value.themeColor)
    const bgBase = isDark ? colord('#121212') : colord('#ffffff')
    const fgBase = isDark ? colord('#ffffff') : colord('#121212')

    // 计算内容颜色
    const primaryContent = primary.isDark() ? '#ffffff' : '#000000'

    // 定义变量映射
    const vars: Record<string, string> = {
      // 品牌色系
      '--primary-color': primary.toHex(),
      '--primary-hover': isDark ? primary.lighten(0.1).toHex() : primary.darken(0.05).toHex(),
      '--primary-active': isDark ? primary.darken(0.1).toHex() : primary.darken(0.1).toHex(),
      '--primary-soft': primary.alpha(isDark ? 0.2 : 0.12).toRgbString(),
      '--primary-content': primaryContent,

      // 背景色系
      '--color-main': bgBase.mix(primary, isDark ? 0.05 : 0.02).toHex(),
      '--color-sub': isDark
        ? bgBase.lighten(0.05).mix(primary, 0.05).toHex()
        : bgBase.darken(0.02).mix(primary, 0.03).toHex(),
      '--color-dim': isDark
        ? bgBase.lighten(0.12).mix(primary, 0.05).toHex()
        : bgBase.darken(0.06).mix(primary, 0.05).toHex(),

      // 文字色系
      '--text-main': fgBase.alpha(0.9).toRgbString(),
      '--text-sub': fgBase.alpha(0.6).toRgbString(),
      '--text-dim': fgBase.alpha(0.35).toRgbString(),
    }

    // 设置 CSS 变量
    Object.entries(vars).forEach(([key, val]) => root.style.setProperty(key, val))
  }

  // 监听配置变化
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
