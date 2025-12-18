import { dispatchMessage } from '../utils/msg-handler'

// 简单的 UUID 生成函数
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

interface OneBotResponse {
  status: string
  retcode?: number
  data?: unknown
  echo?: string
  [key: string]: unknown
}

class WebSocketService {
  private ws: WebSocket | null = null
  private heartbeatTimer: number | null = null
  private heartbeatTimeoutTimer: number | null = null
  private reconnectTimer: number | null = null
  private pendingRequests = new Map<string, { resolve: (val: unknown) => void; reject: (err: Error) => void }>()
  private isConnecting = false
  private manuallyClosed = false

  // 重连回调函数：由外部设置，用于获取最新的连接参数
  private reconnectCallback: (() => { address: string; token: string } | null) | null = null

  // 心跳间隔 (ms)
  private readonly HEARTBEAT_INTERVAL = 30000
  // 心跳超时等待 (ms)
  private readonly HEARTBEAT_TIMEOUT = 10000

  /**
   * 设置重连回调函数
   * @param callback 返回最新连接参数的函数，返回 null 表示不需要重连
   */
  setReconnectCallback(callback: (() => { address: string; token: string } | null) | null) {
    this.reconnectCallback = callback
  }

  async connect(address: string, token: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) return
    if (this.isConnecting) return

    this.isConnecting = true
    this.manuallyClosed = false

    let url = address
    if (!url.startsWith('ws://') && !url.startsWith('wss://')) {
      url = `ws://${url}`
    }
    if (token) {
      const separator = url.includes('?') ? '&' : '?'
      url += `${separator}access_token=${encodeURIComponent(token)}`
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(url)
      } catch (e) {
        this.isConnecting = false
        reject(e)
        return
      }

      this.ws.onopen = () => {
        console.log('[WS] Connected')
        this.isConnecting = false
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
        this.startHeartbeat()
        resolve()
      }

      this.ws.onmessage = (event) => {
        // 收到任何消息都重置心跳超时
        this.resetHeartbeatTimeout()
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (e) {
          console.error('[WS] Parse error', e)
        }
      }

      this.ws.onclose = (event) => {
        console.log('[WS] Closed', event.code, event.reason)
        this.cleanup()
        this.isConnecting = false
        if (!this.manuallyClosed) {
          // 非正常关闭，尝试重连
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = (error) => {
        console.error('[WS] Error', error)
        if (this.isConnecting) {
          this.isConnecting = false
          reject(error)
        }
      }
    })
  }

  disconnect() {
    this.manuallyClosed = true
    if (this.ws) {
      this.ws.close(1000, 'User logged out')
      this.ws = null
    }
    this.cleanup()
  }

  callApi(action: string, params: Record<string, unknown> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'))
        return
      }

      const echo = generateUUID()
      this.pendingRequests.set(echo, { resolve, reject })

      // 15秒 API 超时
      setTimeout(() => {
        if (this.pendingRequests.has(echo)) {
          this.pendingRequests.delete(echo)
          reject(new Error(`API timeout: ${action}`))
        }
      }, 15000)

      this.ws.send(JSON.stringify({ action, params, echo }))
    })
  }

  send(action: string, params: Record<string, unknown> = {}) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(JSON.stringify({ action, params }))
  }

  private handleMessage(data: OneBotResponse) {
    if (data.echo && this.pendingRequests.has(data.echo)) {
      const { resolve, reject } = this.pendingRequests.get(data.echo)!
      this.pendingRequests.delete(data.echo)

      // 兼容不同框架的返回结构 (retcode 0 或 status ok)
      if (data.status === 'ok' || data.retcode === 0) {
        resolve(data.data)
      } else {
        reject(new Error(`API Error: ${data.status || data.retcode}`))
      }
      return
    }
    dispatchMessage(data)
  }

  private startHeartbeat() {
    this.cleanup()
    // 定时发送心跳包 (OneBot 实际上通常是被动接收 heartbeart，但为了保活，我们主动发 get_status 也可以)
    this.heartbeatTimer = window.setInterval(() => {
      // 如果连接正常，发送一个轻量级请求来保活
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('get_status')
      }
    }, this.HEARTBEAT_INTERVAL)
  }

  private resetHeartbeatTimeout() {
    if (this.heartbeatTimeoutTimer) clearTimeout(this.heartbeatTimeoutTimer)
    // 如果超过一定时间没收到任何消息，认为连接假死
    this.heartbeatTimeoutTimer = window.setTimeout(() => {
      console.warn('[WS] Heartbeat timeout, reconnecting...')
      this.ws?.close() // 触发 onclose 重连
    }, this.HEARTBEAT_INTERVAL + this.HEARTBEAT_TIMEOUT)
  }

  private cleanup() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
    if (this.heartbeatTimeoutTimer) clearTimeout(this.heartbeatTimeoutTimer)
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.heartbeatTimer = null
    this.heartbeatTimeoutTimer = null
    this.reconnectTimer = null

    // 清理挂起的请求
    this.pendingRequests.forEach(({ reject }) => reject(new Error('Connection closed')))
    this.pendingRequests.clear()
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return

    // 使用重连回调获取连接参数
    if (!this.reconnectCallback) {
      console.warn('[WS] No reconnect callback set, skipping reconnect')
      return
    }

    const params = this.reconnectCallback()
    if (!params || !params.address) {
      console.warn('[WS] No valid connection params from callback, skipping reconnect')
      return
    }

    console.log('[WS] Reconnecting in 3s...')
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect(params.address, params.token).catch(() => {
        // 重连失败会自动再次触发 onclose
      })
    }, 3000)
  }
}

export { WebSocketService }
export const wsService = new WebSocketService()
