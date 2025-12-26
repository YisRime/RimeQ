import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import { colord, extend } from 'colord'
import mixPlugin from 'colord/plugins/mix'
import { bot } from '@/api'
import type { LoginInfo } from '@/types'

extend([mixPlugin])

export const useSettingStore = defineStore('setting', () => {
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const user = ref<LoginInfo | null>(null)

  const config = ref({
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
  })

  const isLogged = computed(() => isConnected.value && !!user.value)
  const systemDark = usePreferredDark()

  async function login(addr: string, tk: string) {
    console.log('[SettingStore] Start Login:', addr)
    if (isConnecting.value) return
    isConnecting.value = true

    try {
      await bot.connect(addr, tk)
      console.log('[SettingStore] Socket Connected')

      const info = await bot.getLoginInfo()
      console.log('[SettingStore] User Info Fetched:', info)

      if (!info) throw new Error('无法获取用户信息')

      user.value = info
      isConnected.value = true

      config.value.connectAddress = addr
      if (config.value.rememberToken) {
        config.value.accessToken = tk
      }
    } catch (e) {
      console.error('[SettingStore] Login Failed:', e)
      logout()
      throw e
    } finally {
      isConnecting.value = false
    }
  }

  function attemptAutoLogin(): Promise<void> | boolean {
    console.log('[SettingStore] Attempt Auto Login check...')
    if (isLogged.value) {
        console.log('[SettingStore] Already logged in.')
        return false
    }

    const { autoConnect, connectAddress, accessToken } = config.value
    if (autoConnect && connectAddress && accessToken) {
      console.log('[SettingStore] Auto Login Triggered')
      return login(connectAddress, accessToken)
    }
    console.log('[SettingStore] No Auto Login conditions met')
    return false
  }

  function logout() {
    console.log('[SettingStore] Logout')
    bot.disconnect()
    isConnected.value = false
    user.value = null
  }

  function applyTheme() {
    const { themeColor, forceDarkMode, followSystemTheme, customCSS } = config.value
    const isDark = followSystemTheme ? systemDark.value : forceDarkMode
    const root = document.documentElement

    if (isDark) root.classList.add('dark')
    else root.classList.remove('dark')

    const styleId = 'rime-custom-css'
    let styleEl = document.getElementById(styleId)
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    styleEl.textContent = customCSS || ''

    const primary = colord(themeColor)
    const bgBase = isDark ? colord('#121212') : colord('#ffffff')
    const fgBase = isDark ? colord('#ffffff') : colord('#121212')

    const vars: Record<string, string> = {
      '--primary-color': primary.toHex(),
      '--primary-hover': isDark ? primary.lighten(0.1).toHex() : primary.darken(0.05).toHex(),
      '--primary-active': isDark ? primary.darken(0.1).toHex() : primary.darken(0.1).toHex(),
      '--primary-soft': primary.alpha(isDark ? 0.2 : 0.12).toRgbString(),
      '--primary-content': primary.isDark() ? '#ffffff' : '#000000',

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

    Object.entries(vars).forEach(([key, val]) => {
      root.style.setProperty(key, val)
    })
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

  return {
    isConnected,
    isConnecting,
    user,
    config,
    isLogged,
    login,
    logout,
    attemptAutoLogin,
    applyTheme
  }
}, {
  persist: {
    paths: ['config'],
    storage: localStorage
  } as any
})
