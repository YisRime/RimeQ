import { dispatchMessage } from '@/utils/msg-handler'

/**
 * WebSocket 通信服务类
 * 负责底层连接维护、心跳保活、API 调用封装
 */
export class Socket {
  /** WebSocket 实例 */
  private ws: WebSocket | null = null
  /** 心跳定时器 ID */
  private timer: number | null = null
  /**
   * 挂起的 API 请求队列
   * Key: 请求的 echo 标识
   * Value: Promise 的 resolve/reject 函数
   */
  private pending = new Map<string, { resolve: (d: any) => void; reject: (e: Error) => void }>()
  /** 当前连接的 URL */
  private url = ''
  /** 当前的鉴权 Token */
  private token = ''
  /** 活跃状态标记 */
  private active = false

  /**
   * 连接到 WebSocket 服务器
   * @param url - 服务端地址
   * @param token - 鉴权 Access Token
   * @returns 连接成功时 Resolve，失败时 Reject
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
        console.log('[API] Websocket 已连接')
        this.beat()
        resolve()
      }

      this.ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          this.handle(data)
        } catch (err) {
          console.error('[API] JSON 解析出错:', err)
        }
      }

      this.ws.onclose = (e) => {
        console.warn('[API] Websocket 已断开:', e.code, e.reason)
        this.clear()
        if (this.active) {
          setTimeout(() => this.connect(this.url, this.token), 5000)
        }
      }

      this.ws.onerror = (e) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
          console.error('[API] WebSocket 连接出错:', e)
          reject(e)
        }
      }
    })
  }

  /**
   * 断开连接
   */
  disconnect() {
    this.active = false
    this.ws?.close()
    this.clear()
  }

  /**
   * 调用 API
   * @template T - 响应数据的类型
   * @param action - API 动作名称 (如 `send_private_msg`)
   * @param params - API 参数对象
   * @returns Promise 解析后的响应数据 `data` 字段
   * @throws {Error} WebSocket 未连接、调用超时或 API 返回错误
   */
  call<T = any>(action: string, params = {}): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState !== WebSocket.OPEN) return reject(new Error('WebSocket Offline'))

      const echo = Math.random().toString(36).substring(2, 10)
      this.pending.set(echo, { resolve, reject })

      setTimeout(() => {
        if (this.pending.delete(echo)) reject(new Error(`API Timeout: ${action}`))
      }, 60000)

      this.ws.send(JSON.stringify({ action, params, echo }))
    })
  }

  /**
   * 发送数据
   * @param action - 动作名称
   * @param params - 参数对象
   */
  send(action: string, params = {}) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action, params }))
    }
  }

  /**
   * 处理接收到的 WebSocket 消息
   * @param data - 解析后的 JSON 数据
   */
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

  /**
   * 心跳保活
   */
  private beat() {
    this.clear()
    this.timer = window.setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send('get_status')
      } else {
        this.clear()
      }
    }, 30000)
  }

  /**
   * 清理资源
   */
  private clear() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
    this.pending.forEach(p => p.reject(new Error('Connection Closed')))
    this.pending.clear()
  }
}

export const socket = new Socket()
