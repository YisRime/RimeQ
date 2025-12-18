import { dispatchMessage } from '../utils/msg-handler'

/**
 * WebSocket 通信服务类
 * 负责底层连接维护、心跳保活、API 调用封装
 */
export class Socket {
  private ws: WebSocket | null = null
  private timer: number | null = null
  private pending = new Map<string, { resolve: (d: any) => void; reject: (e: Error) => void }>()
  private url = ''
  private token = ''
  private active = false

  /**
   * 连接到 WebSocket 服务器
   * @param url - 服务地址
   * @param token - Access Token
   */
  connect(url: string, token: string): Promise<void> {
    this.url = url
    this.token = token
    this.active = true

    if (this.ws?.readyState === WebSocket.OPEN) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const protocol = url.startsWith('http') ? url.replace(/^http/, 'ws') : (url.startsWith('ws') ? url : `ws://${url}`)
      const fullUrl = `${protocol}?access_token=${encodeURIComponent(token)}`

      try {
        this.ws = new WebSocket(fullUrl)
      } catch (e) {
        return reject(e)
      }

      this.ws.onopen = () => {
        console.log('[Socket] Connected')
        this.beat()
        resolve()
      }

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          this.handle(data)
        } catch (err) {
          console.error('[Socket] JSON Parse Error', err)
        }
      }

      this.ws.onclose = (e) => {
        console.log('[Socket] Disconnected', e.code, e.reason)
        this.clear()
        if (this.active) {
          console.log('[Socket] Reconnecting in 5s...')
          setTimeout(() => this.connect(this.url, this.token), 5000)
        }
      }

      this.ws.onerror = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) reject(e)
      }
    })
  }

  /** 主动断开连接 */
  disconnect() {
    this.active = false
    this.ws?.close()
    this.clear()
  }

  /**
   * 调用 API (有响应)
   * @param action - API 动作名称
   * @param params - API 参数
   * @returns API 响应数据
   */
  call<T = any>(action: string, params = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return reject(new Error('WebSocket Offline'))

      const echo = Math.random().toString(36).slice(2, 10)
      this.pending.set(echo, { resolve, reject })

      setTimeout(() => {
        if (this.pending.delete(echo)) reject(new Error(`API Timeout: ${action}`))
      }, 60000)

      this.ws.send(JSON.stringify({ action, params, echo }))
    })
  }

  /**
   * 发送数据 (无响应)
   * @param action - 动作名称
   * @param params - 参数
   */
  send(action: string, params = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, params }))
    }
  }

  /** 分发消息 */
  private handle(data: any) {
    if (data.echo && this.pending.has(data.echo)) {
      const req = this.pending.get(data.echo)!
      this.pending.delete(data.echo)
      if (data.status === 'ok' || data.retcode === 0) {
        req.resolve(data.data)
      } else {
        req.reject(new Error(data.msg || data.wording || `Error ${data.retcode}`))
      }
    } else {
      dispatchMessage(data)
    }
  }

  /** 心跳保活 */
  private beat() {
    this.clear()
    this.timer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('get_status')
      }
    }, 30000)
  }

  /** 清理资源 */
  private clear() {
    if (this.timer) clearInterval(this.timer)
    this.pending.forEach(p => p.reject(new Error('Connection Closed')))
    this.pending.clear()
  }
}

export const socket = new Socket()
