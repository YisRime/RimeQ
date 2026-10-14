import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { useStorage, usePreferredDark } from '@vueuse/core'
import { bot } from '@/api'
import { useContactStore } from './contact'
import { dispatchEvent } from '@/utils/dispatch'

/**
 * 全局应用设置与状态管理
 * @description 负责用户登录、连接状态、主题外观以及各项应用配置
 */
export const useSettingStore = defineStore('setting', () => {
  /** WebSocket 连接状态 */
  const isConnected = ref(false)
  /** 当前已登录用户信息 */
  const user = ref<{ user_id: number; nickname: string } | null>(null)

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
    /** 是否渲染超级表情 */
    renderSuperFace: true,
    /** 是否启用自定义表情功能 */
    enableCustomFace: false,
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
   * 建立连接，获取用户信息，并初始化相关数据
   * @param addr - 服务地址
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
      bot.onReceive(dispatchEvent)
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
   * 断开连接并清理用户状态
   */
  function logout() {
    bot.disconnect()
    bot.onReceive(() => {})
    isConnected.value = false
    user.value = null
  }

  /**
   * 生成主题色变量
   * @param hex - 主题色 Hex
   * @param isDark - 是否深色模式
   */
  function generatePrimaryVars(hex: string, isDark: boolean) {
    // Hex 转 RGB
    let c = hex.substring(1)
    if (c.length === 3) c = c.split('').map(i => i + i).join('')
    const r = parseInt(c.substring(0, 2), 16)
    const g = parseInt(c.substring(2, 4), 16)
    const b = parseInt(c.substring(4, 6), 16)
    // 微调
    const offset = isDark ? 20 : -20

    return {
      '--primary-color': `${r}, ${g}, ${b}`,
      '--primary-hover': `${Math.max(0, Math.min(255, r + offset))}, ${Math.max(0, Math.min(255, g + offset))}, ${Math.max(0, Math.min(255, b + offset))}`,
      '--primary-active': `${Math.max(0, Math.min(255, r + offset * 2))}, ${Math.max(0, Math.min(255, g + offset * 2))}, ${Math.max(0, Math.min(255, b + offset * 2))}`,
      '--primary-content': ((r * 299) + (g * 587) + (b * 114)) / 1000 >= 128 ? '#000000' : '#ffffff',
    }
  }

  /**
   * 应用当前的主题设置
   * 根据配置计算并注入 CSS 变量到 DOM，实现主题动态切换
   */
  function applyTheme() {
    const root = document.documentElement
    const isDark = config.value.followSystemTheme ? systemDark.value : config.value.forceDarkMode
    root.classList.toggle('dark', isDark)
    // 注入 CSS
    const styleId = 'rimeq-custom-css'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = config.value.customCSS || ''
    // 注入 Var
    const primaryVars = generatePrimaryVars(config.value.themeColor, isDark)
    Object.entries(primaryVars).forEach(([key, val]) => root.style.setProperty(key, val))
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
