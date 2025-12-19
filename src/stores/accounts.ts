import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { bot } from '@/api'
import type { LoginInfo } from '@/types'

/**
 * 账户管理 Store
 * 负责 WebSocket 连接状态与当前用户身份
 */
export const useAccountsStore = defineStore('accounts', () => {
  // --- State ---

  /** WebSocket 是否已连接 */
  const connected = ref(false)

  /** 是否正在连接中 */
  const connecting = ref(false)

  /** 当前登录的用户资料 */
  const user = ref<LoginInfo | null>(null)

  /** 当前连接的服务器地址 */
  const address = ref('')

  /** 当前使用的鉴权令牌 */
  const token = ref('')

  // --- Getters ---

  /** 是否已登录 (连接成功且已获取用户信息) */
  const isLogged = computed(() => connected.value && !!user.value)

  // --- Actions ---

  /**
   * 登录连接
   * 建立 WebSocket 连接并获取基础用户信息
   * @param addr - 服务器地址
   * @param tk - Access Token
   */
  async function login(addr: string, tk: string): Promise<void> {
    address.value = addr
    token.value = tk
    connecting.value = true

    try {
      // 1. 建立连接
      await bot.connect(addr, tk)

      // 2. 验证有效性
      const info = await bot.getLoginInfo()
      if (info) {
        user.value = info
        connected.value = true
      } else {
        throw new Error('无法获取用户信息')
      }
    } catch (error) {
      // 连接失败清理状态
      connected.value = false
      user.value = null
      throw error
    } finally {
      connecting.value = false
    }
  }

  /**
   * 登出
   * 断开连接并清理当前用户状态
   */
  function logout() {
    bot.disconnect()
    connected.value = false
    user.value = null
  }

  return {
    connected,
    connecting,
    user,
    address,
    token,
    isLogged,
    login,
    logout
  }
})
