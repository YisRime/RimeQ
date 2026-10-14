import { bot } from '@/api'

/**
 * 生成 UUID
 * @returns {string} - 唯一标识符
 */
function uuidv4(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

/**
 * 流管理器
 * @description 处理流式异步回调
 */
class Stream {
  private downloadListeners = new Map<string, (data: any) => void>()

  /**
   * 处理流数据包
   * @param {any} data - 数据包
   */
  public handleStreamPacket(data: any) {
    if (data?.stream === 'stream-action') {
      const streamId = data.echo
      if (streamId && this.downloadListeners.has(streamId)) this.downloadListeners.get(streamId)!(data.data)
    }
  }

  /**
   * 注册下载流监听器
   * @param {string} streamId - 唯一标识
   * @param {(data: any) => void} callback - 回调函数
   */
  public registerDownload(streamId: string, callback: (data: any) => void) {
    this.downloadListeners.set(streamId, callback)
  }

  /**
   * 移除下载流监听器
   * @param {string} streamId - 唯一标识
   */
  public removeDownload(streamId: string) {
    this.downloadListeners.delete(streamId)
  }
}

export const streamFile = new Stream()

/**
 * 文件上传
 * @param {'group' | 'private'} type - 会话类型
 * @param {number} targetId - 目标群号或 QQ 号
 * @param {File} file - 文件对象
 * @param {string} [folder] - 目标文件夹 ID
 */
export async function uploadFile(type: 'group' | 'private', targetId: number, file: File, folder?: string) {
  const useStream = file.size > 4 * 1048576 && bot.backend === 'NapCat'
  const fileData = useStream
    ? await uploadStream(file)
    : await fileToBase64(file)
  if (!fileData) throw new Error('File Upload Failed')
  return bot.uploadFile(type, targetId, fileData, file.name, folder)
}

/**
 * 媒体上传
 * @param {File} file - 文件对象
 * @returns {Promise<string>} - 文件路径或 Base64 Data URI
 */
export async function uploadMedia(file: File): Promise<string> {
  if (file.size > 4 * 1048576 && bot.backend === 'NapCat') return await uploadStream(file)
  return await fileToBase64(file)
}

/**
 * 文件下载
 * @param {string} fileId - 文件路径、URL 或 ID
 * @param {string} [fileName] - 文件名
 * @param {'file' | 'image' | 'record'} [type='file'] - 文件类型
 */
export async function downloadFile(fileId: string, fileName?: string, type: 'file' | 'image' | 'record' = 'file'): Promise<void> {
  if (type === 'record') {
    const res = await bot.getRecord(fileId, 'mp3')
    downloadBlob(base64ToBlob(res.base64, 'audio/mp3'), fileName || `record_${Date.now()}.mp3`)
    return
  }
  if (bot.backend === 'NapCat') {
    const urlRes = await bot.getFile(fileId)
    if (urlRes.url) {
      window.open(urlRes.url, '_blank')
      return
    }
  }
  const res = await bot.downloadFile(fileId)
  if (res.file) console.warn('[File] Local Path:', res.file)
}

/**
 * 流式上传
 * @param {File} file - 文件
 * @returns {Promise<string>} - 文件路径
 */
async function uploadStream(file: File): Promise<string> {
  const CHUNK_SIZE = 512 * 1024
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  const streamId = uuidv4()
  let filePath = ''
  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE
    const end = Math.min(file.size, start + CHUNK_SIZE)
    const chunk = file.slice(start, end)
    const chunkBase64 = await blobToBase64(chunk)
    const isComplete = i === totalChunks - 1
    const res = await bot.uploadFileStream(streamId, chunkBase64, i, totalChunks, file.size, file.name, isComplete)
    if (isComplete && res.file_path) filePath = res.file_path
    if (i % 10 === 0) await new Promise(r => setTimeout(r, 5))
  }
  return filePath
}

/**
 * Blob 转换 Base64 字符串
 * @param {Blob} blob - Blob 或 File 对象
 * @returns {Promise<string>} - Base64 字符串
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        const parts = result.split(',')
        resolve(parts[1] || '')
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * File 转换 Base64 Data URI
 * @param {File} file - File 对象
 * @returns {Promise<string>} - Base64 字符串
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Base64 转换 Blob
 * @param {string} base64 - Base64 字符串
 * @param {string} type - MIME 类型
 * @returns {Blob} - Blob 对象
 */
function base64ToBlob(base64: string, type: string): Blob {
  const binary = atob(base64.replace(/\s/g, ''))
  const len = binary.length
  const buffer = new ArrayBuffer(len)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < len; i++) view[i] = binary.charCodeAt(i)
  return new Blob([view], { type })
}

/**
 * 本地下载
 * @param {Blob} blob - Blob 数据
 * @param {string} fileName - 文件名
 */
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
