import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { bot } from '../api'
import { useContactStore } from './contact'
import type { LoginInfo } from '../types'

export interface LoginConfig {
  address: string
  token: string
  remember: boolean
  autoConnect: boolean
}

export const useAuthStore = defineStore('auth', () => {
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const token = ref('')
  const address = ref('')
  const loginInfo = ref<LoginInfo | null>(null)

  const isAuthenticated = computed(() => isConnected.value && !!loginInfo.value)

  const savedConfig = useStorage<LoginConfig | null>('webqq_auth_config', null, localStorage)

  function getSavedConfig(): LoginConfig | null {
    return savedConfig.value
  }

  async function connect(config: LoginConfig): Promise<boolean> {
    if (config.remember) {
      savedConfig.value = {
        address: config.address,
        token: config.token,
        remember: true,
        autoConnect: config.autoConnect
      }
    } else {
      savedConfig.value = null
    }

    address.value = config.address
    token.value = config.token
    isConnecting.value = true

    try {
      // socket.ts 内置了自动重连逻辑，无需手动设置 callback
      await bot.connect(config.address, config.token)

      const apiLoginInfo = await bot.getLoginInfo()
      if (!apiLoginInfo) {
        throw new Error('Failed to get login info')
      }

      loginInfo.value = {
        user_id: apiLoginInfo.user_id,
        nickname: apiLoginInfo.nickname
      }
      isConnected.value = true
      isConnecting.value = false

      const contactStore = useContactStore()
      contactStore.init()

      return true
    } catch (error) {
      console.error('Login failed:', error)
      isConnected.value = false
      isConnecting.value = false
      loginInfo.value = null
      throw error
    }
  }

  function logout() {
    bot.disconnect()
    isConnected.value = false
    isConnecting.value = false
    loginInfo.value = null
  }

  return {
    isConnected,
    isConnecting,
    token,
    address,
    loginInfo,
    isAuthenticated,
    getSavedConfig,
    connect,
    logout
  }
})
