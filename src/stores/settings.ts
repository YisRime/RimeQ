import { defineStore } from 'pinia'
import { watch } from 'vue'
import { useStorage } from '@vueuse/core'

/** 用户配置数据结构 */
export interface AppConfig {
  /** 自动连接 */
  autoConnect: boolean
  /** 上次保存的地址 */
  address: string
  /** 上次保存的 Token */
  token: string
  /** 记住密码状态 (用于前端回显) */
  remember: boolean
  /** 暗黑模式 (false:关闭, true:开启) */
  darkMode: boolean
  /** 跟随系统主题 */
  autoTheme: boolean
  /** 主题色索引或 Hex */
  themeColor: number | string
  /** 聊天背景图 URL */
  bgImage: string
  /** 背景模糊程度 (px) */
  bgBlur: number
  /** 是否开启防撤回 (本地拦截) */
  antiRecall: boolean
  /** 自定义 CSS 代码 */
  css: string
  /** 调试日志级别 */
  logLevel: string
}

/**
 * 设置 Store
 * 管理应用全局配置与持久化
 */
export const useSettingsStore = defineStore('settings', () => {
  // --- State ---

  /** 默认配置 */
  const defaults: AppConfig = {
    autoConnect: false,
    address: '',
    token: '',
    remember: false,
    darkMode: false,
    autoTheme: true,
    themeColor: 0,
    bgImage: '',
    bgBlur: 0,
    antiRecall: false,
    css: '',
    logLevel: 'error'
  }

  /** 持久化配置对象 */
  const config = useStorage<AppConfig>(
    'app_settings_v2',
    defaults,
    localStorage,
    { mergeDefaults: true }
  )

  // --- Actions ---

  /**
   * 应用视觉样式
   * 处理自定义 CSS 注入与主题变量设置
   */
  function applyStyle() {
    // 1. 注入自定义 CSS
    const id = 'user-custom-css'
    let el = document.getElementById(id)
    if (!el) {
      el = document.createElement('style')
      el.id = id
      document.head.appendChild(el)
    }
    el.textContent = config.value.css || ''

    // 2. 处理主题色 (简单示例，完整逻辑可参考原 option.ts)
    const root = document.documentElement
    // 这里假设有一个转换函数或逻辑来设置 --primary-color
    // root.style.setProperty('--primary-color', ...)
  }

  // 监听配置变化自动重绘
  watch(config, applyStyle, { deep: true, immediate: true })

  return {
    config,
    applyStyle
  }
})
