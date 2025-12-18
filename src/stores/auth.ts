import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { botApi } from '../api'
import { useContactStore } from './contact'

export interface LoginConfig {
  address: string
  token: string
  remember: boolean
  autoConnect: boolean
}

// OneBot v11 标准：get_login_info 返回的结构
export interface LoginInfo {
  userId: number  // user_id
  nickname: string
  avatar: string  // 扩展字段
}

export const useAuthStore = defineStore('auth', () => {
  const isConnected = ref(false)
  const isConnecting = ref(false)
  const token = ref('')
  const address = ref('')
  const loginInfo = ref<LoginInfo | null>(null)

  const isAuthenticated = computed(() => isConnected.value && !!loginInfo.value)

  // 使用 useStorage 简化配置持久化
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
      // 配置 WebSocket 重连回调，提供获取最新连接参数的函数
      botApi.wsService.setReconnectCallback(() => {
        if (address.value && isConnected.value) {
          return { address: address.value, token: token.value }
        }
        return null
      })

      await botApi.connect(config.address, config.token)

      const apiLoginInfo = await botApi.getLoginInfo()
      if (!apiLoginInfo) {
        throw new Error('Failed to get login info')
      }

      loginInfo.value = {
        userId: apiLoginInfo.user_id,  // 使用 userId
        nickname: apiLoginInfo.nickname,
        avatar: `https://q1.qlogo.cn/g?b=qq&s=0&nk=${apiLoginInfo.user_id}`
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
      loginInfo.value = null  // currentUser -> loginInfo
      throw error
    }
  }

  function logout() {
    botApi.disconnect()
    botApi.wsService.setReconnectCallback(null) // 清除重连回调
    isConnected.value = false
    isConnecting.value = false
    loginInfo.value = null  // currentUser -> loginInfo
  }

  return {
    isConnected,
    isConnecting,
    token,
    address,
    loginInfo,  // currentUser -> loginInfo
    isAuthenticated,
    getSavedConfig,
    connect,
    logout
  }
})
