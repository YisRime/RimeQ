import { defineStore } from 'pinia'
import { ref, watch, computed } from 'vue'
import { usePreferredDark } from '@vueuse/core'
import { colord, extend } from 'colord'
import mixPlugin from 'colord/plugins/mix'
import namesPlugin from 'colord/plugins/names'
import { bot } from '@/api'
import type { LoginInfo } from '@/types'

extend([mixPlugin, namesPlugin])

export const useSettingStore = defineStore('setting', () => {
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const user = ref<LoginInfo | null>(null)
  const isLogged = computed(() => isConnected.value && !!user.value)

  // 配置项
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

  async function login(addr: string, tk: string) {
    isConnecting.value = true
    try {
      await bot.connect(addr, tk)
      const info = await bot.getLoginInfo()
      if (!info) throw new Error('Unable to fetch user info.')

      user.value = info
      isConnected.value = true
      config.value.connectAddress = addr

      if (config.value.rememberToken) {
        config.value.accessToken = tk
      }
    } catch (e) {
      logout()
      throw e
    } finally {
      isConnecting.value = false
    }
  }

  function logout() {
    bot.disconnect()
    isConnected.value = false
    user.value = null
  }

  const preferredDark = usePreferredDark()

  function applyTheme() {
    const { themeColor, forceDarkMode, customCSS } = config.value
    const root = document.documentElement

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

    const isDark = config.value.followSystemTheme ? preferredDark.value : forceDarkMode
    const darkBase = colord('#121212')
    const lightBase = colord('#ffffff')

    if (isDark) {
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

  watch(
    () => [config.value.themeColor, config.value.forceDarkMode, config.value.followSystemTheme, config.value.customCSS, preferredDark.value],
    () => applyTheme(),
    { immediate: true, deep: true }
  )

  return { isConnected, isConnecting, user, config, login, logout, isLogged }
}, {
  persist: {
    paths: ['config']
  } as any
})
