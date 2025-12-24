/**
 * WebSocket 通信服务核心
 * @description
 * 负责底层的 WebSocket 连接管理，包括连接建立、断开重连、心跳检测等功能。
 */
export class Socket {
  /** WebSocket 实例 */
  private ws?: WebSocket
  /** 当前连接地址 */
  private url = ''
  /** 当前连接 Token */
  private token = ''
  /** 是否主动关闭 */
  private isManualClose = false

  /** 心跳检测定时器 */
  private watchdogTimer?: number
  /** 重连倒计时定时器 */
  private reconnectTimer?: number

  /** 全局消息监听回调 */
  private listener?: (data: any) => void

  /**
   * 挂起的 API 请求队列
   * Key: 请求唯一标识 (echo)
   * Value: Promise 控制句柄与超时定时器
   */
  private pending = new Map<string, {
    resolve: (data: any) => void
    reject: (reason?: any) => void
    timer: number
  }>()

  /**
   * 注册全局事件接收器
   * @param fn - 接收数据的回调函数
   */
  public onReceive(fn: (data: any) => void): void {
    this.listener = fn
  }

  /**
   * 建立 WebSocket 连接
   * @param url - 服务端地址 (如 ws://127.0.0.1:3000)
   * @param token - 鉴权 Token
   * @returns Promise - 连接成功时 resolve，失败时 reject
   */
  public connect(url: string, token: string): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN && this.url === url && this.token === token) {
      return Promise.resolve()
    }

    clearTimeout(this.reconnectTimer)

    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.cleanup()
    }

    this.isManualClose = false
    this.url = url
    this.token = token

    return new Promise((resolve, reject) => {
      const target = url.replace(/^http/, 'ws')
      const wsUrl = `${target}?access_token=${encodeURIComponent(token)}`

      try {
        const ws = new WebSocket(wsUrl)
        this.ws = ws

        ws.onopen = () => {
          this.resetWatchdog()
          resolve()
        }

        ws.onmessage = (e) => this.handlePacket(e.data)

        ws.onclose = (e) => {
          console.warn(`[API] Websocket 连接中断: ${e.code}`)
          this.cleanup()
          if (!this.isManualClose && this.url) {
            clearTimeout(this.reconnectTimer)
            this.reconnectTimer = window.setTimeout(() => {
              console.log('[API] 正在重连...')
              this.connect(this.url, this.token).catch(() => { })
            }, 3000)
          }
        }

        ws.onerror = (e) => {
          if (ws.readyState !== WebSocket.OPEN) reject(new Error('Connection Error'))
          console.error('[API] Websocket 连接出错:', e)
        }
      } catch (e) {
        reject(e)
      }
    })
  }

  /**
   * 断开连接
   * @param isManual - 是否标记为主动断开。
   */
  public disconnect(isManual = true): void {
    this.isManualClose = isManual
    if (isManual) {
      this.url = ''
      this.token = ''
      clearTimeout(this.reconnectTimer)
    }

    if (this.ws) {
      if (isManual) this.ws.onclose = null
      this.ws.close()
    }
    this.cleanup()
  }

  /**
   * 发送 API 请求并等待响应
   * @template T - 期望的响应数据类型
   * @param action - API 动作名称 (如 send_private_msg)
   * @param params - API 参数对象
   * @param timeout - 超时时间(毫秒)，默认 60000ms
   * @returns Promise - 解析后的响应数据 (data 字段)
   */
  public request<T = any>(action: string, params: Record<string, any> = {}, timeout = 60000): Promise<T> {
    if (this.ws?.readyState !== WebSocket.OPEN) return Promise.reject(new Error('WebSocket Disconnected'))

    const echo = Date.now().toString(36) + Math.random().toString(36).slice(2)
    const payload = JSON.stringify({ action, params, echo })

    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(() => {
        if (this.pending.delete(echo)) {
          reject(new Error(`${action} Timeout`))
        }
      }, timeout)

      this.pending.set(echo, { resolve, reject, timer })
      this.ws!.send(payload)
    })
  }

  /**
   * 处理 WebSocket 原始数据包
   * @internal
   */
  private handlePacket(raw: string): void {
    this.resetWatchdog()

    let data: any
    try {
      data = JSON.parse(raw)
    } catch {
      return
    }

    if (data.echo) {
      const req = this.pending.get(data.echo)
      if (req) {
        clearTimeout(req.timer)
        this.pending.delete(data.echo)
        if (data.status === 'ok' || data.retcode === 0) {
          req.resolve(data.data)
        } else {
          req.reject(new Error(data.msg || data.wording || `Error Code ${data.retcode}`))
        }
      }
      return
    }

    this.listener?.(data)
  }

  /**
   * 重置心跳看门狗
   * @internal
   */
  private resetWatchdog(): void {
    clearTimeout(this.watchdogTimer)
    this.watchdogTimer = window.setTimeout(() => {
      console.warn('[API] Websocket 心跳超时')
      this.ws?.close()
    }, 60000)
  }

  /**
   * 资源清理
   * @internal
   */
  private cleanup(): void {
    clearTimeout(this.watchdogTimer)
    if (this.pending.size > 0) {
      const error = new Error('Connection closed')
      for (const req of this.pending.values()) {
        clearTimeout(req.timer)
        req.reject(error)
      }
      this.pending.clear()
    }
    this.ws = undefined
  }
}

/** 导出全局单例 Socket 实例 */
export const socket = new Socket()
